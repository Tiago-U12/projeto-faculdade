// Repositório dos dados pessoais com duas implementações de mesma interface:
//  - LocalRepo: "neste aparelho" (IndexedDB), sem conta;
//  - CloudRepo: "conta" (Supabase). Toda autorização é do banco (RLS por owner_id); o cliente só envia o JWT.
import type { KvBackend } from './backend';
import { mergeSection } from '../../supabase/functions/_shared/generateCore';
import type { EntityMap, GuideSection, Kind, PageText, PDiscipline, PEvent, PGuide, PMaterial, PQuestion, PTopic } from './types';

export type Space = { kind: 'device' } | { kind: 'account'; uid: string; email: string };

export interface PersonalRepo {
  readonly space: Space;
  list<K extends Kind>(kind: K): Promise<EntityMap[K][]>;
  put<K extends Kind>(kind: K, e: EntityMap[K]): Promise<void>;
  /** onlyNew: não sobrescreve o que já existe com o mesmo ID (importação) */
  putMany<K extends Kind>(kind: K, es: EntityMap[K][], opts?: { onlyNew?: boolean }): Promise<void>;
  remove<K extends Kind>(kind: K, ids: string[]): Promise<void>;
  /** texto extraído de um material, por página (ou trecho, no texto colado) */
  getPages(materialId: string): Promise<PageText[]>;
  putPages(materialId: string, pages: PageText[]): Promise<void>;
  removePages(materialId: string): Promise<void>;
  /** mescla uma seção do guia sem tocar nas outras (na conta: uma instrução no banco) */
  setGuideSection(guideId: string, key: string, patch: Partial<GuideSection>): Promise<void>;
  /** só na conta: exclui o material com questões e guias derivados numa única operação do banco */
  deleteMaterialCascade?(materialId: string): Promise<{ questoes: number; guias: number }>;
}

export class LocalRepo implements PersonalRepo {
  readonly space: Space = { kind: 'device' };
  constructor(private kv: KvBackend) {}
  list<K extends Kind>(kind: K) {
    return this.kv.getAll<EntityMap[K]>(kind);
  }
  put<K extends Kind>(kind: K, e: EntityMap[K]) {
    return this.kv.put(kind, e);
  }
  async putMany<K extends Kind>(kind: K, es: EntityMap[K][], opts?: { onlyNew?: boolean }) {
    if (!opts?.onlyNew) return this.kv.putMany(kind, es);
    const have = new Set((await this.kv.getAll<{ id: string }>(kind)).map((e) => e.id));
    return this.kv.putMany(kind, es.filter((e) => !have.has(e.id)));
  }
  remove<K extends Kind>(kind: K, ids: string[]) {
    return this.kv.delete(kind, ids);
  }
  async getPages(materialId: string) {
    return (await this.kv.getByPrefix<PageText & { materialId: string }>('pages', materialId)).map(({ page, text }) => ({ page, text }));
  }
  async putPages(materialId: string, pages: PageText[]) {
    await this.kv.deleteByPrefix('pages', materialId);
    await this.kv.putMany('pages', pages.map((p) => ({ materialId, page: p.page, text: p.text })));
  }
  removePages(materialId: string) {
    return this.kv.deleteByPrefix('pages', materialId);
  }
  async setGuideSection(guideId: string, key: string, patch: Partial<GuideSection>) {
    const g = await this.kv.get<PGuide>('guides', guideId);
    if (!g) throw new Error('Guia não encontrado.');
    await this.kv.put('guides', { ...g, sections: { ...g.sections, [key]: mergeSection(g.sections[key] as unknown as Record<string, unknown>, patch as Record<string, unknown>) }, updatedAt: new Date().toISOString() });
  }
}

// ---------- mapeamento entidade ↔ linha do Postgres ----------

type Row = Record<string, unknown>;
interface Mapper<E> {
  table: string;
  toRow(e: E, uid: string): Row;
  fromRow(r: Row): E;
}

const common = (r: Row) => ({ id: r.id as string, createdAt: r.created_at as string, updatedAt: r.updated_at as string });

