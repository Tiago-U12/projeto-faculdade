import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAccount } from '../account';
import { friendlyDbError } from '../personal/repo';
import { attemptFromRow, attemptToRow, localActiveStamp, pendingAttempts, pendingReports, reportFromRow, reportToRow } from '../lib/sync';
import type { ActiveSession } from '../lib/storage';
import { useStudy } from '../state';

export interface SyncStatus {
  /** sessões concluídas ainda não enviadas à conta */
  pending: number;
  syncing: boolean;
  lastSync: string | null;
  error: string | null;
  syncNow(): Promise<void>;
}

const Ctx = createContext<SyncStatus | null>(null);
/** null no espaço "neste aparelho" (sem conta) */
export const useSync = () => useContext(Ctx);

const PAGE = 1000;

/** Mantém o progresso do banco existente igual em todos os aparelhos da conta. */
export function ProgressSync({ uid, children }: { uid: string; children: ReactNode }) {
  const account = useAccount();
  const study = useStudy();
  const ref = useRef(study);
  ref.current = study;
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const pushedActive = useRef<string>('');

  const push = useCallback(async () => {
    const sb = await account.client();
    const st = ref.current.state;
    const atts = pendingAttempts(st);
    const reps = pendingReports(st);
    if (atts.length) {
      const { error: e } = await sb.from('attempts').upsert(atts.map((a) => attemptToRow(a, uid)), { onConflict: 'owner_id,id', ignoreDuplicates: true });
      if (e) throw new Error(friendlyDbError(e));
    }
    if (reps.length) {
      const { error: e } = await sb.from('question_reports').upsert(reps.map((r) => reportToRow(r, uid)), { onConflict: 'owner_id,id', ignoreDuplicates: true });
      if (e) throw new Error(friendlyDbError(e));
    }
    if (atts.length || reps.length) ref.current.markPushed(atts.map((a) => a.id), reps.map((r) => r.id));
    const stamp = localActiveStamp(st);
    if (stamp && stamp !== pushedActive.current) {
      const { error: e } = await sb.from('profiles').update({ active_session: st.active ?? null, active_updated_at: stamp }).eq('id', uid);
      if (e) throw new Error(friendlyDbError(e));
      pushedActive.current = stamp;
    }
  }, [account, uid]);

  const pull = useCallback(async () => {
    const sb = await account.client();
    const attempts = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error: e } = await sb.from('attempts').select('*').order('date', { ascending: false }).range(from, from + PAGE - 1);
      if (e) throw new Error(friendlyDbError(e));
      attempts.push(...(data ?? []).map(attemptFromRow));
      if (!data || data.length < PAGE) break;
    }
    const { data: prof, error: pe } = await sb.from('profiles').select('active_session, active_updated_at').eq('id', uid).maybeSingle();
    if (pe) throw new Error(friendlyDbError(pe));
    const { data: reps, error: re } = await sb.from('question_reports').select('*');
    if (re) throw new Error(friendlyDbError(re));
    const updatedAt = prof?.active_updated_at ? new Date(prof.active_updated_at as string).toISOString() : null;
    if (updatedAt) pushedActive.current = updatedAt;
    ref.current.applyRemote({
      attempts,
      active: updatedAt ? { session: (prof!.active_session as ActiveSession | null) ?? null, updatedAt } : null,
      reports: (reps ?? []).map(reportFromRow),
    });
  }, [account, uid]);

  const syncNow = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setSyncing(true);
    try {
      await pull();
      // deixa o React aplicar a mescla antes de calcular o que falta enviar
      await new Promise((r) => setTimeout(r, 0));
      await push();
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busy.current = false;
      setSyncing(false);
    }
  }, [pull, push]);

  useEffect(() => {
    void syncNow();
    const onOnline = () => void syncNow();
    const onVisible = () => document.visibilityState === 'visible' && void syncNow();
    addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [syncNow]);

  // envia sessões concluídas e a sessão em andamento logo depois de mudarem (com pequena espera para agrupar)
  const st = study.state;
  const pendingCount = pendingAttempts(st).length + pendingReports(st).length;
  const activeStamp = localActiveStamp(st);
  useEffect(() => {
    if (busy.current || (!pendingCount && activeStamp === pushedActive.current)) return;
    const t = setTimeout(() => {
      if (busy.current || !navigator.onLine) return;
      busy.current = true;
      push().then(() => setError(null), (e) => setError((e as Error).message)).finally(() => (busy.current = false));
    }, 1500);
    return () => clearTimeout(t);
  }, [pendingCount, activeStamp, push]);

  return <Ctx.Provider value={{ pending: pendingAttempts(st).length, syncing, lastSync: st.sync?.pulledAt ?? null, error, syncNow }}>{children}</Ctx.Provider>;
}
