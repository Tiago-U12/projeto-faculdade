import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { SourceRecord, Taxonomy } from '../../src/types';
import { tokens } from './dedupe';
import { EXTRACTED_DIR, IMPORT_MANIFEST } from './paths';
import { readJson, writeJson } from './store';

export interface ImportEntry {
  path: string;
  sha256: string;
  bytes: number;
  status: 'new' | 'duplicate' | 'updated' | 'unchanged' | 'ignored' | 'error';
  note?: string;
  textFile?: string;
  topics: { disciplineId: string; topicId: string; score: number }[];
  newTopicCandidates: string[];
}

export interface ImportReport {
  entries: ImportEntry[];
  newSources: SourceRecord[];
}

interface Manifest {
  files: Record<string, { sha256: string; importedAt: string; textFile?: string }>;
  hashes: Record<string, string[]>;
}

const TEXT_EXT = new Set(['.md', '.txt', '.html', '.htm', '.js', '.jsx', '.json', '.sql', '.css']);
const MAX_ZIP_FILES = 2000;

export const sha256 = (buf: Buffer) => crypto.createHash('sha256').update(buf).digest('hex');

/** Extrai texto de um arquivo suportado. Retorna null para tipos ignorados. */
export function extractText(file: string): string | null {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.pdf') {
    try {
      return execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 60_000 });
    } catch {
      return null;
    }
  }
  if (ext === '.html' || ext === '.htm') return fs.readFileSync(file, 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
  if (TEXT_EXT.has(ext)) return fs.readFileSync(file, 'utf8');
  return null;
}

/** Expande .zip para um diretório temporário (unzip recusa caminhos com ".." e remove "/" inicial). */
function unzipTo(file: string): string | null {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-zip-'));
  try {
    const listing = execFileSync('unzip', ['-Z1', file], { encoding: 'utf8', timeout: 30_000 }).split('\n').filter(Boolean);
    if (listing.length > MAX_ZIP_FILES) throw new Error('zip com arquivos demais');
    if (listing.some((n) => n.split('/').includes('..') || path.isAbsolute(n))) throw new Error('zip com caminhos suspeitos (zip-slip)');
    execFileSync('unzip', ['-q', '-o', file, '-d', dir], { timeout: 60_000 });
    return dir;
  } catch {
    fs.rmSync(dir, { recursive: true, force: true });
    return null;
  }
}

export function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out.sort();
}

export function classify(text: string, tax: Taxonomy, keywords: Record<string, string[]>): { disciplineId: string; topicId: string; score: number }[] {
  const norm = ' ' + tokens(text).join(' ') + ' ';
  const res: { disciplineId: string; topicId: string; score: number }[] = [];
  for (const d of tax.disciplines) {
    for (const t of d.topics) {
      let score = 0;
      for (const kw of keywords[`${d.id}/${t.id}`] ?? []) {
        const k = ' ' + tokens(kw).join(' ') + ' ';
        let idx = norm.indexOf(k);
        while (idx !== -1 && score < 500) {
          score++;
          idx = norm.indexOf(k, idx + k.length - 1);
        }
      }
      if (score >= 3) res.push({ disciplineId: d.id, topicId: t.id, score });
    }
  }
  return res.sort((a, b) => b.score - a.score).slice(0, 4);
}

