import type { DisciplineId, Difficulty, Mode, PublishedQuestion, QuestionStat, Scope, SessionConfig } from '../types';
import { DIFFICULTIES } from '../types';
import { hashString, mulberry32, shuffle, type Rng } from './rng';
import { isDue, topicAccuracy } from './srs';

const SCOPE_RANK: Record<Scope, number> = { aula: 0, aprofundamento: 1, desafio: 2 };

/** Profundidade cumulativa: "aula" só aula; "aprofundamento" aula+aprofundamento; "desafio" tudo (dos MESMOS assuntos). */
export function scopeAllows(selected: Scope, questionScope: Scope): boolean {
  return SCOPE_RANK[questionScope] <= SCOPE_RANK[selected];
}

/** Filtro estrito: nenhuma questão de assunto não marcado entra. Só questões aprovadas existem no banco publicado. */
export function eligible(bank: readonly PublishedQuestion[], cfg: Pick<SessionConfig, 'disciplineId' | 'topicIds' | 'scope' | 'difficulties'>): PublishedQuestion[] {
  const topics = new Set(cfg.topicIds);
  const diffs = new Set(cfg.difficulties);
  return bank.filter(
    (q) => q.status === 'approved' && q.disciplineId === cfg.disciplineId && topics.has(q.topicId) && diffs.has(q.difficulty) && scopeAllows(cfg.scope, q.scope),
  );
}

export interface SessionItem {
  questionId: string;
  /** ordem embaralhada dos ids das alternativas */
  order: string[];
}

export interface Composition {
  /** revisão: questões que o estudante errou na última vez */
  errors: number;
  /** revisão: acertadas, mas já vencidas na repetição espaçada */
  due: number;
  /** nunca vistas */
  fresh: number;
  /** já vistas e em dia (só entram quando falta material) */
  other: number;
}

export interface Session {
  id: string;
  seed: number;
  config: SessionConfig;
  requested: number;
  items: SessionItem[];
  composition: Composition;
  createdAt: string;
}

export interface BuildContext {
  stats: Record<string, QuestionStat>;
  now?: Date;
}

export function optionOrder(q: PublishedQuestion, seed: number): string[] {
  const ids = q.options.map((o) => o.id);
  if (q.fixedOrder) return ids;
  return shuffle(ids, mulberry32(seed ^ hashString(q.id)));
}

function byUnseenFirst(pool: PublishedQuestion[], stats: Record<string, QuestionStat>, rng: Rng): PublishedQuestion[] {
  const tagged = shuffle(pool, rng).map((q, i) => ({ q, i, seen: stats[q.id]?.seen ?? 0 }));
  tagged.sort((a, b) => a.seen - b.seen || a.i - b.i);
  return tagged.map((t) => t.q);
}

function pickMixed(pool: PublishedQuestion[], n: number, stats: Record<string, QuestionStat>, rng: Rng): PublishedQuestion[] {
  // round-robin entre assuntos; dentro de cada assunto alterna dificuldades
  const topics = new Map<string, Map<Difficulty, PublishedQuestion[]>>();
  for (const q of byUnseenFirst(pool, stats, rng)) {
    const t = topics.get(q.topicId) ?? new Map<Difficulty, PublishedQuestion[]>();
    const arr = t.get(q.difficulty) ?? [];
    arr.push(q);
    t.set(q.difficulty, arr);
    topics.set(q.topicId, t);
  }
  const topicOrder = shuffle([...topics.keys()], rng);
  const diffCursor = new Map<string, number>(topicOrder.map((t) => [t, Math.floor(rng() * 3)]));
  const out: PublishedQuestion[] = [];
  while (out.length < n) {
    let progressed = false;
    for (const t of topicOrder) {
      if (out.length >= n) break;
      const buckets = topics.get(t)!;
      let cur = diffCursor.get(t)!;
      for (let k = 0; k < DIFFICULTIES.length; k++) {
        const d = DIFFICULTIES[(cur + k) % DIFFICULTIES.length];
        const arr = buckets.get(d);
        if (arr && arr.length) {
          out.push(arr.shift()!);
          diffCursor.set(t, (cur + k + 1) % DIFFICULTIES.length);
          progressed = true;
          break;
        }
      }
    }
    if (!progressed) break;
  }
  return shuffle(out, rng);
}

