// Núcleo da função "generate" com banco e IA SIMULADOS (respostas fixas escritas para o teste). Comprova as regras
// de tarefas, reutilização, concorrência, falhas e limites — não comprova o provedor de IA nem o Supabase reais.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { segmentText } from '../../supabase/functions/_shared/materialQuality';
import { AiError, handleGenerate, mergeSection, type AiLike, type GenDeps, type GuideRow, type JobRow } from '../../supabase/functions/_shared/generateCore';

const TEXT = fs.readFileSync(path.resolve(import.meta.dirname, '../fixtures/materiais/texto-colado.txt'), 'utf8');
const PAGES = segmentText(TEXT, 600);
const D = '11111111-1111-4111-8111-111111111111';
const T = '22222222-2222-4222-8222-222222222222';
const M = '44444444-4444-4444-8444-444444444444';
const G = '77777777-7777-4777-8777-777777777777';
const quote = 'o teorema de Fubini permite calcular a integral dupla como duas integrais simples';
const pageOf = PAGES.find((p) => p.text.includes(quote))!.page;

const q = (stem: string, citacao = quote) => ({
  enunciado: stem,
  alternativas: ['Como duas integrais simples em sequência', 'Somente em coordenadas polares', 'Apenas quando f é negativa', 'Nunca, só por aproximação'],
  correta: 0,
  explicacao_correta: 'Pelo teorema de Fubini, em um retângulo e com f contínua, a integral dupla vira duas integrais simples.',
  por_que_erradas: ['Polares são outra técnica.', 'O sinal de f não importa aqui.', 'O cálculo é exato.'],
  passos: [],
  dificuldade: 'medio',
  trechos: [{ material: 'M1', pagina: pageOf, citacao }],
});

function world(opts: { ai?: AiLike | null; topicName?: string; materialStatus?: string; usage?: number; guide?: GuideRow } = {}) {
  const jobs = new Map<string, JobRow>();
  const inserted: Record<string, unknown>[] = [];
  const usage: { ok: boolean; cost_usd: number }[] = [];
  const pending: Promise<unknown>[] = [];
  let guide = opts.guide ?? null;
  let n = 0;
  const deps: GenDeps = {
    ai: opts.ai === undefined ? null : opts.ai,
    limits: { daily: 3, maxAttempts: 2, staleMs: 600000 },
    now: () => new Date('2026-10-24T12:00:00Z'),
    hash: async (s) => createHash('sha256').update(s).digest('hex'),
    newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
    getDiscipline: async (id) => (id === D ? { id: D, name: 'Cálculo II' } : null),
    getTopic: async (id) => (id === T ? { id: T, discipline_id: D, name: opts.topicName ?? 'Integrais duplas' } : null),
    getMaterials: async (ids) => ids.filter((i) => i === M).map((id) => ({ id, title: 'Revisão', kind: 'texto' as const, status: opts.materialStatus ?? 'pronto', version: 3, discipline_id: D })),
    getPages: async () => PAGES,
    existingStems: async () => [],
    getGuide: async (id) => (guide && id === guide.id ? guide : null),
    findJob: async (key) => [...jobs.values()].find((j) => j.idem_key === key) ?? null,
    insertJob: async (j) => {
      if ([...jobs.values()].some((x) => x.idem_key === j.idem_key)) throw new Error('duplicate');
      jobs.set(j.id, { ...j });
    },
    updateJob: async (id, patch) => void jobs.set(id, { ...jobs.get(id)!, ...patch }),
    usageLast24h: async () => (opts.usage ?? 0) + usage.length,
    addUsage: async (ev) => void usage.push(ev),
    insertQuestions: async (rows) => void inserted.push(...rows),
    setGuideSection: async (_g, key, patch) => {
      guide = { ...guide!, data: { ...guide!.data, sections: { ...guide!.data.sections, [key]: mergeSection(guide!.data.sections[key] as Record<string, unknown>, patch) as never } } };
    },
    background: (p) => void pending.push(p),
  };
  return { deps, jobs, inserted, usage, settle: () => Promise.all(pending.splice(0)), guide: () => guide };
}

const fakeAi = (json: unknown | (() => unknown)): AiLike & { calls: number } => {
  const ai = {
    model: 'claude-opus-5-5',
    calls: 0,
    async generate() {
      ai.calls++;
      const out = typeof json === 'function' ? (json as () => unknown)() : json;
      return { json: out, usage: { input: 12000, output: 3000 }, model: 'claude-opus-5-5' };
    },
  };
  return ai;
};
const req = { op: 'questoes' as const, disciplineId: D, topicId: T, materialIds: [M], quantidade: 3 };

