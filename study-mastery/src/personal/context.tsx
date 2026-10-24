import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { KvBackend } from './backend';
import type { PersonalRepo, Space } from './repo';
import type { EntityMap, Kind } from './types';

type Cache = { [K in Kind]?: EntityMap[K][] };

export interface Personal {
  repo: PersonalRepo;
  space: Space;
  /** coleção carregada (undefined enquanto carrega) */
  items<K extends Kind>(kind: K): EntityMap[K][] | undefined;
  load(kind: Kind): Promise<void>;
  error: string | null;
  clearError(): void;
  /** grava e atualiza a tela; lança erro com mensagem em português */
  save<K extends Kind>(kind: K, es: EntityMap[K] | EntityMap[K][]): Promise<void>;
  removeIds<K extends Kind>(kind: K, ids: string[]): Promise<void>;
  /** backend local (só no espaço do aparelho), para textos de materiais */
  kv?: KvBackend;
}

const Ctx = createContext<Personal | null>(null);
export const usePersonal = (): Personal => {
  const p = useContext(Ctx);
  if (!p) throw new Error('usePersonal fora do PersonalProvider');
  return p;
};

/** Carrega uma coleção do espaço atual e devolve os itens (re-renderiza quando mudam). */
export function useCollection<K extends Kind>(kind: K): { items: EntityMap[K][]; loading: boolean } {
  const p = usePersonal();
  const items = p.items(kind);
  useEffect(() => {
    if (!items) void p.load(kind);
  }, [items, kind, p]);
  return { items: items ?? [], loading: !items };
}

export function PersonalProvider({ repo, kv, children }: { repo: PersonalRepo; kv?: KvBackend; children: ReactNode }) {
  const [cache, setCache] = useState<Cache>({});
  const [error, setError] = useState<string | null>(null);
  const loading = useRef(new Set<Kind>());

  const load = useCallback(
    async (kind: Kind) => {
      if (loading.current.has(kind)) return;
      loading.current.add(kind);
      try {
        const list = await repo.list(kind);
        setCache((c) => ({ ...c, [kind]: list }));
      } catch (e) {
        setError((e as Error).message);
        setCache((c) => ({ ...c, [kind]: c[kind] ?? [] }));
      } finally {
        loading.current.delete(kind);
      }
    },
    [repo],
  );

  const value = useMemo<Personal>(
    () => ({
      repo,
      space: repo.space,
      kv,
      items: <K extends Kind>(kind: K) => cache[kind] as EntityMap[K][] | undefined,
      load,
      error,
      clearError: () => setError(null),
      async save(kind, es) {
        const list = Array.isArray(es) ? es : [es];
        await repo.putMany(kind, list);
        setCache((c) => {
          const cur = (c[kind] ?? []) as { id: string }[];
          const ids = new Set(list.map((e) => e.id));
          return { ...c, [kind]: [...cur.filter((x) => !ids.has(x.id)), ...list] };
        });
      },
      async removeIds(kind, ids) {
        await repo.remove(kind, ids);
        const gone = new Set(ids);
        setCache((c) => ({ ...c, [kind]: ((c[kind] ?? []) as { id: string }[]).filter((x) => !gone.has(x.id)) }));
      },
    }),
    [repo, kv, cache, load, error],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
