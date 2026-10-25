// Extração e análise com a coleção de materiais de teste (tests/fixtures/materiais, conteúdo próprio).
// Usa o pdf.js real (build "legacy", a mesma do navegador) rodando em Node.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { analyzeMaterial, looksLikePdf, segmentText, sha256Hex, suggestTopics } from '../../../supabase/functions/_shared/materialQuality';
import { checkPdfFile, extractPdf, ExtractError, type PdfJs } from '../extract';

const DIR = path.resolve(import.meta.dirname, '../../../tests/fixtures/materiais');
const read = (f: string) => new Uint8Array(fs.readFileSync(path.join(DIR, f)));
let pdfjs: PdfJs;

beforeAll(async () => {
  const lib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  lib.GlobalWorkerOptions.workerSrc = pathToFileURL(path.resolve(import.meta.dirname, '../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
  pdfjs = lib as unknown as PdfJs;
});

async function process(f: string) {
  const bytes = read(f);
  checkPdfFile(bytes, f);
  const pages = await extractPdf(pdfjs, bytes);
  return { pages, analysis: analyzeMaterial(pages, 'pdf') };
}

describe('coleção de materiais de teste', () => {
  it('aula normal: 4 páginas com texto e página de origem; pronta, com aviso de fórmulas', async () => {
    const { pages, analysis } = await process('aula-integrais.pdf');
    expect(pages.map((p) => p.page)).toEqual([1, 2, 3, 4]);
    expect(pages[0].text).toMatch(/^1\. Integração por partes/);
    expect(pages[0].text).toContain('∫ u dv = u·v − ∫ v du');
    expect(analysis.status).toBe('pronto');
    expect(analysis.issues.map((i) => i.code)).toContain('formulas');
    const { suggested } = suggestTopics(pages);
    expect(suggested.map((s) => s.name)).toEqual(expect.arrayContaining(['Integração por partes', 'Substituição trigonométrica', 'Frações parciais', 'Integrais impróprias']));
    expect(suggested.find((s) => s.name === 'Frações parciais')?.pages).toEqual([3]);
  });

  it('assunto já cadastrado é localizado nas páginas (sem acento/maiúsculas importarem)', async () => {
    const { pages } = await process('aula-integrais.pdf');
    const { found, suggested } = suggestTopics(pages, ['integracao por partes', 'Teorema de Fubini']);
    expect(found).toEqual([{ name: 'integracao por partes', pages: [1] }]);
    expect(suggested.map((s) => s.name)).not.toContain('Integração por partes');
  });

  it('slides com uma página só de figura: pronto, avisando a página sem texto', async () => {
    const { analysis, pages } = await process('slides-express.pdf');
    expect(analysis.status).toBe('pronto');
    expect(analysis.issues.find((i) => i.code === 'paginas_sem_texto')?.pages).toEqual([2]);
    expect(suggestTopics(pages).suggested.map((s) => s.name)).toEqual(expect.arrayContaining(['Rotas no Express', 'Middlewares']));
  });

  it('PDF digitalizado (só imagem): precisa de atenção, sem prometer OCR', async () => {
    const { analysis } = await process('digitalizado.pdf');
    expect(analysis.status).toBe('atencao');
    expect(analysis.issues[0]).toMatchObject({ code: 'sem_texto', severity: 'bloqueia' });
    expect(analysis.issues[0].message).toMatch(/não faz OCR/);
  });

  it('conteúdo curto demais: precisa de atenção (insuficiente)', async () => {
    const { analysis } = await process('curto.pdf');
    expect(analysis.issues.map((i) => i.code)).toContain('insuficiente');
    expect(analysis.status).toBe('atencao');
  });

  it('tabela: aviso de estrutura de colunas', async () => {
    const { analysis } = await process('tabela-derivadas.pdf');
    expect(analysis.issues.map((i) => i.code)).toContain('tabelas');
  });

  it('protegido por senha, corrompido e "não é PDF" são recusados com orientação', async () => {
    expect(() => checkPdfFile(read('protegido.pdf'), 'protegido.pdf')).toThrow(/protegido por senha/);
    expect(() => checkPdfFile(read('nao-e-pdf.pdf'), 'nao-e-pdf.pdf')).toThrow(/não é um PDF/);
    expect(looksLikePdf(read('nao-e-pdf.pdf'))).toBe(false);
    const err = await extractPdf(pdfjs, read('corrompido.pdf')).catch((e) => e);
    expect(err).toBeInstanceOf(ExtractError);
    expect((err as ExtractError).code).toBe('corrompido');
    // mesmo sem o /Encrypt no fim do arquivo, o pdf.js pede senha → mesma mensagem
    const enc = await extractPdf(pdfjs, read('protegido.pdf')).catch((e) => e);
    expect((enc as ExtractError).code).toBe('protegido');
  });

  it('arquivo acima de 10 MB é recusado antes de ler', () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set(new TextEncoder().encode('%PDF-1.7'));
    expect(() => checkPdfFile(big, 'grande.pdf')).toThrow(/limite é 10 MB/);
  });

  it('texto colado vira trechos citáveis e passa na análise', () => {
    const text = fs.readFileSync(path.join(DIR, 'texto-colado.txt'), 'utf8');
    const pages = segmentText(text, 600);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.map((p) => p.page)).toEqual(pages.map((_, i) => i + 1));
    expect(pages.map((p) => p.text).join('\n\n').replace(/\s+/g, ' ')).toBe(text.trim().replace(/\s+/g, ' '));
    expect(analyzeMaterial(pages, 'texto').status).toBe('pronto');
  });

  it('hash SHA-256 do arquivo (usado para evitar envio duplicado e conferir no servidor)', async () => {
    const h = await sha256Hex(read('aula-integrais.pdf'));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await sha256Hex(read('aula-integrais.pdf'))).toBe(h);
  });
});