export const MAPPERS: { [K in Kind]: Mapper<EntityMap[K]> } = {
  disciplines: {
    table: 'disciplines',
    toRow: (e: PDiscipline, uid) => ({ owner_id: uid, id: e.id, name: e.name, description: e.description, period: e.period || null, color: e.color, created_at: e.createdAt, updated_at: e.updatedAt }),
    fromRow: (r) => ({ ...common(r), name: r.name as string, description: (r.description as string) ?? '', period: (r.period as string | null) ?? undefined, color: r.color as PDiscipline['color'] }),
  },
  materials: {
    table: 'materials',
    // version e server_checked_at são do servidor na conta: nunca enviados pelo navegador
    toRow: (e: PMaterial, uid) => ({
      owner_id: uid, id: e.id, discipline_id: e.disciplineId, title: e.title, kind: e.kind, status: e.status, status_detail: e.statusDetail ?? null,
      file_name: e.fileName ?? null, file_size: e.fileSize ?? null, sha256: e.sha256 ?? null, page_count: e.pageCount, char_count: e.charCount,
      issues: e.issues, suggested_topics: e.suggestedTopics, topic_ids: e.topicIds, created_at: e.createdAt, updated_at: e.updatedAt,
    }),
    fromRow: (r) => ({
      ...common(r), disciplineId: r.discipline_id as string, title: r.title as string, kind: r.kind as PMaterial['kind'], status: r.status as PMaterial['status'],
      statusDetail: (r.status_detail as string | null) ?? undefined, fileName: (r.file_name as string | null) ?? undefined, fileSize: (r.file_size as number | null) ?? undefined,
      sha256: (r.sha256 as string | null) ?? undefined, pageCount: r.page_count as number, charCount: r.char_count as number, issues: (r.issues as PMaterial['issues']) ?? [],
      suggestedTopics: (r.suggested_topics as PMaterial['suggestedTopics']) ?? [], topicIds: (r.topic_ids as string[]) ?? [], version: (r.version as number) ?? 1,
      serverCheckedAt: (r.server_checked_at as string | null) ?? undefined,
    }),
  },
  questions: {
    table: 'questions',
    toRow: (e: PQuestion, uid) => ({
      owner_id: uid, id: e.id, discipline_id: e.disciplineId, topic_id: e.topicId, status: e.status, difficulty: e.difficulty, version: e.version, material_ids: e.materialIds,
      data: { stem: e.stem, options: e.options, correctOptionId: e.correctOptionId, explanation: e.explanation, refs: e.refs, checks: e.checks, origin: e.origin, reportNote: e.reportNote },
      created_at: e.createdAt, updated_at: e.updatedAt,
    }),
    fromRow: (r) => {
      const d = (r.data ?? {}) as Partial<PQuestion>;
      return {
        ...common(r), disciplineId: r.discipline_id as string, topicId: r.topic_id as string, status: r.status as PQuestion['status'], difficulty: r.difficulty as PQuestion['difficulty'],
        version: r.version as number, materialIds: (r.material_ids as string[]) ?? [], stem: d.stem ?? '', options: d.options ?? [], correctOptionId: d.correctOptionId ?? '',
        explanation: d.explanation ?? { correct: '', wrong: {}, steps: [] }, refs: d.refs ?? [], checks: d.checks, origin: d.origin ?? { kind: 'aluno' }, reportNote: d.reportNote,
      };
    },
  },
  guides: {
    table: 'guides',
    toRow: (e: PGuide, uid) => ({
      owner_id: uid, id: e.id, discipline_id: e.disciplineId, title: e.title, material_ids: e.materialIds, version: e.version,
      data: { topicIds: e.topicIds, allowComplement: e.allowComplement, exam: e.exam ?? null, sectionKinds: e.sectionKinds, sections: e.sections },
      created_at: e.createdAt, updated_at: e.updatedAt,
    }),
    fromRow: (r) => {
      const d = (r.data ?? {}) as Partial<PGuide>;
      return {
        ...common(r), disciplineId: r.discipline_id as string, title: r.title as string, materialIds: (r.material_ids as string[]) ?? [], version: r.version as number,
        topicIds: d.topicIds ?? [], allowComplement: !!d.allowComplement, exam: d.exam ?? null, sectionKinds: d.sectionKinds ?? [], sections: d.sections ?? {},
      };
    },
  },
  events: {
    table: 'events',
    toRow: (e: PEvent, uid) => ({
      owner_id: uid, id: e.id, discipline_id: e.disciplineId, type: e.type, title: e.title, status: e.status, all_day: e.allDay,
      date: e.allDay ? e.date : null, start_at: e.allDay ? null : e.start, duration_min: e.durationMin ?? null, time_zone: e.timeZone,
      completed_at: e.completedAt ?? null, data: { topicIds: e.topicIds, notes: e.notes, link: e.link ?? null, history: e.history ?? [], plan: e.plan ?? null },
      created_at: e.createdAt, updated_at: e.updatedAt,
    }),
    fromRow: (r) => {
      const d = (r.data ?? {}) as Partial<PEvent> & { link?: PEvent['link'] | null; plan?: PEvent['plan'] | null };
      return {
        ...common(r), disciplineId: r.discipline_id as string, type: r.type as PEvent['type'], title: r.title as string, status: r.status as PEvent['status'], allDay: !!r.all_day,
        ...(r.all_day ? { date: String(r.date).slice(0, 10) } : { start: new Date(r.start_at as string).toISOString() }),
        ...(r.duration_min != null ? { durationMin: r.duration_min as number } : {}), timeZone: r.time_zone as string,
        topicIds: d.topicIds ?? [], notes: d.notes ?? '', ...(d.link ? { link: d.link } : {}), ...(d.history?.length ? { history: d.history } : {}), ...(d.plan ? { plan: d.plan } : {}),
        ...(r.completed_at ? { completedAt: r.completed_at as string } : {}),
      };
    },
  },
  topics: {
    table: 'topics',
    toRow: (e: PTopic, uid) => ({ owner_id: uid, id: e.id, discipline_id: e.disciplineId, name: e.name, position: e.position, origin: e.origin, created_at: e.createdAt, updated_at: e.updatedAt }),
    fromRow: (r) => ({ ...common(r), disciplineId: r.discipline_id as string, name: r.name as string, position: r.position as number, origin: r.origin as PTopic['origin'] }),
  },
};

