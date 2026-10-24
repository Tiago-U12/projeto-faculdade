import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AnswerRecord, Attempt, DisciplineId, QuestionReport, SessionConfig } from './types';
import type { Bank } from './lib/bank';
import { buildSession, eligible, type Session } from './lib/engine';
import { randomSeed } from './lib/rng';
import { browserStore, emptyState, exportState, importState, loadState, recordAttempt, saveState, STATE_KEY, type ActiveSession, type AppState, type ImportResult, type KeyValueStore, type Settings } from './lib/storage';
import { markPushed, mergeRemote, type RemoteProgress } from './lib/sync';

export interface Study {
  bank: Bank;
  state: AppState;
  persisted: boolean;
  updateSettings(patch: Partial<Settings>): void;
  /** monta uma sessão a partir da configuração; devolve null se não houver questões elegíveis */
  start(config: SessionConfig, onlyIds?: string[]): Session | null;
  answer(questionId: string, optionId: string): void;
  goTo(index: number): void;
  finish(opts?: { onlyAnswered?: boolean }): Attempt | null;
  abandon(): void;
  /** guarda um relato de erro no espaço atual (aparelho ou conta) */
  report(r: Omit<QuestionReport, 'id' | 'createdAt'>): QuestionReport;
  exportJson(): string;
  importJson(text: string, mode: 'merge' | 'replace'): ImportResult;
  clearAll(): void;
  /** conta: junta o progresso vindo do servidor (sem duplicar) */
  applyRemote(remote: RemoteProgress): void;
  /** conta: registra o que o servidor já recebeu */
  markPushed(attemptIds: string[], reportIds?: string[]): void;
}

const Ctx = createContext<Study | null>(null);
export const useStudy = (): Study => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStudy fora do StudyProvider');
  return s;
};

export function StudyProvider({ bank, store, stateKey = STATE_KEY, initialSettings, account = false, children }: { bank: Bank; store?: KeyValueStore | null; stateKey?: string; initialSettings?: Settings; account?: boolean; children: ReactNode }) {
  const storeRef = useRef<KeyValueStore | null>(store === undefined ? browserStore() : store);
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadState(storeRef.current, stateKey);
    // primeira vez desta conta neste aparelho: herda tema e última configuração, nada de progresso
    if (account && !loaded.sync) return { ...loaded, settings: loaded.attempts.length ? loaded.settings : { ...loaded.settings, ...initialSettings }, sync: {} };
    return loaded;
  });
  const [persisted, setPersisted] = useState(!!storeRef.current);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setPersisted(storeRef.current ? saveState(storeRef.current, state, stateKey) : false);
  }, [state, stateKey]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState((s) => fn(s)), []);

  const value = useMemo<Study>(
    () => ({
      bank,
      state,
      persisted,
      updateSettings: (patch) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      start(config, onlyIds) {
        let pool = eligible(bank.questions, config);
        if (onlyIds) {
          const ids = new Set(onlyIds);
          pool = pool.filter((q) => ids.has(q.id));
        }
        if (!pool.length) return null;
        if (stateRef.current.active && !window.confirm('Substituir a sessão em andamento? As respostas não concluídas serão descartadas.')) return null;
        const session = buildSession(pool, config, { stats: stateRef.current.stats }, randomSeed());
        const now = new Date().toISOString();
        const active: ActiveSession = { session, answers: {}, index: 0, startedAt: now, updatedAt: now };
        update((s) => ({ ...s, active, settings: { ...s.settings, lastConfig: config } }));
        return session;
      },
      answer: (questionId, optionId) =>
        update((s) => {
          if (!s.active) return s;
          const locked = s.active.session.config.mode !== 'simulado' && s.active.answers[questionId] !== undefined;
          if (locked) return s;
          return { ...s, active: { ...s.active, answers: { ...s.active.answers, [questionId]: optionId }, updatedAt: new Date().toISOString() } };
        }),
      goTo: (index) => update((s) => (s.active ? { ...s, active: { ...s.active, index: Math.max(0, Math.min(index, s.active.session.items.length - 1)), updatedAt: new Date().toISOString() } } : s)),
      finish(opts) {
        const s = stateRef.current;
        if (!s.active) return null;
        const { session, answers } = s.active;
        const records: AnswerRecord[] = [];
        for (const item of session.items) {
          const q = bank.byId.get(item.questionId);
          if (!q) continue;
          const chosen = answers[q.id] ?? null;
          if (opts?.onlyAnswered && chosen === null) continue;
          records.push({ questionId: q.id, topicId: q.topicId, difficulty: q.difficulty, chosenOptionId: chosen, correct: chosen === q.correctOptionId });
        }
        const next = recordAttempt(s, { attemptId: crypto.randomUUID(), disciplineId: session.config.disciplineId, mode: session.config.mode, bankVersion: bank.manifest.bankVersion, answers: records, now: new Date() });
        stateRef.current = next;
        setState(next);
        return next.attempts[0];
      },
      abandon: () => update((s) => ({ ...s, active: undefined, ...(s.sync ? { sync: { ...s.sync, activeClearedAt: new Date().toISOString() } } : {}) })),
      applyRemote: (remote) => update((s) => mergeRemote(s, remote)),
      markPushed: (ids, reportIds) => update((s) => markPushed(s, ids, reportIds)),
      report(r) {
        const rec: QuestionReport = { ...r, comment: r.comment.slice(0, 1000), id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        update((s) => ({ ...s, reports: [rec, ...(s.reports ?? [])].slice(0, 200) }));
        return rec;
      },
      exportJson: () => exportState(stateRef.current),
      importJson(text, mode) {
        const r = importState(stateRef.current, text, mode);
        if (r.ok) setState(r.state);
        return r;
      },
      clearAll: () => setState(account ? { ...emptyState(), sync: {} } : emptyState()),
    }),
    [bank, state, persisted, update, account],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActive(): { active: ActiveSession; config: SessionConfig } | null {
  const { state } = useStudy();
  return state.active ? { active: state.active, config: state.active.session.config } : null;
}

export type { DisciplineId };
