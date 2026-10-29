// Proteção contra laço infinito no código do estudante: o JavaScript é analisado (acorn, sem executar nada) e cada
// laço ganha uma chamada a __smLoop() no início do corpo — a função, definida pelo harness dentro do sandbox, encerra o
// laço que rodar mais que o limite sem devolver o controle ao navegador. Só insere texto, sem quebrar linhas: os números
// de linha dos erros continuam batendo com o editor.
import { parse, type Node } from 'acorn';
import { simple } from 'acorn-walk';

export interface GuardResult {
  code: string;
  loops: number;
}
export interface GuardSyntaxError {
  error: string;
  line: number;
  column: number;
}

type LoopNode = Node & { body: Node };

export function guardLoops(source: string, sourceType: 'script' | 'module' = 'script'): GuardResult | GuardSyntaxError {
  let ast: Node;
  try {
    ast = parse(source, { ecmaVersion: 'latest', sourceType, locations: true, allowHashBang: true });
  } catch (e) {
    const err = e as SyntaxError & { loc?: { line: number; column: number } };
    return { error: err.message.replace(/\s*\(\d+:\d+\)$/, ''), line: err.loc?.line ?? 0, column: (err.loc?.column ?? 0) + 1 };
  }
  const inserts: { at: number; text: string; order: number }[] = [];
  const visit = (n: Node) => {
    const body = (n as LoopNode).body;
    if (body.type === 'BlockStatement') inserts.push({ at: body.start + 1, text: '__smLoop();', order: 0 });
    else {
      inserts.push({ at: body.start, text: '{__smLoop();', order: 0 });
      inserts.push({ at: body.end, text: '}', order: 1 });
    }
  };
  simple(ast, { ForStatement: visit, ForInStatement: visit, ForOfStatement: visit, WhileStatement: visit, DoWhileStatement: visit });
  // de trás para frente: posições anteriores continuam válidas
  inserts.sort((a, b) => b.at - a.at || b.order - a.order);
  let code = source;
  for (const i of inserts) code = code.slice(0, i.at) + i.text + code.slice(i.at);
  return { code, loops: inserts.filter((i) => i.order === 0).length };
}
