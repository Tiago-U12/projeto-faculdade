import fs from 'node:fs';
import path from 'node:path';
import type { Question, ReviewRecord, SourceRecord, Taxonomy } from '../../src/types';
import { findDuplicates } from './dedupe';
import { blockedByDuplicate } from './pipeline';
import { REVIEW_LOG } from './paths';
import { staticCheck } from './staticCheck';

export const REVIEW_CHECKLIST = [
  'gabarito-correto-e-unico',
  'enunciado-claro-sem-ambiguidade',
  'distratores-plausiveis-e-claramente-errados',
  'explicacao-correta-e-didatica',
  'dificuldade-compativel',
  'dentro-do-assunto-selecionado',
  'referencia-verificavel',
] as const;

export interface ReviewInput {
  reviewer: string;
  reviewerType: 'human' | 'ai-assisted';
  notes?: string;
  now?: Date;
  /** itens do checklist atestados; todos são obrigatórios para aprovar */
  checklist?: Record<string, boolean>;
}

function log(entry: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(REVIEW_LOG), { recursive: true });
  fs.appendFileSync(REVIEW_LOG, JSON.stringify(entry) + '\n');
}

export function reviewQueue(all: Question[]): Question[] {
  return all.filter((q) => q.status === 'verified');
}

export class ReviewError extends Error {}

/** Aprova somente questões `verified`, com verificação ok, sem pendências estáticas nem duplicidade. */
export function approve(all: Question[], ids: string[], tax: Taxonomy, sources: SourceRecord[], input: ReviewInput, writeLog = true): Question[] {
  const now = (input.now ?? new Date()).toISOString();
  const byId = new Map(all.map((q) => [q.id, q]));
  const dups = blockedByDuplicate(findDuplicates(all.filter((q) => q.status !== 'rejected')), byId);
  const approved: Question[] = [];
  const checklist = Object.fromEntries(REVIEW_CHECKLIST.map((k) => [k, input.checklist?.[k] ?? false]));
  if (!REVIEW_CHECKLIST.every((k) => checklist[k])) throw new ReviewError('O checklist de revisão precisa estar completo para aprovar.');
  if (!input.reviewer.trim()) throw new ReviewError('Informe o revisor.');
  for (const id of ids) {
    const q = byId.get(id);
    if (!q) throw new ReviewError(`Questão inexistente: ${id}`);
    if (q.status !== 'verified') throw new ReviewError(`${id}: só questões "verified" podem ser aprovadas (status atual: ${q.status}).`);
    if (q.verification?.result?.ok !== true) throw new ReviewError(`${id}: sem verificação automática aprovada.`);
    const errs = staticCheck(q, tax, sources, { requireComplete: true }).filter((i) => i.level === 'error');
    if (errs.length) throw new ReviewError(`${id}: pendências — ${errs.map((e) => e.message).join('; ')}`);
    if (dups.has(id)) throw new ReviewError(`${id}: possível duplicata.`);
  }
  for (const id of ids) {
    const q = byId.get(id)!;
    const review: ReviewRecord = { decision: 'approved', reviewer: input.reviewer, reviewerType: input.reviewerType, at: now, ...(input.notes ? { notes: input.notes } : {}), checklist };
    q.review = review;
    q.status = 'approved';
    q.updatedAt = now;
    approved.push(q);
    if (writeLog) log({ at: now, id, decision: 'approved', reviewer: input.reviewer, reviewerType: input.reviewerType, version: q.version, notes: input.notes ?? null });
  }
  return approved;
}

export function reject(all: Question[], ids: string[], reason: string, reviewer: string, reviewerType: ReviewInput['reviewerType'], now = new Date(), writeLog = true): Question[] {
  if (!reason.trim()) throw new ReviewError('Informe o motivo da rejeição.');
  const out: Question[] = [];
  for (const id of ids) {
    const q = all.find((x) => x.id === id);
    if (!q) throw new ReviewError(`Questão inexistente: ${id}`);
    q.review = { decision: 'rejected', reviewer, reviewerType, at: now.toISOString(), notes: reason };
    q.status = 'rejected';
    q.updatedAt = now.toISOString();
    out.push(q);
    if (writeLog) log({ at: now.toISOString(), id, decision: 'rejected', reviewer, reviewerType, version: q.version, notes: reason });
  }
  return out;
}
