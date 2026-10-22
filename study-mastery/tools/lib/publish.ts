import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { BankManifest, Difficulty, PublishedQuestion, Question, SourceRecord, Taxonomy } from '../../src/types';
import { findDuplicates } from './dedupe';
import { contentHash } from './dsl';
import { PUBLISH_DIR, REPORTS_DIR } from './paths';
import { staticCheck } from './staticCheck';
import { loadLedger, saveLedger, writeJson } from './store';
import { verifyAll } from './verify';

export class PublishError extends Error {
  constructor(public problems: string[]) {
    super(`Publicação bloqueada (${problems.length} problema(s)):\n - ${problems.slice(0, 40).join('\n - ')}`);
  }
}

export interface PublishOptions {
  recheck?: boolean;
  requireHuman?: boolean;
  dryRun?: boolean;
  now?: Date;
  outDir?: string;
}

export function toPublished(q: Question): PublishedQuestion {
  const { verification, review, status: _s, ...rest } = q;
  void _s;
  return { ...rest, status: 'approved', verifiedBy: verification?.result?.method ?? 'desconhecido', reviewedBy: review!.reviewerType };
}

export async function publish(all: Question[], tax: Taxonomy, sources: SourceRecord[], opts: PublishOptions = {}): Promise<{ manifest: BankManifest; problems: string[]; written: string[] }> {
  const now = opts.now ?? new Date();
  const out = opts.outDir ?? PUBLISH_DIR;
  const problems: string[] = [];
  let approved = all.filter((q) => q.status === 'approved');
  if (opts.requireHuman) approved = approved.filter((q) => q.review?.reviewerType === 'human');

  for (const q of approved) {
    if (q.review?.decision !== 'approved' || !q.review.reviewer) problems.push(`${q.id}: aprovada sem registro de revisão`);
    for (const i of staticCheck(q, tax, sources, { requireComplete: true })) if (i.level === 'error') problems.push(`${q.id}: ${i.message}`);
    if (q.verification?.result?.ok !== true) problems.push(`${q.id}: sem verificação automática aprovada`);
  }
  for (const d of findDuplicates(approved)) problems.push(`duplicata entre aprovadas: ${d.a} ~ ${d.b} (${d.kind})`);
  if (opts.recheck !== false) {
    for (const o of await verifyAll(approved.filter((q) => q.verification))) if (!o.ok) problems.push(`${o.id}: reverificação falhou — ${o.errors.join('; ')}`);
  }
  const ledger = loadLedger();
  const approvedIds = new Set(approved.map((q) => q.id));
  for (const q of all) if (ledger[q.id]?.retired && q.status === 'approved') problems.push(`${q.id}: ID aposentado não pode ser reutilizado`);
  if (problems.length) throw new PublishError(problems);

  const nowIso = now.toISOString();
  const pubs = approved.map(toPublished).sort((a, b) => a.disciplineId.localeCompare(b.disciplineId) || a.topicId.localeCompare(b.topicId) || a.id.localeCompare(b.id));
  const hash = crypto.createHash('sha256').update(pubs.map((p) => `${p.id}@${p.version}:${contentHash(approved.find((q) => q.id === p.id)!)}`).join('|')).digest('hex').slice(0, 8);
  const bankVersion = `${nowIso.slice(0, 10).replace(/-/g, '.')}-${hash}`;
  const byDiscipline: Record<string, Record<Difficulty, number>> = {};
  for (const p of pubs) {
    const c = (byDiscipline[p.disciplineId] ??= { facil: 0, medio: 0, dificil: 0 });
    c[p.difficulty]++;
  }
  const manifest: BankManifest = { schemaVersion: 1, bankVersion, generatedAt: nowIso, totals: { approved: pubs.length }, byDiscipline };

  const written: string[] = [];
  if (!opts.dryRun) {
    fs.mkdirSync(out, { recursive: true });
    for (const d of tax.disciplines) {
      const f = path.join(out, `${d.id}.json`);
      writeJson(f, pubs.filter((p) => p.disciplineId === d.id));
      written.push(f);
    }
    writeJson(path.join(out, 'manifest.json'), manifest);
    written.push(path.join(out, 'manifest.json'));
    // livro-razão de IDs: nenhum ID publicado some ou é reutilizado sem registro
    for (const q of approved) ledger[q.id] = { firstPublished: ledger[q.id]?.firstPublished ?? nowIso, lastVersion: q.version };
    for (const id of Object.keys(ledger)) if (!approvedIds.has(id) && !ledger[id].retired) ledger[id].retired = nowIso;
    saveLedger(ledger);
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    fs.appendFileSync(path.join(REPORTS_DIR, 'publish-log.jsonl'), JSON.stringify({ at: nowIso, bankVersion, approved: pubs.length, byDiscipline }) + '\n');
  }
  return { manifest, problems, written };
}
