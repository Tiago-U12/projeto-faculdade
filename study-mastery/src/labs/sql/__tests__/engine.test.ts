// SQL Lab com SQLite real (sql.js em Node): soluções de referência e equivalentes passam, erradas falham com feedback
// educativo, e os limites/isolamento valem. Nada aqui compara texto de SQL.
import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { exerciseProblems } from '../../catalog';
import { configureEngine, describeExercise, execute, gradeExercise, runExercise, SQL_LIMITS } from '../engine';
import { SQL_EXERCISES } from '../exercises';
import type { SqlLabExercise } from '../types';

let SQL: SqlJsStatic;
beforeAll(async () => {
  SQL = await initSqlJs();
  configureEngine(SQL);
});

const byId = (id: string): SqlLabExercise => {
  const e = SQL_EXERCISES.find((x) => x.id === id);
  if (!e) throw new Error(id);
  return e;
};
const grade = (id: string, sql: string) => gradeExercise(SQL, byId(id), sql);
const failed = (id: string, sql: string) => grade(id, sql).results.filter((r) => !r.passed);

describe('catálogo do SQL Lab', () => {
  it('tem de 8 a 12 exercícios válidos, com ids únicos e todos os conteúdos pedidos', () => {
    expect(SQL_EXERCISES.length).toBeGreaterThanOrEqual(8);
    expect(SQL_EXERCISES.length).toBeLessThanOrEqual(12);
    expect(new Set(SQL_EXERCISES.map((e) => e.id)).size).toBe(SQL_EXERCISES.length);
    for (const e of SQL_EXERCISES) {
      expect(exerciseProblems(e, 'sql'), e.id).toEqual([]);
      expect(e.fixtures[0].id, e.id).toBe('enunciado');
      expect(e.dialect).toBe('sqlite');
    }
    const all = SQL_EXERCISES.map((e) => e.solutionSql.toUpperCase()).join('\n');
    for (const kw of ['WHERE', 'ORDER BY', 'LIMIT', 'LEFT JOIN', 'JOIN', 'GROUP BY', 'COUNT(', 'SUM(', 'AVG(', 'HAVING', '(SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE TABLE']) expect(all, kw).toContain(kw);
    expect(new Set(SQL_EXERCISES.map((e) => e.grading.mode))).toEqual(new Set(['result', 'state', 'schema']));
  });

  it('a solução de referência passa em todos os bancos de teste; o código inicial não', () => {
    for (const e of SQL_EXERCISES) {
      const ok = gradeExercise(SQL, e, e.solutionSql);
      expect(ok.passed, `${e.id}: ${JSON.stringify(ok.results)}`).toBe(true);
      expect(ok.score).toBe(100);
      expect(gradeExercise(SQL, e, e.starterSql).passed, e.id).toBe(false);
    }
  });

  it('casos adicionais são diferentes do enunciado (cada um testa algo)', () => {
    for (const e of SQL_EXERCISES) {
      const seeds = e.fixtures.map((f) => f.seedSql);
      expect(new Set(seeds).size, e.id).toBe(seeds.length);
      for (const f of e.fixtures.slice(1)) expect(f.hint, `${e.id}/${f.id}`).toBeTruthy();
    }
  });

  it('a aba Dados mostra tabelas, colunas e linhas do enunciado', () => {
    const t = describeExercise(SQL, byId('sql-clientes-acima-de-100'));
    expect(t.map((x) => x.name)).toEqual(['clientes', 'produtos', 'pedidos', 'itens_pedido']);
    const clientes = t[0];
    expect(clientes.columns.map((c) => c.name)).toEqual(['id', 'nome', 'cidade']);
    expect(clientes.columns[0].pk).toBe(true);
    expect(clientes.columns[1].notNull).toBe(true);
    expect(clientes.totalRows).toBe(5);
    expect(clientes.rows[1]).toEqual([2, 'Bruno Lima', null]);
  });
});

