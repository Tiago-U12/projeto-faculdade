import { describe, expect, it } from 'vitest';
import { emptyState, exportState, importState, loadState, migrateLegacyAttempts, recordAttempt, saveState, STATE_KEY, type KeyValueStore } from '../storage';
import type { AnswerRecord } from '../../types';

function memStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}
const NOW = new Date('2026-10-22T12:00:00Z');
const ans = (id: string, correct: boolean): AnswerRecord => ({ questionId: id, topicId: 'lhopital', difficulty: 'facil', chosenOptionId: 'a', correct });

describe('localStorage', () => {
  it('salva e recarrega o estado', () => {
    const store = memStore();
    const s = recordAttempt(emptyState(), { attemptId: 'a1', disciplineId: 'calculo2', mode: 'simulado', bankVersion: 'v', answers: [ans('q1', true), ans('q2', false)], now: NOW });
    expect(saveState(store, s)).toBe(true);
    const back = loadState(store);
    expect(back.attempts).toHaveLength(1);
    expect(back.stats.q1.box).toBe(1);
    expect(back.stats.q2.lastCorrect).toBe(false);
  });
  it('funciona sem storage (modo privado) e com JSON corrompido', () => {
    expect(loadState(null)).toEqual(emptyState());
    expect(saveState(null, emptyState())).toBe(false);
    const store = memStore();
    store.setItem(STATE_KEY, '{not json');
    expect(loadState(store)).toEqual(emptyState());
    store.setItem(STATE_KEY, JSON.stringify({ version: 99 }));
    expect(loadState(store)).toEqual(emptyState());
  });
  it('migra tentativas do protótipo v0.2 sem perder o histórico', () => {
    const store = memStore();
    store.setItem('study-mastery-attempts-v02', JSON.stringify([{ id: 'x', date: '2026-10-01T00:00:00Z', discipline: 'fullstack', answers: [{ questionId: 'fs-001', topic: 'HTML Semântico', correct: true }] }]));
    const s = loadState(store);
    expect(s.attempts).toHaveLength(1);
    expect(s.attempts[0].answers[0].topicId).toBe('html');
    expect(migrateLegacyAttempts('lixo')).toEqual([]);
  });
});

describe('exportar / importar', () => {
  const base = recordAttempt(emptyState(), { attemptId: 'a1', disciplineId: 'calculo2', mode: 'simulado', bankVersion: 'v', answers: [ans('q1', true)], now: NOW });
  it('round-trip em modo substituir', () => {
    const r = importState(emptyState(), exportState(base, NOW), 'replace');
    expect(r.ok && r.state.attempts).toHaveLength(1);
  });
  it('mesclar não duplica tentativas e mantém a estatística mais recente', () => {
    const later = recordAttempt(base, { attemptId: 'a2', disciplineId: 'calculo2', mode: 'revisao', bankVersion: 'v', answers: [ans('q1', false)], now: new Date(NOW.getTime() + 1000) });
    const r1 = importState(base, exportState(later, NOW), 'merge');
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.attemptsAdded).toBe(1);
    expect(r1.state.attempts.map((a) => a.id).sort()).toEqual(['a1', 'a2']);
    expect(r1.state.stats.q1.lastCorrect).toBe(false);
    const r2 = importState(r1.state, exportState(later, NOW), 'merge');
    expect(r2.ok && r2.attemptsAdded).toBe(0);
  });
  it('rejeita arquivos inválidos', () => {
    expect(importState(base, 'xx', 'merge')).toMatchObject({ ok: false });
    expect(importState(base, JSON.stringify({ app: 'outro' }), 'merge')).toMatchObject({ ok: false });
  });
  it('limita o histórico guardado', () => {
    let s = emptyState();
    for (let i = 0; i < 230; i++) s = recordAttempt(s, { attemptId: `a${i}`, disciplineId: 'calculo2', mode: 'simulado', bankVersion: 'v', answers: [ans('q', true)], now: new Date(NOW.getTime() + i) });
    expect(s.attempts.length).toBe(200);
    expect(s.attempts[0].id).toBe('a229');
  });
});
