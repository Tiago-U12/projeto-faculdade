import { describe, expect, it } from 'vitest';
import { buildSession, countBy, eligible, optionOrder, reviewCounts, scopeAllows, shortfall } from '../engine';
import { nextStat } from '../srs';
import { makeBank, makeQ } from './fixtures';
import type { QuestionStat, SessionConfig } from '../../types';

const cfg = (o: Partial<SessionConfig> = {}): SessionConfig => ({
  disciplineId: 'calculo2',
  topicIds: ['lhopital'],
  scope: 'desafio',
  difficulties: ['facil', 'medio', 'dificil'],
  mode: 'simulado',
  size: 10,
  ...o,
});
const bank = makeBank();
const NOW = new Date('2026-10-22T12:00:00Z');

describe('eligible — filtros estritos', () => {
  it('nunca inclui assunto desmarcado', () => {
    const pool = eligible(bank, cfg({ topicIds: ['lhopital'] }));
    expect(pool.length).toBe(12);
    expect(pool.every((q) => q.topicId === 'lhopital')).toBe(true);
  });
  it('com nenhum assunto marcado não há questões', () => {
    expect(eligible(bank, cfg({ topicIds: [] }))).toHaveLength(0);
  });
  it('não mistura disciplinas', () => {
    expect(eligible(bank, cfg({ disciplineId: 'fullstack', topicIds: ['lhopital'] }))).toHaveLength(0);
    expect(eligible(bank, cfg({ disciplineId: 'fullstack', topicIds: ['html'] }))).toHaveLength(5);
  });
  it('filtra por dificuldade', () => {
    const pool = eligible(bank, cfg({ difficulties: ['dificil'] }));
    expect(pool.every((q) => q.difficulty === 'dificil')).toBe(true);
    expect(pool.length).toBe(4);
  });
  it('profundidade é cumulativa: aula < aprofundamento < desafio', () => {
    expect(scopeAllows('aula', 'aula')).toBe(true);
    expect(scopeAllows('aula', 'aprofundamento')).toBe(false);
    expect(scopeAllows('aprofundamento', 'aula')).toBe(true);
    expect(scopeAllows('aprofundamento', 'desafio')).toBe(false);
    expect(scopeAllows('desafio', 'aula')).toBe(true);
    const aula = eligible(bank, cfg({ scope: 'aula' }));
    expect(aula.every((q) => q.scope === 'aula')).toBe(true);
    expect(eligible(bank, cfg({ scope: 'aprofundamento' })).every((q) => q.scope !== 'desafio')).toBe(true);
  });
  it('ignora tudo que não está aprovado', () => {
    const pool = eligible([{ ...bank[0], status: 'draft' as never }], cfg({ topicIds: [bank[0].topicId] }));
    expect(pool).toHaveLength(0);
  });
});