describe('soluções equivalentes passam (correção por comportamento)', () => {
  const cases: [string, string][] = [
    ['sql-produtos-ate-50', 'select p.nome as produto, p.preco valor from produtos p where p.preco between 0 and 50 order by p.preco asc, p.nome asc'],
    ['sql-produtos-ate-50', 'SELECT nome, preco FROM produtos WHERE NOT preco > 50 ORDER BY 2, 1;'],
    ['sql-tres-mais-caros', 'SELECT nome, preco FROM produtos ORDER BY preco DESC, nome ASC LIMIT 3 OFFSET 0'],
    ['sql-clientes-sem-cidade', 'SELECT nome, id FROM clientes WHERE cidade IS NULL ORDER BY id'],
    ['sql-pedidos-com-cliente', 'SELECT pedidos.id AS pedido, clientes.nome AS cliente, pedidos.data FROM clientes INNER JOIN pedidos ON pedidos.cliente_id = clientes.id ORDER BY pedido'],
    ['sql-pedidos-com-cliente', 'SELECT p.id, c.nome, p.data FROM pedidos p, clientes c WHERE p.cliente_id = c.id ORDER BY p.id'],
    ['sql-clientes-sem-pedido', 'SELECT nome FROM clientes c WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id) ORDER BY nome'],
    ['sql-clientes-sem-pedido', 'SELECT nome FROM clientes WHERE id NOT IN (SELECT cliente_id FROM pedidos) ORDER BY 1'],
    ['sql-resumo-por-categoria', 'SELECT categoria, COUNT(id), ROUND(AVG(preco), 2) FROM produtos GROUP BY categoria ORDER BY categoria'],
    ['sql-resumo-por-categoria', 'SELECT categoria, COUNT(*) AS qtd, SUM(preco) * 1.0 / COUNT(*) AS media FROM produtos GROUP BY 1 ORDER BY 1'],
    [
      'sql-clientes-acima-de-100',
      'SELECT nome, total FROM (SELECT c.id, c.nome, SUM(i.quantidade * i.preco_unit) AS total FROM clientes c JOIN pedidos p ON p.cliente_id = c.id JOIN itens_pedido i ON i.pedido_id = p.id GROUP BY c.id) t WHERE total > 100 ORDER BY total DESC, nome',
    ],
    ['sql-livros-acima-da-media', 'WITH m AS (SELECT AVG(paginas) AS media FROM livros) SELECT titulo, paginas FROM livros, m WHERE paginas > m.media ORDER BY paginas DESC, titulo'],
    ['sql-reajuste-papelaria', "UPDATE produtos SET preco = ROUND(preco * 1.1, 2) WHERE categoria = 'Papelaria';"],
    ['sql-reajuste-papelaria', "UPDATE produtos SET preco = preco + preco * 0.1 WHERE categoria IN ('Papelaria'); SELECT * FROM produtos;"],
    ['sql-limpar-emprestimos', "DELETE FROM emprestimos WHERE data_devolucao IS NOT NULL AND data_devolucao < '2026-01-01'"],
    [
      'sql-matricular-turma',
      "INSERT INTO disciplinas (nome, creditos) VALUES ('Banco de Dados II', 4); INSERT INTO matriculas (aluno_id, disciplina_id) SELECT id, (SELECT id FROM disciplinas WHERE nome = 'Banco de Dados II') FROM alunos WHERE curso = 'Sistemas de Informação';",
    ],
    [
      'sql-criar-avaliacoes',
      'CREATE TABLE avaliacoes (id INT PRIMARY KEY, produto_id INT NOT NULL REFERENCES produtos(id), nota INT NOT NULL CHECK (nota >= 1 AND nota <= 5), comentario VARCHAR(500))',
    ],
  ];
  it.each(cases)('%s: %s', (id, sql) => {
    const g = grade(id, sql);
    expect(g.passed, JSON.stringify(g.results)).toBe(true);
  });
});

