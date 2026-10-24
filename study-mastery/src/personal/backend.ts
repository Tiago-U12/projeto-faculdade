// Armazenamento local por coleção: IndexedDB no navegador, memória nos testes.

export interface KvBackend {
  getAll<T>(store: string): Promise<T[]>;
  get<T>(store: string, key: IDBValidKey): Promise<T | undefined>;
  put(store: string, value: unknown): Promise<void>;
  putMany(store: string, values: unknown[]): Promise<void>;
  delete(store: string, keys: IDBValidKey[]): Promise<void>;
  /** remove do store todas as chaves que começam com o prefixo (chaves compostas [prefixo, …]) */
  deleteByPrefix(store: string, prefix: string): Promise<void>;
}

/** Stores: uma por coleção (chave "id") + "pages" (chave [materialId, página]). */
export const STORES = ['disciplines', 'topics', 'materials', 'guides', 'guideSections', 'questions', 'events', 'plans'] as const;
export const DB_VERSION = 1;

export function openIdb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
      if (!db.objectStoreNames.contains('pages')) db.createObjectStore('pages', { keyPath: ['materialId', 'page'] });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Banco local bloqueado por outra aba do Study Mastery. Feche as outras abas e tente de novo.'));
  });
}

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('transação cancelada'));
  });
const result = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export function idbBackend(name: string): KvBackend {
  let dbp: Promise<IDBDatabase> | null = null;
  const db = () => (dbp ??= openIdb(name));
  return {
    async getAll<T>(store: string) {
      return (await result((await db()).transaction(store).objectStore(store).getAll())) as T[];
    },
    async get<T>(store: string, key: IDBValidKey) {
      return (await result((await db()).transaction(store).objectStore(store).get(key))) as T | undefined;
    },
    async put(store, value) {
      const tx = (await db()).transaction(store, 'readwrite');
      tx.objectStore(store).put(value);
      await done(tx);
    },
    async putMany(store, values) {
      const tx = (await db()).transaction(store, 'readwrite');
      for (const v of values) tx.objectStore(store).put(v);
      await done(tx);
    },
    async delete(store, keys) {
      const tx = (await db()).transaction(store, 'readwrite');
      for (const k of keys) tx.objectStore(store).delete(k);
      await done(tx);
    },
    async deleteByPrefix(store, prefix) {
      const tx = (await db()).transaction(store, 'readwrite');
      tx.objectStore(store).delete(IDBKeyRange.bound([prefix], [prefix, []]));
      await done(tx);
    },
  };
}

/** Backend em memória (testes e navegadores sem IndexedDB, como alguns modos privados). */
export function memoryBackend(): KvBackend {
  const data = new Map<string, Map<string, unknown>>();
  const keyOf = (store: string, v: unknown) => (store === 'pages' ? JSON.stringify([(v as { materialId: string }).materialId, (v as { page: number }).page]) : (v as { id: string }).id);
  const s = (store: string) => data.get(store) ?? data.set(store, new Map()).get(store)!;
  const clone = <T>(v: T): T => structuredClone(v);
  return {
    async getAll<T>(store: string) {
      return [...s(store).values()].map(clone) as T[];
    },
    async get<T>(store: string, key: IDBValidKey) {
      const v = s(store).get(Array.isArray(key) ? JSON.stringify(key) : String(key));
      return v === undefined ? undefined : (clone(v) as T);
    },
    async put(store, value) {
      s(store).set(keyOf(store, value), clone(value));
    },
    async putMany(store, values) {
      for (const v of values) s(store).set(keyOf(store, v), clone(v));
    },
    async delete(store, keys) {
      for (const k of keys) s(store).delete(Array.isArray(k) ? JSON.stringify(k) : String(k));
    },
    async deleteByPrefix(store, prefix) {
      for (const k of [...s(store).keys()]) if (k.startsWith(JSON.stringify([prefix]).slice(0, -1) + ',')) s(store).delete(k);
    },
  };
}
