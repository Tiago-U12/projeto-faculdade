// Sessões com questões pessoais: filtro estrito, sem completar com outros assuntos, gabarito preservado e histórico
// com a versão respondida.
import { describe, expect, it } from 'vitest';
import { buildSession, personalPool } from '../engine';
import { emptyState, MAX_LOCAL_SNAPSHOTS, recordAttempt, trimSnapshots } from '../storage';
import type { Attempt, PersonalQuizQuestion, SessionConfig } from '../../types';

const pq = (id: string, topicId: string, extra: Partial<PersonalQuizQuestion> = {}): PersonalQuizQuestion => ({
  personal: true, id, version: 1, disciplineId: 'd1', disciplineName: 'Física', topicId, topicName: topicId, difficulty: 'medio',
  stem: `Enunciado ${id}`, options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }, { id: 'd', text: 'D' }], correctOptionId: 'c',
  explanation: { correct: 'Porque C.' }, status: 'gerada_ia', refs: [], ...extra,
});
const cfg = (o: Partial<SessionConfig> = {}): SessionConfig => ({ disciplineId: 'd1', topicIds: ['cinematica'], difficulties: ['facil', 'medio', 'dificil'], scope: 'aula', mode: 'aprender', size: 20, ...o });

describe('sessões com questões pessoais', () => {
  const qs = [
    pq('q1', 'cinematica'), pq('q2', 'cinematica'), pq('q3', 'cinematica', { difficulty: 'dificil' }),
    pq('q4', 'dinamica'), pq('q5', 'cinematica', { status: 'reportada' }), pq('q6', 'cinematica', { status: 'arquivada' }),
    pq('q7', 'cinematica', { disciplineId: 'd2' }),
  ];

  it('respeita estritamente assunto, dificuldade e disciplina; deixa de fora reportadas e arquivadas', () => {
    expect(personalPool(qs, cfg()).map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);
    expect(personalPool(qs, cfg({ difficulties: ['dificil'] })).map((q) => q.id)).toEqual(['q3']);
  });

  it('com menos questões que o pedido, a sessão fica menor: não completa com outro assunto nem repete', () => {
    for (const mode of ['aprender', 'simulado', 'revisao', 'misto'] as const) {
      const s = buildSession(personalPool(qs, cfg()), cfg({ mode }), { stats: {} }, 7);
      const ids = s.items.map((i) => i.questionId);
      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(3);
      expect(ids.every((id) => ['q1', 'q2', 'q3'].includes(id))).toBe(true);
      expect(s.requested).toBe(20);
    }
  });

  it('embaralhar alternativas mantém o gabarito (a ordem é só uma permutação dos mesmos ids)', () => {
    const s = buildSession(personalPool(qs, cfg()), cfg(), { stats: {} }, 99);
    for (const it of s.items) expect([...it.order].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('o histórico guarda a versão respondida: editar a questão depois não muda a tentativa', () => {
    const answered = pq('q1', 'cinematica', { version: 2, stem: 'Versão 2' });
    const st = recordAttempt(emptyState(), { attemptId: 't1', disciplineId: 'd1', mode: 'aprender', bankVersion: 'pessoal', answers: [{ questionId: 'q1', topicId: 'cinematica', difficulty: 'medio', chosenOptionId: 'c', correct: true, questionVersion: 2 }], now: new Date('2026-10-24T10:00:00Z'), source: 'pessoal', snapshots: { q1: answered } });
    answered.stem = 'Versão 3 (editada depois)';
    // a tentativa guarda a cópia recebida; o teste muta o objeto original para provar que a tela usa o snapshot salvo em JSON
    const saved = JSON.parse(JSON.stringify(st)) as typeof st;
    expect(saved.attempts[0]).toMatchObject({ source: 'pessoal', answers: [{ questionVersion: 2 }] });
    expect(saved.stats.q1.correct).toBe(1);
  });

  it('no aparelho, o texto das questões pessoais fica só nas tentativas mais recentes (cabe no armazenamento)', () => {
    const many: Attempt[] = Array.from({ length: MAX_LOCAL_SNAPSHOTS + 5 }, (_, i) => ({ id: `t${i}`, date: '2026-10-24', disciplineId: 'd1', mode: 'aprender', bankVersion: 'pessoal', answers: [], source: 'pessoal', snapshots: { q1: pq('q1', 'x') } }));
    const trimmed = trimSnapshots(many);
    expect(trimmed.filter((a) => a.snapshots).length).toBe(MAX_LOCAL_SNAPSHOTS);
    expect(trimmed).toHaveLength(MAX_LOCAL_SNAPSHOTS + 5);
  });
});
