// Planejamento até a prova e sessões perdidas: regras conferíveis (datas, disponibilidade, conflitos, falta de tempo).
import { describe, expect, it } from 'vitest';
import type { PEvent } from '../../personal/types';
import { buildPlan, busyFrom, checkPlan, eventDay, isOverdue, suggestReschedule, topicLevel, type PlanInput } from '../plan';
import { instantToZoned, weekday, zonedToInstant } from '../time';

const TZ = 'America/Sao_Paulo';
const NOW = zonedToInstant('2026-10-24', '10:00', TZ); // sábado
const T = '2026-10-24T13:00:00.000Z';
const ev = (o: Partial<PEvent>): PEvent => ({ id: Math.random().toString(36).slice(2), disciplineId: 'd1', type: 'estudo', title: 'Evento', status: 'agendado', allDay: false, timeZone: TZ, topicIds: [], notes: '', createdAt: T, updatedAt: T, ...o });
const at = (d: string, h: string) => new Date(zonedToInstant(d, h, TZ)).toISOString();
const topics = [{ id: 't1', name: 'Integrais' }, { id: 't2', name: 'Séries' }, { id: 't3', name: 'EDO' }];
const base = (o: Partial<PlanInput> = {}): PlanInput => ({
  examDate: '2026-11-07', topics, availability: { weekdays: [1, 2, 3, 4, 5], windowStart: '19:00', windowEnd: '22:00', minutesPerDay: 120 }, sessionMin: 50,
  now: NOW, timeZone: TZ, busy: [], performance: {}, disciplineName: 'Cálculo', ...o,
});

