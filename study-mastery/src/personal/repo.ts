// Repositório dos dados pessoais com duas implementações de mesma interface:
//  - LocalRepo: "neste aparelho" (IndexedDB), sem conta;
//  - CloudRepo: "conta" (Supabase). Toda autorização é do banco (RLS por owner_id); o cliente só envia o JWT.
import type { KvBackend } from './backend';
import type { EntityMap, Kind, PDiscipline, PTopic } from './types';

export type Space = { kind: 'device' } | { kind: 'account'; uid: string; email: string };

export interface PersonalRepo {
  readonly space: Space;
  list<K extends Kind>(kind: K): Promise<EntityMap[K][]>;
  put<K extends Kind>(kind: K, e: EntityMap[K]): Promise<void>;
  /** onlyNew: não sobrescreve o que já existe com o mesmo ID (importação) */
  putMany<K extends Kind>(kind: K, es: EntityMap[K][], opts?: { onlyNew?: boolean }): Promise<void>;
  remove<K extends Kind>(kind: K, ids: string[]): Promise<void>;
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
  topics: {
    table: 'topics',
    toRow: (e: PTopic, uid) => ({ owner_id: uid, id: e.id, discipline_id: e.disciplineId, name: e.name, position: e.position, origin: e.origin, created_at: e.createdAt, updated_at: e.updatedAt }),
    fromRow: (r) => ({ ...common(r), disciplineId: r.discipline_id as string, name: r.name as string, position: r.position as number, origin: r.origin as PTopic['origin'] }),
  },
};

/** Parte do supabase-js usada aqui (permite testar o mapeamento sem rede). */
export interface TableClient {
  from(table: string): {
    select(cols: string): { order(col: string, o: { ascending: boolean }): PromiseLike<{ data: Row[] | null; error: { message: string; code?: string } | null }> };
    upsert(rows: Row[], o: { onConflict: string; ignoreDuplicates?: boolean }): PromiseLike<{ error: { message: string; code?: string } | null }>;
    delete(): { in(col: string, vals: string[]): PromiseLike<{ error: { message: string; code?: string } | null }> };
  };
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
}

// ---------- exclusão em cascata (mesma regra nos dois espaços) ----------

export interface DeletionPlan {
  disciplines: string[];
  topics: string[];
}

/** O que sai junto ao excluir uma disciplina ou um assunto. No banco da conta as FKs fazem o mesmo. */
export function planDeletion(target: { kind: 'disciplines' | 'topics'; id: string }, all: { topics: PTopic[] }): DeletionPlan {
  if (target.kind === 'topics') return { disciplines: [], topics: [target.id] };
  return { disciplines: [target.id], topics: all.topics.filter((t) => t.disciplineId === target.id).map((t) => t.id) };
}

export async function executeDeletion(repo: PersonalRepo, plan: DeletionPlan) {
  // filhos antes dos pais (no banco local não há FK)
  await repo.remove('topics', plan.topics);
  await repo.remove('disciplines', plan.disciplines);
}
