// Regras da função process-material com banco e Storage SIMULADOS (o comportamento da API real do Supabase só é
// comprovado no projeto hospedado). Usa os PDFs da coleção de teste.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { sha256Hex, type PageText } from '../../supabase/functions/_shared/materialQuality';
import { processMaterial, storagePath, type MaterialRow, type ProcessDeps } from '../../supabase/functions/_shared/processMaterial';

const FIX = path.resolve(import.meta.dirname, '../fixtures/materiais');
const pdf = new Uint8Array(fs.readFileSync(path.join(FIX, 'aula-integrais.pdf')));
const longText = Array.from({ length: 4 }, (_, i) => ({ page: i + 1, text: `${i + 1}. Assunto ${i}\n` + 'Texto de estudo com conteúdo suficiente para análise. '.repeat(12) }));

function world(m: Partial<MaterialRow>, files: Record<string, Uint8Array>, pages: PageText[]) {
  const row: MaterialRow = { id: 'm1', owner_id: 'u1', kind: 'pdf', status: 'processando', file_size: pdf.byteLength, sha256: '', page_count: pages.length, server_checked_at: null, ...m };
  const updates: Record<string, unknown>[] = [];
  const removed: string[] = [];
  const deps: ProcessDeps = {
    getMaterial: async (id) => (id === row.id ? row : null),
    getPages: async () => pages,
    download: async (p) => files[p] ?? null,
    update: async (_o, _i, patch) => void updates.push(patch),
    removeFile: async (p) => void removed.push(p),
    now: () => '2026-10-24T12:00:00.000Z',
  };
  return { deps, updates, removed };
}

describe('process-material (simulado)', () => {
  it('PDF íntegro e texto completo: marca conferido com o estado da análise', async () => {
    const w = world({ sha256: await sha256Hex(pdf) }, { [storagePath('u1', 'm1')]: pdf }, longText);
    const r = await processMaterial(w.deps, 'm1');
    expect(r).toMatchObject({ http: 200, status: 'pronto' });
    expect(w.updates[0]).toMatchObject({ status: 'pronto', server_checked_at: '2026-10-24T12:00:00.000Z' });
  });

  it('pedido repetido depois de conferido não refaz nada', async () => {
    const w = world({ status: 'pronto', server_checked_at: '2026-10-24T11:00:00.000Z' }, {}, longText);
    expect(await processMaterial(w.deps, 'm1')).toMatchObject({ http: 200, reused: true });
    expect(w.updates).toEqual([]);
  });

  it('material de outra conta (o RLS não devolve) → 404, nada gravado', async () => {
    const w = world({}, {}, longText);
    expect((await processMaterial(w.deps, 'outro')).http).toBe(404);
    expect(w.updates).toEqual([]);
  });

  it('arquivo trocado depois da leitura (hash diferente): falha e o arquivo é apagado', async () => {
    const w = world({ sha256: 'f'.repeat(64) }, { [storagePath('u1', 'm1')]: pdf }, longText);
    const r = await processMaterial(w.deps, 'm1');
    expect(r).toMatchObject({ http: 422, status: 'falhou' });
    expect(w.removed).toEqual(['u1/m1.pdf']);
  });

  it('arquivo que não é PDF ou de tamanho diferente: falha', async () => {
    const png = new Uint8Array(fs.readFileSync(path.join(FIX, 'nao-e-pdf.pdf')));
    const a = world({ file_size: png.byteLength, sha256: await sha256Hex(png) }, { 'u1/m1.pdf': png }, longText);
    expect((await processMaterial(a.deps, 'm1')).detail).toMatch(/não é um PDF/);
    const b = world({ file_size: 123, sha256: await sha256Hex(pdf) }, { 'u1/m1.pdf': pdf }, longText);
    expect((await processMaterial(b.deps, 'm1')).detail).toMatch(/tamanho diferente/);
  });

  it('texto incompleto ou arquivo ausente: falha com orientação para tentar de novo', async () => {
    const a = world({ page_count: 5, sha256: await sha256Hex(pdf) }, { 'u1/m1.pdf': pdf }, longText);
    expect((await processMaterial(a.deps, 'm1')).detail).toMatch(/incompleto \(4 de 5/);
    const b = world({ sha256: await sha256Hex(pdf) }, {}, longText);
    expect((await processMaterial(b.deps, 'm1')).detail).toMatch(/não chegou/);
  });

  it('texto colado: só a análise (não há arquivo)', async () => {
    const w = world({ kind: 'texto', file_size: null, sha256: null }, {}, longText);
    expect(await processMaterial(w.deps, 'm1')).toMatchObject({ http: 200, status: 'pronto' });
  });
});
