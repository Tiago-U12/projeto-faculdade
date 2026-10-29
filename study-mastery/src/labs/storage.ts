// Persistência dos laboratórios: rascunhos, tentativas e dados auxiliares no IndexedDB "study-mastery-labs", separados
// por espaço (este aparelho sem conta, ou cada conta). Ficam SÓ neste navegador: nada é enviado a servidor ou conta.
// Sem IndexedDB (navegação privada, bloqueio), tudo funciona em memória e a tela avisa que não será guardado.
import type { LabAttempt, LabDraft } from './types';

export const LABS_DB = 'study-mastery-labs';
const DB_VERSION = 1;
/** limite por rascunho: código de estudo é pequeno; protege a cota do navegador */
export const MAX_DRAFT_CHARS = 200_000;
/** tentativas guardadas por espaço (as mais antigas saem primeiro) */
export const MAX_ATTEMPTS = 2000;

export interface LabStore {
  /** false = armazenamento indisponível: os dados valem só enquanto a aba estiver aberta */
  readonly persistent: boolean;
  readonly space: string;
  getDraft(exerciseId: string): Promise<LabDraft | undefined>;
  putDraft(d: LabDraft): Promise<void>;
  deleteDraft(exerciseId: string): Promise<void>;
  listAttempts(exerciseId?: string): Promise<LabAttempt[]>;
  addAttempt(a: LabAttempt): Promise<void>;
  getMeta<T>(key: string): Promise<T | undefined>;
  setMeta(key: string, value: unknown): Promise<void>;
  /** apaga tudo deste espaço (rascunhos, tentativas, associações) */
  clear(): Promise<void>;
}

const draftSize = (d: LabDraft) => (d.sql?.length ?? 0) + Object.values(d.files ?? {}).reduce((s, f) => s + f.length, 0);

export class DraftTooLargeError extends Error {
  constructor() {
    super(`O rascunho passou de ${MAX_DRAFT_CHARS.toLocaleString('pt-BR')} caracteres e não foi salvo.`);
  }
}

const byNewest = (a: LabAttempt, b: LabAttempt) => b.finishedAt.localeCompare(a.finishedAt);

/** Armazenamento em memória (fallback e testes). */
export function memoryLabStore(space: string, persistent = false): LabStore {
  const drafts = new Map<string, LabDraft>();
  let attempts: LabAttempt[] = [];
  const meta = new Map<string, unknown>();
  const clone = <T,>(v: T): T => structuredClone(v);
  return {
    persistent,
    space,
    async getDraft(id) {
      const d = drafts.get(id);
      return d && clone(d);
    },
    async putDraft(d) {
      if (draftSize(d) > MAX_DRAFT_CHARS) throw new DraftTooLargeError();
      drafts.set(d.exerciseId, clone(d));
    },
    async deleteDraft(id) {
      drafts.delete(id);
    },
    async listAttempts(id) {
      return attempts.filter((a) => !id || a.exerciseId === id).map(clone).sort(byNewest);
    },
    async addAttempt(a) {
      attempts = [...attempts, clone(a)].sort(byNewest).slice(0, MAX_ATTEMPTS);
    },
    async getMeta<T>(key: string) {
      return meta.has(key) ? clone(meta.get(key) as T) : undefined;
    },
    async setMeta(key, value) {
      meta.set(key, clone(value));
    },
    async clear() {
      drafts.clear();
      attempts = [];
      meta.clear();
    },
  };
}

const req = <T,>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('transação cancelada'));
  });

function openDb(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = factory.open(LABS_DB, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: ['space', 'exerciseId'] });
      if (!db.objectStoreNames.contains('attempts')) db.createObjectStore('attempts', { keyPath: 'id' }).createIndex('space', 'space');
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: ['space', 'key'] });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('banco dos laboratórios bloqueado por outra aba'));
  });
}

function idbLabStore(db: IDBDatabase, space: string): LabStore {
  const strip = <T extends object>(v: T & { space?: string }): T => {
    const { space: _s, ...rest } = v;
    return rest as T;
  };
  return {
    persistent: true,
    space,
    async getDraft(id) {
      const v = await req(db.transaction('drafts').objectStore('drafts').get([space, id]));
      return v ? strip(v as LabDraft & { space: string }) : undefined;
    },
    async putDraft(d) {
      if (draftSize(d) > MAX_DRAFT_CHARS) throw new DraftTooLargeError();
      const tx = db.transaction('drafts', 'readwrite');
      tx.objectStore('drafts').put({ ...d, space });
      // pede a gravação já (sem esperar o fim da tarefa): chamado ao sair da página, garante o commit antes do descarte
      tx.commit?.();
      await done(tx);
    },
    async deleteDraft(id) {
      const tx = db.transaction('drafts', 'readwrite');
      tx.objectStore('drafts').delete([space, id]);
      await done(tx);
    },
    async listAttempts(id) {
      const all = (await req(db.transaction('attempts').objectStore('attempts').index('space').getAll(space))) as (LabAttempt & { space: string })[];
      return all.filter((a) => !id || a.exerciseId === id).map((a) => strip(a)).sort(byNewest);
    },
    async addAttempt(a) {
      const tx = db.transaction('attempts', 'readwrite');
      const store = tx.objectStore('attempts');
      store.put({ ...a, space });
      const keys = (await req(store.index('space').getAll(space))) as (LabAttempt & { space: string })[];
      if (keys.length > MAX_ATTEMPTS) for (const old of keys.sort(byNewest).slice(MAX_ATTEMPTS)) store.delete(old.id);
      await done(tx);
    },
    async getMeta<T>(key: string) {
      const v = (await req(db.transaction('meta').objectStore('meta').get([space, key]))) as { value: T } | undefined;
      return v?.value;
    },
    async setMeta(key, value) {
      const tx = db.transaction('meta', 'readwrite');
      tx.objectStore('meta').put({ space, key, value });
      await done(tx);
    },
    async clear() {
      const tx = db.transaction(['drafts', 'attempts', 'meta'], 'readwrite');
      const range = IDBKeyRange.bound([space], [space, []]);
      tx.objectStore('drafts').delete(range);
      tx.objectStore('meta').delete(range);
      const attempts = tx.objectStore('attempts');
      for (const k of (await req(attempts.index('space').getAllKeys(space))) as IDBValidKey[]) attempts.delete(k);
      await done(tx);
    },
  };
}

/** Abre o armazenamento do espaço; sem IndexedDB, devolve um armazenamento em memória (persistent = false). */
export async function openLabStore(space: string, factory: IDBFactory | null = globalThis.indexedDB ?? null): Promise<LabStore> {
  if (!factory) return memoryLabStore(space);
  try {
    return idbLabStore(await openDb(factory), space);
  } catch {
    return memoryLabStore(space);
  }
}
