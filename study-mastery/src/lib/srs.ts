import type { QuestionStat } from '../types';

/** Intervalos (dias) por caixa de Leitner. Caixa 0 = errada: volta a ser devida imediatamente. */
export const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];
const DAY = 24 * 60 * 60 * 1000;

export function nextStat(prev: QuestionStat | undefined, correct: boolean, now: Date): QuestionStat {
  const box = correct ? Math.min((prev?.box ?? 0) + 1, BOX_INTERVAL_DAYS.length - 1) : 0;
  const days = BOX_INTERVAL_DAYS[correct ? box : 0];
  return {
    seen: (prev?.seen ?? 0) + 1,
    correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
    lastSeen: now.toISOString(),
    lastCorrect: correct,
    box,
    due: new Date(now.getTime() + days * DAY).toISOString(),
  };
}

export function isDue(stat: QuestionStat | undefined, now: Date): boolean {
  return !!stat && new Date(stat.due).getTime() <= now.getTime();
}

/** Precisão por assunto, a partir das estatísticas por questão. */
export function topicAccuracy(
  stats: Record<string, QuestionStat>,
  topicOf: (questionId: string) => string | undefined,
): Map<string, { seen: number; correct: number }> {
  const m = new Map<string, { seen: number; correct: number }>();
  for (const [qid, s] of Object.entries(stats)) {
    const t = topicOf(qid);
    if (!t) continue;
    const cur = m.get(t) ?? { seen: 0, correct: 0 };
    cur.seen += s.seen;
    cur.correct += s.correct;
    m.set(t, cur);
  }
  return m;
}
