// Feedback educativo do SQL Lab: traduz erros do SQLite e diferenças de resultado em orientações, sem mostrar a
// solução. As heurísticas sobre o texto do SQL só escolhem uma DICA — a correção é sempre pelo comportamento.
import type { Difference } from './compare';
import type { SqlFixture } from './types';

const ERRORS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/no such table: ([\w.]+)/i, (m) => `A tabela "${m[1]}" não existe neste banco. Confira o nome na aba Dados.`],
  [/no such column: ([\w.]+)/i, (m) => `A coluna "${m[1]}" não existe (ou a tabela dela não está no FROM/JOIN). Confira os nomes na aba Dados.`],
  [/ambiguous column name: ([\w.]+)/i, (m) => `A coluna "${m[1]}" existe em mais de uma tabela da consulta. Diga de qual é: tabela.${m[1]} (ou alias.${m[1]}).`],
  [/near "([^"]*)": syntax error/i, (m) => `Erro de sintaxe perto de "${m[1]}". Confira vírgulas, parênteses, aspas e a ordem das cláusulas (SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT).`],
  [/incomplete input/i, () => 'O comando parece incompleto: faltou fechar parênteses ou aspas, ou terminar a cláusula?'],
  [/unrecognized token: "?([^"]*)"?/i, (m) => `Trecho não reconhecido: ${m[1]}. Texto vai entre aspas simples ('assim'); aspas duplas e crases são para nomes.`],
  [/misuse of aggregate/i, () => 'Função de agregação (COUNT, SUM, AVG…) usada fora do lugar. Para filtrar grupos use HAVING, não WHERE.'],
  [/a GROUP BY clause is required before HAVING/i, () => 'HAVING filtra grupos: ele vem depois de um GROUP BY.'],
  [/FOREIGN KEY constraint failed/i, () => 'Chave estrangeira violada: o registro aponta para algo que não existe (ou ainda é referenciado por outra tabela).'],
  [/UNIQUE constraint failed: ([\w.]+)/i, (m) => `Valor repetido em "${m[1]}", que não aceita duplicatas.`],
  [/NOT NULL constraint failed: ([\w.]+)/i, (m) => `"${m[1]}" é obrigatório (NOT NULL) e ficou sem valor.`],
  [/CHECK constraint failed/i, () => 'Uma regra CHECK da tabela recusou o valor.'],
  [/table ([\w.]+) already exists/i, (m) => `A tabela "${m[1]}" já existe neste banco.`],
  [/(\d+) values for (\d+) columns/i, (m) => `O INSERT tem ${m[1]} valor(es) para ${m[2]} coluna(s).`],
  [/SELECTs to the left and right of (UNION|INTERSECT|EXCEPT)/i, (m) => `As consultas dos dois lados do ${m[1]} precisam ter o mesmo número de colunas.`],
  [/out of memory|string or blob too big/i, () => 'A consulta tentou usar memória demais e foi interrompida.'],
];

/** Mensagem do SQLite → orientação em português (com o original entre parênteses, como o aluno verá em outros bancos). */
export function explainError(message: string, kind: 'syntax' | 'runtime' | 'limit'): string {
  if (kind === 'limit') return message;
  for (const [re, fn] of ERRORS) {
    const m = message.match(re);
    if (m) return `${fn(m)} (SQLite: ${message})`;
  }
  return kind === 'syntax' ? `Erro de sintaxe. (SQLite: ${message})` : `O banco recusou o comando. (SQLite: ${message})`;
}

export interface FeedbackContext {
  fixture: SqlFixture;
  studentSql: string;
  /** escopo "desafio": diz o que está errado, com menos pistas */
  lean: boolean;
  mode: 'result' | 'state';
  /** consulta de estado que divergiu (modo state) */
  stateLabel?: string;
}

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/** Dicas por sintomas comuns no texto (só sugestão; a nota vem do comportamento). */
function textHints(sql: string, d: Difference): string[] {
  const out: string[] = [];
  if (/(=|<>|!=)\s*NULL\b/i.test(sql)) out.push('Comparar com NULL usando = ou <> nunca dá verdadeiro: use IS NULL / IS NOT NULL.');
  if (d.kind === 'duplicates' && !d.extra && /\bDISTINCT\b/i.test(sql)) out.push('O DISTINCT removeu linhas que deveriam aparecer repetidas.');
  if (d.kind === 'values' && /[\w)]\s*\/\s*[\w(]/.test(sql))
    out.push('Atenção ao dialeto: no SQLite, divisão entre inteiros descarta as casas (5 / 3 = 1), e DECIMAL com valor redondo (2.00) vira inteiro; no MySQL, 5 / 3 = 1.6667. Use AVG ou multiplique por 1.0.');
  return out;
}

export function feedbackFor(d: Difference, ctx: FeedbackContext): string {
  const where = ctx.mode === 'state' ? `Estado final diferente do esperado${ctx.stateLabel ? ` (${ctx.stateLabel})` : ''}. ` : '';
  let base: string;
  switch (d.kind) {
    case 'columns-count':
      base = `O resultado tem ${plural(d.actual, 'coluna', 'colunas')}; o esperado são ${d.expected}. Confira a lista do SELECT.`;
      break;
    case 'column-names':
      base = `Use os nomes de coluna pedidos no enunciado (faltou: ${d.missing.join(', ')}). Para renomear, use AS.`;
      break;
    case 'row-count':
      base = ctx.lean ? 'Quantidade de linhas diferente da esperada.' : `Seu resultado tem ${plural(d.actual, 'linha', 'linhas')}; o esperado são ${d.expected}.`;
      break;
    case 'duplicates':
      base = d.extra
        ? 'Há linhas repetidas a mais. Um JOIN pode estar multiplicando linhas, ou faltou agrupar.'
        : 'Faltam linhas repetidas: o esperado mantém duplicatas que são dados diferentes com o mesmo valor.';
      break;
    case 'null-mismatch':
      base = 'Há NULL onde deveria haver um valor (ou o contrário). NULL não é 0 nem texto vazio.';
      break;
    case 'values':
      base = ctx.lean ? 'Há valores diferentes dos esperados.' : `${plural(d.rows, 'linha esperada não aparece', 'linhas esperadas não aparecem')} no seu resultado (ou aparece(m) com valores diferentes).`;
      break;
    case 'order':
      base = 'As linhas estão certas, mas a ordem não. Confira o ORDER BY, a direção (ASC/DESC) e o desempate pedido.';
      break;
  }
  const extras = ctx.lean ? [] : [...(ctx.fixture.hint ? [ctx.fixture.hint] : []), ...textHints(ctx.studentSql, d)];
  return [where + base, ...extras].join(' ');
}
