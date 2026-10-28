// Web Worker do SQL Lab: o SQL do estudante roda aqui, fora da thread da interface, num SQLite em WebAssembly
// (sql.js) servido pelo próprio app — sem rede, sem acesso ao IndexedDB/armazenamento do Study Mastery e sem DOM.
// Uma consulta que não termina é resolvida pela página: ela encerra este worker (terminate) e cria outro.
import initSqlJs, { type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { configureEngine, describeExercise, gradeExercise, runExercise } from './engine';
import { isSqlRequest, type SqlWorkerResponse } from './protocol';

const scope = self as unknown as { postMessage(m: SqlWorkerResponse): void; onmessage: ((e: MessageEvent) => void) | null };

let engine: Promise<{ SQL: SqlJsStatic; version: string }> | null = null;
const load = () =>
  (engine ??= initSqlJs({ locateFile: () => wasmUrl }).then((SQL) => {
    configureEngine(SQL);
    const db = new SQL.Database();
    try {
      return { SQL, version: String(db.exec('SELECT sqlite_version()')[0].values[0][0]) };
    } finally {
      db.close();
    }
  }));

scope.onmessage = async (e: MessageEvent) => {
  const m: unknown = e.data;
  if (!isSqlRequest(m)) {
    const id = typeof (m as { id?: unknown })?.id === 'number' ? (m as { id: number }).id : -1;
    scope.postMessage({ id, type: 'error', message: 'Mensagem inválida para o SQL Lab.' });
    return;
  }
  try {
    const { SQL, version } = await load();
    const t0 = performance.now();
    switch (m.type) {
      case 'init':
        scope.postMessage({ id: m.id, type: 'ready', sqliteVersion: version });
        break;
      case 'run':
        scope.postMessage({ id: m.id, type: 'run', result: runExercise(SQL, m.exercise, m.sql), ms: Math.round(performance.now() - t0) });
        break;
      case 'grade':
        scope.postMessage({ id: m.id, type: 'grade', grade: gradeExercise(SQL, m.exercise, m.sql), ms: Math.round(performance.now() - t0) });
        break;
      case 'describe':
        scope.postMessage({ id: m.id, type: 'describe', tables: describeExercise(SQL, m.exercise) });
        break;
    }
  } catch (err) {
    if (m.type === 'init') engine = null;
    scope.postMessage({ id: m.id, type: 'error', message: String((err as Error)?.message ?? err) });
  }
};
