// Progresso prático, separado do quiz: um laboratório concluído é evidência diferente de uma questão objetiva certa.
import type { ExerciseStatus } from './filters';
import type { LabAttempt, LabExerciseBase } from './types';

/** Para considerar a prática de um assunto consolidada: vários desafios concluídos, não só um fácil. */
export const CONSOLIDATED_MIN_PASSED = 3;

export interface LabProgress {
  /** exercícios com rascunho ou tentativa */
  started: number;
  /** exercícios aprovados ao menos uma vez */
  completed: number;
  attempts: number;
  /** minutos aproximados de prática (tempo com a página do exercício aberta e em uso) */
  practiceMinutes: number;
  byKind: Record<string, { started: number; completed: number; attempts: number }>;
  /** melhor pontuação por exercício (0–100) */
  bestScore: Record<string, number>;
  /** assuntos com prática consolidada: ≥ 3 exercícios concluídos, ao menos 1 médio ou difícil */
  consolidatedTopics: string[];
}

export function exerciseStatus(id: string, attempts: readonly LabAttempt[], startedIds: ReadonlySet<string>): ExerciseStatus {
  if (attempts.some((a) => a.exerciseId === id && a.passed)) return 'concluido';
  if (startedIds.has(id) || attempts.some((a) => a.exerciseId === id)) return 'iniciado';
  return 'novo';
}

export function summarize(exercises: readonly LabExerciseBase[], attempts: readonly LabAttempt[], startedIds: ReadonlySet<string>, practiceMs: Readonly<Record<string, number>> = {}): LabProgress {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const startedSet = new Set([...startedIds, ...attempts.map((a) => a.exerciseId)].filter((id) => byId.has(id)));
  const passed = new Set(attempts.filter((a) => a.passed && byId.has(a.exerciseId)).map((a) => a.exerciseId));
  const bestScore: Record<string, number> = {};
  for (const a of attempts) if (byId.has(a.exerciseId)) bestScore[a.exerciseId] = Math.max(bestScore[a.exerciseId] ?? 0, a.score);
  const byKind: LabProgress['byKind'] = {};
  for (const id of startedSet) {
    const e = byId.get(id)!;
    const k = (byKind[e.kind] ??= { started: 0, completed: 0, attempts: 0 });
    k.started++;
    if (passed.has(id)) k.completed++;
  }
  for (const a of attempts) if (byId.has(a.exerciseId)) byKind[byId.get(a.exerciseId)!.kind].attempts++;
  const topicPassed = new Map<string, LabExerciseBase[]>();
  for (const id of passed) for (const t of byId.get(id)!.topicIds) topicPassed.set(t, [...(topicPassed.get(t) ?? []), byId.get(id)!]);
  const consolidatedTopics = [...topicPassed].filter(([, es]) => es.length >= CONSOLIDATED_MIN_PASSED && es.some((e) => e.difficulty !== 'facil')).map(([t]) => t);
  const ms = Object.entries(practiceMs).filter(([id]) => byId.has(id)).reduce((s, [, v]) => s + v, 0);
  return {
    started: startedSet.size,
    completed: passed.size,
    attempts: attempts.filter((a) => byId.has(a.exerciseId)).length,
    practiceMinutes: Math.round(ms / 60000),
    byKind,
    bestScore,
    consolidatedTopics,
  };
}
