// Núcleo da Edge Function "generate": tarefas com status consultável, sem repetir trabalho nem consumo.
//  - mesma entrada (dono + material na versão atual + configuração) = mesma chave: pedido repetido devolve a tarefa
//    existente (em andamento ou pronta), sem nova chamada à IA;
//  - limite diário de chamadas por conta e limite de tentativas automáticas por tarefa;
//  - tudo que é lido/gravado em nome do estudante passa pelo JWT dele (RLS); só tarefas e consumo usam o servidor.
import { extractiveSection, GEN_LIMITS, materialKeys, questionPrompt, SECTION_KINDS, SECTION_SCHEMA, sectionPrompt, selectPages, validateQuestions, validateSection, QUESTIONS_SCHEMA, type Difficulty, type GuideItem, type QuestionDraft, type SectionKind, type SourcePage } from './generation.ts';

export interface AiLike {
  model: string;
  generate(p: { system: string; user: string; schema: Record<string, unknown> }): Promise<{ json: unknown; usage: { input: number; output: number }; model: string }>;
}

/** Erro da IA com mensagem para o estudante. retryable = vale tentar de novo depois. */
export class AiError extends Error {
  constructor(message: string, readonly kind: 'recusa' | 'limite' | 'incompleta' | 'indisponivel' | 'formato', readonly retryable: boolean) {
    super(message);
  }
}

export interface JobRow {
  id: string;
  kind: 'questoes' | 'secao';
  idem_key: string;
  status: 'running' | 'done' | 'failed';
  attempts: number;
  max_attempts: number;
  input: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  error?: string | null;
  started_at: string;
}

export interface GuideRow {
  id: string;
  discipline_id: string;
  material_ids: string[];
  data: { topicIds: string[]; allowComplement: boolean; exam?: { date: string } | null; sections: Record<string, { version?: number; status?: string }> };
}

export interface GenDeps {
  ai: AiLike | null;
  limits: { daily: number; maxAttempts: number; staleMs: number };
  now(): Date;
  hash(s: string): Promise<string>;
  newId(): string;
  getDiscipline(id: string): Promise<{ id: string; name: string } | null>;
  getTopic(id: string): Promise<{ id: string; discipline_id: string; name: string } | null>;
  getMaterials(ids: string[]): Promise<{ id: string; title: string; kind: 'pdf' | 'texto'; status: string; version: number; discipline_id: string }[]>;
  getPages(materialId: string): Promise<{ page: number; text: string }[]>;
  existingStems(disciplineId: string, topicId: string): Promise<string[]>;
  getGuide(id: string): Promise<GuideRow | null>;
  findJob(key: string): Promise<JobRow | null>;
  insertJob(job: JobRow): Promise<void>;
  updateJob(id: string, patch: Partial<JobRow> & { finished_at?: string }): Promise<void>;
  usageLast24h(): Promise<number>;
  addUsage(ev: { job_id: string; kind: string; model: string; input_tokens: number; output_tokens: number; cost_usd: number; ok: boolean }): Promise<void>;
  insertQuestions(rows: Record<string, unknown>[]): Promise<void>;
  /** mescla na seção (mesma regra do SQL set_guide_section e de mergeSection) */
  setGuideSection(guideId: string, key: string, patch: Record<string, unknown>): Promise<void>;
  /** continua o trabalho depois de responder (EdgeRuntime.waitUntil); nos testes, aguarda */
  background(p: Promise<unknown>): void;
}

export type GenRequest =
  | { op: 'status' }
  | { op: 'questoes'; disciplineId: string; topicId: string; materialIds: string[]; quantidade?: number; dificuldade?: Difficulty }
  | { op: 'secao'; guideId: string; topicId: string; kind: SectionKind; regenerar?: boolean };

export interface GenResponse {
  http: number;
  body: Record<string, unknown>;
}

