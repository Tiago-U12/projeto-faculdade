// Sincronização do progresso com a conta. Regras:
//  - tentativas são imutáveis e têm ID: a união por ID nunca duplica, venha de onde vier;
//  - as estatísticas de repetição espaçada são RECALCULADAS a partir das tentativas (mesmo resultado em todo aparelho);
//  - a sessão em andamento segue "a mais recente vence" (data de atualização).
import type { Attempt, QuestionReport, QuestionStat } from '../types';
import { nextStat } from './srs';
import { MAX_ATTEMPTS, type ActiveSession, type AppState } from './storage';

export function replayStats(attempts: readonly Attempt[]): Record<string, QuestionStat> {
  const stats: Record<string, QuestionStat> = {};
  const ordered = [...attempts].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const a of ordered) {
    const at = new Date(a.date);
    for (const ans of a.answers) stats[ans.questionId] = nextStat(stats[ans.questionId], ans.correct, at);
  }
  return stats;
}

export interface RemoteProgress {
  attempts: Attempt[];
  /** sessão em andamento salva na conta; session null = encerrada/descartada em algum aparelho */
  active?: { session: ActiveSession | null; updatedAt: string } | null;
  reports?: QuestionReport[];
}

/** Quando o estado local da sessão em andamento mudou pela última vez (inclusive ao ser encerrada). */
export const localActiveStamp = (s: AppState) => (s.active ? s.active.updatedAt ?? s.active.startedAt : s.sync?.activeClearedAt ?? '');

/** Junta o que veio da conta ao estado local (do mesmo espaço de conta). Não perde nada de nenhum lado. */
export function mergeRemote(local: AppState, remote: RemoteProgress): AppState {
  const byId = new Map(local.attempts.map((a) => [a.id, a]));
  let added = 0;
  for (const a of remote.attempts) {
    if (!byId.has(a.id)) {
      byId.set(a.id, a);
      added++;
    }
  }
  const all = [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
  const pushed = new Set(local.sync?.pushed ?? []);
  for (const a of remote.attempts) pushed.add(a.id);
  let active = local.active;
  let activeClearedAt = local.sync?.activeClearedAt;
  if (remote.active && remote.active.updatedAt > localActiveStamp(local)) {
    active = remote.active.session ? { ...remote.active.session, updatedAt: remote.active.updatedAt } : undefined;
    if (!remote.active.session) activeClearedAt = remote.active.updatedAt;
  }
  const reports = [...(local.reports ?? [])];
  const knownReports = new Set(reports.map((r) => r.id));
  for (const r of remote.reports ?? []) if (!knownReports.has(r.id)) reports.push(r);
  const pushedReports = new Set(local.sync?.pushedReports ?? []);
  for (const r of remote.reports ?? []) pushedReports.add(r.id);
  return {
    ...local,
    attempts: all.slice(0, MAX_ATTEMPTS),
    // recalculadas sobre TODAS as tentativas conhecidas (a conta guarda o histórico inteiro)
    stats: added ? replayStats(all) : local.stats,
    active,
    ...(reports.length ? { reports } : {}),
    sync: { ...local.sync, pushed: [...pushed], pushedReports: [...pushedReports], pulledAt: new Date().toISOString(), ...(activeClearedAt ? { activeClearedAt } : {}) },
  };
}

export function pendingAttempts(state: AppState): Attempt[] {
  const pushed = new Set(state.sync?.pushed ?? []);
  return state.attempts.filter((a) => !pushed.has(a.id));
}

export function pendingReports(state: AppState): QuestionReport[] {
  const pushed = new Set(state.sync?.pushedReports ?? []);
  return (state.reports ?? []).filter((r) => !pushed.has(r.id));
}

export function markPushed(state: AppState, attemptIds: string[], reportIds: string[] = []): AppState {
  return {
    ...state,
    sync: {
      ...state.sync,
      pushed: [...new Set([...(state.sync?.pushed ?? []), ...attemptIds])],
      pushedReports: [...new Set([...(state.sync?.pushedReports ?? []), ...reportIds])],
    },
  };
}

// ---------- linhas do Postgres ----------

export function attemptToRow(a: Attempt, uid: string) {
  return { owner_id: uid, id: a.id, date: a.date, discipline_id: a.disciplineId, source: a.source ?? 'banco', mode: a.mode, bank_version: a.bankVersion, answers: a.answers, snapshots: a.snapshots ?? null };
}

export function attemptFromRow(r: Record<string, unknown>): Attempt {
  return {
    id: r.id as string,
    date: new Date(r.date as string).toISOString(),
    disciplineId: r.discipline_id as Attempt['disciplineId'],
    mode: r.mode as Attempt['mode'],
    bankVersion: r.bank_version as string,
    answers: r.answers as Attempt['answers'],
    ...(r.source === 'pessoal' ? { source: 'pessoal' as const, ...(r.snapshots ? { snapshots: r.snapshots as Attempt['snapshots'] } : {}) } : {}),
  };
}

export function reportToRow(r: QuestionReport, uid: string) {
  return { owner_id: uid, id: r.id, question_id: r.questionId, question_version: r.questionVersion, source: r.source, reason: r.reason, comment: r.comment, created_at: r.createdAt };
}

export function reportFromRow(r: Record<string, unknown>): QuestionReport {
  return { id: r.id as string, questionId: r.question_id as string, questionVersion: r.question_version as number, source: r.source as QuestionReport['source'], reason: r.reason as QuestionReport['reason'], comment: (r.comment as string) ?? '', createdAt: new Date(r.created_at as string).toISOString() };
}
