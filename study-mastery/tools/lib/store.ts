import fs from 'node:fs';
import path from 'node:path';
import type { Question, SourceRecord, Taxonomy } from '../../src/types';
import { LEDGER_FILE, QUESTIONS_DIR, SOURCES_FILE, TAXONOMY_FILE } from './paths';

export function readJson<T>(file: string, fallback?: T): T {
  if (!fs.existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Arquivo não encontrado: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export function writeJson(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 1) + '\n');
}

export const loadTaxonomy = (): Taxonomy => readJson<Taxonomy>(TAXONOMY_FILE);
export const loadSources = (): SourceRecord[] => readJson<SourceRecord[]>(SOURCES_FILE, []);

export function questionFile(q: Pick<Question, 'disciplineId' | 'topicId'>): string {
  return path.join(QUESTIONS_DIR, q.disciplineId, `${q.topicId}.json`);
}

/** Lê todas as questões (qualquer status) de content/questions/<disciplina>/<assunto>.json */
export function loadQuestions(dir = QUESTIONS_DIR): Question[] {
  const out: Question[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    for (const f of fs.readdirSync(path.join(dir, d.name)).sort()) {
      if (!f.endsWith('.json')) continue;
      const arr = readJson<Question[]>(path.join(dir, d.name, f));
      out.push(...arr);
    }
  }
  return out;
}

/** Regrava os arquivos afetados, mantendo ordem estável por id. */
export function saveQuestions(all: Question[], dir = QUESTIONS_DIR): void {
  const groups = new Map<string, Question[]>();
  for (const q of all) {
    const f = path.join(dir, q.disciplineId, `${q.topicId}.json`);
    (groups.get(f) ?? groups.set(f, []).get(f)!).push(q);
  }
  for (const [f, qs] of groups) writeJson(f, qs.sort((a, b) => a.id.localeCompare(b.id)));
}

export interface Ledger {
  [id: string]: { firstPublished: string; lastVersion: number; retired?: string };
}
export const loadLedger = (): Ledger => readJson<Ledger>(LEDGER_FILE, {});
export const saveLedger = (l: Ledger): void => writeJson(LEDGER_FILE, l);

export function newId(prefix: string, existing: Iterable<string>): string {
  const used = new Set(existing);
  for (let i = 1; i < 10000; i++) {
    const id = `${prefix}-${String(i).padStart(3, '0')}`;
    if (!used.has(id)) return id;
  }
  throw new Error('IDs esgotados para ' + prefix);
}