/** Preço oficial por milhão de tokens (US$), para estimar o consumo registrado. Conferir na página de preços. */
export const PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
};
export const estimateCost = (model: string, input: number, output: number) => {
  const p = PRICES[model];
  return p ? Math.round(((input * p.input + output * p.output) / 1e6) * 1e6) / 1e6 : 0;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const bad = (msg: string): GenResponse => ({ http: 400, body: { error: msg } });

function jobView(j: JobRow, extra: Record<string, unknown> = {}) {
  return { job: { id: j.id, status: j.status, attempts: j.attempts, result: j.result ?? null, error: j.error ?? null }, ...extra };
}

async function loadSources(deps: GenDeps, materialIds: string[], disciplineId: string): Promise<{ pages: SourcePage[]; versions: Record<string, number> } | GenResponse> {
  const mats = await deps.getMaterials(materialIds);
  if (mats.length !== new Set(materialIds).size || mats.some((m) => m.discipline_id !== disciplineId)) return { http: 404, body: { error: 'Material não encontrado nesta disciplina.' } };
  const notReady = mats.filter((m) => m.status !== 'pronto');
  if (notReady.length) return { http: 422, body: { error: `Material ainda não está pronto: ${notReady.map((m) => m.title).join(', ')}. Resolva o processamento antes de gerar.` } };
  const pages: SourcePage[] = [];
  for (const m of mats) for (const p of await deps.getPages(m.id)) pages.push({ materialId: m.id, materialTitle: m.title, unit: m.kind === 'pdf' ? 'página' : 'trecho', page: p.page, text: p.text });
  return { pages, versions: Object.fromEntries(mats.map((m) => [m.id, m.version])) };
}

/** Cria a tarefa ou devolve a que já existe para a mesma chave. */
async function claim(deps: GenDeps, key: string, kind: JobRow['kind'], input: Record<string, unknown>): Promise<{ job: JobRow; start: boolean } | GenResponse> {
  const now = deps.now();
  const existing = await deps.findJob(key);
  if (existing) {
    // concluída com resultado útil: reaproveita. Concluída sem nenhuma questão aceita conta como tentativa falha
    // (senão o mesmo pedido ficaria preso para sempre no resultado vazio)
    const empty = existing.status === 'done' && existing.kind === 'questoes' && !((existing.result as { criadas?: number } | null)?.criadas);
    if (existing.status === 'done' && !empty) return { http: 200, body: jobView(existing, { reused: true }) };
    const fresh = now.getTime() - new Date(existing.started_at).getTime() < deps.limits.staleMs;
    if (existing.status === 'running' && fresh) return { http: 202, body: jobView(existing, { emAndamento: true }) };
    if (existing.attempts >= existing.max_attempts) return { http: 429, body: { ...jobView(existing), error: `Esta geração falhou ${existing.attempts} vezes. Tente mais tarde ou mude o pedido (outro material ou assunto).` } };
    if ((await deps.usageLast24h()) >= deps.limits.daily) return { http: 429, body: { error: `Limite de ${deps.limits.daily} gerações por dia atingido nesta conta. Tente amanhã.` } };
    const retry = { ...existing, status: 'running' as const, attempts: existing.attempts + 1, started_at: now.toISOString(), error: null };
    await deps.updateJob(existing.id, { status: 'running', attempts: retry.attempts, started_at: retry.started_at, error: null });
    return { job: retry, start: true };
  }
  if ((await deps.usageLast24h()) >= deps.limits.daily) return { http: 429, body: { error: `Limite de ${deps.limits.daily} gerações por dia atingido nesta conta. Tente amanhã.` } };
  const job: JobRow = { id: deps.newId(), kind, idem_key: key, status: 'running', attempts: 1, max_attempts: deps.limits.maxAttempts, input, started_at: now.toISOString() };
  try {
    await deps.insertJob(job);
  } catch {
    // outro pedido igual chegou junto (chave única): devolve o dele em vez de gerar em dobro
    const other = await deps.findJob(key);
    if (other) return { http: 202, body: jobView(other, { emAndamento: true }) };
    throw new Error('não foi possível registrar a tarefa');
  }
  return { job, start: true };
}

async function callAi(deps: GenDeps, job: JobRow, prompt: { system: string; user: string }, schema: Record<string, unknown>) {
  try {
    const r = await deps.ai!.generate({ ...prompt, schema });
    await deps.addUsage({ job_id: job.id, kind: job.kind, model: r.model, input_tokens: r.usage.input, output_tokens: r.usage.output, cost_usd: estimateCost(r.model, r.usage.input, r.usage.output), ok: true });
    return r;
  } catch (e) {
    // conta para o limite diário mesmo sem resposta útil: impede insistência automática
    await deps.addUsage({ job_id: job.id, kind: job.kind, model: deps.ai!.model, input_tokens: 0, output_tokens: 0, cost_usd: 0, ok: false });
    throw e;
  }
}

const failMessage = (e: unknown) => (e instanceof AiError ? e.message : 'Falha inesperada na geração. Tente de novo.');

export async function handleGenerate(deps: GenDeps, req: GenRequest): Promise<GenResponse> {
  if (req.op === 'status') {
    return { http: 200, body: { ia: !!deps.ai, modelo: deps.ai?.model ?? null, usadoHoje: await deps.usageLast24h(), limiteDiario: deps.limits.daily } };
  }
  if (!deps.ai) return { http: 503, body: { code: 'ia_nao_configurada', error: 'A geração por IA ainda não foi configurada neste site. Guias com trechos do material e questões criadas por você continuam disponíveis.' } };

  if (req.op === 'questoes') {
    if (!UUID.test(req.disciplineId) || !UUID.test(req.topicId) || !Array.isArray(req.materialIds) || !req.materialIds.length || req.materialIds.length > 10 || !req.materialIds.every((m) => UUID.test(m))) return bad('Pedido inválido.');
    if (req.quantidade !== undefined && (typeof req.quantidade !== 'number' || !Number.isFinite(req.quantidade))) return bad('Quantidade inválida.');
    const quantidade = Math.max(1, Math.min(GEN_LIMITS.maxQuestionsPerBatch, Math.floor(req.quantidade ?? 5)));
    if (req.dificuldade && !['facil', 'medio', 'dificil'].includes(req.dificuldade)) return bad('Dificuldade inválida.');
    const topic = await deps.getTopic(req.topicId);
    const disc = await deps.getDiscipline(req.disciplineId);
    if (!topic || !disc || topic.discipline_id !== disc.id) return { http: 404, body: { error: 'Assunto não encontrado nesta disciplina.' } };
    const src = await loadSources(deps, req.materialIds, disc.id);
    if ('http' in src) return src;
    const pages = selectPages(src.pages, topic.name);
    if (!pages.length) return { http: 422, body: { error: `O material escolhido não trata de “${topic.name}” (nenhuma página menciona o assunto). Escolha outro material ou ajuste o nome do assunto.` } };
    const stems = await deps.existingStems(disc.id, topic.id);
    const input = { topicId: topic.id, materials: Object.entries(src.versions).sort(), quantidade, dificuldade: req.dificuldade ?? null, existentes: stems.length };
    const key = await deps.hash(JSON.stringify({ op: 'questoes', ...input }));
    const c = await claim(deps, key, 'questoes', input);
    if ('http' in c) return c;
    const job = c.job;
    deps.background(
      (async () => {
        try {
          const keys = materialKeys(pages);
          const r = await callAi(deps, job, questionPrompt({ disciplineName: disc.name, topicName: topic.name, count: quantidade, difficulty: req.dificuldade, pages, keys }), QUESTIONS_SCHEMA as unknown as Record<string, unknown>);
          const v = validateQuestions(r.json, { pages, keys, existingStems: stems, max: quantidade });
          const now = deps.now().toISOString();
          const rows = v.accepted.map((q: QuestionDraft) => ({
            id: deps.newId(), discipline_id: disc.id, topic_id: topic.id, status: 'gerada_ia', difficulty: q.difficulty, version: 1,
            material_ids: [...new Set(q.refs.map((x) => x.materialId))],
            data: { stem: q.stem, options: q.options, correctOptionId: q.correctOptionId, explanation: q.explanation, refs: q.refs, checks: q.checks, origin: { kind: 'ia', model: r.model, jobId: job.id, materialVersions: src.versions, generatedAt: now } },
          }));
          if (rows.length) await deps.insertQuestions(rows);
          await deps.updateJob(job.id, { status: 'done', result: { criadas: rows.length, ids: rows.map((x) => x.id), rejeitadas: v.rejected, observacao: v.note }, finished_at: now });
        } catch (e) {
          await deps.updateJob(job.id, { status: 'failed', error: failMessage(e), finished_at: deps.now().toISOString() });
        }
      })(),
    );
    return { http: 202, body: jobView(job) };
  }

  if (req.op === 'secao') {
    if (!UUID.test(req.guideId) || !UUID.test(req.topicId) || !SECTION_KINDS.includes(req.kind)) return bad('Pedido inválido.');
    const guide = await deps.getGuide(req.guideId);
    if (!guide) return { http: 404, body: { error: 'Guia não encontrado.' } };
    if (!guide.data.topicIds.includes(req.topicId)) return { http: 422, body: { error: 'Este assunto não foi confirmado neste guia.' } };
    const topic = await deps.getTopic(req.topicId);
    const disc = await deps.getDiscipline(guide.discipline_id);
    if (!topic || !disc || topic.discipline_id !== disc.id) return { http: 404, body: { error: 'Assunto não encontrado nesta disciplina.' } };
    const sectionKey = `${topic.id}:${req.kind}`;
    const current = guide.data.sections[sectionKey];
    if (current?.status === 'pronta' && !req.regenerar) return { http: 200, body: { reused: true, section: sectionKey } };
    const src = await loadSources(deps, guide.material_ids, disc.id);
    if ('http' in src) return src;
    const pages = selectPages(src.pages, topic.name);
    if (!pages.length) return { http: 422, body: { error: `Os materiais deste guia não tratam de “${topic.name}”. Adicione um material sobre o assunto.` } };
    const input = { guideId: guide.id, sectionKey, materials: Object.entries(src.versions).sort(), complemento: guide.data.allowComplement, versaoAtual: current?.version ?? 0 };
    const key = await deps.hash(JSON.stringify({ op: 'secao', ...input }));
    const c = await claim(deps, key, 'secao', input);
    if ('http' in c) return c;
    const job = c.job;
    deps.background(
      (async () => {
        // as versões dos materiais só entram junto com os itens novos: enquanto gera (ou se falhar), a seção continua
        // dizendo de qual versão veio o conteúdo que ela mostra
        const base = { key: sectionKey, topicId: topic.id, kind: req.kind, jobId: job.id };
        try {
          await deps.setGuideSection(guide.id, sectionKey, { ...base, status: 'gerando' });
          const keys = materialKeys(pages);
          const r = await callAi(deps, job, sectionPrompt({ kind: req.kind, disciplineName: disc.name, topicName: topic.name, allowComplement: guide.data.allowComplement, examDate: guide.data.exam?.date, pages, keys }), SECTION_SCHEMA as unknown as Record<string, unknown>);
          const v = validateSection(r.json, { pages, keys, allowComplement: guide.data.allowComplement });
          const now = deps.now().toISOString();
          const items: GuideItem[] = v.items;
          if (!items.length) throw new AiError(`Nenhum item veio com trecho conferido no material (${v.dropped} descartado(s)). O conteúdo anterior da seção foi mantido.`, 'formato', true);
          // com itens novos, o banco guarda a versão anterior em "previous" (set_guide_section)
          await deps.setGuideSection(guide.id, sectionKey, { ...base, materialVersions: src.versions, status: 'pronta', error: null, generator: 'ia', model: r.model, items, dropped: v.dropped, notes: v.note ? [v.note] : [], version: (current?.version ?? 0) + 1, generatedAt: now });
          await deps.updateJob(job.id, { status: 'done', result: { itens: items.length, descartados: v.dropped }, finished_at: now });
        } catch (e) {
          // sem "items": o conteúdo anterior da seção continua lá
          await deps.setGuideSection(guide.id, sectionKey, { ...base, status: current?.status === 'pronta' ? 'pronta' : 'falhou', error: failMessage(e) }).catch(() => undefined);
          await deps.updateJob(job.id, { status: 'failed', error: failMessage(e), finished_at: deps.now().toISOString() });
        }
      })(),
    );
    return { http: 202, body: jobView(job) };
  }
  return bad('Operação desconhecida.');
}

/** Usado sem IA (aparelho ou conta): seção de trechos do material, gerada no navegador. */
export { extractiveSection };

/**
 * Mesma regra do SQL set_guide_section: mescla o patch na seção; quando o patch traz itens novos e já havia itens,
 * a versão anterior fica em "previous" (regenerar não destrói o que existia).
 */
export function mergeSection(old: Record<string, unknown> | undefined, patch: Record<string, unknown>): Record<string, unknown> {
  const base = old ?? {};
  if ('items' in patch && 'items' in base) {
    const { previous: _p, ...prev } = base;
    return { ...base, ...patch, previous: prev };
  }
  return { ...base, ...patch };
}
