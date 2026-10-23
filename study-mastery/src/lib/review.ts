import type { DisciplineId, PublishedQuestion, SessionConfig } from '../types';

/** Reconstrói os filtros a partir das questões da tentativa, sem depender da última configuração. */
export function reviewConfig(disciplineId: DisciplineId, questions: readonly PublishedQuestion[]): SessionConfig {
  const own = questions.filter((q) => q.disciplineId === disciplineId);
  return {
    disciplineId,
    topicIds: [...new Set(own.map((q) => q.topicId))],
    difficulties: [...new Set(own.map((q) => q.difficulty))],
    scope: own.some((q) => q.scope === 'desafio') ? 'desafio' : own.some((q) => q.scope === 'aprofundamento') ? 'aprofundamento' : 'aula',
    mode: 'revisao',
    size: Math.min(20, own.length),
  };
}
