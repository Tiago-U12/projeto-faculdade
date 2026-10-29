#!/usr/bin/env tsx
/**
 * Confere se os exercícios do SQL Lab marcados como "sql-comum" se comportam igual num banco da família MySQL.
 * Sobe um MariaDB 10.11 temporário (mais próximo do MySQL 8 disponível offline; não é idêntico), com o sql_mode padrão
 * do MySQL 8, e para cada exercício e banco de teste roda o schema, os dados e a SOLUÇÃO DE REFERÊNCIA, comparando o
 * resultado com o do SQLite do laboratório. Não envia nada para fora da máquina.
 *
 *   npm run labs:sql-portability            (requer mariadb-install-db e mariadbd no PATH)
 *   SM_MARIADB_SOCKET=/caminho/sock npm run labs:sql-portability   (usa um servidor já rodando)
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import initSqlJs from 'sql.js';
import { compareResults } from '../src/labs/sql/compare';
import { configureEngine, observe } from '../src/labs/sql/engine';
import { SQL_EXERCISES } from '../src/labs/sql/exercises';
import type { ResultSet, SqlLabExercise, SqlValue } from '../src/labs/sql/types';

const MYSQL8_MODE = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

/** Único ajuste de schema: autoincremento tem outra grafia no MySQL. */
const toMysqlSchema = (sql: string) => sql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'INTEGER PRIMARY KEY AUTO_INCREMENT');

let server: ChildProcess | null = null;
let tmp = '';

