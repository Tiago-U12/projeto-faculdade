// Execução e correção com SQLite real (sql.js). Roda dentro do Web Worker no navegador e direto nos testes (Node).
// Cada execução usa um banco NOVO (schema + dados do caso) que é fechado em seguida: nada de uma tentativa contamina
// outra, e o banco do Study Mastery nunca é tocado (o SQLite do laboratório não tem acesso a rede, arquivos ou JS).
import type { Database, SqlJsStatic, SqlJsValue } from 'sql.js';
import { compareResults, type Difference } from './compare';
import { explainError, feedbackFor } from './feedback';
import type { ResultSet, SqlFixture, SqlLabExercise, SqlValue } from './types';
import type { LabGrade, LabTestResult } from '../types';

export const SQL_LIMITS = {
  /** tamanho máximo do SQL enviado */
  maxSqlChars: 20_000,
  /** linhas mostradas por resultado (o resto é avisado) */
  maxRowsShown: 1000,
  /** linhas lidas para correção: acima disso o resultado é considerado grande demais */
  maxRowsGraded: 5000,
  /** comandos por envio */
  maxStatements: 50,
};

export interface RunOutput {
  ok: true;
  /** resultado do último comando que devolveu linhas (o que a tela mostra) */
  result: ResultSet | null;
  /** quantos comandos rodaram e quantas linhas foram alteradas */
  statements: number;
  changes: number;
}
export interface RunFailure {
  ok: false;
  kind: 'syntax' | 'runtime' | 'limit';
  message: string;
}

const toValue = (v: SqlJsValue): SqlValue => (v instanceof Uint8Array ? `[BLOB ${v.length} bytes]` : v);

/**
 * Teto de memória do SQLite (vale para a instância WebAssembly inteira): consultas que tentam alocar demais falham com
 * erro em vez de travar o worker. Chamado uma vez ao carregar o motor.
 */
export function configureEngine(SQL: SqlJsStatic): void {
  const db = new SQL.Database();
  try {
    db.run('PRAGMA hard_heap_limit = 67108864;');
  } finally {
    db.close();
  }
}

function freshDb(SQL: SqlJsStatic, schemaSql: string, seedSql: string): Database {
  const db = new SQL.Database();
  // banco do exercício limitado a ~8 MB (páginas de 4 KB)
  db.run('PRAGMA max_page_count = 2048;');
  // como no MySQL/InnoDB: chaves estrangeiras valem (no SQLite vêm desligadas)
  db.run('PRAGMA foreign_keys = ON;');
  db.run(schemaSql);
  if (seedSql.trim()) db.run(seedSql);
  return db;
}

/** Executa o SQL do estudante e devolve o último resultado com linhas (até maxRows). */
export function execute(db: Database, sql: string, maxRows: number): RunOutput | RunFailure {
  if (sql.length > SQL_LIMITS.maxSqlChars) return { ok: false, kind: 'limit', message: `O SQL passou de ${SQL_LIMITS.maxSqlChars.toLocaleString('pt-BR')} caracteres.` };
  if (!sql.trim()) return { ok: false, kind: 'syntax', message: 'Escreva um comando SQL antes de executar.' };
  let result: ResultSet | null = null;
  let statements = 0;
  let changes = 0;
  try {
    for (const stmt of db.iterateStatements(sql)) {
      statements++;
      try {
        if (statements > SQL_LIMITS.maxStatements) return { ok: false, kind: 'limit', message: `Mais de ${SQL_LIMITS.maxStatements} comandos num envio.` };
        const columns = stmt.getColumnNames();
        const rows: SqlValue[][] = [];
        let truncated = false;
        while (stmt.step()) {
          if (rows.length >= maxRows) {
            truncated = true;
            break;
          }
          rows.push(stmt.get().map(toValue));
        }
        if (columns.length) result = { columns, rows, truncated };
        else changes += db.getRowsModified();
      } finally {
        stmt.free();
      }
    }
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    return { ok: false, kind: /syntax error|incomplete input|unrecognized token/i.test(msg) ? 'syntax' : 'runtime', message: msg };
  }
  return { ok: true, result, statements, changes };
}

/** "Executar": roda no banco do enunciado (primeiro caso) e descarta o banco. */
export function runExercise(SQL: SqlJsStatic, ex: Pick<SqlLabExercise, 'schemaSql' | 'fixtures'>, sql: string): RunOutput | RunFailure {
  const db = freshDb(SQL, ex.schemaSql, ex.fixtures[0]?.seedSql ?? '');
  try {
    return execute(db, sql, SQL_LIMITS.maxRowsShown);
  } finally {
    db.close();
  }
}

export interface TableView {
  name: string;
  columns: { name: string; type: string; notNull: boolean; pk: boolean }[];
  rows: SqlValue[][];
  totalRows: number;
}

