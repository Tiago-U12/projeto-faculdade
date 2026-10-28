// Cliente do worker do SQL Lab: fila de pedidos (um por vez), limite de tempo e cancelamento. Estourar o tempo ou
// cancelar ENCERRA o worker (única forma de parar um laço infinito no SQLite) e o próximo pedido cria outro.
import type { LabGrade } from '../types';
import type { RunFailure, RunOutput, TableView } from './engine';
import { isSqlResponse, type SqlWorkerRequest, type SqlWorkerResponse } from './protocol';
import type { SqlLabExercise } from './types';

export const SQL_TIMEOUTS = { init: 20_000, run: 3_000, grade: 6_000, describe: 5_000 };

export class SqlTimeoutError extends Error {
  constructor(public readonly ms: number) {
    super(`A execução passou de ${(ms / 1000).toLocaleString('pt-BR')} s e foi interrompida. Procure laços sem fim (ex.: WITH RECURSIVE sem condição de parada) ou junções sem condição.`);
    this.name = 'SqlTimeoutError';
  }
}
export class SqlCancelledError extends Error {
  constructor() {
    super('Execução cancelada.');
    this.name = 'SqlCancelledError';
  }
}

export interface WorkerLike {
  postMessage(m: SqlWorkerRequest): void;
  terminate(): void;
  onmessage: ((e: MessageEvent) => void) | null;
  onerror: ((e: ErrorEvent | Event) => void) | null;
}

type Out = { [K in SqlWorkerResponse['type']]: Extract<SqlWorkerResponse, { type: K }> };
type Pending = { id: number; resolve: (r: SqlWorkerResponse) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };
type Body = SqlWorkerRequest extends infer R ? (R extends { id: number } ? Omit<R, 'id'> : never) : never;

const defaultFactory = (): WorkerLike => new Worker(new URL('./sql.worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike;

export class SqlRunner {
  private worker: WorkerLike | null = null;
  private version: string | null = null;
  private pending: Pending | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private seq = 0;
  /** quantas vezes o worker foi recriado (cancelamento, tempo esgotado ou falha) */
  restarts = 0;

  constructor(
    private readonly factory: () => WorkerLike = defaultFactory,
    private readonly timeouts = SQL_TIMEOUTS,
  ) {}

  private spawn(): WorkerLike {
    const w = this.factory();
    w.onmessage = (e) => {
      const m: unknown = e.data;
      // só aceitamos respostas bem formadas ao pedido em andamento
      if (!isSqlResponse(m) || !this.pending || m.id !== this.pending.id) return;
      const p = this.pending;
      this.pending = null;
      clearTimeout(p.timer);
      if (m.type === 'error') p.reject(new Error(m.message));
      else p.resolve(m);
    };
    w.onerror = (e) => {
      (e as Event).preventDefault?.();
      this.kill(new Error('O SQLite deste laboratório parou de responder. Ele será reiniciado na próxima execução.'));
    };
    this.worker = w;
    return w;
  }

  private kill(reason: Error) {
    this.worker?.terminate();
    this.worker = null;
    this.version = null;
    this.restarts++;
    const p = this.pending;
    this.pending = null;
    if (p) {
      clearTimeout(p.timer);
      p.reject(reason);
    }
  }

  private send<T extends SqlWorkerResponse['type']>(body: Body, timeoutMs: number): Promise<Out[T]> {
    const w = this.worker ?? this.spawn();
    const id = ++this.seq;
    return new Promise<Out[T]>((resolve, reject) => {
      const timer = setTimeout(() => this.kill(new SqlTimeoutError(timeoutMs)), timeoutMs);
      this.pending = { id, resolve: resolve as (r: SqlWorkerResponse) => void, reject, timer };
      w.postMessage({ ...body, id } as SqlWorkerRequest);
    });
  }

  /** Garante o SQLite carregado (WebAssembly) — o tempo de carga não conta no limite das consultas. Só roda dentro da fila. */
  private async ensureReady(): Promise<string> {
    if (this.version && this.worker) return this.version;
    const r = await this.send<'ready'>({ type: 'init' }, this.timeouts.init);
    this.version = r.sqliteVersion;
    return this.version;
  }

  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    const run = this.queue.then(job, job);
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Carrega o SQLite e devolve a versão. */
  init(): Promise<string> {
    return this.enqueue(() => this.ensureReady());
  }

  private call<T extends 'run' | 'grade' | 'describe'>(body: Body, timeoutMs: number): Promise<Out[T]> {
    return this.enqueue(async () => {
      await this.ensureReady();
      return this.send<T>(body, timeoutMs);
    });
  }

  async run(exercise: SqlLabExercise, sql: string): Promise<{ result: RunOutput | RunFailure; ms: number }> {
    const r = await this.call<'run'>({ type: 'run', exercise, sql }, this.timeouts.run);
    return { result: r.result, ms: r.ms };
  }
  async grade(exercise: SqlLabExercise, sql: string): Promise<{ grade: LabGrade; ms: number }> {
    const r = await this.call<'grade'>({ type: 'grade', exercise, sql }, this.timeouts.grade);
    return { grade: r.grade, ms: r.ms };
  }
  async describe(exercise: SqlLabExercise): Promise<TableView[]> {
    return (await this.call<'describe'>({ type: 'describe', exercise }, this.timeouts.describe)).tables;
  }

  /** Interrompe o que estiver rodando (encerra o worker). */
  cancel() {
    if (this.pending) this.kill(new SqlCancelledError());
  }
  get busy() {
    return this.pending !== null;
  }
  dispose() {
    this.cancel();
    this.worker?.terminate();
    this.worker = null;
    this.version = null;
  }
}

// Um runner compartilhado entre exercícios (o SQLite carrega uma vez); encerrado depois de um tempo sem uso.
// A página pega o runner com sharedSqlRunner() e marca uso no efeito (acquire/release), o que funciona com o
// StrictMode (efeitos montados, desmontados e montados de novo em desenvolvimento).
let shared: SqlRunner | null = null;
let users = 0;
let idle: ReturnType<typeof setTimeout> | null = null;
export function sharedSqlRunner(): SqlRunner {
  return (shared ??= new SqlRunner());
}
export function acquireSqlRunner(): SqlRunner {
  if (idle) clearTimeout(idle);
  idle = null;
  users++;
  return sharedSqlRunner();
}
export function releaseSqlRunner(idleMs = 60_000) {
  users = Math.max(0, users - 1);
  if (users || !shared) return;
  idle = setTimeout(() => {
    shared?.dispose();
    shared = null;
  }, idleMs);
}