/** Títulos/cabeçalhos frequentes que não casam com nenhum assunto conhecido → candidatos a assunto novo. */
export function newTopicCandidates(text: string, knownKeywords: string[]): string[] {
  const known = new Set(knownKeywords.flatMap((k) => tokens(k)));
  const counts = new Map<string, number>();
  for (const raw of text.split('\n')) {
    const line = raw.trim().replace(/^#+\s*/, '').replace(/^\d+(\.\d+)*[.)]?\s+/, '');
    if (line.length < 6 || line.length > 70 || /[.;,]$/.test(line) || /[{}=<>;]/.test(line)) continue;
    if (!/^[A-ZÀ-Ú]/.test(line)) continue;
    const toks = tokens(line);
    if (toks.length < 2 || toks.length > 8) continue;
    if (toks.some((t) => known.has(t))) continue;
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => k);
}

export interface ImportOptions {
  dir: string;
  tax: Taxonomy;
  keywords: Record<string, string[]>;
  existingSources: SourceRecord[];
  disciplineHint?: string;
  dryRun?: boolean;
  now?: Date;
  manifestFile?: string;
  extractedDir?: string;
}

export function importDirectory(o: ImportOptions): ImportReport {
  const now = (o.now ?? new Date()).toISOString();
  const manifestFile = o.manifestFile ?? IMPORT_MANIFEST;
  const extractedDir = o.extractedDir ?? EXTRACTED_DIR;
  const manifest = readJson<Manifest>(manifestFile, { files: {}, hashes: {} });
  const entries: ImportEntry[] = [];
  const newSources: SourceRecord[] = [];
  const allKeywords = Object.values(o.keywords).flat();

  const handle = (abs: string, rel: string) => {
    const buf = fs.readFileSync(abs);
    const hash = sha256(buf);
    const prev = manifest.files[rel];
    const dupOf = (manifest.hashes[hash] ?? []).find((p) => p !== rel);
    const base: ImportEntry = { path: rel, sha256: hash, bytes: buf.length, status: 'new', topics: [], newTopicCandidates: [] };
    if (prev && prev.sha256 === hash) return void entries.push({ ...base, status: 'unchanged', textFile: prev.textFile });
    if (dupOf) return void entries.push({ ...base, status: 'duplicate', note: `mesmo conteúdo de ${dupOf}` });
    const text = extractText(abs);
    if (text === null || text.trim().length < 20) return void entries.push({ ...base, status: 'ignored', note: 'tipo não suportado ou sem texto extraível' });
    const topics = classify(text, o.tax, o.keywords);
    const textFile = path.join(extractedDir, `${hash.slice(0, 8)}-${path.basename(rel).replace(/[^\w.-]+/g, '_')}.txt`);
    if (!o.dryRun) {
      fs.mkdirSync(extractedDir, { recursive: true });
      fs.writeFileSync(textFile, text);
      manifest.files[rel] = { sha256: hash, importedAt: now, textFile };
      (manifest.hashes[hash] ??= []).push(rel);
    }
    const disciplineId = (o.disciplineHint ?? topics[0]?.disciplineId ?? 'fullstack') as SourceRecord['disciplineId'];
    const id = `imp-${hash.slice(0, 10)}`;
    if (!o.existingSources.some((s) => s.sha256 === hash) && !newSources.some((s) => s.id === id)) {
      newSources.push({ id, title: path.basename(rel), kind: /lista|exerc/i.test(rel) ? 'lista' : 'aula-pdf', disciplineId, origin: `importado:${rel}`, usage: 'Material de aula importado pelo mantenedor (uso interno; texto não é publicado).', accessed: true, accessedAt: now.slice(0, 10), sha256: hash, topicIds: topics.filter((t) => t.disciplineId === disciplineId).map((t) => t.topicId) });
    }
    entries.push({ ...base, status: prev ? 'updated' : 'new', textFile, topics, newTopicCandidates: newTopicCandidates(text, allKeywords) });
  };

  for (const abs of walk(o.dir)) {
    const rel = path.relative(o.dir, abs);
    if (path.extname(abs).toLowerCase() === '.zip') {
      const tmp = unzipTo(abs);
      if (!tmp) {
        entries.push({ path: rel, sha256: sha256(fs.readFileSync(abs)), bytes: fs.statSync(abs).size, status: 'error', note: 'zip inválido ou suspeito', topics: [], newTopicCandidates: [] });
        continue;
      }
      for (const inner of walk(tmp)) handle(inner, `${rel}!/${path.relative(tmp, inner)}`);
      fs.rmSync(tmp, { recursive: true, force: true });
    } else handle(abs, rel);
  }
  if (!o.dryRun) writeJson(manifestFile, manifest);
  return { entries, newSources };
}

// ---------- Google Drive (REST) ----------

export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<any>; arrayBuffer(): Promise<ArrayBuffer> }>;

interface DriveFile { id: string; name: string; mimeType: string }

/** Baixa uma pasta do Google Drive (recursivo) para `outDir`. Token OAuth somente via variável de ambiente. */
export async function downloadDriveFolder(folderId: string, outDir: string, token: string, fetchFn: FetchLike = fetch as unknown as FetchLike): Promise<string[]> {
  const headers = { Authorization: `Bearer ${token}` };
  const written: string[] = [];
  const GDOC = 'application/vnd.google-apps.';
  async function rec(id: string, dir: string, depth: number) {
    if (depth > 6) return;
    let pageToken = '';
    do {
      const q = encodeURIComponent(`'${id}' in parents and trashed = false`);
      const r = await fetchFn(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name,mimeType)&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`, { headers });
      if (!r.ok) throw new Error(`Drive: HTTP ${r.status} ao listar ${id}`);
      const body = (await r.json()) as { files: DriveFile[]; nextPageToken?: string };
      for (const f of body.files) {
        const safe = f.name.replace(/[\\/:*?"<>|]+/g, '_');
        if (f.mimeType === GDOC + 'folder') await rec(f.id, path.join(dir, safe), depth + 1);
        else {
          const isDoc = f.mimeType.startsWith(GDOC);
          const url = isDoc ? `https://www.googleapis.com/drive/v3/files/${f.id}/export?mimeType=text/plain` : `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`;
          const d = await fetchFn(url, { headers });
          if (!d.ok) continue;
          fs.mkdirSync(dir, { recursive: true });
          const target = path.join(dir, isDoc ? `${safe}.txt` : safe);
          fs.writeFileSync(target, Buffer.from(await d.arrayBuffer()));
          written.push(target);
        }
      }
      pageToken = body.nextPageToken ?? '';
    } while (pageToken);
  }
  await rec(folderId, outDir, 0);
  return written;
}
