import type { Difficulty, DisciplineId, PublishedQuestion, Scope } from '../../types';

let n = 0;
export function makeQ(o: Partial<PublishedQuestion> & { topicId: string; difficulty?: Difficulty; scope?: Scope; disciplineId?: DisciplineId }): PublishedQuestion {
  n++;
  const id = o.id ?? `t-${String(n).padStart(4, '0')}`;
  return {
    id,
    disciplineId: o.disciplineId ?? 'calculo2',
    difficulty: o.difficulty ?? 'facil',
    scope: o.scope ?? 'aula',
    type: 'multiple-choice',
    stem: `Enunciado ${id}`,
    options: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
      { id: 'c', text: 'C' },
      { id: 'd', text: 'D' },
    ],
    correctOptionId: 'c',
    explanation: { correct: 'porque sim' },
    sourceRefs: [{ sourceId: 'x', usage: 'aula' }],
    status: 'approved',
    version: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    verifiedBy: 'sympy+numeric',
    reviewedBy: 'ai-assisted',
    ...o,
  } as PublishedQuestion;
}

export function makeBank(): PublishedQuestion[] {
  const out: PublishedQuestion[] = [];
  const diffs: Difficulty[] = ['facil', 'medio', 'dificil'];
  for (const topic of ['lhopital', 'primitivas', 'substituicao']) {
    for (let i = 0; i < 12; i++) out.push(makeQ({ id: `${topic}-${i}`, topicId: topic, difficulty: diffs[i % 3], scope: (['aula', 'aprofundamento', 'desafio'] as Scope[])[i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2] }));
  }
  for (let i = 0; i < 5; i++) out.push(makeQ({ id: `fs-${i}`, topicId: 'html', disciplineId: 'fullstack' }));
  return out;
}
