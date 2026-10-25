import { useEffect, useMemo } from 'react';
import type { PersonalQuizQuestion } from '../types';
import { usePersonalOptional } from './context';
import type { PDiscipline, PMaterial, PQuestion, PTopic } from './types';

/** Cópia da questão pessoal para o quiz e o histórico (com nomes de assunto/material e o trecho citado). */
export function toQuiz(q: PQuestion, d: PDiscipline | undefined, topics: Map<string, PTopic>, materials: Map<string, PMaterial>): PersonalQuizQuestion {
  return {
    personal: true,
    id: q.id,
    version: q.version,
    disciplineId: q.disciplineId,
    disciplineName: d?.name ?? 'Disciplina',
    topicId: q.topicId,
    topicName: topics.get(q.topicId)?.name ?? 'Assunto',
    difficulty: q.difficulty,
    stem: q.stem,
    options: q.options,
    correctOptionId: q.correctOptionId,
    explanation: { correct: q.explanation.correct, wrong: q.explanation.wrong, steps: q.explanation.steps },
    status: q.status,
    refs: q.refs.map((r) => {
      const m = materials.get(r.materialId);
      return { materialId: r.materialId, materialTitle: m?.title ?? 'Material excluído', unit: m?.kind === 'texto' ? 'trecho' : 'página', page: r.page, quote: r.quote };
    }),
    ...(q.checks ? { checks: q.checks } : {}),
    ...(q.origin.model ? { model: q.origin.model } : {}),
    ...(q.origin.editedAt ? { edited: true } : {}),
    origin: q.origin.kind,
  };
}

/** Questões pessoais de uma disciplina, prontas para sessões (inclui reportadas/arquivadas: quem filtra é a sessão). */
export function usePersonalQuiz(disciplineId: string): { questions: PersonalQuizQuestion[]; raw: PQuestion[]; loading: boolean } {
  const p = usePersonalOptional();
  const want = !!p && !!disciplineId;
  const qs = (want && p.items('questions')) || undefined;
  const topics = (want && p.items('topics')) || undefined;
  const materials = (want && p.items('materials')) || undefined;
  const disciplines = (want && p.items('disciplines')) || undefined;
  useEffect(() => {
    if (!want) return;
    for (const k of ['questions', 'topics', 'materials', 'disciplines'] as const) if (!p.items(k)) void p.load(k);
  }, [want, p]);
  return useMemo(() => {
    if (!want) return { questions: [], raw: [], loading: false };
    const d = (disciplines ?? []).find((x) => x.id === disciplineId);
    const tm = new Map((topics ?? []).map((t) => [t.id, t]));
    const mm = new Map((materials ?? []).map((m) => [m.id, m]));
    const raw = (qs ?? []).filter((q) => q.disciplineId === disciplineId);
    return { questions: raw.map((q) => toQuiz(q, d, tm, mm)), raw, loading: !qs };
  }, [want, qs, topics, materials, disciplines, disciplineId]);
}
