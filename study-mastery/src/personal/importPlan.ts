// Importação EXPLÍCITA dos dados deste aparelho (sem conta) para a conta escolhida.
// - nada é enviado sem o estudante ver o resumo e confirmar;
// - reimportar não duplica: o que já está na conta (mesmo ID) é ignorado;
// - disciplina/assunto com o mesmo nome de um que já existe na conta é juntado a ele (as referências são remapeadas);
// - o original continua no aparelho até o estudante apagá-lo.
import type { AppState } from '../lib/storage';
import type { Attempt, QuestionReport } from '../types';
import { LIMITS, topicKey, type PDiscipline, type PTopic } from './types';

export interface ImportSource {
  state: AppState;
  disciplines: PDiscipline[];
  topics: PTopic[];
}

export interface ImportTarget {
  attemptIds: ReadonlySet<string>;
  reportIds: ReadonlySet<string>;
  disciplines: PDiscipline[];
  topics: PTopic[];
}

export interface ImportPlan {
  attempts: Attempt[];
  reports: QuestionReport[];
  disciplines: PDiscipline[];
  topics: PTopic[];
  /** disciplinas do aparelho juntadas a uma de mesmo nome na conta */
  merged: { name: string; deviceId: string; accountId: string }[];
  /** já estavam na conta (importação anterior) */
  alreadyThere: { attempts: number; reports: number; disciplines: number; topics: number };
  /** id no aparelho → id na conta */
  remap: Record<string, string>;
  /** motivo para não importar (ex.: limite), ou null */
  blocked: string | null;
}

export function planImport(src: ImportSource, dst: ImportTarget): ImportPlan {
  const remap: Record<string, string> = {};
  const alreadyThere = { attempts: 0, reports: 0, disciplines: 0, topics: 0 };
  const merged: ImportPlan['merged'] = [];

  const dstDiscById = new Set(dst.disciplines.map((d) => d.id));
  const dstDiscByName = new Map(dst.disciplines.map((d) => [topicKey(d.name), d]));
  const disciplines: PDiscipline[] = [];
  for (const d of src.disciplines) {
    if (dstDiscById.has(d.id)) {
      alreadyThere.disciplines++;
      continue;
    }
    const same = dstDiscByName.get(topicKey(d.name));
    if (same) {
      remap[d.id] = same.id;
      merged.push({ name: same.name, deviceId: d.id, accountId: same.id });
      continue;
    }
    disciplines.push(d);
  }

  const dstTopicIds = new Set(dst.topics.map((t) => t.id));
  const topicByName = new Map(dst.topics.map((t) => [`${t.disciplineId}\u0000${topicKey(t.name)}`, t.id]));
  const topics: PTopic[] = [];
  for (const t of src.topics) {
    if (dstTopicIds.has(t.id)) {
      alreadyThere.topics++;
      continue;
    }
    const disciplineId = remap[t.disciplineId] ?? t.disciplineId;
    const key = `${disciplineId}\u0000${topicKey(t.name)}`;
    const existing = topicByName.get(key);
    if (existing) {
      remap[t.id] = existing;
      continue;
    }
    topicByName.set(key, t.id);
    topics.push({ ...t, disciplineId });
  }

  const attempts: Attempt[] = [];
  for (const a of src.state.attempts) {
    if (dst.attemptIds.has(a.id)) {
      alreadyThere.attempts++;
      continue;
    }
    attempts.push(remap[a.disciplineId] || a.answers.some((x) => remap[x.topicId]) ? { ...a, disciplineId: (remap[a.disciplineId] ?? a.disciplineId) as Attempt['disciplineId'], answers: a.answers.map((x) => ({ ...x, topicId: remap[x.topicId] ?? x.topicId })) } : a);
  }
  const reports: QuestionReport[] = [];
  for (const r of src.state.reports ?? []) {
    if (dst.reportIds.has(r.id)) alreadyThere.reports++;
    else reports.push(r);
  }

  let blocked: string | null = null;
  if (dst.disciplines.length + disciplines.length > LIMITS.disciplines) blocked = `A conta ficaria com mais de ${LIMITS.disciplines} disciplinas. Exclua alguma antes de importar.`;
  return { attempts, reports, disciplines, topics, merged, alreadyThere, remap, blocked };
}

export const isEmptyPlan = (p: ImportPlan) => !p.attempts.length && !p.reports.length && !p.disciplines.length && !p.topics.length && !p.merged.length;

/** Registro (no aparelho) de importações já feitas, só para informar o estudante. */
export const IMPORT_LOG_KEY = 'study-mastery:importacoes:v1';