describe('buildSession — sessões', () => {
  const pool = eligible(bank, cfg({ topicIds: ['lhopital', 'primitivas', 'substituicao'] }));

  it('nunca repete questões na rodada', () => {
    for (let seed = 1; seed < 30; seed++) {
      const s = buildSession(pool, cfg({ size: 20, topicIds: ['lhopital', 'primitivas', 'substituicao'] }), { stats: {}, now: NOW }, seed);
      const ids = s.items.map((i) => i.questionId);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBe(20);
    }
  });
  it('não inventa questões quando o conjunto elegível é menor que o pedido', () => {
    const small = eligible(bank, cfg({ disciplineId: 'fullstack', topicIds: ['html'] }));
    const s = buildSession(small, cfg({ disciplineId: 'fullstack', topicIds: ['html'], size: 20 }), { stats: {}, now: NOW }, 7);
    expect(s.items).toHaveLength(5);
    expect(s.requested).toBe(20);
    expect(shortfall(small.length, 20)).toBe(15);
    expect(shortfall(40, 20)).toBe(0);
  });
  it('é determinística para a mesma semente e muda com outra', () => {
    const c = cfg({ size: 10, topicIds: ['lhopital', 'primitivas', 'substituicao'] });
    const a = buildSession(pool, c, { stats: {}, now: NOW }, 42);
    const b = buildSession(pool, c, { stats: {}, now: NOW }, 42);
    const d = buildSession(pool, c, { stats: {}, now: NOW }, 43);
    expect(a.items).toEqual(b.items);
    expect(a.items.map((i) => i.questionId)).not.toEqual(d.items.map((i) => i.questionId));
  });
  it('embaralha alternativas preservando o conjunto de ids e a resposta correta', () => {
    const q = makeQ({ topicId: 'lhopital', correctOptionId: 'c' });
    let moved = 0;
    for (let seed = 1; seed < 50; seed++) {
      const order = optionOrder(q, seed);
      expect([...order].sort()).toEqual(['a', 'b', 'c', 'd']);
      expect(order.includes(q.correctOptionId)).toBe(true);
      if (order.indexOf('c') !== 2) moved++;
    }
    expect(moved).toBeGreaterThan(10);
  });
  it('respeita fixedOrder', () => {
    const q = makeQ({ topicId: 'lhopital', fixedOrder: true });
    for (let seed = 1; seed < 20; seed++) expect(optionOrder(q, seed)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('prioriza questões ainda não vistas (aprender/simulado)', () => {
    const seen = Object.fromEntries(pool.slice(0, 20).map((q) => [q.id, { seen: 3, correct: 3, lastSeen: NOW.toISOString(), lastCorrect: true, box: 2, due: NOW.toISOString() } as QuestionStat]));
    const c = cfg({ size: 10, topicIds: ['lhopital', 'primitivas', 'substituicao'] });
    const s = buildSession(pool, c, { stats: seen, now: NOW }, 5);
    expect(s.items.every((i) => !seen[i.questionId])).toBe(true);
    expect(s.composition.fresh).toBe(10);
  });
});

describe('modo misto', () => {
  it('equilibra assuntos e mistura dificuldades', () => {
    const topics = ['lhopital', 'primitivas', 'substituicao'];
    const pool = eligible(bank, cfg({ topicIds: topics }));
    const s = buildSession(pool, cfg({ mode: 'misto', size: 9, topicIds: topics }), { stats: {}, now: NOW }, 11);
    const byId = new Map(pool.map((q) => [q.id, q]));
    const items = s.items.map((i) => byId.get(i.questionId)!);
    for (const t of topics) expect(items.filter((q) => q.topicId === t)).toHaveLength(3);
    expect(new Set(items.map((q) => q.difficulty)).size).toBe(3);
  });
});

describe('modo revisão', () => {
  const topics = ['lhopital'];
  const pool = eligible(bank, cfg({ topicIds: topics }));
  const st = (q: string, correct: boolean, dueOffsetDays: number): [string, QuestionStat] => [
    q,
    { seen: 1, correct: correct ? 1 : 0, lastSeen: NOW.toISOString(), lastCorrect: correct, box: correct ? 1 : 0, due: new Date(NOW.getTime() + dueOffsetDays * 86400000).toISOString() },
  ];

  it('põe os erros primeiro, depois vencidas, depois novas — sem reembaralhar a prioridade', () => {
    const stats = Object.fromEntries([
      st(pool[0].id, false, -2),
      st(pool[1].id, false, -5), // mais atrasado → vem antes
      st(pool[2].id, true, -1), // acertada e vencida
      st(pool[3].id, true, +10), // acertada e em dia
    ]);
    const s = buildSession(pool, cfg({ mode: 'revisao', size: 5, topicIds: topics }), { stats, now: NOW }, 99);
    const ids = s.items.map((i) => i.questionId);
    expect(ids.slice(0, 2)).toEqual([pool[1].id, pool[0].id]);
    expect(ids[2]).toBe(pool[2].id);
    expect(ids).not.toContain(pool[3].id); // há novas suficientes
    expect(s.composition).toEqual({ errors: 2, due: 1, fresh: 2, other: 0 });
  });
  it('completa com já vistas em dia somente se faltar material', () => {
    const stats = Object.fromEntries(pool.map((q) => st(q.id, true, +20)));
    const s = buildSession(pool, cfg({ mode: 'revisao', size: 5, topicIds: topics }), { stats, now: NOW }, 1);
    expect(s.items).toHaveLength(5);
    expect(s.composition.other).toBe(5);
    expect(new Set(s.items.map((i) => i.questionId)).size).toBe(5);
  });
  it('conta erros e vencidas para mostrar na configuração', () => {
    const stats = Object.fromEntries([st(pool[0].id, false, 0), st(pool[1].id, true, -1), st(pool[2].id, true, 3)]);
    expect(reviewCounts(pool, stats, NOW)).toEqual({ errors: 1, due: 1 });
  });
});

describe('repetição espaçada (Leitner)', () => {
  it('erro volta a ser devido já; acertos espaçam cada vez mais', () => {
    let s = nextStat(undefined, false, NOW);
    expect(s.box).toBe(0);
    expect(new Date(s.due).getTime()).toBe(NOW.getTime());
    s = nextStat(s, true, NOW);
    expect(s.box).toBe(1);
    expect(new Date(s.due).getTime() - NOW.getTime()).toBe(86400000);
    s = nextStat(s, true, NOW);
    s = nextStat(s, true, NOW);
    expect(s.box).toBe(3);
    expect(new Date(s.due).getTime() - NOW.getTime()).toBe(7 * 86400000);
    s = nextStat(s, false, NOW);
    expect(s.box).toBe(0);
    expect(s.seen).toBe(5);
  });
});

describe('contagens', () => {
  it('countBy agrega por dificuldade', () => {
    expect(countBy(bank.filter((q) => q.topicId === 'lhopital'))).toEqual({ facil: 4, medio: 4, dificil: 4 });
  });
});
