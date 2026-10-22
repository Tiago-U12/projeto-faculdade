import crypto from 'node:crypto';
import type { DisciplineId, Difficulty, Question, Scope, SourceRef, VerificationSpec } from '../../src/types';
import { hashString, mulberry32, shuffle } from '../../src/lib/rng';

/** Tag para strings com LaTeX sem duplicar barras: m`$\int_0^1 x\,dx$` */
export const m = String.raw;

export interface DraftSpec {
  id: string;
  d: DisciplineId;
  topic: string;
  sub?: string;
  diff: Difficulty;
  scope: Scope;
  stem: string;
  /**
   * a PRIMEIRA é a correta; as demais são distratores. A ordem final é permutada de forma determinística.
   * Forma recomendada: cada distrator como par [texto, motivo] (o motivo nunca se desalinha da alternativa).
   */
  opts: [string, string | [string, string], string | [string, string], string | [string, string]];
  /** alternativa à forma de pares: motivo de cada distrator, na ordem de opts[1..3] */
  why?: [string, string, string];
  exp: string;
  steps?: string[];
  mistakes?: string[];
  src: [sourceId: string, locator?: string, usage?: SourceRef['usage']][];
  verify?: {
    kind: VerificationSpec['kind'];
    params?: Record<string, unknown>;
    /** problema próprio de cada alternativa (mesma ordem de opts): o verificador confere o valor declarado em `values` */
    perOption?: [Record<string, unknown>, Record<string, unknown>, Record<string, unknown>, Record<string, unknown>];
    /** valores verificáveis, paralelos a opts (mesma ordem: correta primeiro) */
    values?: [string, string, string, string];
    claims?: string[];
  };
  fixedOrder?: boolean;
  tags?: string[];
  legacyId?: string;
}

const LETTERS = ['a', 'b', 'c', 'd'];

export function contentHash(q: Question): string {
  const core = { s: q.stem, o: q.options, c: q.correctOptionId, e: q.explanation, v: q.verification ? { k: q.verification.kind, p: q.verification.params, o: q.verification.optionValues, c: q.verification.claims } : null, d: q.difficulty, sc: q.scope, t: q.topicId };
  return crypto.createHash('sha256').update(JSON.stringify(core)).digest('hex').slice(0, 16);
}

function normalizeOptions(spec: DraftSpec): { texts: string[]; whys: string[] } {
  const texts: string[] = [];
  const whys: string[] = [];
  spec.opts.forEach((o, i) => {
    if (Array.isArray(o)) {
      if (i === 0) throw new Error(`${spec.id}: a alternativa correta (primeira) não leva motivo`);
      texts.push(o[0]);
      whys.push(o[1]);
    } else {
      texts.push(o);
      if (i > 0) whys.push(spec.why?.[i - 1] ?? '');
    }
  });
  return { texts, whys };
}

export function toQuestion(spec: DraftSpec, now = new Date().toISOString()): Question {
  const { texts, whys } = normalizeOptions(spec);
  // permutação determinística: a resposta correta não fica sempre na mesma posição nos dados
  const perm = spec.fixedOrder ? [0, 1, 2, 3] : shuffle([0, 1, 2, 3], mulberry32(hashString(spec.id)));
  const options = perm.map((origIdx, pos) => ({ id: LETTERS[pos], text: texts[origIdx].trim() }));
  const idOfOrig = (i: number) => LETTERS[perm.indexOf(i)];
  const wrong: Record<string, string> = {};
  [1, 2, 3].forEach((i) => (wrong[idOfOrig(i)] = whys[i - 1].trim()));
  const q: Question = {
    id: spec.id,
    disciplineId: spec.d,
    topicId: spec.topic,
    ...(spec.sub ? { subtopic: spec.sub } : {}),
    difficulty: spec.diff,
    scope: spec.scope,
    type: 'multiple-choice',
    stem: spec.stem.trim(),
    options,
    correctOptionId: idOfOrig(0),
    ...(spec.fixedOrder ? { fixedOrder: true } : {}),
    explanation: { correct: spec.exp.trim(), ...(spec.steps?.length ? { steps: spec.steps.map((s) => s.trim()) } : {}), wrong, ...(spec.mistakes?.length ? { commonMistakes: spec.mistakes.map((s) => s.trim()) } : {}) },
    sourceRefs: spec.src.map(([sourceId, locator, usage]) => ({ sourceId, ...(locator ? { locator } : {}), usage: usage ?? 'aula' })),
    status: 'draft',
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...(spec.legacyId ? { legacyId: spec.legacyId } : {}),
    ...(spec.tags?.length ? { tags: spec.tags } : {}),
  };
  if (spec.verify) {
    const optionValues = spec.verify.values ? Object.fromEntries(spec.verify.values.map((v, i) => [idOfOrig(i), v])) : undefined;
    const params = spec.verify.perOption ? { ...(spec.verify.params ?? {}), perOption: Object.fromEntries(spec.verify.perOption.map((pp, i) => [idOfOrig(i), pp])) } : spec.verify.params;
    q.verification = { kind: spec.verify.kind, ...(params ? { params } : {}), ...(optionValues ? { optionValues } : {}), ...(spec.verify.claims ? { claims: spec.verify.claims } : {}) };
  }
  return q;
}
