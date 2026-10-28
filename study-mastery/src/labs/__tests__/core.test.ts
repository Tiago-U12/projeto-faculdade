// Study Labs Core: catálogo, filtros estritos, sessões, progresso e rotas.
import { describe, expect, it } from 'vitest';
import { parseHash } from '../../lib/route';
import { exerciseProblems, loadCatalog } from '../catalog';
import { countForTopic, filterExercises, fitsTopics, pickSession, type LabContext } from '../filters';
import { exerciseStatus, summarize } from '../progress';
import type { LabDefinition } from '../registry';
import type { LabAttempt, LabFilter } from '../types';
import { ex } from './fixtures';

const ctx = (topicSkills: Record<string, string[]> = {}): LabContext => ({ bankDisciplineIds: new Set(['fullstack', 'calculo2']), topicSkills });
const f = (o: Partial<LabFilter> = {}): LabFilter => ({ disciplineId: 'fullstack', topicIds: ['mysql'], difficulties: ['facil', 'medio', 'dificil'], kinds: [], scope: 'desafio', ...o });
const def = (kind: string, load: () => Promise<ReturnType<typeof ex>[]>): LabDefinition => ({ kind, name: kind, summary: '', runtime: '', offline: true, loadExercises: load, loadPage: async () => ({ default: () => null }) });

describe('catálogo', () => {
  it('valida a estrutura dos exercícios', () => {
    expect(exerciseProblems(ex('sql-ok', { kind: 'sql' }), 'sql')).toEqual([]);
    const bad = exerciseProblems(ex('X Inválido', { kind: 'web', version: 0, topicIds: [], skills: ['nao.existe'], hints: [], objectives: [] }), 'sql');
    expect(bad.join(' | ')).toMatch(/id inválido.*versão.*tipo "web".*sem assunto.*capacidade desconhecida.*sem objetivos.*sem dicas/);
  });

  it('um laboratório que não carrega não derruba os outros; inválidos e repetidos ficam fora', async () => {
    const c = await loadCatalog([
      def('demo', async () => [ex('ex-001'), ex('ex-002'), ex('ex-001'), ex('ex-bad', { objectives: [] })]),
      def('quebrado', async () => {
        throw new Error('sem rede');
      }),
    ]);
    expect(c.exercises.map((e) => e.id)).toEqual(['ex-001', 'ex-002']);
    expect(c.failedLabs).toEqual(['quebrado']);
    expect(c.invalid.map((i) => i.id).sort()).toEqual(['ex-001', 'ex-bad']);
  });
});

describe('filtros estritos', () => {
  const all = [
    ex('sel-1', { topicIds: ['mysql'] }),
    ex('join-1', { topicIds: ['mysql'], skills: ['sql.join'], difficulty: 'medio' }),
    ex('html-css', { topicIds: ['html', 'css'], skills: ['html.semantic', 'css.layout'] }),
    ex('css-1', { topicIds: ['css'], skills: ['css.layout'], scope: 'desafio' }),
    ex('react-1', { kind: 'react', topicIds: ['react-componentes'], skills: ['react.components'] }),
  ];

  it('disciplina do banco: só exercícios com TODOS os assuntos marcados', () => {
    expect(filterExercises(all, f({ topicIds: ['css'] }), ctx()).map((e) => e.id)).toEqual(['css-1']);
    expect(filterExercises(all, f({ topicIds: ['css', 'html'] }), ctx()).map((e) => e.id)).toEqual(['html-css', 'css-1']);
    expect(filterExercises(all, f({ topicIds: [] }), ctx())).toEqual([]);
    expect(filterExercises(all, f({ disciplineId: 'calculo2', topicIds: ['mysql'] }), ctx())).toEqual([]);
  });

  it('dificuldade, tipo e profundidade (cumulativa como no quiz)', () => {
    expect(filterExercises(all, f({ difficulties: ['medio'] }), ctx()).map((e) => e.id)).toEqual(['join-1']);
    expect(filterExercises(all, f({ topicIds: ['css'], scope: 'aprofundamento' }), ctx())).toEqual([]);
    expect(filterExercises(all, f({ topicIds: ['react-componentes', 'mysql'], kinds: ['react'] }), ctx()).map((e) => e.id)).toEqual(['react-1']);
  });

  it('disciplina pessoal: só pelas capacidades associadas explicitamente (nada pelo nome)', () => {
    const personal = 'f3b8c2e0-0000-4000-8000-000000000001';
    const t = 'topico-joins';
    expect(fitsTopics(all[1], personal, [t], ctx())).toBe(false); // sem associação, nada
    expect(filterExercises(all, f({ disciplineId: personal, topicIds: [t] }), ctx({ [t]: ['sql.join'] })).map((e) => e.id)).toEqual(['join-1']);
    // exercício com capacidade não associada não entra (estrito)
    expect(filterExercises(all, f({ disciplineId: personal, topicIds: [t] }), ctx({ [t]: ['css.layout'] })).map((e) => e.id)).toEqual(['css-1']);
    expect(countForTopic(all, personal, t, ctx({ [t]: ['html.semantic', 'css.layout'] }))).toBe(2);
  });

  it('sessão: nunca completa com outros assuntos; prioriza o que não foi concluído; ordem por dificuldade', () => {
    const matched = filterExercises(all, f({ topicIds: ['mysql'] }), ctx());
    expect(pickSession(matched, 3, () => 'novo', 1).map((e) => e.id)).toEqual(['sel-1', 'join-1']);
    const status = (id: string) => (id === 'sel-1' ? 'concluido' : 'novo');
    expect(pickSession(matched, 1, status, 7).map((e) => e.id)).toEqual(['join-1']);
    expect(pickSession(matched, 1, status, 7)).toEqual(pickSession(matched, 1, status, 7)); // determinística
  });
});

