// Progresso: atividade × desempenho × evidência; semanas; próximas provas e pendências.
import { describe, expect, it } from 'vitest';
import { zonedToInstant } from '../../calendar/time';
import type { PEvent } from '../../personal/types';
import type { Attempt } from '../../types';
import { evidenceText, pendingActivities, topicProgress, upcomingExams, weekly } from '../progress';

const TZ = 'America/Sao_Paulo';
const ans = (topicId: string, correct: boolean, questionId = Math.random().toString(36)) => ({ questionId, topicId, difficulty: 'medio' as const, chosenOptionId: (correct ? 'a' : 'b') as string | null, correct });
const att = (id: string, date: string, answers: ReturnType<typeof ans>[], disciplineId = 'd1'): Attempt => ({ id, date, disciplineId: disciplineId as Attempt['disciplineId'], mode: 'aprender', bankVersion: 'pessoal', answers });

describe('progresso por assunto', () => {
  it('uma resposta certa não vira conclusão; evidência pede volume e mais de uma sessão', () => {
    const p = topicProgress([att('a1', '2026-10-20T12:00:00Z', [ans('t1', true)])], 'd1', ['t1', 't2']);
    expect(p.get('t1')).toMatchObject({ answered: 1, rate: 100, evidence: 'insuficiente' });
    expect(evidenceText(p.get('t1')!)).toMatch(/Poucas respostas \(1\): ainda sem conclusão/);
    expect(evidenceText(p.get('t2')!)).toBe('Ainda sem respostas');
    const many = Array.from({ length: 6 }, () => ans('t1', true));
    expect(topicProgress([att('a1', '2026-10-20T12:00:00Z', many)], 'd1', ['t1']).get('t1')!.evidence).toBe('uma_sessao');
    const two = topicProgress([att('a1', '2026-10-20T12:00:00Z', many.slice(0, 3)), att('a2', '2026-10-22T12:00:00Z', many.slice(3))], 'd1', ['t1']).get('t1')!;
    expect(two).toMatchObject({ evidence: 'varias_sessoes', sessions: 2 });
    expect(evidenceText(two)).not.toMatch(/domin/i);
  });

  it('separa disciplinas (histórico pessoal e banco não se misturam) e ignora questões puladas', () => {
    const p = topicProgress([att('a1', '2026-10-20T12:00:00Z', [ans('t1', true), { ...ans('t1', false), chosenOptionId: null }]), att('b1', '2026-10-20T12:00:00Z', [ans('t1', false)], 'calculo2')], 'd1', ['t1']);
    expect(p.get('t1')).toMatchObject({ answered: 1, correct: 1 });
  });
});

describe('evolução por semana', () => {
  it('agrupa por semana no fuso escolhido (domingo 00:30 em SP ainda é a semana anterior em UTC−3)', () => {
    const w = weekly([att('a1', '2026-10-18T02:30:00Z', [ans('t1', true)]), att('a2', '2026-10-19T12:00:00Z', [ans('t1', false), ans('t1', true)]), att('a3', '2026-10-05T12:00:00Z', [ans('t1', true)])], 'd1', TZ);
    expect(w.map((x) => x.weekStart)).toEqual(['2026-10-04', '2026-10-11', '2026-10-18']);
    expect(w[2]).toMatchObject({ answered: 2, correct: 1, sessions: 1 });
  });
});

describe('agenda no progresso', () => {
  const T = '2026-10-24T13:00:00.000Z';
  const NOW = zonedToInstant('2026-10-24', '10:00', TZ);
  const ev = (o: Partial<PEvent>): PEvent => ({ id: Math.random().toString(36), disciplineId: 'd1', type: 'estudo', title: 'x', status: 'agendado', allDay: true, date: '2026-10-24', timeZone: TZ, topicIds: [], notes: '', createdAt: T, updatedAt: T, ...o });
  it('próximas provas com dias restantes; canceladas e passadas ficam de fora', () => {
    const r = upcomingExams([ev({ type: 'prova', date: '2026-11-03', title: 'P2' }), ev({ type: 'prova', date: '2026-10-26', title: 'P1' }), ev({ type: 'prova', date: '2026-10-20' }), ev({ type: 'prova', date: '2026-10-30', status: 'cancelado' })], NOW, TZ);
    expect(r.map((x) => [x.event.title, x.daysLeft])).toEqual([['P1', 2], ['P2', 10]]);
  });
  it('pendências: atrasados e o que é de hoje', () => {
    const late = ev({ allDay: false, date: undefined, start: new Date(zonedToInstant('2026-10-23', '19:00', TZ)).toISOString(), durationMin: 50 });
    const today = ev({ allDay: false, date: undefined, start: new Date(zonedToInstant('2026-10-24', '19:00', TZ)).toISOString() });
    const done = ev({ status: 'concluido', date: '2026-10-22' });
    const r = pendingActivities([late, today, done], NOW, TZ);
    expect(r.overdue).toEqual([late]);
    expect(r.today).toEqual([today]);
  });
});