function pickReview(pool: PublishedQuestion[], n: number, stats: Record<string, QuestionStat>, now: Date, rng: Rng): { list: PublishedQuestion[]; comp: Composition } {
  const t = (id: string) => new Date(stats[id].due).getTime();
  const errors = shuffle(pool.filter((q) => stats[q.id] && !stats[q.id].lastCorrect), rng).sort((a, b) => t(a.id) - t(b.id));
  const due = shuffle(pool.filter((q) => stats[q.id]?.lastCorrect && isDue(stats[q.id], now)), rng).sort((a, b) => t(a.id) - t(b.id));
  const fresh = pool.filter((q) => !stats[q.id]);
  // assuntos mais fracos primeiro entre as novas
  const acc = topicAccuracy(stats, (id) => pool.find((q) => q.id === id)?.topicId);
  const score = (topicId: string) => {
    const a = acc.get(topicId);
    return a && a.seen ? a.correct / a.seen : 0.5;
  };
  const freshSorted = shuffle(fresh, rng).sort((a, b) => score(a.topicId) - score(b.topicId));
  const other = shuffle(pool.filter((q) => stats[q.id]?.lastCorrect && !isDue(stats[q.id], now)), rng).sort((a, b) => t(a.id) - t(b.id));
  const list: PublishedQuestion[] = [];
  const comp: Composition = { errors: 0, due: 0, fresh: 0, other: 0 };
  const take = (arr: PublishedQuestion[], key: keyof Composition) => {
    for (const q of arr) {
      if (list.length >= n) return;
      list.push(q);
      comp[key]++;
    }
  };
  take(errors, 'errors');
  take(due, 'due');
  take(freshSorted, 'fresh');
  take(other, 'other');
  return { list, comp };
}

export function buildSession(pool: readonly PublishedQuestion[], config: SessionConfig, ctx: BuildContext, seed: number): Session {
  const now = ctx.now ?? new Date();
  const rng = mulberry32(seed);
  const n = Math.min(config.size, pool.length);
  let picked: PublishedQuestion[];
  let comp: Composition = { errors: 0, due: 0, fresh: 0, other: 0 };
  if (config.mode === 'revisao') {
    const r = pickReview([...pool], n, ctx.stats, now, rng);
    picked = r.list;
    comp = r.comp;
  } else if (config.mode === 'misto') {
    picked = pickMixed([...pool], n, ctx.stats, rng);
  } else {
    picked = byUnseenFirst([...pool], ctx.stats, rng).slice(0, n);
    // apresentação aleatória, mesmo quando a seleção priorizou as não vistas
    picked = shuffle(picked, rng);
  }
  if (config.mode !== 'revisao') {
    for (const q of picked) {
      if (!ctx.stats[q.id]) comp.fresh++;
      else comp.other++;
    }
  }
  return {
    id: `s-${seed.toString(36)}-${now.getTime().toString(36)}`,
    seed,
    config,
    requested: config.size,
    items: picked.map((q) => ({ questionId: q.id, order: optionOrder(q, seed) })),
    composition: comp,
    createdAt: now.toISOString(),
  };
}

// ---------- disponibilidade (usada na tela de configuração e nos relatórios) ----------

export function countBy(pool: readonly PublishedQuestion[]): Record<Difficulty, number> {
  const c: Record<Difficulty, number> = { facil: 0, medio: 0, dificil: 0 };
  for (const q of pool) c[q.difficulty]++;
  return c;
}

export function countByTopic(bank: readonly PublishedQuestion[], disciplineId: DisciplineId): Map<string, Record<Difficulty, number>> {
  const m = new Map<string, Record<Difficulty, number>>();
  for (const q of bank) {
    if (q.disciplineId !== disciplineId) continue;
    const c = m.get(q.topicId) ?? { facil: 0, medio: 0, dificil: 0 };
    c[q.difficulty]++;
    m.set(q.topicId, c);
  }
  return m;
}

export function shortfall(poolSize: number, requested: number): number {
  return Math.max(0, requested - poolSize);
}

export function reviewCounts(pool: readonly PublishedQuestion[], stats: Record<string, QuestionStat>, now = new Date()) {
  let errors = 0;
  let due = 0;
  for (const q of pool) {
    const s = stats[q.id];
    if (!s) continue;
    if (!s.lastCorrect) errors++;
    else if (isDue(s, now)) due++;
  }
  return { errors, due };
}

export const MODES_WITH_IMMEDIATE_FEEDBACK: Mode[] = ['aprender', 'revisao', 'misto'];
