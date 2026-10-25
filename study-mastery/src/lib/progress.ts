// Progresso: separa ATIVIDADE (o que foi feito), DESEMPENHO (acertos no questionário) e EVIDÊNCIA (se há respostas
// suficientes para alguma conclusão). Nada aqui declara domínio de um assunto.
import { eventDay, isOverdue } from '../calendar/plan';
import { daysBetween, instantToZoned, startOfWeek, todayIn, type YMD } from '../calendar/time';
import type { PEvent } from '../personal/types';
import type { Attempt } from '../types';

/** Abaixo disso, acerto/erro de um assunto não sustenta conclusão. */
export const MIN_ANSWERS = 5;

export type Evidence = 'insuficiente' | 'uma_sessao' | 'varias_sessoes';

export interface TopicProgress {
  answered: number;
  correct: number;
  sessions: number;
  distinct: number;
  rate: number | null;
  evidence: Evidence;
}

export function topicProgress(attempts: readonly Attempt[], disciplineId: string, topicIds: readonly string[]): Map<string, TopicProgress> {
  const acc = new Map(topicIds.map((t) => [t, { answered: 0, correct: 0, sessions: new Set<string>(), qs: new Set<string>() }]));
  for (const a of attempts) {
    if (a.disciplineId !== disciplineId) continue;
    for (const x of a.answers) {
      const c = acc.get(x.topicId);
      if (!c || x.chosenOptionId === null) continue;
      c.answered++;
      if (x.correct) c.correct++;
      c.sessions.add(a.id);
      c.qs.add(x.questionId);
    }
  }
  const out = new Map<string, TopicProgress>();
  for (const [t, c] of acc) {
    out.set(t, {
      answered: c.answered, correct: c.correct, sessions: c.sessions.size, distinct: c.qs.size,
      rate: c.answered ? Math.round((100 * c.correct) / c.answered) : null,
      evidence: c.answered < MIN_ANSWERS ? 'insuficiente' : c.sessions.size < 2 ? 'uma_sessao' : 'varias_sessoes',
    });
  }
  return out;
}

export function evidenceText(p: TopicProgress): string {
  if (!p.answered) return 'Ainda sem respostas';
  if (p.evidence === 'insuficiente') return `Poucas respostas (${p.answered}): ainda sem conclusão`;
  if (p.evidence === 'uma_sessao') return `${p.answered} respostas em 1 sessão: repita em outro dia para confirmar`;
  return `${p.answered} respostas em ${p.sessions} sessões`;
}

export interface WeekPoint {
  weekStart: YMD;
  answered: number;
  correct: number;
  sessions: number;
}

/** Acertos por semana (domingo a sábado no fuso escolhido), só semanas com respostas, das mais antigas às recentes. */
export function weekly(attempts: readonly Attempt[], disciplineId: string, tz: string, maxWeeks = 8): WeekPoint[] {
  const m = new Map<YMD, WeekPoint>();
  for (const a of attempts) {
    if (a.disciplineId !== disciplineId) continue;
    const answered = a.answers.filter((x) => x.chosenOptionId !== null);
    if (!answered.length) continue;
    const w = startOfWeek(instantToZoned(Date.parse(a.date), tz).date);
    const p = m.get(w) ?? { weekStart: w, answered: 0, correct: 0, sessions: 0 };
    p.answered += answered.length;
    p.correct += answered.filter((x) => x.correct).length;
    p.sessions++;
    m.set(w, p);
  }
  return [...m.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart)).slice(-maxWeeks);
}

/** Provas agendadas nos próximos dias (inclui hoje), mais próximas primeiro. */
export function upcomingExams(events: readonly PEvent[], now: number, tz: string, days = 60): { event: PEvent; date: YMD; daysLeft: number }[] {
  const today = todayIn(tz, now);
  return events
    .filter((e) => e.type === 'prova' && e.status === 'agendado')
    .map((e) => ({ event: e, date: eventDay(e, tz), daysLeft: daysBetween(today, eventDay(e, tz)) }))
    .filter((x) => x.daysLeft >= 0 && x.daysLeft <= days)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Pendências: atrasados (não concluídos) e o que está marcado para hoje. */
export function pendingActivities(events: readonly PEvent[], now: number, tz: string): { overdue: PEvent[]; today: PEvent[] } {
  const today = todayIn(tz, now);
  return {
    overdue: events.filter((e) => isOverdue(e, now, tz)),
    today: events.filter((e) => e.status === 'agendado' && !isOverdue(e, now, tz) && eventDay(e, tz) === today && e.type !== 'prova'),
  };
}