describe('progresso prático (separado do quiz)', () => {
  const exs = [ex('a', { difficulty: 'facil' }), ex('b', { difficulty: 'medio' }), ex('c', { difficulty: 'dificil' }), ex('d', { topicIds: ['html'], kind: 'web' })];
  const at = (exerciseId: string, passed: boolean, score: number, finishedAt = '2026-10-28T12:00:00Z'): LabAttempt => ({ id: exerciseId + finishedAt + score, exerciseId, exerciseVersion: 1, kind: exs.find((e) => e.id === exerciseId)!.kind, disciplineId: 'fullstack', topicIds: exs.find((e) => e.id === exerciseId)!.topicIds, startedAt: finishedAt, finishedAt, score, passed, testResults: [], summary: '' });

  it('iniciados, concluídos, tentativas, melhor pontuação, tempo e por laboratório', () => {
    const attempts = [at('a', false, 50), at('a', true, 100, '2026-10-28T13:00:00Z'), at('b', false, 66)];
    const p = summarize(exs, attempts, new Set(['d', 'fantasma']), { a: 120_000, d: 60_000, fantasma: 999_999 });
    expect(p).toMatchObject({ started: 3, completed: 1, attempts: 3, practiceMinutes: 3, bestScore: { a: 100, b: 66 } });
    expect(p.byKind).toEqual({ demo: { started: 2, completed: 1, attempts: 3 }, web: { started: 1, completed: 0, attempts: 0 } });
    expect(exerciseStatus('a', attempts, new Set())).toBe('concluido');
    expect(exerciseStatus('b', attempts, new Set())).toBe('iniciado');
    expect(exerciseStatus('d', attempts, new Set(['d']))).toBe('iniciado');
    expect(exerciseStatus('c', attempts, new Set())).toBe('novo');
  });

  it('prática consolidada exige 3 concluídos com ao menos um médio/difícil (um exercício fácil não basta)', () => {
    expect(summarize(exs, [at('a', true, 100)], new Set()).consolidatedTopics).toEqual([]);
    const all3 = [at('a', true, 100), at('b', true, 100), at('c', true, 100)];
    expect(summarize(exs, all3, new Set()).consolidatedTopics).toEqual(['mysql']);
  });
});

describe('rotas dos laboratórios', () => {
  it('hub com filtros e exercício com sessão', () => {
    expect(parseHash('#/labs')).toEqual({ name: 'labs' });
    expect(parseHash('#/labs?d=fullstack&t=mysql,html&k=sql')).toEqual({ name: 'labs', disciplineId: 'fullstack', topicIds: ['mysql', 'html'], kind: 'sql' });
    expect(parseHash('#/lab?id=sql-001&s=abc')).toEqual({ name: 'lab', id: 'sql-001', sessionId: 'abc' });
    expect(parseHash('#/lab')).toEqual({ name: 'labs' });
  });
});
