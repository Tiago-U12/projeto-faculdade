// Qualidade do texto extraído de um material e sugestão de assuntos.
// Módulo sem dependências: usado no navegador (Vite) e nas Edge Functions (Deno), com o mesmo resultado.

export interface PageText {
  page: number;
  text: string;
}

export type IssueCode = 'sem_texto' | 'ilegivel' | 'insuficiente' | 'paginas_sem_texto' | 'formulas' | 'tabelas' | 'muitas_paginas';

export interface MaterialIssue {
  code: IssueCode;
  /** bloqueia = "Precisa de atenção"; aviso = pronto, mas com limitação a conferir */
  severity: 'bloqueia' | 'aviso';
  message: string;
  pages?: number[];
}

export interface Analysis {
  charCount: number;
  wordCount: number;
  emptyPages: number[];
  issues: MaterialIssue[];
  status: 'pronto' | 'atencao';
}

export const LIMITS = {
  maxPages: 300,
  maxPageChars: 20000,
  maxPastedChars: 200000,
  maxPdfBytes: 10 * 1024 * 1024,
  minWords: 150,
} as const;

const LETTER = /\p{L}/gu;
const WORD = /\p{L}{2,}/gu;
const MATH = /[∫∑∏√∞≤≥≠±∂∇πθλμσΔΣΩαβγδε→⇒⇔∈∀∃·×÷^]/gu;
const BROKEN = /[�-]|\(cid:\d+\)/gu;

const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;
const fmtPages = (ps: number[]) => (ps.length > 8 ? ps.slice(0, 8).join(', ') + '…' : ps.join(', '));

