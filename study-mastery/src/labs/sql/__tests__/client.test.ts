// Cliente do worker: fila, limite de tempo (encerra e recria o worker), cancelamento, falha do worker e mensagens
// inválidas ignoradas. O worker aqui é falso; o motor de verdade é testado em engine.test.ts e no navegador (e2e).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { acquireSqlRunner, releaseSqlRunner, sharedSqlRunner, SqlCancelledError, SqlRunner, SqlTimeoutError, type WorkerLike } from '../client';
import { SQL_EXERCISES } from '../exercises';
import { isSqlRequest, isSqlResponse, type SqlWorkerRequest } from '../protocol';

const ex = SQL_EXERCISES[0];

/** Worker falso: responde conforme `behavior`; 'hang' nunca responde (laço infinito). */
class FakeWorker implements WorkerLike {
  static all: FakeWorker[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent | Event) => void) | null = null;
  terminated = false;
  received: SqlWorkerRequest[] = [];
  constructor(public behavior: (m: SqlWorkerRequest, w: FakeWorker) => void) {
    FakeWorker.all.push(this);
  }
  postMessage(m: SqlWorkerRequest) {
    this.received.push(m);
    queueMicrotask(() => !this.terminated && this.behavior(m, this));
  }
  reply(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
  terminate() {
    this.terminated = true;
  }
}

const normal = (m: SqlWorkerRequest, w: FakeWorker) => {
  if (m.type === 'init') w.reply({ id: m.id, type: 'ready', sqliteVersion: '3.49.1' });
  else if (m.type === 'run') w.reply({ id: m.id, type: 'run', result: { ok: true, result: null, statements: 1, changes: 0 }, ms: 1 });
  else if (m.type === 'grade') w.reply({ id: m.id, type: 'grade', grade: { passed: true, score: 100, results: [], summary: 'ok' }, ms: 2 });
};

afterEach(() => {
  FakeWorker.all = [];
  vi.useRealTimers();
});

describe('SqlRunner', () => {
  it('carrega o SQLite uma vez e atende pedidos em fila', async () => {
    const r = new SqlRunner(() => new FakeWorker(normal));
    expect(await r.init()).toBe('3.49.1');
    const [a, b] = await Promise.all([r.run(ex, 'SELECT 1'), r.grade(ex, 'SELECT 1')]);
    expect(a.result.ok).toBe(true);
    expect(b.grade.passed).toBe(true);
    expect(FakeWorker.all).toHaveLength(1);
    expect(FakeWorker.all[0].received.map((m) => m.type)).toEqual(['init', 'run', 'grade']);
  });

  it('tempo esgotado: encerra o worker, explica o erro e o próximo pedido usa um worker novo', async () => {
    vi.useFakeTimers();
    let hang = true;
    const r = new SqlRunner(() => new FakeWorker((m, w) => (m.type === 'run' && hang ? undefined : normal(m, w))), { init: 1000, run: 3000, grade: 6000, describe: 1000 });
    const p = r.run(ex, 'WITH RECURSIVE x AS (SELECT 1 UNION ALL SELECT 1 FROM x) SELECT COUNT(*) FROM x');
    const caught = p.catch((e) => e);
    await vi.advanceTimersByTimeAsync(3001);
    const err = await caught;
    expect(err).toBeInstanceOf(SqlTimeoutError);
    expect((err as Error).message).toMatch(/passou de 3 s/);
    expect(FakeWorker.all[0].terminated).toBe(true);
    expect(r.restarts).toBe(1);
    hang = false;
    const ok = await r.run(ex, 'SELECT 1');
    expect(ok.result.ok).toBe(true);
    expect(FakeWorker.all).toHaveLength(2);
    expect(FakeWorker.all[1].received.map((m) => m.type)).toEqual(['init', 'run']);
  });

  it('cancelar interrompe a execução em andamento', async () => {
    const r = new SqlRunner(() => new FakeWorker((m, w) => (m.type === 'run' ? undefined : normal(m, w))));
    await r.init();
    const p = r.run(ex, 'SELECT 1').catch((e) => e);
    await new Promise((res) => setTimeout(res, 0));
    expect(r.busy).toBe(true);
    r.cancel();
    expect(await p).toBeInstanceOf(SqlCancelledError);
    expect(FakeWorker.all[0].terminated).toBe(true);
    expect(r.busy).toBe(false);
  });

  it('ignora respostas malformadas ou de outro pedido; erro do worker vira mensagem', async () => {
    vi.useFakeTimers();
    const r = new SqlRunner(
      () =>
        new FakeWorker((m, w) => {
          if (m.type !== 'run') return normal(m, w);
          w.reply({ id: m.id + 99, type: 'run', result: { ok: true }, ms: 1 });
          w.reply({ id: m.id, type: 'run' });
          w.reply('texto qualquer');
          w.reply({ id: m.id, type: 'error', message: 'falhou de verdade' });
        }),
    );
    await expect(r.run(ex, 'SELECT 1')).rejects.toThrow('falhou de verdade');
  });

  it('falha do próprio worker (onerror) rejeita e reinicia', async () => {
    const r = new SqlRunner(() => new FakeWorker((m, w) => (m.type === 'run' ? w.onerror?.(new Event('error')) : normal(m, w))));
    await expect(r.run(ex, 'SELECT 1')).rejects.toThrow(/parou de responder/);
    expect(r.restarts).toBe(1);
  });

  it('falha ao carregar o SQLite pode ser tentada de novo', async () => {
    let fail = true;
    const r = new SqlRunner(() => new FakeWorker((m, w) => (m.type === 'init' && fail ? w.reply({ id: m.id, type: 'error', message: 'wasm indisponível' }) : normal(m, w))));
    await expect(r.init()).rejects.toThrow('wasm indisponível');
    fail = false;
    expect(await r.init()).toBe('3.49.1');
  });
});

describe('runner compartilhado', () => {
  it('é o mesmo entre exercícios e só é descartado depois de ficar sem uso (também com StrictMode)', () => {
    vi.useFakeTimers();
    const r = sharedSqlRunner();
    acquireSqlRunner();
    // StrictMode: efeito desmonta e monta de novo — nada é descartado
    releaseSqlRunner(1000);
    acquireSqlRunner();
    vi.advanceTimersByTime(5000);
    expect(sharedSqlRunner()).toBe(r);
    releaseSqlRunner(1000);
    vi.advanceTimersByTime(999);
    expect(sharedSqlRunner()).toBe(r);
    vi.advanceTimersByTime(2);
    expect(sharedSqlRunner()).not.toBe(r);
  });
});

describe('protocolo', () => {
  it('valida pedidos e respostas', () => {
    expect(isSqlRequest({ id: 1, type: 'init' })).toBe(true);
    expect(isSqlRequest({ id: 1, type: 'run', exercise: ex, sql: 'SELECT 1' })).toBe(true);
    expect(isSqlRequest({ id: 1, type: 'run', exercise: { ...ex, kind: 'web' }, sql: 'x' })).toBe(false);
    expect(isSqlRequest({ id: 1, type: 'run', exercise: ex })).toBe(false);
    expect(isSqlRequest({ id: '1', type: 'init' })).toBe(false);
    expect(isSqlRequest({ id: 1, type: 'eval', code: 'x' })).toBe(false);
    expect(isSqlResponse({ id: 1, type: 'ready', sqliteVersion: '3' })).toBe(true);
    expect(isSqlResponse({ id: 1, type: 'grade', grade: { passed: 'sim', results: [] }, ms: 1 })).toBe(false);
    expect(isSqlResponse(null)).toBe(false);
  });
});
