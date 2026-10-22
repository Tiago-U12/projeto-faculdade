import type { Question } from '../../src/types';

const STOP = new Set('a o as os um uma uns umas de do da dos das em no na nos nas por para com sem que qual quais e ou se ao aos é são ser foi como mais menos já também'.split(' '));

export function tokens(text: string): string[] {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\$[^$]*\$/g, (m) => ' ' + m.replace(/[^a-z0-9]/g, ' ') + ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t && !STOP.has(t));
}

function shingles(toks: string[], n = 2): Set<string> {
  const s = new Set<string>();
  if (toks.length < n) toks.forEach((t) => s.add(t));
  for (let i = 0; i + n <= toks.length; i++) s.add(toks.slice(i, i + n).join(' '));
  return s;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Mascara números e coeficientes: "calcule lim (x²+3)…" e "(x²+5)…" geram o mesmo molde. */
export function numberMaskedSignature(text: string): string {
  return tokens(text.replace(/\d+([.,]\d+)?/g, '#')).join(' ');
}

/** Assinatura estrutural da expressão a verificar (números → #, variáveis preservadas). */
export function expressionShape(q: Question): string | null {
  const p = q.verification?.params as Record<string, unknown> | undefined;
  const e = (p?.expr ?? p?.code) as string | undefined;
  if (!e) return null;
  return `${q.verification!.kind}:` + e.replace(/\s+/g, '').replace(/\d+(\.\d+)?/g, '#');
}

export interface DupPair {
  a: string;
  b: string;
  kind: 'texto' | 'molde-numerico' | 'expressao-igual';
  score: number;
}

export function findDuplicates(qs: Question[], thresholds = { text: 0.62, masked: 0.8 }): DupPair[] {
  const info = qs.map((q) => {
    const full = q.stem + ' ' + q.options.map((o) => o.text).join(' ');
    return { q, sh: shingles(tokens(q.stem)), shFull: shingles(tokens(full)), masked: numberMaskedSignature(q.stem), shape: expressionShape(q), exact: q.verification?.params ? JSON.stringify(q.verification.params).replace(/\s+/g, '') : null };
  });
  const out: DupPair[] = [];
  for (let i = 0; i < info.length; i++) {
    for (let j = i + 1; j < info.length; j++) {
      const A = info[i];
      const B = info[j];
      if (A.q.disciplineId !== B.q.disciplineId) continue;
      if (A.exact && A.exact === B.exact && A.q.verification?.kind === B.q.verification?.kind) {
        out.push({ a: A.q.id, b: B.q.id, kind: 'expressao-igual', score: 1 });
        continue;
      }
      const sTxt = Math.max(jaccard(A.sh, B.sh), jaccard(A.shFull, B.shFull));
      if (sTxt >= thresholds.text) {
        out.push({ a: A.q.id, b: B.q.id, kind: 'texto', score: sTxt });
        continue;
      }
      // mesmo molde com números trocados: enunciado muito parecido após mascarar + mesma forma da expressão
      if (A.masked && A.masked === B.masked && A.q.topicId === B.q.topicId && A.q.stem.length > 25 && A.shape && A.shape === B.shape) out.push({ a: A.q.id, b: B.q.id, kind: 'molde-numerico', score: 1 });
      else if (A.shape && A.shape === B.shape && A.q.topicId === B.q.topicId && jaccard(shingles(tokens(A.masked)), shingles(tokens(B.masked))) >= thresholds.masked) out.push({ a: A.q.id, b: B.q.id, kind: 'molde-numerico', score: 0.9 });
    }
  }
  return out;
}