/** Parte do supabase-js usada aqui (permite testar o mapeamento sem rede). */
type DbError = { message: string; code?: string } | null;
export interface TableClient {
  from(table: string): {
    select(cols: string): {
      order(col: string, o: { ascending: boolean }): PromiseLike<{ data: Row[] | null; error: DbError }>;
      eq(col: string, v: string): { order(col: string, o: { ascending: boolean }): PromiseLike<{ data: Row[] | null; error: DbError }> };
    };
    upsert(rows: Row[], o: { onConflict: string; ignoreDuplicates?: boolean }): PromiseLike<{ error: DbError }>;
    delete(): { in(col: string, vals: string[]): PromiseLike<{ error: DbError }>; eq(col: string, v: string): PromiseLike<{ error: DbError }> };
  };
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: DbError }>;
}

export class CloudError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

/** Mensagem em português para erros comuns da API (RLS, validação, limites, rede). */
export function friendlyDbError(e: { message: string; code?: string }): string {
  if (/Failed to fetch|NetworkError|Load failed|fetch failed/i.test(e.message)) return 'Sem conexão com o servidor: nada foi salvo. Tente de novo quando estiver online.';
  if (e.code === '23514' && /limite/.test(e.message)) return 'Você atingiu o limite desta conta para este tipo de item.';
  if (e.code === '23514') return 'Algum campo está fora do formato aceito (tamanho ou valor).';
  if (e.code === '23505') return 'Já existe um item com esse nome.';
  if (e.code === '23503') return 'O item relacionado não existe mais (talvez tenha sido excluído em outro aparelho).';
  if (e.code === '42501') return 'Sem permissão para esta ação. Entre de novo na sua conta.';
  if (e.code === 'PGRST301' || /JWT/i.test(e.message)) return 'Sua sessão expirou. Entre de novo na sua conta.';
  return 'O servidor recusou a operação: ' + e.message;
}

