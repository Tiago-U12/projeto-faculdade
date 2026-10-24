import { describe, expect, it } from 'vitest';
import { emptyState, recordAttempt, type ActiveSession, type AppState } from '../storage';
import { localActiveStamp, markPushed, mergeRemote, needsFullPull, pendingAttempts, replayStats } from '../sync';
import type { Attempt } from '../../types';

const att = (id: string, date: string, answers: [string, boolean][]): Attempt => ({
  id,
  date,
  disciplineId: 'calculo2',
  mode: 'aprender',
  bankVersion: 'v',
  answers: answers.map(([q, correct]) => ({ questionId: q, topicId: 't', difficulty: 'medio', chosenOptionId: 'a', correct })),
});
const active = (updatedAt: string): ActiveSession => ({
  session: { id: 's', seed: 1, config: { disciplineId: 'calculo2', topicIds: ['t'], scope: 'aula', difficulties: ['medio'], mode: 'aprender', size: 5 }, requested: 5, items: [], composition: { errors: 0, due: 0, fresh: 0, other: 0 }, createdAt: updatedAt },
  answers: {},
  index: 0,
  startedAt: updatedAt,
  updatedAt,
});
const account = (s: AppState = emptyState()): AppState => ({ ...s, sync: {} });

describe('progresso entre aparelhos', () => {
  it('estatísticas recalculadas são iguais às incrementais (mesma ordem de tentativas)', () => {
    let s = emptyState();
    const a1 = att('a1', '2026-10-01T10:00:00.000Z', [['q1', true], ['q2', false]]);
    const a2 = att('a2', '2026-10-03T10:00:00.000Z', [['q1', true], ['q2', true]]);
    for (const a of [a1, a2]) s = recordAttempt(s, { attemptId: a.id, disciplineId: a.disciplineId, mode: a.mode, bankVersion: a.bankVersion, answers: a.answers, now: new Date(a.date) });
    expect(replayStats([a2, a1])).toEqual(s.stats);
  });

  it('mescla sem duplicar: tentativas dos dois aparelhos, cada uma uma vez, e estatísticas de todas', () => {
    const local = account({ ...emptyState(), attempts: [att('celular', '2026-10-02T10:00:00.000Z', [['q1', false]])] });
    const remote = [att('notebook', '2026-10-01T10:00:00.000Z', [['q1', true]]), att('celular', '2026-10-02T10:00:00.000Z', [['q1', false]])];
    const m = mergeRemote(local, { attempts: remote });
    expect(m.attempts.map((a) => a.id)).toEqual(['celular', 'notebook']);
    expect(m.stats.q1.seen).toBe(2);
    expect(m.stats.q1.lastCorrect).toBe(false); // a mais recente (celular) errou
    // mesclar de novo não muda nada
    expect(mergeRemote(m, { attempts: remote }).attempts).toHaveLength(2);
  });

  it('o que veio da conta não é reenviado; o que só existe aqui fica pendente até confirmar o envio', () => {
    const local = account({ ...emptyState(), attempts: [att('novo', '2026-10-05T10:00:00.000Z', [])] });
    const m = mergeRemote(local, { attempts: [att('antigo', '2026-10-01T10:00:00.000Z', [])] });
    expect(pendingAttempts(m).map((a) => a.id)).toEqual(['novo']);
    expect(pendingAttempts(markPushed(m, ['novo']))).toEqual([]);
  });

  it('sessão em andamento: a mais recente vence, e uma sessão encerrada em outro aparelho não volta', () => {
    const local = account({ ...emptyState(), active: active('2026-10-05T10:00:00.000Z') });
    expect(mergeRemote(local, { attempts: [], active: { session: active('2026-10-04T10:00:00.000Z'), updatedAt: '2026-10-04T10:00:00.000Z' } }).active?.updatedAt).toBe('2026-10-05T10:00:00.000Z');
    expect(mergeRemote(local, { attempts: [], active: { session: active('2026-10-06T10:00:00.000Z'), updatedAt: '2026-10-06T10:00:00.000Z' } }).active?.updatedAt).toBe('2026-10-06T10:00:00.000Z');
    // encerrada no notebook depois da última resposta do celular
    const cleared = mergeRemote(local, { attempts: [], active: { session: null, updatedAt: '2026-10-07T10:00:00.000Z' } });
    expect(cleared.active).toBeUndefined();
    expect(localActiveStamp(cleared)).toBe('2026-10-07T10:00:00.000Z');
    // e uma cópia antiga da sessão não ressuscita
    expect(mergeRemote(cleared, { attempts: [], active: { session: active('2026-10-06T10:00:00.000Z'), updatedAt: '2026-10-06T10:00:00.000Z' } }).active).toBeUndefined();
  });

  it('concluir uma sessão na conta registra o encerramento para os outros aparelhos', () => {
    const s = account({ ...emptyState(), active: active('2026-10-05T10:00:00.000Z') });
    const done = recordAttempt(s, { attemptId: 'x', disciplineId: 'calculo2', mode: 'aprender', bankVersion: 'v', answers: [], now: new Date('2026-10-05T11:00:00.000Z') });
    expect(done.active).toBeUndefined();
    expect(done.sync?.activeClearedAt).toBe('2026-10-05T11:00:00.000Z');
  });
});

describe('quando baixar o histórico inteiro da conta', () => {
  it('primeira vez, contagem indisponível ou contagem diferente do que o aparelho conhece: baixa tudo', () => {
    const base = emptyState();
    expect(needsFullPull(base, { attempts: 0, reports: 0 })).toBe(true);
    const synced = { ...base, sync: { pulledAt: '2026-10-24T10:00:00.000Z', pushed: ['a1', 'a2'], pushedReports: ['r1'] } };
    expect(needsFullPull(synced, { attempts: 2, reports: 1 })).toBe(false);
    expect(needsFullPull(synced, { attempts: 3, reports: 1 })).toBe(true); // outro aparelho enviou uma sessão
    expect(needsFullPull(synced, { attempts: 2, reports: 2 })).toBe(true);
    expect(needsFullPull(synced, { attempts: 0, reports: 1 })).toBe(true); // histórico apagado em outro aparelho
    expect(needsFullPull(synced, { attempts: null, reports: 1 })).toBe(true);
  });
});
