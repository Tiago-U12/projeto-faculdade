// Persistência dos laboratórios com um IndexedDB real em memória (fake-indexeddb): reabrir o banco recupera o trabalho,
// espaços não se misturam e, sem IndexedDB, tudo funciona em memória avisando que não é guardado.
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { DraftTooLargeError, MAX_DRAFT_CHARS, openLabStore } from '../storage';
import type { LabAttempt } from '../types';

const attempt = (id: string, exerciseId: string, finishedAt: string, passed = false): LabAttempt => ({ id, exerciseId, exerciseVersion: 1, kind: 'sql', disciplineId: 'fullstack', topicIds: ['mysql'], startedAt: finishedAt, finishedAt, score: passed ? 100 : 0, passed, testResults: [], summary: '' });

describe('armazenamento dos laboratórios', () => {
  it('rascunho, tentativas e dados sobrevivem a fechar e reabrir o banco', async () => {
    const factory = new IDBFactory();
    const a = await openLabStore('device', factory);
    expect(a.persistent).toBe(true);
    await a.putDraft({ exerciseId: 'sql-1', exerciseVersion: 2, sql: 'SELECT 1;', updatedAt: '2026-10-28T10:00:00Z' });
    await a.addAttempt(attempt('t1', 'sql-1', '2026-10-28T10:00:00Z'));
    await a.addAttempt(attempt('t2', 'sql-1', '2026-10-28T11:00:00Z', true));
    await a.setMeta('assoc', { topico: ['sql.join'] });
    const b = await openLabStore('device', factory); // "fechar o navegador e voltar"
    expect(await b.getDraft('sql-1')).toEqual({ exerciseId: 'sql-1', exerciseVersion: 2, sql: 'SELECT 1;', updatedAt: '2026-10-28T10:00:00Z' });
    expect((await b.listAttempts('sql-1')).map((x) => x.id)).toEqual(['t2', 't1']);
    expect(await b.getMeta('assoc')).toEqual({ topico: ['sql.join'] });
  });

  it('espaços separados: a conta não vê o aparelho nem outra conta; apagar um não apaga o outro', async () => {
    const factory = new IDBFactory();
    const dev = await openLabStore('device', factory);
    const acc = await openLabStore('u:conta-a', factory);
    await dev.putDraft({ exerciseId: 'x', exerciseVersion: 1, sql: 'aparelho', updatedAt: 'a' });
    await dev.addAttempt(attempt('d1', 'x', '2026-10-28T10:00:00Z'));
    await dev.setMeta('started', ['x']);
    expect(await acc.getDraft('x')).toBeUndefined();
    expect(await acc.listAttempts()).toEqual([]);
    expect(await acc.getMeta('started')).toBeUndefined();
    await acc.putDraft({ exerciseId: 'x', exerciseVersion: 1, sql: 'conta', updatedAt: 'b' });
    await acc.clear();
    expect((await dev.getDraft('x'))?.sql).toBe('aparelho');
    expect((await dev.listAttempts()).length).toBe(1);
    expect(await acc.getDraft('x')).toBeUndefined();
  });

  it('rascunho grande demais é recusado com mensagem (não estoura a cota do navegador)', async () => {
    const s = await openLabStore('device', new IDBFactory());
    await expect(s.putDraft({ exerciseId: 'w', exerciseVersion: 1, files: { 'index.html': 'x'.repeat(MAX_DRAFT_CHARS + 1) }, updatedAt: 'a' })).rejects.toBeInstanceOf(DraftTooLargeError);
  });

  it('sem IndexedDB (ou com falha ao abrir): funciona em memória e informa que não é persistente', async () => {
    const none = await openLabStore('device', null);
    expect(none.persistent).toBe(false);
    await none.putDraft({ exerciseId: 'y', exerciseVersion: 1, sql: 'ok', updatedAt: 'a' });
    expect((await none.getDraft('y'))?.sql).toBe('ok');
    const broken = { open: () => { throw new Error('bloqueado'); } } as unknown as IDBFactory;
    expect((await openLabStore('device', broken)).persistent).toBe(false);
  });
});
