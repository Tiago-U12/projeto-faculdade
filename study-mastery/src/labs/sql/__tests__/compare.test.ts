// Comparação de resultados (funções puras): NULL, tolerância, duplicatas, colunas e ordem com empates.
import { describe, expect, it } from 'vitest';
import { alignColumns, compareResults, sqlCompare, valueEquals } from '../compare';
import { explainError, feedbackFor } from '../feedback';
import type { ResultSet, SqlValue } from '../types';

const rs = (columns: string[], rows: SqlValue[][]): ResultSet => ({ columns, rows, truncated: false });
const loose = { orderMatters: false, columnNamesMatter: false, tolerance: 0.01 };

describe('valueEquals', () => {
  it('NULL só é igual a NULL; números com tolerância; inteiros e texto exatos', () => {
    expect(valueEquals(null, null, 0)).toBe(true);
    expect(valueEquals(null, 0, 0)).toBe(false);
    expect(valueEquals('', null, 0)).toBe(false);
    expect(valueEquals(1.666667, 1.67, 0.01)).toBe(true);
    expect(valueEquals(1.6, 1.67, 0.01)).toBe(false);
    expect(valueEquals(2, 3, 5)).toBe(false);
    expect(valueEquals('Ana', 'ana', 0)).toBe(false);
    expect(valueEquals('10', 10, 0)).toBe(false);
  });
});

describe('compareResults', () => {
  const exp = rs(['nome', 'total'], [['Ana', 10], ['Bia', 20], ['Ana', 10]]);

  it('aceita a mesma multiconsulta em outra ordem quando a ordem não importa', () => {
    expect(compareResults(exp, rs(['nome', 'total'], [['Ana', 10], ['Ana', 10], ['Bia', 20]]), loose)).toBeNull();
  });

  it('duplicatas contam: faltando ou sobrando', () => {
    expect(compareResults(exp, rs(['nome', 'total'], [['Ana', 10], ['Bia', 20]]), loose)).toEqual({ kind: 'duplicates', extra: false });
    expect(compareResults(rs(['n'], [['a']]), rs(['n'], [['a'], ['a']]), loose)).toEqual({ kind: 'duplicates', extra: true });
  });

  it('número de colunas, nomes exigidos e alinhamento por nome', () => {
    expect(compareResults(exp, rs(['nome'], [['Ana'], ['Bia'], ['Ana']]), loose)).toEqual({ kind: 'columns-count', expected: 2, actual: 1 });
    expect(compareResults(exp, rs(['total', 'nome'], [[10, 'Ana'], [20, 'Bia'], [10, 'Ana']]), loose)).toBeNull();
    expect(compareResults(exp, rs(['cliente', 'soma'], [['Ana', 10], ['Bia', 20], ['Ana', 10]]), loose)).toBeNull();
    expect(compareResults(exp, rs(['cliente', 'total'], exp.rows), { ...loose, columnNamesMatter: true })).toEqual({ kind: 'column-names', missing: ['nome'] });
    expect(alignColumns(exp, rs(['NOME', 'Total'], [['x', 1]])).columns).toEqual(['NOME', 'Total']);
  });

  it('NULL trocado por 0 é apontado como problema de NULL', () => {
    expect(compareResults(rs(['a', 'b'], [['x', null]]), rs(['a', 'b'], [['x', 0]]), loose)).toEqual({ kind: 'null-mismatch' });
    expect(compareResults(rs(['a', 'b'], [['x', 1]]), rs(['a', 'b'], [['y', 2]]), loose)).toEqual({ kind: 'values', rows: 1 });
  });

  it('ordem: posição a posição, ou pela chave pedida (empates sem desempate não viram erro)', () => {
    const e = rs(['nome', 'preco'], [['A', 1], ['B', 2], ['C', 2]]);
    const swapped = rs(['nome', 'preco'], [['A', 1], ['C', 2], ['B', 2]]);
    expect(compareResults(e, swapped, { ...loose, orderMatters: true })).toEqual({ kind: 'order' });
    expect(compareResults(e, swapped, { ...loose, orderMatters: true, orderKeys: [{ column: 'preco' }] })).toBeNull();
    expect(compareResults(e, swapped, { ...loose, orderMatters: true, orderKeys: [{ column: 'preco' }, { column: 'nome' }] })).toEqual({ kind: 'order' });
    expect(compareResults(e, rs(['nome', 'preco'], [['B', 2], ['C', 2], ['A', 1]]), { ...loose, orderMatters: true, orderKeys: [{ column: 'preco', desc: true }] })).toBeNull();
  });

  it('sqlCompare segue a ordem do SQLite: NULL < número < texto', () => {
    expect([3, 'b', null, 'a', 1].sort(sqlCompare)).toEqual([null, 1, 3, 'a', 'b']);
  });
});

describe('feedback', () => {
  const fixture = { id: 'f', label: 'Caso', seedSql: '', hint: 'Dica do caso.' };
  it('explica erros do SQLite em português e mantém o original', () => {
    expect(explainError('no such column: precos', 'runtime')).toBe('A coluna "precos" não existe (ou a tabela dela não está no FROM/JOIN). Confira os nomes na aba Dados. (SQLite: no such column: precos)');
    expect(explainError('incomplete input', 'syntax')).toMatch(/incompleto/);
    expect(explainError('qualquer coisa', 'runtime')).toMatch(/recusou o comando/);
    expect(explainError('Mais de 50 comandos num envio.', 'limit')).toBe('Mais de 50 comandos num envio.');
  });
  it('desafio tira a dica do caso e os números exatos', () => {
    const d = { kind: 'row-count' as const, expected: 2, actual: 3 };
    expect(feedbackFor(d, { fixture, studentSql: '', lean: false, mode: 'result' })).toBe('Seu resultado tem 3 linhas; o esperado são 2. Dica do caso.');
    expect(feedbackFor(d, { fixture, studentSql: '', lean: true, mode: 'result' })).toBe('Quantidade de linhas diferente da esperada.');
  });
  it('dicas pelo sintoma: = NULL e DISTINCT que removeu duplicatas', () => {
    expect(feedbackFor({ kind: 'row-count', expected: 1, actual: 0 }, { fixture, studentSql: 'where x = null', lean: false, mode: 'result' })).toMatch(/IS NULL/);
    expect(feedbackFor({ kind: 'duplicates', extra: false }, { fixture, studentSql: 'select distinct nome', lean: false, mode: 'result' })).toMatch(/DISTINCT removeu/);
  });
});