/** Estrutura e dados do banco do enunciado (aba "Dados"). */
export function describeExercise(SQL: SqlJsStatic, ex: Pick<SqlLabExercise, 'schemaSql' | 'fixtures'>): TableView[] {
  const db = freshDb(SQL, ex.schemaSql, ex.fixtures[0]?.seedSql ?? '');
  try {
    const names = (db.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid")[0]?.values ?? []).map((r) => String(r[0]));
    return names.map((name) => {
      const q = name.replace(/"/g, '""');
      const cols = (db.exec(`SELECT name, type, "notnull", pk FROM pragma_table_info('${name.replace(/'/g, "''")}')`)[0]?.values ?? []).map((r) => ({ name: String(r[0]), type: String(r[1]), notNull: r[2] === 1, pk: Number(r[3]) > 0 }));
      const total = Number(db.exec(`SELECT COUNT(*) FROM "${q}"`)[0]?.values[0][0] ?? 0);
      const rows = (db.exec(`SELECT * FROM "${q}" LIMIT 50`)[0]?.values ?? []).map((r) => r.map(toValue));
      return { name, columns: cols, rows, totalRows: total };
    });
  } finally {
    db.close();
  }
}

/** Resultado esperado/obtido num caso: roda o SQL num banco novo e lê o que a correção precisa. */
export function observe(SQL: SqlJsStatic, ex: SqlLabExercise, fx: SqlFixture, sql: string): { sets: ResultSet[] } | RunFailure {
  const db = freshDb(SQL, ex.schemaSql, fx.seedSql);
  try {
    const g = ex.grading;
    const run = execute(db, sql, SQL_LIMITS.maxRowsGraded);
    if (!run.ok) return run;
    if (g.mode === 'result') {
      if (run.result?.truncated) return { ok: false, kind: 'limit', message: `O resultado passou de ${SQL_LIMITS.maxRowsGraded.toLocaleString('pt-BR')} linhas.` };
      return { sets: run.result ? [run.result] : [] };
    }
    if (g.mode === 'state') {
      const sets: ResultSet[] = [];
      for (const q of g.stateQueries) {
        const r = execute(db, q.sql, SQL_LIMITS.maxRowsGraded);
        // tabela apagada ou renomeada pelo estudante: estado vazio e marcado
        sets.push(r.ok && r.result ? r.result : { columns: ['__erro__'], rows: [[r.ok ? 'sem resultado' : r.message]], truncated: false });
      }
      return { sets };
    }
    return { sets: [], ...probe(db, ex) };
  } finally {
    db.close();
  }
}

/** DDL: colunas da tabela e sondas (comandos que precisam funcionar ou ser recusados). */
export function probe(db: Database, ex: SqlLabExercise): { schema: { columns: string[]; probes: boolean[] } } {
  const g = ex.grading;
  if (g.mode !== 'schema') return { schema: { columns: [], probes: [] } };
  const cols = (db.exec(`SELECT name FROM pragma_table_info('${g.table.replace(/'/g, "''")}')`)[0]?.values ?? []).map((r) => String(r[0]).toLowerCase());
  const probes = g.probes.map((p) => {
    try {
      db.run('SAVEPOINT sonda;');
      db.run(p.sql);
      db.run('ROLLBACK TO sonda; RELEASE sonda;');
      return p.expect === 'ok';
    } catch {
      try {
        db.run('ROLLBACK TO sonda; RELEASE sonda;');
      } catch {
        /* sem savepoint aberto */
      }
      return p.expect === 'erro';
    }
  });
  return { schema: { columns: cols, probes } };
}

/**
 * "Verificar resposta": roda a solução de referência e a do estudante em cada banco de teste (bancos novos a cada vez)
 * e compara o comportamento — nunca o texto do SQL.
 */
export function gradeExercise(SQL: SqlJsStatic, ex: SqlLabExercise, studentSql: string): LabGrade {
  const results: LabTestResult[] = [];
  const g = ex.grading;
  const lean = ex.scope === 'desafio';
  let syntax: string | null = null;
  for (const fx of ex.fixtures) {
    const expected = observe(SQL, ex, fx, ex.solutionSql);
    if ('ok' in expected) throw new Error(`solução de referência falhou em ${ex.id}/${fx.id}: ${expected.message}`);
    const actual = observe(SQL, ex, fx, studentSql);
    if ('ok' in actual) {
      if (actual.kind === 'syntax') syntax = actual.message;
      results.push({ id: fx.id, label: fx.label, passed: false, message: explainError(actual.message, actual.kind) });
      continue;
    }
    let diff: Difference | null = null;
    let stateLabel: string | undefined;
    if (g.mode === 'result') {
      const exp = expected.sets[0];
      const act = actual.sets[0];
      if (!exp) throw new Error(`solução de referência de ${ex.id} não devolveu resultado em ${fx.id}`);
      if (!act) {
        results.push({ id: fx.id, label: fx.label, passed: false, message: 'Seu SQL não devolveu uma tabela de resultado. Este exercício espera uma consulta (SELECT).' });
        continue;
      }
      diff = compareResults(exp, act, g);
    } else if (g.mode === 'state') {
      for (let i = 0; i < g.stateQueries.length && !diff; i++) {
        diff = compareResults(expected.sets[i], actual.sets[i], { orderMatters: true, columnNamesMatter: false, tolerance: g.tolerance });
        if (diff) stateLabel = g.stateQueries[i].label;
      }
    } else {
      const s = (actual as { schema?: { columns: string[]; probes: boolean[] } }).schema!;
      const missing = g.columns.filter((c) => !s.columns.includes(c.toLowerCase()));
      const failedProbe = g.probes.find((_, i) => !s.probes[i]);
      const message = missing.length ? `A tabela ${g.table} não tem a(s) coluna(s): ${missing.join(', ')}.` : failedProbe ? `Restrição não conferiu: ${failedProbe.label}.` : undefined;
      results.push({ id: fx.id, label: fx.label, passed: !message, message });
      continue;
    }
    results.push({ id: fx.id, label: fx.label, passed: !diff, message: diff ? feedbackFor(diff, { fixture: fx, studentSql, lean, mode: g.mode, stateLabel }) : undefined });
  }
  const passedN = results.filter((r) => r.passed).length;
  const passed = passedN === results.length;
  const score = Math.round((100 * passedN) / results.length);
  const summary = passed
    ? `Correto em todos os ${results.length} bancos de teste.`
    : syntax
      ? 'Corrija o erro de SQL e verifique de novo.'
      : `Passou em ${passedN} de ${results.length} bancos de teste.`;
  return { passed, score, results, summary };
}