export class CloudRepo implements PersonalRepo {
  readonly space: Space;
  constructor(private db: TableClient, uid: string, email: string) {
    this.space = { kind: 'account', uid, email };
  }
  private get uid() {
    return (this.space as Extract<Space, { kind: 'account' }>).uid;
  }
  async list<K extends Kind>(kind: K): Promise<EntityMap[K][]> {
    const m = MAPPERS[kind];
    const { data, error } = await this.db.from(m.table).select('*').order('created_at', { ascending: true });
    if (error) throw new CloudError(friendlyDbError(error), error.code);
    return (data ?? []).map((r) => m.fromRow(r));
  }
  put<K extends Kind>(kind: K, e: EntityMap[K]) {
    return this.putMany(kind, [e]);
  }
  async putMany<K extends Kind>(kind: K, es: EntityMap[K][], opts?: { onlyNew?: boolean }) {
    if (!es.length) return;
    const m = MAPPERS[kind];
    const { error } = await this.db.from(m.table).upsert(es.map((e) => m.toRow(e, this.uid)), { onConflict: 'owner_id,id', ignoreDuplicates: !!opts?.onlyNew });
    if (error) throw new CloudError(friendlyDbError(error), error.code);
  }
  async remove<K extends Kind>(kind: K, ids: string[]) {
    if (!ids.length) return;
    const { error } = await this.db.from(MAPPERS[kind].table).delete().in('id', ids);
    if (error) throw new CloudError(friendlyDbError(error), error.code);
  }
  async getPages(materialId: string) {
    const { data, error } = await this.db.from('material_pages').select('page, text').eq('material_id', materialId).order('page', { ascending: true });
    if (error) throw new CloudError(friendlyDbError(error), error.code);
    return (data ?? []).map((r) => ({ page: r.page as number, text: r.text as string }));
  }
  async putPages(materialId: string, pages: PageText[]) {
    // lotes pequenos: cada requisição fica bem abaixo do limite de corpo da API; reenviar é idempotente (PK)
    for (let i = 0; i < pages.length; i += 40) {
      const rows = pages.slice(i, i + 40).map((p) => ({ owner_id: this.uid, material_id: materialId, page: p.page, text: p.text }));
      const { error } = await this.db.from('material_pages').upsert(rows, { onConflict: 'owner_id,material_id,page' });
      if (error) throw new CloudError(friendlyDbError(error), error.code);
    }
  }
  async removePages(materialId: string) {
    const { error } = await this.db.from('material_pages').delete().eq('material_id', materialId);
    if (error) throw new CloudError(friendlyDbError(error), error.code);
  }
  async setGuideSection(guideId: string, key: string, patch: Partial<GuideSection>) {
    const { error } = await this.db.rpc('set_guide_section', { p_guide: guideId, p_key: key, p_patch: patch });
    if (error) throw new CloudError(friendlyDbError(error), error.code);
  }
  /** exclusão no banco da conta: questões e guias derivados e texto no histórico (função delete_material_cascade) */
  async deleteMaterialCascade(materialId: string): Promise<{ questoes: number; guias: number }> {
    const { data, error } = await this.db.rpc('delete_material_cascade', { p_material: materialId });
    if (error) throw new CloudError(friendlyDbError(error), error.code);
    return data as { questoes: number; guias: number };
  }
}

// ---------- exclusão em cascata (mesma regra nos dois espaços) ----------

export interface DeletionPlan {
  disciplines: string[];
  topics: string[];
  /** materiais saem com páginas e arquivo (ver materials/service.deleteMaterial) */
  materials: string[];
  questions: string[];
  guides: string[];
  events: string[];
}

/**
 * O que sai junto ao excluir uma disciplina, um assunto ou um material. Mesma regra nos dois espaços:
 *  - disciplina → assuntos, materiais, questões, guias e eventos da agenda dela;
 *  - assunto → questões dele;
 *  - material → questões e guias gerados a partir dele (na conta: delete_material_cascade).
 */
export function planDeletion(
  target: { kind: 'disciplines' | 'topics' | 'materials'; id: string },
  all: { topics: PTopic[]; materials?: PMaterial[]; questions?: PQuestion[]; guides?: PGuide[]; events?: PEvent[] },
): DeletionPlan {
  const qs = all.questions ?? [];
  const gs = all.guides ?? [];
  if (target.kind === 'topics') return { disciplines: [], topics: [target.id], materials: [], questions: qs.filter((q) => q.topicId === target.id).map((q) => q.id), guides: [], events: [] };
  if (target.kind === 'materials') {
    // eventos ficam (são a agenda do estudante); o vínculo com um guia excluído aparece como "conteúdo excluído"
    return { disciplines: [], topics: [], materials: [target.id], questions: qs.filter((q) => q.materialIds.includes(target.id)).map((q) => q.id), guides: gs.filter((g) => g.materialIds.includes(target.id)).map((g) => g.id), events: [] };
  }
  return {
    disciplines: [target.id],
    topics: all.topics.filter((t) => t.disciplineId === target.id).map((t) => t.id),
    materials: (all.materials ?? []).filter((m) => m.disciplineId === target.id).map((m) => m.id),
    questions: qs.filter((q) => q.disciplineId === target.id).map((q) => q.id),
    guides: gs.filter((g) => g.disciplineId === target.id).map((g) => g.id),
    events: (all.events ?? []).filter((e) => e.disciplineId === target.id).map((e) => e.id),
  };
}

export async function executeDeletion(repo: PersonalRepo, plan: DeletionPlan) {
  // filhos antes dos pais (no banco local não há FK)
  await repo.remove('events', plan.events);
  await repo.remove('questions', plan.questions);
  await repo.remove('guides', plan.guides);
  for (const id of plan.materials) await repo.removePages(id);
  await repo.remove('materials', plan.materials);
  await repo.remove('topics', plan.topics);
  await repo.remove('disciplines', plan.disciplines);
}