async function startServer(): Promise<string> {
  if (process.env.SM_MARIADB_SOCKET) return process.env.SM_MARIADB_SOCKET;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-mariadb-'));
  const data = path.join(tmp, 'data');
  const sock = path.join(tmp, 'm.sock');
  const init = spawnSync('mariadb-install-db', [`--datadir=${data}`, '--user=root', '--auth-root-authentication-method=socket', '--skip-test-db'], { encoding: 'utf8' });
  if (init.status !== 0) throw new Error(`mariadb-install-db falhou (está instalado?):\n${init.stderr || init.error}`);
  server = spawn('mariadbd', [`--datadir=${data}`, `--socket=${sock}`, '--skip-networking', '--user=root', `--pid-file=${path.join(tmp, 'm.pid')}`, '--character-set-server=utf8mb4', '--collation-server=utf8mb4_general_ci'], { stdio: 'ignore' });
  for (let i = 0; i < 100; i++) {
    if (spawnSync('mariadb', [`--socket=${sock}`, '-uroot', '-e', 'SELECT 1'], { encoding: 'utf8' }).status === 0) return sock;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('o MariaDB temporário não respondeu');
}

function stopServer() {
  server?.kill('SIGTERM');
  if (tmp) setTimeout(() => fs.rmSync(tmp, { recursive: true, force: true }), 1500);
}

function mysql(sock: string, db: string | null, sql: string): { ok: boolean; out: string; err: string } {
  const args = [`--socket=${sock}`, '-uroot', '--batch', '--default-character-set=utf8mb4', ...(db ? [db] : [])];
  const r = spawnSync('mariadb', args, { input: `SET SESSION sql_mode = '${MYSQL8_MODE}';\n${sql}`, encoding: 'utf8' });
  return { ok: r.status === 0, out: r.stdout, err: r.stderr };
}

/** Saída --batch (TSV com cabeçalho) → ResultSet. Números voltam como texto: convertidos para comparar com o SQLite. */
function parseBatch(out: string): ResultSet | null {
  const lines = out.replace(/\n$/, '').split('\n');
  if (!lines[0]) return null;
  const unescape = (v: string) => v.replace(/\\t/g, '\t').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
  const cell = (v: string): SqlValue => (v === 'NULL' ? null : /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : unescape(v));
  return { columns: lines[0].split('\t'), rows: lines.slice(1).map((l) => l.split('\t').map(cell)), truncated: false };
}

let n = 0;
function freshDb(sock: string, ex: SqlLabExercise, seed: string): string {
  const db = `lab_${++n}`;
  const r = mysql(sock, null, `CREATE DATABASE ${db} CHARACTER SET utf8mb4; USE ${db};\n${toMysqlSchema(ex.schemaSql)}\n${seed}`);
  if (!r.ok) throw new Error(`schema/dados de ${ex.id} falharam no MariaDB: ${r.err}`);
  return db;
}

/** Diferenças documentadas em docs/STUDY_LABS.md: confirmadas rodando nos dois bancos (devem DIFERIR). */
const DIFFERENCES: { label: string; sql: string }[] = [
  { label: 'divisão entre inteiros', sql: 'SELECT 5 / 3 AS r' },
  { label: 'comparação de texto com maiúsculas', sql: "SELECT CASE WHEN 'ana' = 'ANA' THEN 'igual' ELSE 'diferente' END AS r" },
  { label: 'operador ||', sql: "SELECT 'a' || 'b' AS r" },
  { label: 'LENGTH conta caracteres ou bytes', sql: "SELECT LENGTH('ção') AS r" },
  { label: 'coluna fora do GROUP BY', sql: 'SELECT categoria, nome FROM t GROUP BY categoria' },
  { label: 'função de data do MySQL', sql: 'SELECT CURDATE() IS NOT NULL AS r' },
  { label: 'valor de tipo errado numa coluna INTEGER', sql: "INSERT INTO t (categoria, nome, n) VALUES ('x', 'y', 'abc'); SELECT n AS r FROM t WHERE categoria = 'x'" },
];

function checkDifferences(SQL: Awaited<ReturnType<typeof initSqlJs>>, sock: string): number {
  const setup = "CREATE TABLE t (categoria VARCHAR(20), nome VARCHAR(20), n INTEGER); INSERT INTO t VALUES ('A', 'um', 1), ('A', 'dois', 2);";
  console.log('\nDiferenças de dialeto (SQLite do laboratório × MariaDB com modo MySQL 8):');
  let bad = 0;
  for (const d of DIFFERENCES) {
    const db = new SQL.Database();
    let lite: string;
    try {
      db.run(setup);
      const r = db.exec(d.sql);
      lite = JSON.stringify(r[r.length - 1]?.values[0]?.[0] ?? null);
    } catch (e) {
      lite = `erro: ${(e as Error).message}`;
    } finally {
      db.close();
    }
    const name = `lab_d${++n}`;
    mysql(sock, null, `CREATE DATABASE ${name} CHARACTER SET utf8mb4; USE ${name}; ${setup}`);
    const m = mysql(sock, name, d.sql);
    const maria = m.ok ? JSON.stringify(parseBatch(m.out)?.rows[0]?.[0] ?? null) : `erro: ${(m.err.trim().split('\n').pop() ?? '').replace(/^ERROR \d+ \(\w+\) at line \d+: /, '')}`;
    mysql(sock, null, `DROP DATABASE ${name}`);
    const differ = lite !== maria;
    if (!differ) bad++;
    console.log(`  ${differ ? '✓' : '✗ (não difere!)'} ${d.label}: SQLite ${lite} · MariaDB ${maria}`);
  }
  return bad;
}

async function main() {
  const SQL = await initSqlJs();
  configureEngine(SQL);
  const sock = await startServer();
  const version = mysql(sock, null, 'SELECT VERSION() AS v').out.split('\n')[1];
  console.log(`MariaDB ${version} (sql_mode do MySQL 8)\n`);
  let problems = 0;
  for (const ex of SQL_EXERCISES) {
    const notes: string[] = [];
    for (const fx of ex.fixtures) {
      const lite = observe(SQL, ex, fx, ex.solutionSql);
      if ('ok' in lite) throw new Error(`${ex.id}/${fx.id} falhou no SQLite`);
      const db = freshDb(sock, ex, fx.seedSql);
      const g = ex.grading;
      if (g.mode === 'result') {
        const r = mysql(sock, db, ex.solutionSql);
        // resultado vazio: o --batch não imprime nem o cabeçalho (só dá para conferir que não há linhas)
        const got = r.ok ? parseBatch(r.out) ?? { columns: lite.sets[0].columns, rows: [], truncated: false } : null;
        const diff = got ? compareResults(lite.sets[0], got, g) : { kind: 'erro' };
        if (diff) notes.push(`${fx.id}: ${r.ok ? JSON.stringify(diff) : r.err.trim()}`);
      } else if (g.mode === 'state') {
        const r = mysql(sock, db, ex.solutionSql);
        if (!r.ok) notes.push(`${fx.id}: ${r.err.trim()}`);
        g.stateQueries.forEach((q, i) => {
          const s = mysql(sock, db, q.sql);
          const got = s.ok ? parseBatch(s.out) ?? { columns: lite.sets[i].columns, rows: [], truncated: false } : null;
          const diff = got ? compareResults(lite.sets[i], got, { orderMatters: true, columnNamesMatter: false, tolerance: g.tolerance }) : { kind: 'erro' };
          if (diff) notes.push(`${fx.id}/${q.label}: ${JSON.stringify(diff)}`);
        });
      } else {
        const r = mysql(sock, db, ex.solutionSql);
        if (!r.ok) notes.push(`${fx.id}: ${r.err.trim()}`);
        for (const p of g.probes) {
          const t = mysql(sock, db, `START TRANSACTION;\n${p.sql}\nROLLBACK;`);
          if ((t.ok ? 'ok' : 'erro') !== p.expect) notes.push(`${fx.id}: sonda "${p.label}" deu ${t.ok ? 'ok' : 'erro'} (esperado ${p.expect})`);
        }
      }
      mysql(sock, null, `DROP DATABASE ${db}`);
    }
    const same = notes.length === 0;
    const declared = ex.portability ?? 'não declarado';
    const bad = declared === 'sql-comum' && !same;
    if (bad) problems++;
    console.log(`${bad ? '✗' : same ? '✓' : '·'} ${ex.id} — declarado: ${declared}; MariaDB: ${same ? 'mesmo comportamento' : 'diferente'}`);
    for (const x of notes) console.log(`    ${x}`);
  }
  problems += checkDifferences(SQL, sock);
  console.log(problems ? `\n${problems} exercício(s) marcados como sql-comum se comportam diferente.` : '\nTodos os exercícios marcados como sql-comum se comportam igual no MariaDB.');
  stopServer();
  process.exitCode = problems ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  stopServer();
  process.exitCode = 1;
});