describe('soluções erradas falham com feedback educativo', () => {
  it('limite: < em vez de <= perde o produto de R$ 50,00', () => {
    const f = failed('sql-produtos-ate-50', 'SELECT nome, preco FROM produtos WHERE preco < 50 ORDER BY preco, nome');
    expect(f.map((r) => r.id)).toEqual(['enunciado', 'limite']);
    expect(f[1].message).toMatch(/1 linha; o esperado são 2/);
    expect(f[1].message).toMatch(/exatamente R\$ 50,00/);
  });

  it('ordem: sem o desempate pedido, o empate de preço sai fora de ordem', () => {
    const f = failed('sql-produtos-ate-50', 'SELECT nome, preco FROM produtos WHERE preco <= 50 ORDER BY preco');
    expect(f.map((r) => r.id)).toContain('enunciado');
    expect(f[0].message).toMatch(/ordem/);
  });

  it('ranking: sem desempate, o produto errado entra no top 3', () => {
    const f = failed('sql-tres-mais-caros', 'SELECT nome, preco FROM produtos ORDER BY preco DESC LIMIT 3');
    expect(f.map((r) => r.id)).toEqual(['empate']);
    const asc = failed('sql-tres-mais-caros', 'SELECT nome, preco FROM produtos ORDER BY preco, nome LIMIT 3');
    expect(asc.length).toBeGreaterThan(0);
  });

  it('NULL: "= NULL" não encontra nada e ganha a dica de IS NULL; vazio não é nulo', () => {
    const f = failed('sql-clientes-sem-cidade', 'SELECT id, nome FROM clientes WHERE cidade = NULL ORDER BY id');
    expect(f[0].message).toMatch(/IS NULL/);
    const vazio = failed('sql-clientes-sem-cidade', "SELECT id, nome FROM clientes WHERE cidade IS NULL OR cidade = '' ORDER BY id");
    expect(vazio.map((r) => r.id)).toEqual(['vazio-nao-e-nulo']);
    expect(vazio[0].message).toMatch(/texto vazio/);
  });

  it('JOIN pela coluna errada ou LEFT JOIN a partir de clientes', () => {
    expect(grade('sql-pedidos-com-cliente', 'SELECT p.id, c.nome, p.data FROM pedidos p JOIN clientes c ON c.id = p.id ORDER BY p.id').passed).toBe(false);
    const left = failed('sql-pedidos-com-cliente', 'SELECT p.id, c.nome, p.data FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id ORDER BY p.id');
    expect(left.map((r) => r.id)).toContain('sem-pedido');
  });

  it('clientes sem pedido: comparar por nome falha com homônimos; INNER JOIN não acha ninguém', () => {
    const porNome = failed('sql-clientes-sem-pedido', 'SELECT nome FROM clientes WHERE nome NOT IN (SELECT c.nome FROM clientes c JOIN pedidos p ON p.cliente_id = c.id) ORDER BY nome');
    expect(porNome.map((r) => r.id)).toEqual(['homonimos']);
    expect(porNome[0].message).toMatch(/pelo id/);
    expect(grade('sql-clientes-sem-pedido', 'SELECT c.nome FROM clientes c JOIN pedidos p ON p.cliente_id = c.id WHERE p.id IS NULL').passed).toBe(false);
  });

  it('agregação: arredondar para inteiro não é aceito; tolerância de 2 casas é', () => {
    const f = failed('sql-resumo-por-categoria', 'SELECT categoria, COUNT(*), ROUND(AVG(preco)) FROM produtos GROUP BY categoria ORDER BY categoria');
    expect(f.map((r) => r.id)).toContain('dizima');
  });

  it('HAVING: limite exato, homônimos agrupados por nome e WHERE com agregação', () => {
    const base = 'FROM clientes c JOIN pedidos p ON p.cliente_id = c.id JOIN itens_pedido i ON i.pedido_id = p.id';
    expect(failed('sql-clientes-acima-de-100', `SELECT c.nome, SUM(i.quantidade * i.preco_unit) AS total ${base} GROUP BY c.id HAVING total >= 100 ORDER BY total DESC, c.nome`).map((r) => r.id)).toEqual(['exatamente-100']);
    const porNome = failed('sql-clientes-acima-de-100', `SELECT c.nome, SUM(i.quantidade * i.preco_unit) AS total ${base} GROUP BY c.nome HAVING total > 100 ORDER BY total DESC, c.nome`);
    expect(porNome.map((r) => r.id)).toEqual(['homonimos']);
    const where = failed('sql-clientes-acima-de-100', `SELECT c.nome, SUM(i.quantidade * i.preco_unit) AS total ${base} WHERE SUM(i.quantidade * i.preco_unit) > 100 GROUP BY c.id`);
    expect(where[0].message).toMatch(/HAVING/);
    expect(where[0].message).toMatch(/SQLite: misuse of aggregate/);
  });

  it('dialeto: divisão inteira do SQLite é explicada (no MySQL o mesmo SQL daria 1.6667)', () => {
    const f = failed('sql-resumo-por-categoria', 'SELECT categoria, COUNT(*), SUM(preco) / COUNT(*) FROM produtos GROUP BY categoria ORDER BY categoria');
    expect(f.map((r) => r.id)).toEqual(['dizima']);
    expect(f[0].message).toMatch(/5 \/ 3 = 1/);
  });

  it('subconsulta: média fixada no código falha em outro banco', () => {
    const f = failed('sql-livros-acima-da-media', 'SELECT titulo, paginas FROM livros WHERE paginas > 277.67 ORDER BY paginas DESC, titulo');
    expect(f.map((r) => r.id)).toEqual(['nulos']);
  });

  it('DML: UPDATE sem WHERE e DELETE pela data errada mudam linhas que não deviam', () => {
    const upd = failed('sql-reajuste-papelaria', 'UPDATE produtos SET preco = preco * 1.10');
    expect(upd.map((r) => r.id)).toEqual(['enunciado', 'sem-papelaria', 'mistura']);
    expect(upd[0].message).toMatch(/Estado final diferente do esperado \(tabela produtos\)/);
    expect(failed('sql-limpar-emprestimos', "DELETE FROM emprestimos WHERE data_saida < '2026-01-01'").map((r) => r.id)).toContain('aberto-antigo');
    expect(failed('sql-limpar-emprestimos', "DELETE FROM emprestimos WHERE data_devolucao <= '2026-01-01'").map((r) => r.id)).toEqual(['virada']);
  });

  it('INSERT com id fixo quebra quando o banco já usou aquele id', () => {
    const f = failed(
      'sql-matricular-turma',
      "INSERT INTO disciplinas VALUES (4, 'Banco de Dados II', 4); INSERT INTO matriculas SELECT id, 4, NULL FROM alunos WHERE curso = 'Sistemas de Informação';",
    );
    expect(f.map((r) => r.id)).toEqual(['outros-ids']);
    expect(f[0].message).toMatch(/UNIQUE|repetido/);
  });

  it('desafio dá menos pistas (sem a dica do caso)', () => {
    const f = failed('sql-matricular-turma', "INSERT INTO disciplinas (nome, creditos) VALUES ('Banco de Dados II', 4);");
    expect(f.length).toBe(2);
    for (const r of f) expect(r.message).not.toMatch(/busque o id|Mesmo sem alunos/);
  });

  it('DDL: tabela sem CHECK ou sem chave estrangeira é recusada pelo comportamento', () => {
    const semCheck = grade('sql-criar-avaliacoes', 'CREATE TABLE avaliacoes (id INTEGER PRIMARY KEY, produto_id INTEGER NOT NULL, nota INTEGER NOT NULL, comentario TEXT, FOREIGN KEY (produto_id) REFERENCES produtos(id))');
    expect(semCheck.passed).toBe(false);
    expect(semCheck.results[0].message).toMatch(/nota 6 é recusada/);
    const semFk = grade('sql-criar-avaliacoes', 'CREATE TABLE avaliacoes (id INTEGER PRIMARY KEY, produto_id INTEGER NOT NULL, nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5), comentario TEXT)');
    expect(semFk.results[0].message).toMatch(/produto inexistente/);
    const semColuna = grade('sql-criar-avaliacoes', 'CREATE TABLE avaliacoes (id INTEGER PRIMARY KEY, produto_id INTEGER NOT NULL)');
    expect(semColuna.results[0].message).toMatch(/nota, comentario/);
  });

  it('erro de sintaxe vira orientação, com a mensagem original do SQLite', () => {
    const g = grade('sql-produtos-ate-50', 'SELEC nome FROM produtos');
    expect(g.passed).toBe(false);
    expect(g.summary).toMatch(/Corrija o erro/);
    expect(g.results[0].message).toMatch(/sintaxe perto de "SELEC".*SQLite:/);
    expect(grade('sql-produtos-ate-50', 'SELECT nome FROM produto').results[0].message).toMatch(/tabela "produto" não existe/);
    expect(grade('sql-pedidos-com-cliente', 'SELECT id FROM pedidos p JOIN clientes c ON c.id = p.cliente_id').results[0].message).toMatch(/mais de uma tabela/);
  });

  it('consulta em exercício de consulta que não devolve tabela é explicada', () => {
    expect(grade('sql-produtos-ate-50', "UPDATE produtos SET nome = 'x'").results[0].message).toMatch(/não devolveu uma tabela/);
  });
});

