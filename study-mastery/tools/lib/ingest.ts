import type { Question } from '../../src/types';
import { contentHash, toQuestion, type DraftSpec } from './dsl';

export interface IngestOptions {
  /** atualizar rascunhos/verificadas existentes com conteúdo diferente */
  update?: boolean;
  /** IDs aprovados que podem receber errata (versão +1, volta a draft) */
  revise?: Set<string>;
  /** motivo obrigatório quando há errata */
  reason?: string;
  now?: Date;
}

export interface IngestResult {
  added: number;
  updated: number;
  revised: number;
  same: number;
}

/**
 * Carrega um lote de especificações (DSL) no banco editorial, sem nunca sobrescrever silenciosamente uma questão
 * aprovada ou rejeitada. A errata (`revise`) é o único caminho para corrigir uma aprovada: a versão sobe, a revisão
 * anterior é descartada e a questão volta a draft — sai do banco publicado até passar de novo por validate → review → publish.
 */
export function ingestSpecs(all: Question[], specs: DraftSpec[], opts: IngestOptions = {}): IngestResult {
  const revise = opts.revise ?? new Set<string>();
  const reason = opts.reason?.trim() ?? '';
  if (revise.size && !reason) throw new Error('--revise exige --reason "motivo da errata".');
  const at = (opts.now ?? new Date()).toISOString();
  const byId = new Map(all.map((q) => [q.id, q]));
  const r: IngestResult = { added: 0, updated: 0, revised: 0, same: 0 };
  for (const s of specs) {
    const q = toQuestion(s, at);
    const cur = byId.get(q.id);
    if (!cur) {
      all.push(q);
      byId.set(q.id, q);
      r.added++;
      continue;
    }
    if (contentHash(cur) === contentHash(q)) {
      r.same++;
      continue;
    }
    if (cur.status === 'approved' && revise.has(q.id)) {
      const version = cur.version + 1;
      Object.assign(cur, { ...q, createdAt: cur.createdAt, updatedAt: at, version, status: 'draft' as const, errata: [...(cur.errata ?? []), { version, at, reason }] });
      delete cur.review;
      r.revised++;
      continue;
    }
    if (cur.status === 'approved' || cur.status === 'rejected') throw new Error(`${q.id} já está ${cur.status}: não pode ser sobrescrito por ingest. Crie um novo ID ou, para corrigir uma aprovada, use --revise ${q.id} --reason "...".`);
    if (!opts.update) throw new Error(`${q.id} já existe com conteúdo diferente (use --update para atualizar rascunhos).`);
    Object.assign(cur, { ...q, createdAt: cur.createdAt, version: cur.version, status: 'draft' as const });
    r.updated++;
  }
  return r;
}
