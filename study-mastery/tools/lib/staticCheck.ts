import katex from 'katex';
import type { Question, SourceRecord, Taxonomy } from '../../src/types';
import { DIFFICULTIES, SCOPES } from '../../src/types';

export interface Issue {
  id: string;
  level: 'error' | 'warn';
  code: string;
  message: string;
}

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BANNED_OPTION = /\b(todas as (alternativas|anteriores|op[cç][oõ]es)|nenhuma das (alternativas|anteriores)|ambas? as (alternativas|anteriores)|n[aã]o (sei|h[aá] resposta))\b/i;
const MIN_EXPLANATION = 60;
const MIN_WRONG_REASON = 12;

/** Extrai trechos $...$ e $$...$$ (ignorando `$` dentro de blocos de código). */
export function extractMath(text: string): { tex: string; display: boolean }[] {
  const out: { tex: string; display: boolean }[] = [];
  const noCode = text.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' ');
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(noCode))) out.push(m[1] !== undefined ? { tex: m[1], display: true } : { tex: m[2], display: false });
  return out;
}

export function countDollarsOutsideCode(text: string): number {
  const noCode = text.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' ');
  return (noCode.match(/(?<!\\)\$/g) ?? []).length;
}

export function checkMathSyntax(text: string): string[] {
  const errs: string[] = [];
  if (countDollarsOutsideCode(text) % 2 !== 0) errs.push('número ímpar de "$" (delimitador de fórmula não fechado)');
  for (const { tex, display } of extractMath(text)) {
    try {
      katex.renderToString(tex, { throwOnError: true, displayMode: display, strict: 'ignore' });
    } catch (e) {
      errs.push(`LaTeX inválido «${tex.slice(0, 50)}»: ${(e as Error).message.slice(0, 80)}`);
    }
  }
  return errs;
}

export function allTexts(q: Question): string[] {
  const e = q.explanation;
  return [q.stem, ...q.options.map((o) => o.text), e?.correct ?? '', ...(e?.steps ?? []), ...Object.values(e?.wrong ?? {}), ...(e?.commonMistakes ?? [])];
}

const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

export function staticCheck(q: Question, tax: Taxonomy, sources: SourceRecord[], opts: { requireComplete: boolean }): Issue[] {
  const issues: Issue[] = [];
  const add = (level: Issue['level'], code: string, message: string) => issues.push({ id: q.id, level, code, message });
  if (!q.id || !ID_RE.test(q.id)) add('error', 'id', 'ID ausente ou fora do padrão [a-z0-9-]');
  const disc = tax.disciplines.find((d) => d.id === q.disciplineId);
  if (!disc) add('error', 'discipline', `disciplina desconhecida: ${q.disciplineId}`);
  else if (!disc.topics.some((t) => t.id === q.topicId)) add('error', 'topic', `assunto desconhecido em ${q.disciplineId}: ${q.topicId}`);
  if (!DIFFICULTIES.includes(q.difficulty)) add('error', 'difficulty', `dificuldade inválida: ${q.difficulty}`);
  if (!SCOPES.includes(q.scope)) add('error', 'scope', `camada inválida: ${q.scope}`);
  if (q.type !== 'multiple-choice') add('error', 'type', 'apenas multiple-choice é suportado');
  if (!q.stem || q.stem.trim().length < 15) add('error', 'stem', 'enunciado ausente ou curto demais');
  if (q.stem && q.stem.length > 1500) add('warn', 'stem-long', 'enunciado muito longo (>1500)');

  // alternativas
  if (!Array.isArray(q.options) || q.options.length !== 4) add('error', 'options-count', 'exatamente 4 alternativas');
  else {
    const ids = q.options.map((o) => o.id);
    if (new Set(ids).size !== ids.length) add('error', 'options-ids', 'ids de alternativas repetidos');
    const texts = q.options.map((o) => norm(o.text));
    if (texts.some((t) => !t)) add('error', 'options-empty', 'alternativa vazia');
    if (new Set(texts).size !== texts.length) add('error', 'options-dup', 'alternativas duplicadas');
    if (!ids.includes(q.correctOptionId)) add('error', 'answer', 'correctOptionId não corresponde a nenhuma alternativa');
    if (!q.fixedOrder && q.options.some((o) => BANNED_OPTION.test(o.text))) add('error', 'options-relational', 'alternativas do tipo "todas/nenhuma das anteriores" dependem da ordem e são ambíguas');
    const lens = q.options.map((o) => o.text.length);
    const correctLen = q.options.find((o) => o.id === q.correctOptionId)?.text.length ?? 0;
    if (correctLen > 0 && correctLen === Math.max(...lens) && correctLen > 2.2 * (lens.reduce((a, b) => a + b, 0) - correctLen) / 3 && correctLen > 40) add('warn', 'longest-correct', 'a alternativa correta é muito mais longa que as demais (dica de resposta)');
  }

  // explicação
  const ex = q.explanation;
  if (!ex || !ex.correct || ex.correct.trim().length < MIN_EXPLANATION) add('error', 'explanation', `explicação da resposta correta ausente/curta (mín. ${MIN_EXPLANATION} caracteres)`);
  if (opts.requireComplete && ex && q.options?.length === 4) {
    for (const o of q.options) {
      if (o.id === q.correctOptionId) continue;
      const w = ex.wrong?.[o.id];
      if (!w || w.trim().length < MIN_WRONG_REASON) add('error', 'explanation-wrong', `falta o motivo pelo qual a alternativa ${o.id} está errada`);
    }
  }

  // fontes
  if (!q.sourceRefs?.length) add('error', 'sources', 'referência de fonte obrigatória');
  for (const r of q.sourceRefs ?? []) {
    const s = sources.find((x) => x.id === r.sourceId);
    if (!s) add('error', 'source-unknown', `fonte não cadastrada: ${r.sourceId}`);
    else {
      if (!s.accessed) add('error', 'source-unaccessed', `fonte "${r.sourceId}" ainda não foi lida/consultada (accessed=false) — não é permitido alegar proveniência`);
      if (s.disciplineId !== q.disciplineId) add('warn', 'source-discipline', `fonte ${r.sourceId} pertence a outra disciplina`);
    }
  }
  if ((q.scope === 'aula') && !(q.sourceRefs ?? []).some((r) => sources.find((s) => s.id === r.sourceId && (s.kind.startsWith('aula') || s.kind === 'lista' || s.kind === 'programa')))) {
    add('error', 'scope-aula-source', 'camada "aula" exige ao menos uma fonte de aula/lista/programa da faculdade');
  }

  // matemática
  for (const t of allTexts(q)) for (const m of checkMathSyntax(t)) add('error', 'math', m);

  // verificação
  if (opts.requireComplete) {
    const v = q.verification;
    if (!v) add('error', 'verification-missing', 'especificação de verificação ausente');
    else {
      if (v.kind !== 'source') {
        const ids = new Set(q.options?.map((o) => o.id));
        const keys = Object.keys(v.optionValues ?? {});
        if (keys.length !== 4 || keys.some((k) => !ids.has(k))) add('error', 'verification-values', 'optionValues deve cobrir as 4 alternativas');
        if ((['limit', 'form', 'definite', 'derivative', 'integral', 'expr', 'function'].includes(v.kind)) && !(ex?.steps?.length)) add('error', 'steps', 'questões de cálculo exigem resolução passo a passo (explanation.steps)');
      } else if (!v.claims?.length) add('error', 'claims', 'kind=source exige claims (afirmações conferidas na fonte)');
    }
  }
  return issues;
}