describe('generate (IA e banco simulados)', () => {
  it('sem chave de IA: status informa e geração responde "não configurada", sem criar tarefa', async () => {
    const w = world({ ai: null });
    expect((await handleGenerate(w.deps, { op: 'status' })).body).toMatchObject({ ia: false });
    const r = await handleGenerate(w.deps, req);
    expect(r.http).toBe(503);
    expect(r.body.code).toBe('ia_nao_configurada');
    expect(w.jobs.size).toBe(0);
  });

  it('assunto de outra conta (o RLS não devolve) → 404; material não pronto → 422; assunto ausente do material → 422, sem chamar a IA', async () => {
    const ai = fakeAi({ questoes: [], observacao: '' });
    expect((await handleGenerate(world({ ai }).deps, { ...req, topicId: '33333333-3333-4333-8333-333333333333' })).http).toBe(404);
    expect((await handleGenerate(world({ ai, materialStatus: 'atencao' }).deps, req)).http).toBe(422);
    const r = await handleGenerate(world({ ai, topicName: 'Séries de Fourier' }).deps, req);
    expect(r.http).toBe(422);
    expect(String(r.body.error)).toMatch(/não trata de “Séries de Fourier”/);
    expect(ai.calls).toBe(0);
  });

  it('gera, valida e salva só o que tem trecho conferido; registra consumo estimado', async () => {
    const ai = fakeAi({ questoes: [q('Como o teorema de Fubini permite calcular a integral dupla em um retângulo?'), q('Questão com citação inventada sobre integrais duplas e regiões', 'Esta frase não existe no material do estudante')], observacao: '' });
    const w = world({ ai });
    const r = await handleGenerate(w.deps, req);
    expect(r.http).toBe(202);
    await w.settle();
    const job = [...w.jobs.values()][0];
    expect(job.status).toBe('done');
    expect(job.result).toMatchObject({ criadas: 1, rejeitadas: [{ reasons: ['nenhum trecho citado foi encontrado no material'] }] });
    expect(w.inserted[0]).toMatchObject({ status: 'gerada_ia', discipline_id: D, topic_id: T, material_ids: [M], version: 1 });
    expect((w.inserted[0].data as { origin: { materialVersions: Record<string, number> } }).origin.materialVersions).toEqual({ [M]: 3 });
    expect(w.usage).toEqual([expect.objectContaining({ ok: true, cost_usd: (12000 * 4 + 3000 * 20) / 1e6 })]);
  });

  it('pedido repetido: em andamento devolve a mesma tarefa; concluído reutiliza o resultado; a IA é chamada uma vez', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const inner = fakeAi({ questoes: [q('Como o teorema de Fubini permite calcular a integral dupla em um retângulo?')], observacao: '' });
    // a IA real leva segundos: segura a resposta até o segundo pedido chegar
    const ai = { model: inner.model, generate: async (p: Parameters<AiLike['generate']>[0]) => (await gate, inner.generate(p)) };
    const w = world({ ai });
    const first = await handleGenerate(w.deps, req);
    const again = await handleGenerate(w.deps, req);
    release();
    expect(again).toMatchObject({ http: 202, body: { emAndamento: true } });
    expect((again.body.job as { id: string }).id).toBe((first.body.job as { id: string }).id);
    await w.settle();
    const done = await handleGenerate(w.deps, req);
    expect(done).toMatchObject({ http: 200, body: { reused: true } });
    expect(inner.calls).toBe(1);
  });

  it('falha da IA: tarefa "falhou" com mensagem; nova tentativa permitida até o limite; depois, recusa', async () => {
    const ai = { model: 'claude-opus-5-5', generate: vi.fn().mockRejectedValue(new AiError('O provedor de IA está indisponível (erro 529). Tente de novo mais tarde.', 'indisponivel', true)) };
    const w = world({ ai });
    await handleGenerate(w.deps, req);
    await w.settle();
    let job = [...w.jobs.values()][0];
    expect(job).toMatchObject({ status: 'failed', attempts: 1, error: expect.stringMatching(/indisponível/) });
    expect(w.usage).toEqual([expect.objectContaining({ ok: false, cost_usd: 0 })]);
    expect((await handleGenerate(w.deps, req)).http).toBe(202);
    await w.settle();
    job = [...w.jobs.values()][0];
    expect(job.attempts).toBe(2);
    const blocked = await handleGenerate(w.deps, req);
    expect(blocked.http).toBe(429);
    expect(String(blocked.body.error)).toMatch(/falhou 2 vezes/);
    expect(ai.generate).toHaveBeenCalledTimes(2);
  });

  it('limite diário por conta: recusa sem chamar a IA', async () => {
    const ai = fakeAi({ questoes: [], observacao: '' });
    const r = await handleGenerate(world({ ai, usage: 3 }).deps, req);
    expect(r.http).toBe(429);
    expect(ai.calls).toBe(0);
  });

  it('seção de guia: regenerar guarda a versão anterior; falha na regeneração mantém o conteúdo', async () => {
    const guide: GuideRow = { id: G, discipline_id: D, material_ids: [M], data: { topicIds: [T], allowComplement: false, exam: null, sections: {} } };
    let n = 0;
    const ai = fakeAi(() => ({ itens: [{ titulo: `Fubini v${++n}`, texto: 'Integral dupla em retângulo como duas simples.', passos: [], complementar: false, trechos: [{ material: 'M1', pagina: pageOf, citacao: quote }] }], observacao: '' }));
    const w = world({ ai, guide });
    await handleGenerate(w.deps, { op: 'secao', guideId: G, topicId: T, kind: 'resumo' });
    await w.settle();
    const key = `${T}:resumo`;
    expect(w.guide()!.data.sections[key]).toMatchObject({ status: 'pronta', version: 1 });
    // sem "regenerar", pedir de novo não chama a IA
    expect((await handleGenerate(w.deps, { op: 'secao', guideId: G, topicId: T, kind: 'resumo' })).body).toMatchObject({ reused: true });
    await handleGenerate(w.deps, { op: 'secao', guideId: G, topicId: T, kind: 'resumo', regenerar: true });
    await w.settle();
    const s = w.guide()!.data.sections[key] as unknown as { version: number; items: { title: string }[]; previous: { items: { title: string }[] } };
    expect(s.version).toBe(2);
    expect(s.items[0].title).toBe('Fubini v2');
    expect(s.previous.items[0].title).toBe('Fubini v1');
    // falha depois de o material mudar (versão 3 → 4): o conteúdo continua o da versão 2 e continua dizendo que veio
    // da versão 3 do material (assim o aviso de "material mudou" não some)
    const orig = w.deps.getMaterials;
    w.deps.getMaterials = async (ids) => (await orig(ids)).map((m) => ({ ...m, version: 4 }));
    w.deps.ai = { model: 'x', generate: async () => { throw new AiError('O provedor de IA recusou gerar este conteúdo.', 'recusa', false); } };
    w.guide()!.data.sections[key] = { ...w.guide()!.data.sections[key], version: 2 } as never;
    await handleGenerate(w.deps, { op: 'secao', guideId: G, topicId: T, kind: 'resumo', regenerar: true });
    await w.settle();
    const after = w.guide()!.data.sections[key] as unknown as { status: string; items: { title: string }[]; error: string };
    expect(after).toMatchObject({ status: 'pronta', items: [{ title: 'Fubini v2' }], error: expect.stringMatching(/recusou/), materialVersions: { [M]: 3 } });
  });

  it('lote concluído sem nenhuma questão aceita não prende o pedido: dá para tentar de novo, até o limite de tentativas', async () => {
    const ai = fakeAi({ questoes: [q('Questão com citação inventada sobre integrais duplas e regiões', 'Esta frase não existe no material do estudante')], observacao: '' });
    const w = world({ ai });
    await handleGenerate(w.deps, req);
    await w.settle();
    expect([...w.jobs.values()][0]).toMatchObject({ status: 'done', result: { criadas: 0 } });
    expect((await handleGenerate(w.deps, req)).http).toBe(202);
    await w.settle();
    expect(ai.calls).toBe(2);
    const third = await handleGenerate(w.deps, req);
    expect(third.http).toBe(429);
    expect(ai.calls).toBe(2);
  });

  it('quantidade inválida: recusa sem criar tarefa nem chamar a IA', async () => {
    const ai = fakeAi({ questoes: [], observacao: '' });
    const w = world({ ai });
    const r = await handleGenerate(w.deps, { ...req, quantidade: 'abc' as unknown as number });
    expect(r).toMatchObject({ http: 400 });
    expect(w.jobs.size + ai.calls).toBe(0);
  });

  it('assunto que não foi confirmado no guia: recusado', async () => {
    const guide: GuideRow = { id: G, discipline_id: D, material_ids: [M], data: { topicIds: [], allowComplement: false, exam: null, sections: {} } };
    expect((await handleGenerate(world({ ai: fakeAi({}), guide }).deps, { op: 'secao', guideId: G, topicId: T, kind: 'resumo' })).http).toBe(422);
  });
});
