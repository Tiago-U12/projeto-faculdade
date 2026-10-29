// Ligações dos laboratórios com o app: armazenamento por espaço, contexto de filtro (disciplinas do banco e associações
// de assuntos pessoais) e progresso.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePersonalOptional } from '../personal/context';
import { useStudy } from '../state';
import type { LabContext } from './filters';
import { openLabStore, type LabStore } from './storage';
import type { LabAttempt } from './types';

/** chave do espaço: os dados de laboratório de uma conta não se misturam com os do aparelho nem de outra conta */
export function useSpaceKey(): string {
  const p = usePersonalOptional();
  return p?.space.kind === 'account' ? `u:${p.space.uid}` : 'device';
}

const stores = new Map<string, Promise<LabStore>>();
/** Um armazenamento por espaço, aberto uma vez (permite injetar nos testes). */
export function labStoreFor(space: string, open: (s: string) => Promise<LabStore> = openLabStore): Promise<LabStore> {
  let s = stores.get(space);
  if (!s) stores.set(space, (s = open(space)));
  return s;
}
export function resetLabStores() {
  stores.clear();
}

export function useLabStore(): LabStore | null {
  const space = useSpaceKey();
  const [store, setStore] = useState<LabStore | null>(null);
  useEffect(() => {
    let live = true;
    setStore(null);
    void labStoreFor(space).then((s) => live && setStore(s));
    return () => {
      live = false;
    };
  }, [space]);
  return store;
}

export const ASSOC_KEY = 'assoc';
export const STARTED_KEY = 'started';
export const PRACTICE_KEY = 'practiceMs';
export const SESSION_KEY = 'session';

export type Associations = Record<string, string[]>;

/** Associações explícitas assunto pessoal → capacidades (salvas só neste aparelho, no espaço atual). */
export function useAssociations(store: LabStore | null): { assoc: Associations; setTopic(topicId: string, skills: string[]): Promise<void>; ready: boolean } {
  const [assoc, setAssoc] = useState<Associations | null>(null);
  useEffect(() => {
    if (!store) return;
    let live = true;
    void store.getMeta<Associations>(ASSOC_KEY).then((a) => live && setAssoc(a ?? {}));
    return () => {
      live = false;
    };
  }, [store]);
  const setTopic = useCallback(
    async (topicId: string, skills: string[]) => {
      if (!store) return;
      const cur = (await store.getMeta<Associations>(ASSOC_KEY)) ?? {};
      const next = { ...cur, [topicId]: skills };
      if (!skills.length) delete next[topicId];
      await store.setMeta(ASSOC_KEY, next);
      setAssoc(next);
    },
    [store],
  );
  return { assoc: assoc ?? {}, setTopic, ready: !!assoc };
}

/** Contexto dos filtros: quais disciplinas são do banco e as associações de assuntos pessoais. */
export function useLabContext(assoc: Associations): LabContext {
  const { bank } = useStudy();
  return useMemo(() => ({ bankDisciplineIds: new Set(bank.taxonomy.disciplines.map((d) => d.id)), topicSkills: assoc }), [bank, assoc]);
}

export interface LabActivity {
  attempts: LabAttempt[];
  started: Set<string>;
  practiceMs: Record<string, number>;
  ready: boolean;
  reload(): void;
}

/** Tentativas, exercícios iniciados e tempo de prática do espaço atual. */
export function useLabActivity(store: LabStore | null): LabActivity {
  const [data, setData] = useState<{ attempts: LabAttempt[]; started: Set<string>; practiceMs: Record<string, number> } | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!store) return;
    let live = true;
    void Promise.all([store.listAttempts(), store.getMeta<string[]>(STARTED_KEY), store.getMeta<Record<string, number>>(PRACTICE_KEY)]).then(
      ([attempts, started, practiceMs]) => live && setData({ attempts, started: new Set(started ?? []), practiceMs: practiceMs ?? {} }),
    );
    return () => {
      live = false;
    };
  }, [store, tick]);
  return { attempts: data?.attempts ?? [], started: data?.started ?? new Set(), practiceMs: data?.practiceMs ?? {}, ready: !!data, reload: () => setTick((t) => t + 1) };
}
