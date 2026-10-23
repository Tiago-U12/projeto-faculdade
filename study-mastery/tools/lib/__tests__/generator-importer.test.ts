import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AnthropicProvider, buildPrompt, generateDrafts, MAX_BATCH, MockProvider } from '../generator';
import { classify, downloadDriveFolder, importDirectory, newTopicCandidates, type FetchLike } from '../importer';
import { LONG, mk, limitSpec, SOURCES, TAX } from './helpers';

const item = (n: number, extra: object = {}) => ({
  stem: `Calcule o limite número ${n} usando a regra de L’Hôpital em uma forma indeterminada.`,
  opts: ['$1$', '$0$', '$2$', '$3$'],
  why: ['errada porque sim', 'errada porque não', 'errada talvez'],
  exp: LONG,
  src: [['src-aula', 'slide 3']],
  verify: { kind: 'limit', params: { expr: 'sin(x)/x', at: '0' }, values: ['1', '0', '2', '3'] },
  ...extra,
});

describe('gerador de rascunhos', () => {
  const base = { tax: TAX, sources: SOURCES, existing: [], disciplineId: 'calculo2' as const, topicId: 'lhopital', difficulty: 'facil' as const, scope: 'aula' as const, count: 3 };

  it('produz somente rascunhos — mesmo que o modelo peça "approved"', async () => {
    const provider = new MockProvider(JSON.stringify([item(1, { status: 'approved', review: { decision: 'approved' } }), item(2)]));
    const r = await generateDrafts({ ...base, provider });
    expect(r.drafts).toHaveLength(2);
    expect(r.drafts.every((d) => d.status === 'draft' && !d.review)).toBe(true);
    expect(r.drafts.map((d) => d.id)).toEqual(['c2-lhopital-001', 'c2-lhopital-002']);
    expect(r.drafts[0].tags).toContain('gen:mock');
  });
  it('aceita JSON cercado por texto, descarta itens malformados e limita o lote', async () => {
    const many = Array.from({ length: 30 }, (_, i) => item(i));
    const provider = new MockProvider('Aqui está:\n' + JSON.stringify([{ stem: 'sem nada' }, ...many]) + '\nFim.');
    const r = await generateDrafts({ ...base, provider, count: 50 });
    expect(r.rejected.length).toBe(1);
    expect(r.drafts.length).toBeLessThanOrEqual(MAX_BATCH);
  });
  it('não repete IDs existentes e inclui questões existentes no prompt (anti-duplicação)', async () => {
    const existing = [mk(limitSpec())];
    const provider = new MockProvider(JSON.stringify([item(9)]));
    const r = await generateDrafts({ ...base, existing, provider });
    expect(r.drafts[0].id).toBe('c2-lhopital-002');
    expect(provider.calls[0].user).toMatch(/Calcule o limite/);
    expect(provider.calls[0].user).toMatch(/JÁ EXISTENTES/);
  });
  it('o prompt proíbe fontes não acessadas e fixa dificuldade/camada', () => {
    const p = buildPrompt({ ...base, provider: new MockProvider('[]'), tax: { ...TAX }, sources: SOURCES.map((s) => (s.id === 'src-aula' ? { ...s, accessed: false } : s)) });
    expect(p.user).toMatch(/NÃO ACESSADA/);
    expect(p.user).toMatch(/facil/);
    expect(p.system).toMatch(/ORIGINAIS/);
  });
  it('provedor real exige chave de ambiente e chama a API com a chave do ambiente', async () => {
    expect(() => new AnthropicProvider('', 'm')).toThrow(/ANTHROPIC_API_KEY/);
    let seen: any;
    const fake = (async (url: string, init: any) => {
      seen = { url, headers: init.headers, body: JSON.parse(init.body) };
      return { ok: true, json: async () => ({ content: [{ type: 'text', text: '[]' }] }), text: async () => '' };
    }) as unknown as typeof fetch;
    const p = new AnthropicProvider('sk-test', 'modelo-x', fake);
    expect(await p.generate({ system: 's', user: 'u', maxTokens: 10 })).toBe('[]');
    expect(seen.url).toMatch(/anthropic\.com/);
    expect(seen.headers['x-api-key']).toBe('sk-test');
    expect(seen.body.model).toBe('modelo-x');
  });
});

