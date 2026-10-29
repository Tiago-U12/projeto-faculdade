// Exercícios fictícios para testar o Core sem depender de um laboratório real.
import type { LabExerciseBase } from '../types';

export const ex = (id: string, o: Partial<LabExerciseBase> = {}): LabExerciseBase => ({
  id,
  version: 1,
  kind: 'demo',
  disciplineId: 'fullstack',
  topicIds: ['mysql'],
  skills: ['sql.select'],
  difficulty: 'facil',
  scope: 'aula',
  title: `Exercício ${id}`,
  prompt: 'Enunciado de teste.',
  objectives: ['Objetivo'],
  estimatedMinutes: 5,
  hints: ['Dica 1', 'Dica 2'],
  explanation: 'Explicação.',
  ...o,
});
