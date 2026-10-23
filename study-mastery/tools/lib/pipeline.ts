import type { Question, SourceRecord, Status, Taxonomy } from '../../src/types';
import { findDuplicates, type DupPair } from './dedupe';
import { staticCheck, type Issue } from './staticCheck';
import { verifyAll } from './verify';

export interface ValidationReport {
  issues: Issue[];
  duplicates: DupPair[];
  transitions: { id: string; from: Status; to: Status }[];
  verified: number;
  /** aprovadas reexecutadas com sucesso (só com recheckApproved) */
  rechecked: number;
  failedVerification: string[];
  regressions: string[];
}

export interface ValidateOptions {
  /** reexecutar verificação nas aprovadas (para publicação) */
  recheckApproved?: boolean;
  /** pular execução do Python/Node (somente checagens estáticas) */
  skipVerify?: boolean;
  /** restringe aos ids */
  only?: Set<string>;
  now?: Date;
}

export function blockedByDuplicate(pairs: DupPair[], byId: Map<string, Question>): Set<string> {
  const blocked = new Set<string>();
  for (const p of pairs) {
    const a = byId.get(p.a)!;
    const b = byId.get(p.b)!;
    if (a.status === 'rejected' || b.status === 'rejected') continue;
    if (a.status === 'approved' && b.status !== 'approved') blocked.add(b.id);
    else if (b.status === 'approved' && a.status !== 'approved') blocked.add(a.id);
    else blocked.add(a.id < b.id ? b.id : a.id);
  }
  return blocked;
}

/** Valida e promove draft→verified (ou rebaixa verified→draft). Nunca aprova: aprovação é um ato de revisão. */
export async function validateAll(all: Question[], tax: Taxonomy, sources: SourceRecord[], opts: ValidateOptions = {}): Promise<ValidationReport> {
  const now = (opts.now ?? new Date()).toISOString();
  const live = all.filter((q) => q.status !== 'rejected');
  const issues: Issue[] = [];
  const target = (q: Question) => (!opts.only || opts.only.has(q.id));
  for (const q of live) {
    if (!target(q)) continue;
    issues.push(...staticCheck(q, tax, sources, { requireComplete: true }));
  }
  const byId = new Map(all.map((q) => [q.id, q]));
  const duplicates = findDuplicates(live);
  const blocked = blockedByDuplicate(duplicates, byId);
  for (const d of duplicates) {
    for (const id of [d.a, d.b]) if (blocked.has(id) && target(byId.get(id)!)) issues.push({ id, level: 'error', code: 'duplicate', message: `possível duplicata (${d.kind}, similaridade ${d.score.toFixed(2)}) de ${id === d.a ? d.b : d.a}` });
  }
  const errorIds = new Set(issues.filter((i) => i.level === 'error').map((i) => i.id));

  const toVerify = live.filter((q) => target(q) && q.verification && (q.status !== 'approved' || opts.recheckApproved) && !errorIds.has(q.id));
  const failedVerification: string[] = [];
  const regressions: string[] = [];
  const outcomes = opts.skipVerify ? [] : await verifyAll(toVerify);
  const outById = new Map(outcomes.map((o) => [o.id, o]));
  let verified = 0;
  let rechecked = 0;
  const transitions: ValidationReport['transitions'] = [];
  for (const q of live) {
    if (!target(q)) continue;
    const o = outById.get(q.id);
    if (o) {
      q.verification!.result = { ok: o.ok, method: o.method, ranAt: now, details: o.ok ? o.details : `${o.details} | ${o.errors.join('; ')}` };
      if (!o.ok) {
        failedVerification.push(q.id);
        issues.push({ id: q.id, level: 'error', code: 'verification', message: o.errors.join('; ') || o.details });
        errorIds.add(q.id);
      }
    }
    const verificationOk = q.verification?.result?.ok === true;
    const clean = !errorIds.has(q.id);
    if (q.status === 'approved') {
      if (!clean) regressions.push(q.id);
      else if (o?.ok) rechecked++;
      continue;
    }
    const to: Status = clean && verificationOk && (o || opts.skipVerify) ? 'verified' : 'draft';
    // com skipVerify só promove se já havia resultado ok anterior
    if (to !== q.status) {
      transitions.push({ id: q.id, from: q.status, to });
      q.status = to;
      q.updatedAt = now;
    }
    if (to === 'verified') verified++;
  }
  return { issues, duplicates, transitions, verified, rechecked, failedVerification, regressions };
}