describe('planejamento', () => {
  it('cabe: distribui estudo, exercícios, revisões e simulado; tudo antes da prova e dentro da disponibilidade', () => {
    const i = base();
    const r = buildPlan(i);
    expect(r.errors).toEqual([]);
    expect(r.unplaced).toEqual([]);
    expect(checkPlan(r.sessions, i)).toEqual([]);
    const kinds = r.sessions.map((s) => s.activity);
    expect(kinds.filter((k) => k === 'estudo')).toHaveLength(3);
    expect(kinds.filter((k) => k === 'revisao')).toHaveLength(3);
    expect(kinds.at(-1)).toBe('simulado');
    expect(r.sessions.every((s) => s.date < '2026-11-07' && [1, 2, 3, 4, 5].includes(weekday(s.date)))).toBe(true);
    // revisão de um assunto vem depois do estudo dele
    for (const t of topics) {
      const st = r.sessions.findIndex((s) => s.activity === 'estudo' && s.topicIds[0] === t.id);
      const rv = r.sessions.findIndex((s) => s.activity === 'revisao' && s.topicIds[0] === t.id);
      expect(rv).toBeGreaterThan(st);
    }
    // não preenche a agenda inteira
    expect(r.freeSlots).toBeGreaterThan(0);
  });

  it('nunca marca preparação no dia da prova ou depois, nem no passado', () => {
    const r = buildPlan(base({ examDate: '2026-10-27' }));
    expect(r.sessions.every((s) => s.date < '2026-10-27')).toBe(true);
    expect(r.sessions.every((s) => zonedToInstant(s.date, s.start, TZ) > NOW)).toBe(true);
    expect(buildPlan(base({ examDate: '2026-10-24' })).errors[0]).toMatch(/depois de hoje/);
  });

  it('evita conflitos conhecidos e diz quais foram evitados', () => {
    const aula = ev({ title: 'Aula de Física', start: at('2026-10-26', '19:00'), durationMin: 90 });
    const i = base({ busy: busyFrom([aula]) });
    const r = buildPlan(i);
    expect(checkPlan(r.sessions, i)).toEqual([]);
    expect(r.conflictsAvoided).toEqual(['Aula de Física']);
    const monday = r.sessions.filter((s) => s.date === '2026-10-26');
    expect(monday.every((s) => s.start >= '20:30')).toBe(true);
  });

  it('tempo insuficiente: avisa com números, lista o que ficou de fora e não espreme sessões', () => {
    const i = base({ examDate: '2026-10-28', availability: { weekdays: [1, 2], windowStart: '19:00', windowEnd: '20:00', minutesPerDay: 50 } });
    const r = buildPlan(i);
    expect(r.sessions).toHaveLength(2);
    expect(r.unplaced.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toMatch(/Tempo insuficiente.*2 horários livres.*Ficaram de fora/);
    expect(checkPlan(r.sessions, i)).toEqual([]);
    // prioridade: primeiro o estudo dos assuntos
    expect(r.sessions.map((s) => s.activity)).toEqual(['estudo', 'estudo']);
  });

  it('considera dificuldades observadas, mas só com evidência (uma resposta não decide nada)', () => {
    expect(topicLevel({ answered: 1, correct: 0 })).toBe('sem_dados');
    expect(topicLevel({ answered: 10, correct: 4 })).toBe('fraco');
    expect(topicLevel({ answered: 10, correct: 9 })).toBe('forte');
    const r = buildPlan(base({ performance: { t2: { answered: 10, correct: 3 }, t3: { answered: 12, correct: 11 } } }));
    const ex = (id: string) => r.sessions.filter((s) => s.activity === 'exercicios' && s.topicIds[0] === id).length;
    expect(ex('t2')).toBe(2);
    expect(ex('t1')).toBe(1);
    expect(ex('t3')).toBe(0);
    expect(r.sessions[0].topicIds).toEqual(['t2']); // o assunto mais fraco vem primeiro
    expect(r.warnings.join(' ')).toMatch(/Mais exercícios para: Séries/);
  });

  it('respeita o tempo por dia e a duração escolhida (sessões não dependem de nº fixo de questões)', () => {
    const i = base({ sessionMin: 30, availability: { weekdays: [0, 1, 2, 3, 4, 5, 6], windowStart: '08:00', windowEnd: '22:00', minutesPerDay: 60 } });
    const r = buildPlan(i);
    expect(checkPlan(r.sessions, i)).toEqual([]);
    expect(r.sessions.every((s) => s.durationMin === 30)).toBe(true);
  });

  it('a conferência acusa um plano adulterado (depois da prova, conflito, excesso no dia)', () => {
    const aula = ev({ title: 'Aula', start: at('2026-10-26', '19:00'), durationMin: 60 });
    const i = base({ busy: busyFrom([aula]) });
    const bad = [
      { activity: 'estudo' as const, topicIds: ['t1'], title: 'A', date: '2026-11-07', start: '19:00', durationMin: 50 },
      { activity: 'estudo' as const, topicIds: ['t1'], title: 'B', date: '2026-10-26', start: '19:00', durationMin: 50 },
      { activity: 'estudo' as const, topicIds: ['t1'], title: 'C', date: '2026-10-27', start: '19:00', durationMin: 50 },
      { activity: 'estudo' as const, topicIds: ['t1'], title: 'D', date: '2026-10-27', start: '20:00', durationMin: 50 },
      { activity: 'estudo' as const, topicIds: ['t1'], title: 'E', date: '2026-10-27', start: '21:00', durationMin: 50 },
    ];
    const p = checkPlan(bad, i).join(' | ');
    expect(p).toMatch(/A em .* dia da prova ou depois/);
    expect(p).toMatch(/B conflita com Aula/);
    expect(p).toMatch(/passa do tempo por dia/);
  });
});

describe('agenda: atraso e sessão perdida', () => {
  it('evento vencido fica "atrasado", nunca concluído automaticamente', () => {
    const e = ev({ start: at('2026-10-23', '19:00'), durationMin: 50 });
    expect(isOverdue(e, NOW, TZ)).toBe(true);
    expect(e.status).toBe('agendado');
    expect(isOverdue({ ...e, status: 'concluido' }, NOW, TZ)).toBe(false);
    expect(isOverdue(ev({ allDay: true, date: '2026-10-24' }), NOW, TZ)).toBe(false); // o dia ainda não acabou
    expect(isOverdue(ev({ allDay: true, date: '2026-10-23' }), NOW, TZ)).toBe(true);
  });

  it('sugere o próximo horário livre dentro do planejamento, antes da prova, preservando compromissos fixos', () => {
    const plan = { id: 'p1', examDate: '2026-10-30', weekdays: [1, 2, 3], windowStart: '19:00', windowEnd: '21:00', minutesPerDay: 100 };
    const missed = ev({ title: 'Estudo: Integrais', start: at('2026-10-23', '19:00'), durationMin: 50, plan });
    const prova = ev({ type: 'prova', title: 'Prova de Física', start: at('2026-10-26', '19:00'), durationMin: 120 });
    const r = suggestReschedule(missed, [missed, prova], NOW, TZ);
    expect(r.suggestion).toMatchObject({ date: '2026-10-27', start: '19:00' });
    expect(r.suggestion!.impact).toMatch(/a 3 dias da prova/);
    expect(r.suggestion!.impact).toMatch(/não mudam/);
    // a sugestão não altera nada sozinha: o evento continua igual
    expect(missed.start).toBe(at('2026-10-23', '19:00'));
  });

  it('sem horário antes da prova: explica em vez de sugerir depois dela', () => {
    const plan = { id: 'p1', examDate: '2026-10-26', weekdays: [0], windowStart: '19:00', windowEnd: '20:00', minutesPerDay: 60 };
    const missed = ev({ start: at('2026-10-23', '19:00'), durationMin: 50, plan });
    const blocker = ev({ type: 'entrega', title: 'Entrega', start: at('2026-10-25', '19:00'), durationMin: 60 });
    const r = suggestReschedule(missed, [missed, blocker], NOW, TZ);
    expect(r.suggestion).toBeNull();
    expect(r.reason).toMatch(/antes da prova/);
  });

  it('provas e entregas não recebem sugestão automática', () => {
    expect(suggestReschedule(ev({ type: 'prova', start: at('2026-10-23', '19:00') }), [], NOW, TZ).reason).toMatch(/compromissos fixos/);
  });

  it('eventos de dia inteiro não ocupam horário; a data deles não muda com o fuso', () => {
    const allDay = ev({ allDay: true, date: '2026-11-20', type: 'prova' });
    expect(busyFrom([allDay])).toEqual([]);
    const timed = ev({ start: at('2026-11-20', '22:30') });
    for (const tz of ['America/Sao_Paulo', 'Asia/Tokyo', 'Pacific/Honolulu']) expect(eventDay(allDay, tz)).toBe('2026-11-20');
    // já o evento com horário cai em outro dia quando visto de Tóquio (é o mesmo instante)
    expect(eventDay(timed, 'Asia/Tokyo')).toBe('2026-11-21');
    expect(instantToZoned(Date.parse(timed.start!), TZ).time).toBe('22:30');
  });
});
