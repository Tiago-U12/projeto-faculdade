// Comparação de resultados SQL (funções puras). Regras:
//  - NULL só é igual a NULL (nunca a 0, '' ou ausência);
//  - números com tolerância configurável; texto exato;
//  - linhas comparadas como multiconjunto (duplicatas contam) ou posição a posição quando a ordem importa;
//  - sem exigência de alias, colunas com os mesmos nomes em outra ordem são reordenadas; nomes diferentes são
//    comparados pela posição.
import type { ResultSet, SqlValue } from './types';

export interface CompareOptions {
  orderMatters: boolean;
  orderKeys?: { column: string; desc?: boolean }[];
  columnNamesMatter: boolean;
  tolerance: number;
}

export type Difference =
  | { kind: 'columns-count'; expected: number; actual: number }
  | { kind: 'column-names'; missing: string[] }
  | { kind: 'row-count'; expected: number; actual: number }
  | { kind: 'order' }
  | { kind: 'duplicates'; extra: boolean }
  | { kind: 'null-mismatch' }
  | { kind: 'values'; rows: number };

export function valueEquals(a: SqlValue, b: SqlValue, tolerance: number): boolean {
  if (a === null || b === null) return a === b;
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isInteger(a) && Number.isInteger(b)) return a === b;
    return Math.abs(a - b) <= tolerance;
  }
  return a === b;
}

const rowEquals = (a: SqlValue[], b: SqlValue[], tol: number) => a.length === b.length && a.every((v, i) => valueEquals(v, b[i], tol));

/** Reordena as colunas do resultado do estudante para a ordem esperada, quando os nomes batem (sem exigir alias). */
export function alignColumns(expected: ResultSet, actual: ResultSet): ResultSet {
  const exp = expected.columns.map((c) => c.toLowerCase());
  const act = actual.columns.map((c) => c.toLowerCase());
  if (exp.length !== act.length || new Set(act).size !== act.length || !exp.every((c) => act.includes(c))) return actual;
  const idx = exp.map((c) => act.indexOf(c));
  return { ...actual, columns: idx.map((i) => actual.columns[i]), rows: actual.rows.map((r) => idx.map((i) => r[i])) };
}

/** Pareamento guloso tolerante (tabelas de exercício são pequenas): devolve as linhas esperadas sem par. */
function unmatched(expected: SqlValue[][], actual: SqlValue[][], tol: number): { missing: SqlValue[][]; extra: SqlValue[][] } {
  const used = new Array(actual.length).fill(false);
  const missing: SqlValue[][] = [];
  for (const e of expected) {
    const i = actual.findIndex((a, j) => !used[j] && rowEquals(e, a, tol));
    if (i < 0) missing.push(e);
    else used[i] = true;
  }
  return { missing, extra: actual.filter((_, j) => !used[j]) };
}

/** Ordem do SQLite: NULL < números < texto; texto pela colação BINARY (código a código). */
export function sqlCompare(a: SqlValue, b: SqlValue): number {
  const rank = (v: SqlValue) => (v === null ? 0 : typeof v === 'number' ? 1 : 2);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (a === null || b === null) return 0;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** O resultado está ordenado pela chave? (índices nas colunas esperadas; -1 = coluna inexistente → não confere). */
function sortedBy(rows: SqlValue[][], keys: { index: number; desc: boolean }[]): boolean {
  for (let i = 1; i < rows.length; i++) {
    for (const k of keys) {
      const c = sqlCompare(rows[i - 1][k.index], rows[i][k.index]) * (k.desc ? -1 : 1);
      if (c < 0) break;
      if (c > 0) return false;
    }
  }
  return true;
}

const key = (r: SqlValue[]) => JSON.stringify(r.map((v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v)));

/** Primeira diferença relevante (null = resultados equivalentes). */
export function compareResults(expected: ResultSet, actualRaw: ResultSet, o: CompareOptions): Difference | null {
  if (actualRaw.columns.length !== expected.columns.length) return { kind: 'columns-count', expected: expected.columns.length, actual: actualRaw.columns.length };
  if (o.columnNamesMatter) {
    const act = actualRaw.columns.map((c) => c.toLowerCase());
    const missing = expected.columns.filter((c) => !act.includes(c.toLowerCase()));
    if (missing.length) return { kind: 'column-names', missing };
  }
  const actual = alignColumns(expected, actualRaw);
  if (actual.rows.length !== expected.rows.length) {
    // mesmas linhas distintas, multiplicidade diferente = problema de duplicatas
    const ek = new Set(expected.rows.map(key));
    const ak = new Set(actual.rows.map(key));
    if (ek.size === ak.size && [...ek].every((k) => ak.has(k))) return { kind: 'duplicates', extra: actual.rows.length > expected.rows.length };
    return { kind: 'row-count', expected: expected.rows.length, actual: actual.rows.length };
  }
  const { missing, extra } = unmatched(expected.rows, actual.rows, o.tolerance);
  if (missing.length) {
    // NULL onde se esperava valor (ou o contrário), mantendo o resto da linha: confusão clássica com 0/''/COALESCE
    const nullSwap = missing.some((m) => extra.some((x) => m.some((v, i) => (v === null) !== (x[i] === null)) && m.every((v, i) => v === null || x[i] === null || valueEquals(v, x[i], o.tolerance))));
    return nullSwap ? { kind: 'null-mismatch' } : { kind: 'values', rows: missing.length };
  }
  if (o.orderMatters) {
    const cols = expected.columns.map((c) => c.toLowerCase());
    const keys = (o.orderKeys ?? []).map((k) => ({ index: cols.indexOf(k.column.toLowerCase()), desc: !!k.desc }));
    const ok = keys.length && keys.every((k) => k.index >= 0) ? sortedBy(actual.rows, keys) : expected.rows.every((r, i) => rowEquals(r, actual.rows[i], o.tolerance));
    if (!ok) return { kind: 'order' };
  }
  return null;
}