/** Limpa o texto extraído: tira caracteres de controle, junta espaços e linhas em branco repetidas. */
export function normalizeExtracted(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .split('\n')
    // espaços repetidos viram um; tabulações (colunas de tabela) ficam como uma só
    .map((l) => l.replace(/[ \u00A0]+/g, ' ').replace(/ ?\t[ \t]*/g, '\t').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Divide um texto colado em trechos (≈ páginas) para citar a origem: "trecho 3". */
export function segmentText(text: string, target = 2500): PageText[] {
  const clean = normalizeExtracted(text).slice(0, LIMITS.maxPastedChars);
  const paras = clean.split(/\n\s*\n/);
  const out: PageText[] = [];
  let cur = '';
  const flush = () => {
    if (cur.trim()) out.push({ page: out.length + 1, text: cur.trim() });
    cur = '';
  };
  for (const p of paras) {
    if (p.length > LIMITS.maxPageChars) {
      flush();
      for (let i = 0; i < p.length; i += target * 2) {
        cur = p.slice(i, i + target * 2);
        flush();
      }
      continue;
    }
    if (cur && cur.length + p.length + 2 > target) flush();
    cur += (cur ? '\n\n' : '') + p;
  }
  flush();
  return out.slice(0, LIMITS.maxPages);
}

export function analyzeMaterial(pages: PageText[], kind: 'pdf' | 'texto'): Analysis {
  const issues: MaterialIssue[] = [];
  const all = pages.map((p) => p.text).join('\n');
  const letters = count(all, LETTER);
  const wordCount = count(all, WORD);
  const emptyPages = pages.filter((p) => count(p.text, LETTER) < 20).map((p) => p.page);

  // nenhuma página com texto de verdade: típico de PDF digitalizado (imagem)
  if (kind === 'pdf' && emptyPages.length === pages.length) {
    issues.push({ code: 'sem_texto', severity: 'bloqueia', message: 'O PDF não tem texto selecionável: parece digitalizado como imagem. Esta versão não faz OCR — envie um PDF com texto ou cole o conteúdo.' });
  } else {
    const broken = count(all, BROKEN);
    const nonSpace = all.replace(/\s/g, '').length || 1;
    if (broken / nonSpace > 0.05 || (nonSpace > 200 && letters / nonSpace < 0.35)) {
      issues.push({ code: 'ilegivel', severity: 'bloqueia', message: 'O texto extraído parece embaralhado (a fonte do PDF não informa os caracteres). Confira a prévia; se estiver ilegível, cole o texto.' });
    }
    if (wordCount < LIMITS.minWords) {
      issues.push({ code: 'insuficiente', severity: 'bloqueia', message: `Pouco conteúdo (${wordCount} palavras) para um guia ou questões confiáveis. Junte mais material ou complete com texto colado.` });
    }
  }
  if (kind === 'pdf' && emptyPages.length && emptyPages.length < pages.length) {
    issues.push({ code: 'paginas_sem_texto', severity: 'aviso', message: `Página(s) ${fmtPages(emptyPages)} sem texto (imagens ou slides só com figura): o conteúdo delas não será usado.`, pages: emptyPages });
  }
  const mathPages = pages.filter((p) => {
    const ns = p.text.replace(/\s/g, '').length;
    return ns > 40 && (count(p.text, MATH) / ns > 0.02 || /\b(lim|dx|dy|sen|cos|tg|ln|log)\b.*[=(]/.test(p.text));
  }).map((p) => p.page);
  if (mathPages.length) {
    issues.push({ code: 'formulas', severity: 'aviso', message: `Há fórmulas nas páginas ${fmtPages(mathPages)}. Frações, expoentes e índices costumam sair em linha corrida na extração: confira os trechos antes de confiar em um cálculo.`, pages: mathPages });
  }
  const tablePages = pages.filter((p) => {
    let run = 0;
    for (const line of p.text.split('\n')) {
      run = /\S+(\t| {2,})\S+(\t| {2,})\S+/.test(line) ? run + 1 : 0;
      if (run >= 3) return true;
    }
    return false;
  }).map((p) => p.page);
  if (tablePages.length) {
    issues.push({ code: 'tabelas', severity: 'aviso', message: `Tabelas nas páginas ${fmtPages(tablePages)} podem ter perdido a organização em colunas.`, pages: tablePages });
  }
  return { charCount: all.length, wordCount, emptyPages, issues, status: issues.some((i) => i.severity === 'bloqueia') ? 'atencao' : 'pronto' };
}

// ---------------------------------------------------------------- assuntos

/** Compara nomes sem acento e sem diferenciar maiúsculas. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const GENERIC = new Set(['sumario', 'indice', 'referencias', 'referencias bibliograficas', 'bibliografia', 'exercicios', 'exercicio', 'lista de exercicios', 'agenda', 'objetivos', 'objetivo', 'obrigado', 'duvidas', 'perguntas', 'resumo', 'conclusao', 'introducao', 'anexo', 'apendice', 'questoes', 'gabarito', 'solucao', 'resolucao', 'exemplo', 'exemplos', 'observacao', 'nota', 'atividade', 'tarefa', 'slide']);
const PREFIX = /^(?:(?:cap[ií]tulo|aula|unidade|m[óo]dulo|t[óo]pico|se[cç][aã]o|parte)\s+\d+[a-z]?\s*[-–—:.)]?\s*|\d+(?:\.\d+)*\s*[-–—.)]?\s+)/i;

function candidate(line: string): string | null {
  let s = line.trim().replace(PREFIX, '').replace(/[\s:;,.–—-]+$/, '').trim();
  if (s.length < 4 || s.length > 70) return null;
  if (/https?:|www\.|@|\d{2}\/\d{2}/.test(s)) return null;
  const words = s.split(/\s+/);
  if (words.length > 8) return null;
  const letters = count(s, LETTER);
  if (letters / s.length < 0.6) return null;
  if (GENERIC.has(fold(s))) return null;
  if (/[.!?]$/.test(line.trim()) && words.length > 4) return null; // frase, não título
  if (s === s.toUpperCase() && s.length > 3) s = s.charAt(0) + s.slice(1).toLowerCase();
  return s;
}

export interface TopicSuggestion {
  name: string;
  pages: number[];
}

/**
 * Sugere assuntos a partir de títulos (início de página/slide e linhas numeradas) e aponta onde assuntos já
 * cadastrados aparecem. São SUGESTÕES: o estudante confirma antes de qualquer uso.
 */
export function suggestTopics(pages: PageText[], existing: string[] = [], max = 12): { suggested: TopicSuggestion[]; found: TopicSuggestion[] } {
  const byKey = new Map<string, { name: string; pages: Set<number>; score: number; first: number }>();
  const known = new Set(existing.map(fold));
  pages.forEach((p, idx) => {
    const lines = p.text.split('\n').map((l) => l.trim()).filter(Boolean);
    lines.forEach((line, i) => {
      const numbered = PREFIX.test(line);
      if (i > 2 && !numbered) return;
      const c = candidate(line);
      if (!c) return;
      const key = fold(c);
      if (known.has(key)) return;
      const cur = byKey.get(key) ?? { name: c, pages: new Set<number>(), score: 0, first: idx };
      cur.pages.add(p.page);
      cur.score += (i === 0 ? 2 : 1) + (numbered ? 1 : 0);
      byKey.set(key, cur);
    });
  });
  const suggested = [...byKey.values()]
    .filter((c) => c.score >= 2)
    .sort((a, b) => b.score - a.score || a.first - b.first)
    .slice(0, max)
    .map((c) => ({ name: c.name, pages: [...c.pages].sort((x, y) => x - y) }));
  const foldedPages = pages.map((p) => ({ page: p.page, text: fold(p.text) }));
  const found = existing
    .map((name) => ({ name, pages: foldedPages.filter((p) => p.text.includes(fold(name))).map((p) => p.page) }))
    .filter((t) => t.pages.length);
  return { suggested, found };
}

// ---------------------------------------------------------------- arquivo PDF

const enc = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
function indexOf(bytes: Uint8Array, needle: number[], from = 0, to = bytes.length): number {
  outer: for (let i = from; i <= Math.min(to, bytes.length) - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (bytes[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

/** Tipo real do arquivo (não a extensão): um PDF começa com "%PDF-" no primeiro KB. */
export function looksLikePdf(bytes: Uint8Array): boolean {
  return indexOf(bytes, enc('%PDF-'), 0, 1024) >= 0;
}

/** PDF protegido por senha/criptografia (dicionário /Encrypt no trailer). */
export function pdfEncrypted(bytes: Uint8Array): boolean {
  return indexOf(bytes, enc('/Encrypt'), Math.max(0, bytes.length - 65536)) >= 0;
}

export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const buf = data instanceof Uint8Array ? data.slice().buffer : data;
  const d = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}
