// Filtros estritos dos laboratórios (mesma filosofia do quiz): só entra exercício cujo conteúdo inteiro está nos
// assuntos escolhidos. Faltando exercícios, a sessão fica menor — nunca é completada com outros assuntos.
import { scopeAllows } from '../lib/engine';
import { DIFFICULTIES, type Difficulty } from '../types';
import type { LabExerciseBase, LabFilter, LabSessionSize } from './types';

export interface LabContext {
  /** ids das disciplinas do banco existente (exercícios apontam para elas diretamente) */
  bankDisciplineIds: ReadonlySet<string>;
  /** assunto pessoal → capacidades associadas EXPLICITAMENTE pelo estudante */
  topicSkills: Readonly<Record<string, readonly string[]>>;
}

/**
 * O exercício cabe nos assuntos escolhidos?
 *  - disciplina do banco: todos os assuntos do exercício precisam estar marcados;
 *  - disciplina pessoal: todas as capacidades do exercício precisam estar associadas aos assuntos marcados.
 */
export function fitsTopics(e: LabExerciseBase, disciplineId: string, topicIds: readonly string[], ctx: LabContext): boolean {
  if (!topicIds.length) return false;
  if (ctx.bankDisciplineIds.has(disciplineId)) return e.disciplineId === disciplineId && e.topicIds.length > 0 && e.topicIds.every((t) => topicIds.includes(t));
  const allowed = new Set(topicIds.flatMap((t) => ctx.topicSkills[t] ?? []));
  return e.skills.length > 0 && e.skills.every((s) => allowed.has(s));
}

export function filterExercises(all: readonly LabExerciseBase[], f: LabFilter, ctx: LabContext): LabExerciseBase[] {
  return all.filter((e) => fitsTopics(e, f.disciplineId, f.topicIds, ctx) && f.difficulties.includes(e.difficulty) && (f.kinds.length === 0 || f.kinds.includes(e.kind)) && scopeAllows(f.scope, e.scope));
}

/** Exercícios disponíveis para a disciplina inteira (todos os assuntos dela), por laboratório. */
export function countByKind(list: readonly LabExerciseBase[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of list) m.set(e.kind, (m.get(e.kind) ?? 0) + 1);
  return m;
}

/** Exercícios de um assunto sozinho (contagem mostrada ao lado do assunto). */
export function countForTopic(all: readonly LabExerciseBase[], disciplineId: string, topicId: string, ctx: LabContext): number {
  return all.filter((e) => fitsTopics(e, disciplineId, [topicId], ctx)).length;
}

export type ExerciseStatus = 'novo' | 'iniciado' | 'concluido';

/** gerador determinístico (mesma semente = mesma sessão; testável) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Escolhe até `size` exercícios entre os que passaram no filtro: primeiro os ainda não concluídos, depois os já feitos;
 * a ordem final vai do mais fácil ao mais difícil. Nunca acrescenta exercício fora do filtro.
 */
export function pickSession(matched: readonly LabExerciseBase[], size: LabSessionSize, status: (id: string) => ExerciseStatus, seed: number): LabExerciseBase[] {
  const r = rng(seed);
  const shuffle = <T,>(xs: T[]) => {
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    return xs;
  };
  const pending = shuffle(matched.filter((e) => status(e.id) !== 'concluido'));
  const done = shuffle(matched.filter((e) => status(e.id) === 'concluido'));
  const rank = (d: Difficulty) => DIFFICULTIES.indexOf(d);
  return [...pending, ...done].slice(0, size).sort((a, b) => rank(a.difficulty) - rank(b.difficulty));
}
