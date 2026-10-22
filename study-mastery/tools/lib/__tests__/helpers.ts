import type { SourceRecord, Taxonomy } from '../../../src/types';
import { toQuestion, type DraftSpec } from '../dsl';

export const TAX: Taxonomy = {
  semester: 'test',
  disciplines: [
    { id: 'calculo2', name: 'Cálculo II', short: 'C2', subtitle: '', icon: '∫', accent: 'mint', topics: [{ id: 'lhopital', name: "L'Hôpital", quota: { facil: 2, medio: 1, dificil: 1 }, sourceIds: ['src-aula'] }, { id: 'primitivas', name: 'Primitivas', quota: { facil: 1, medio: 1, dificil: 1 }, sourceIds: ['src-aula'] }] },
    { id: 'fullstack', name: 'Full Stack', short: 'FS', subtitle: '', icon: '</>', accent: 'purple', topics: [{ id: 'js-funcoes', name: 'JS', quota: { facil: 1, medio: 1, dificil: 1 }, sourceIds: ['src-aula'] }] },
  ],
};

export const SOURCES: SourceRecord[] = [
  { id: 'src-aula', title: 'Aula', kind: 'aula-pdf', disciplineId: 'calculo2', origin: 'x', usage: 'u', accessed: true, topicIds: [] },
  { id: 'src-ext-nao-lida', title: 'Ext', kind: 'externa-oficial', disciplineId: 'calculo2', origin: 'x', usage: 'u', accessed: false, topicIds: [] },
  { id: 'src-mdn', title: 'MDN', kind: 'externa-oficial', disciplineId: 'fullstack', origin: 'x', usage: 'u', accessed: true, topicIds: [] },
];

export const LONG = 'Esta explicação é longa o bastante para passar na checagem de tamanho mínimo exigida pelo validador.';

export function limitSpec(over: Partial<DraftSpec> = {}): DraftSpec {
  return {
    id: 'c2-lhopital-001',
    d: 'calculo2',
    topic: 'lhopital',
    diff: 'facil',
    scope: 'aula',
    stem: 'Calcule o limite $\\lim_{x\\to 0} \\frac{\\sin x}{x}$ usando a regra de L’Hôpital.',
    opts: ['$1$', '$0$', '$\\infty$', 'O limite não existe'],
    why: ['Derivar dá $\\cos x/1$, cujo limite é 1, não 0.', 'O limite é finito: a razão das derivadas vale 1.', 'A forma é 0/0, mas o resultado é finito.'],
    exp: LONG,
    steps: ['Verifique que é 0/0.', 'Derive numerador e denominador.', 'Avalie o limite de $\\cos x$.'],
    src: [['src-aula', 'slide 7']],
    verify: { kind: 'limit', params: { expr: 'sin(x)/x', var: 'x', at: '0', dir: '+-' }, values: ['1', '0', 'oo', 'DNE'] },
    ...over,
  };
}

export function jsSpec(over: Partial<DraftSpec> = {}): DraftSpec {
  return {
    id: 'fs-js-funcoes-001',
    d: 'fullstack',
    topic: 'js-funcoes',
    diff: 'medio',
    scope: 'aprofundamento',
    stem: 'O que o código abaixo imprime?\n\n```js\nconst a=[3,1,2];\nconst b=[...a].sort();\nconsole.log(a.join(),b.join());\n```',
    opts: ['3,1,2 1,2,3', '1,2,3 1,2,3', '3,1,2 3,1,2', '1,2,3 3,1,2'],
    why: ['O sort ordenou o original, mas a cópia foi ordenada, não o original.', 'O sort só afeta a cópia: o original não muda.', 'A cópia foi ordenada pelo sort.'],
    exp: LONG,
    src: [['src-mdn', 'Array.prototype.sort']],
    verify: { kind: 'js', params: { code: 'const a=[3,1,2];const b=[...a].sort();console.log(a.join(),b.join());' }, values: ['3,1,2 1,2,3', '1,2,3 1,2,3', '3,1,2 3,1,2', '1,2,3 3,1,2'] },
    ...over,
  };
}

export const mk = (s: DraftSpec) => toQuestion(s, '2026-10-22T00:00:00.000Z');
