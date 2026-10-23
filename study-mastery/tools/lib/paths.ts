import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONTENT = process.env.SM_CONTENT_DIR ? path.resolve(process.env.SM_CONTENT_DIR) : path.join(ROOT, 'content');
export const QUESTIONS_DIR = path.join(CONTENT, 'questions');
export const BATCHES_DIR = path.join(CONTENT, 'batches');
export const REPORTS_DIR = path.join(CONTENT, 'reports');
export const REVIEW_LOG = path.join(CONTENT, 'reviews', 'log.jsonl');
export const TAXONOMY_FILE = path.join(CONTENT, 'taxonomy.json');
export const SOURCES_FILE = path.join(CONTENT, 'sources.json');
export const LEDGER_FILE = path.join(CONTENT, 'published-ledger.json');
export const EXTRACTED_DIR = path.join(CONTENT, 'extracted');
export const IMPORT_MANIFEST = path.join(CONTENT, 'import-manifest.json');
export const PUBLISH_DIR = process.env.SM_PUBLISH_DIR ? path.resolve(process.env.SM_PUBLISH_DIR) : path.join(ROOT, 'src', 'data', 'published');
export const VERIFY_PY = path.join(ROOT, 'tools', 'verify', 'verify.py');
export const JS_PRELOAD = path.join(ROOT, 'tools', 'verify', 'js-preload.cjs');
export const SANDBOX_DIR = path.join(ROOT, 'tools', 'sandbox');
