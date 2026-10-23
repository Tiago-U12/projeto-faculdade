import { describe, expect, it } from 'vitest';
import { reviewConfig } from '../review';
import { eligible } from '../engine';
import { makeQ } from './fixtures';

describe('configuração para refazer erros', () => {
  it('inclui os assuntos, dificuldades e profundidade dos erros da tentativa', () => {
    const questions = [makeQ({ topicId: 'html', disciplineId: 'fullstack' }), makeQ({ topicId: 'react', disciplineId: 'fullstack', scope: 'desafio', difficulty: 'dificil' })];
    const cfg = reviewConfig('fullstack', questions);
    expect(cfg.mode).toBe('revisao');
    expect(cfg.size).toBe(2);
    expect(eligible(questions, cfg)).toEqual(questions);
    expect(eligible([makeQ({ topicId: 'html' })], cfg)).toEqual([]);
  });
  it('limita a 20 erros sem completar com questões de fora', () => {
    expect(reviewConfig('calculo2', Array.from({ length: 30 }, () => makeQ({ topicId: 'derivadas' }))).size).toBe(20);
  });
});
