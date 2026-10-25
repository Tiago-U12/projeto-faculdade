// Extração do texto de um PDF, página por página, com pdf.js (no navegador, sem enviar o arquivo a ninguém).
import { LIMITS, looksLikePdf, normalizeExtracted, pdfEncrypted, type PageText } from '../../supabase/functions/_shared/materialQuality';

/** Parte do pdf.js usada aqui (o módulo é carregado sob demanda). */
export interface PdfJs {
  getDocument(src: { data: Uint8Array; isEvalSupported?: boolean; disableFontFace?: boolean; verbosity?: number }): { promise: Promise<PdfDoc>; destroy(): Promise<void> };
}
interface PdfDoc {
  numPages: number;
  getPage(n: number): Promise<{ getTextContent(): Promise<{ items: unknown[] }>; cleanup(): void }>;
}

export class ExtractError extends Error {
  constructor(readonly code: 'nao_pdf' | 'grande' | 'protegido' | 'corrompido' | 'muitas_paginas', message: string) {
    super(message);
  }
}

/** Validação do arquivo antes de ler: tipo real (assinatura %PDF), tamanho e proteção por senha. */
export function checkPdfFile(bytes: Uint8Array, name: string): void {
  if (bytes.byteLength > LIMITS.maxPdfBytes) throw new ExtractError('grande', `O arquivo tem ${(bytes.byteLength / 1048576).toFixed(1).replace('.', ',')} MB; o limite é 10 MB. Divida o PDF ou envie só as páginas da matéria.`);
  if (!looksLikePdf(bytes)) throw new ExtractError('nao_pdf', `“${name}” não é um PDF (o conteúdo não começa como PDF, mesmo que a extensão seja .pdf).`);
  if (pdfEncrypted(bytes)) throw new ExtractError('protegido', 'O PDF está protegido por senha ou criptografia. Salve uma cópia sem proteção ou cole o texto.');
}

/**
 * Junta os pedaços de texto do pdf.js respeitando as quebras de linha que ele informa. Um vão grande na mesma linha
 * (colunas de tabela) vira tabulação, para a análise conseguir avisar que a tabela pode ter perdido a estrutura.
 */
export function itemsToText(items: unknown[]): string {
  let out = '';
  let lastEnd: number | null = null;
  let lastY: number | null = null;
  let space = false;
  for (const it of items) {
    const t = it as { str?: string; hasEOL?: boolean; transform?: number[]; width?: number; height?: number };
    if (typeof t.str !== 'string') continue;
    if (!t.str.trim()) {
      if (t.str) space = true;
    } else {
      const x = t.transform?.[4] ?? 0;
      const y = t.transform?.[5] ?? 0;
      const h = Math.abs(t.transform?.[3] ?? 0) || t.height || 10;
      if (lastEnd !== null && lastY !== null && Math.abs(y - lastY) < h * 0.5 && x - lastEnd > h * 1.5) out += '\t';
      else if (space && out && !/\s$/.test(out)) out += ' ';
      out += t.str;
      lastEnd = x + (t.width ?? 0);
      lastY = y;
      space = false;
    }
    if (t.hasEOL) {
      out += '\n';
      lastEnd = null;
      space = false;
    }
  }
  return normalizeExtracted(out);
}

export async function extractPdf(pdfjs: PdfJs, bytes: Uint8Array, onPage?: (done: number, total: number) => void): Promise<PageText[]> {
  // o pdf.js pode transferir o buffer para o worker: trabalha numa cópia para preservar o original (hash/envio)
  const task = pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false, disableFontFace: true, verbosity: 0 });
  let doc: PdfDoc;
  try {
    doc = await task.promise;
  } catch (e) {
    const name = (e as { name?: string }).name;
    if (name === 'PasswordException') throw new ExtractError('protegido', 'O PDF está protegido por senha. Salve uma cópia sem proteção ou cole o texto.');
    throw new ExtractError('corrompido', 'Não foi possível abrir o PDF (arquivo incompleto ou corrompido). Tente salvar de novo ou exportar como PDF.');
  }
  try {
    if (doc.numPages > LIMITS.maxPages) throw new ExtractError('muitas_paginas', `O PDF tem ${doc.numPages} páginas; o limite é ${LIMITS.maxPages}. Envie só a parte da matéria.`);
    const pages: PageText[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      pages.push({ page: n, text: itemsToText(content.items).slice(0, LIMITS.maxPageChars) });
      page.cleanup();
      onPage?.(n, doc.numPages);
    }
    return pages;
  } finally {
    // no pdf.js 6 quem libera memória e worker é a tarefa de carregamento
    await task.destroy();
  }
}

let loaded: Promise<PdfJs> | null = null;
/** Carrega o pdf.js (versão "legacy", compatível com navegadores de celular mais antigos) só quando precisa. */
export function loadPdfJs(): Promise<PdfJs> {
  loaded ??= Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')]).then(
    ([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib as unknown as PdfJs;
    },
    () => {
      // o leitor de PDF é baixado no primeiro uso (fica fora do pré-cache): sem internet nessa hora, não há como ler
      loaded = null;
      throw new ExtractError('corrompido', 'O leitor de PDF ainda não foi baixado neste aparelho. Conecte-se à internet e tente de novo (depois funciona offline).');
    },
  );
  return loaded;
}