describe('importador de materiais', () => {
  const mkdir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sm-imp-'));
  const keywords = { 'calculo2/lhopital': ['regra de l’hôpital', 'forma indeterminada'], 'fullstack/mysql': ['mysql', 'pool de conexões'] };

  it('inventaria, deduplica por hash, detecta atualização e classifica assuntos', () => {
    const dir = mkdir();
    const out = mkdir();
    const opts = { dir, tax: TAX, keywords, existingSources: [], manifestFile: path.join(out, 'm.json'), extractedDir: path.join(out, 'x') };
    fs.writeFileSync(path.join(dir, 'a.md'), '# Aula\nA regra de L’Hôpital resolve forma indeterminada. Regra de L’Hôpital, forma indeterminada, regra de L’Hôpital.\n\n## Taxas de Crescimento Assintótico\nTaxas de Crescimento Assintótico\n');
    fs.writeFileSync(path.join(dir, 'copia.md'), fs.readFileSync(path.join(dir, 'a.md')));
    fs.writeFileSync(path.join(dir, 'x.bin'), Buffer.from([1, 2, 3]));
    let r = importDirectory(opts);
    const st = Object.fromEntries(r.entries.map((e) => [e.path, e.status]));
    expect(st['a.md']).toBe('new');
    expect(st['copia.md']).toBe('duplicate');
    expect(st['x.bin']).toBe('ignored');
    expect(r.entries.find((e) => e.path === 'a.md')!.topics[0]).toMatchObject({ topicId: 'lhopital' });
    expect(r.newSources).toHaveLength(1);
    expect(r.newSources[0].sha256).toMatch(/^[0-9a-f]{64}$/);
    r = importDirectory(opts);
    expect(r.entries.find((e) => e.path === 'a.md')!.status).toBe('unchanged');
    fs.appendFileSync(path.join(dir, 'a.md'), '\nmais conteúdo sobre forma indeterminada\n');
    r = importDirectory(opts);
    expect(r.entries.find((e) => e.path === 'a.md')!.status).toBe('updated');
  });
  it('sugere assuntos novos e classifica por palavras-chave', () => {
    const t = '# Teorema do Valor Médio\nTeorema do Valor Médio\nConteúdo\n## Regra de L’Hôpital\n';
    expect(newTopicCandidates(t, Object.values(keywords).flat())).toContain('Teorema do Valor Médio');
    expect(classify('reduce reduce reduce com array', TAX, { 'fullstack/js-funcoes': ['reduce'] })[0].topicId).toBe('js-funcoes');
    expect(classify('texto sem relação nenhuma', TAX, keywords)).toEqual([]);
  });
  it('lê ZIP e recusa zip-slip', () => {
    const dir = mkdir();
    const out = mkdir();
    const py = (code: string) => execFileSync('python3', ['-c', code], { cwd: dir });
    py("import zipfile;z=zipfile.ZipFile('ok.zip','w');z.writestr('pasta/README.md','Aula de MySQL com mysql e mysql e mysql, pool de conexões');z.close()");
    py("import zipfile;z=zipfile.ZipFile('evil.zip','w');z.writestr('../fora.txt','x');z.close()");
    const r = importDirectory({ dir, tax: TAX, keywords, existingSources: [], manifestFile: path.join(out, 'm.json'), extractedDir: path.join(out, 'x') });
    expect(r.entries.find((e) => e.path.startsWith('ok.zip!'))!.status).toBe('new');
    expect(r.entries.find((e) => e.path === 'evil.zip')!.status).toBe('error');
    expect(fs.existsSync(path.join(path.dirname(dir), 'fora.txt'))).toBe(false);
  });
  it('baixa pasta do Drive via REST (fetch injetado) usando o token do ambiente', async () => {
    const calls: string[] = [];
    const fake: FetchLike = async (url, init) => {
      calls.push(`${url}|${init?.headers?.Authorization}`);
      const ok = (b: unknown) => ({ ok: true, status: 200, json: async () => b, arrayBuffer: async () => new TextEncoder().encode(String(b)).buffer as ArrayBuffer });
      if (url.includes('/files?q=')) {
        if (url.includes('root1')) return ok({ files: [{ id: 'sub1', name: 'Sub', mimeType: 'application/vnd.google-apps.folder' }, { id: 'f1', name: 'a.pdf', mimeType: 'application/pdf' }, { id: 'd1', name: 'Doc', mimeType: 'application/vnd.google-apps.document' }] });
        return ok({ files: [{ id: 'f2', name: 'b.txt', mimeType: 'text/plain' }] });
      }
      return ok('conteudo');
    };
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-drv-'));
    const files = await downloadDriveFolder('root1', out, 'tok123', fake);
    expect(files.map((f) => path.relative(out, f)).sort()).toEqual(['Doc.txt', 'Sub/b.txt', 'a.pdf']);
    expect(calls.every((c) => c.endsWith('|Bearer tok123'))).toBe(true);
    expect(calls.some((c) => c.includes('/export?mimeType=text/plain'))).toBe(true);
  });
});