describe('limites e isolamento', () => {
  const ex = byId('sql-produtos-ate-50');

  it('mostra no máximo 1000 linhas e avisa o corte', () => {
    const r = runExercise(SQL, ex, 'WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n LIMIT 5000) SELECT x FROM n');
    expect(r.ok && r.result?.rows.length).toBe(SQL_LIMITS.maxRowsShown);
    expect(r.ok && r.result?.truncated).toBe(true);
  });

  it('recusa SQL grande demais, muitos comandos e resultado gigante na correção', () => {
    expect(runExercise(SQL, ex, `SELECT '${'x'.repeat(SQL_LIMITS.maxSqlChars)}'`)).toMatchObject({ ok: false, kind: 'limit' });
    expect(runExercise(SQL, ex, 'SELECT 1;'.repeat(SQL_LIMITS.maxStatements + 1))).toMatchObject({ ok: false, kind: 'limit' });
    const g = grade('sql-produtos-ate-50', 'WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n LIMIT 6000) SELECT x, x FROM n');
    expect(g.results[0].message).toMatch(/passou de 5\.000 linhas/);
  });

  it('memória: alocação gigante falha com erro em vez de travar', () => {
    const r = runExercise(SQL, ex, 'SELECT length(randomblob(200000000))');
    expect(r.ok).toBe(false);
    expect(r.ok ? '' : r.message).toMatch(/memory|too big/i);
    // e o motor continua funcionando depois
    expect(runExercise(SQL, ex, 'SELECT COUNT(*) FROM produtos')).toMatchObject({ ok: true, result: { rows: [[7]] } });
  });

  it('cada execução usa um banco novo: um DROP não afeta a próxima', () => {
    expect(runExercise(SQL, ex, 'DROP TABLE produtos;')).toMatchObject({ ok: true, statements: 1 });
    expect(runExercise(SQL, ex, 'SELECT COUNT(*) FROM produtos')).toMatchObject({ ok: true, result: { rows: [[7]] } });
    // e a correção também começa do zero em cada caso
    expect(grade('sql-produtos-ate-50', 'DROP TABLE produtos;').passed).toBe(false);
    expect(grade('sql-produtos-ate-50', byId('sql-produtos-ate-50').solutionSql).passed).toBe(true);
  });

  it('sem extensões nem arquivos do sistema: load_extension não existe no runtime', () => {
    const r = runExercise(SQL, ex, "SELECT load_extension('/etc/passwd')");
    expect(r.ok).toBe(false);
  });

  it('chaves estrangeiras valem como no MySQL/InnoDB', () => {
    const r = runExercise(SQL, byId('sql-pedidos-com-cliente'), "INSERT INTO pedidos (id, cliente_id, data) VALUES (999, 12345, '2026-01-01')");
    expect(r).toMatchObject({ ok: false, kind: 'runtime' });
  });

  it('execute: só comentários não é erro (0 comandos) e vazio pede um comando', () => {
    const db = new SQL.Database();
    try {
      expect(execute(db, '-- nada aqui\n', 10)).toMatchObject({ ok: true, statements: 0, result: null });
      expect(execute(db, '   ', 10)).toMatchObject({ ok: false, kind: 'syntax' });
      expect(execute(db, 'SELECT NULL AS a, 1.5 AS b, x\'00ff\' AS c', 10)).toMatchObject({ ok: true, result: { columns: ['a', 'b', 'c'], rows: [[null, 1.5, '[BLOB 2 bytes]']] } });
    } finally {
      db.close();
    }
  });
});
