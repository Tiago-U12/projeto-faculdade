// Catálogo de exercícios dos laboratórios: carrega o banco de cada laboratório sob demanda, valida a estrutura e isola
// falhas (um laboratório que não carrega não derruba os outros nem o resto do app).
import { useEffect, useState } from 'react';
import { DIFFICULTIES, SCOPES } from '../types';
import { LABS, type LabDefinition } from './registry';
import { skillById } from './skills';
import type { LabExerciseBase } from './types';

export interface LoadedCatalog {
  exercises: LabExerciseBase[];
  /** laboratórios cujo catálogo não carregou (ex.: sem rede na primeira visita) */
  failedLabs: string[];
  /** exercícios recusados pela validação (não aparecem para o estudante) */
  invalid: { id: string; problems: string[] }[];
}

const ID = /^[a-z0-9][a-z0-9-]{2,80}$/;

/** Problemas estruturais de um exercício (lista vazia = válido). */
export function exerciseProblems(e: LabExerciseBase, kind: string): string[] {
  const p: string[] = [];
  if (!ID.test(e.id)) p.push('id inválido (use letras minúsculas, números e hífens)');
  if (!Number.isInteger(e.version) || e.version < 1) p.push('versão precisa ser inteiro ≥ 1');
  if (e.kind !== kind) p.push(`tipo "${e.kind}" diferente do laboratório "${kind}"`);
  if (!e.disciplineId) p.push('sem disciplina');
  if (!e.topicIds.length) p.push('sem assunto');
  if (!e.skills.length) p.push('sem capacidade');
  for (const s of e.skills) if (!skillById(s)) p.push(`capacidade desconhecida: ${s}`);
  if (!DIFFICULTIES.includes(e.difficulty)) p.push('dificuldade inválida');
  if (!SCOPES.includes(e.scope)) p.push('profundidade inválida');
  if (!e.title.trim() || !e.prompt.trim()) p.push('título e enunciado são obrigatórios');
  if (!e.objectives.length) p.push('sem objetivos de aprendizagem');
  if (!e.hints.length) p.push('sem dicas');
  if (!e.explanation.trim()) p.push('sem explicação');
  if (!(e.estimatedMinutes > 0 && e.estimatedMinutes <= 120)) p.push('tempo estimado fora de 1–120 min');
  return p;
}

export async function loadCatalog(labs: readonly LabDefinition[] = LABS): Promise<LoadedCatalog> {
  const out: LoadedCatalog = { exercises: [], failedLabs: [], invalid: [] };
  const seen = new Set<string>();
  const loaded = await Promise.allSettled(labs.map((l) => l.loadExercises()));
  loaded.forEach((r, i) => {
    const lab = labs[i];
    if (r.status === 'rejected') {
      out.failedLabs.push(lab.kind);
      return;
    }
    for (const e of r.value) {
      const problems = exerciseProblems(e, lab.kind);
      if (seen.has(e.id)) problems.push('id repetido no catálogo');
      if (problems.length) out.invalid.push({ id: e.id, problems });
      else {
        seen.add(e.id);
        out.exercises.push(e);
      }
    }
  });
  return out;
}

let cached: Promise<LoadedCatalog> | null = null;
/** para testes: esquece o catálogo carregado */
export function resetCatalogCache() {
  cached = null;
}
/** Catálogo compartilhado pelas telas (carregado uma vez; uma falha permite nova tentativa na próxima abertura). */
export function getCatalog(): Promise<LoadedCatalog> {
  cached ??= loadCatalog().then((c) => {
    if (c.failedLabs.length) cached = null;
    return c;
  });
  return cached;
}

export function useLabCatalog(): { catalog: LoadedCatalog | null; loading: boolean } {
  const [catalog, setCatalog] = useState<LoadedCatalog | null>(null);
  useEffect(() => {
    let live = true;
    getCatalog().then((c) => live && setCatalog(c), () => live && setCatalog({ exercises: [], failedLabs: LABS.map((l) => l.kind), invalid: [] }));
    return () => {
      live = false;
    };
  }, []);
  return { catalog, loading: !catalog };
}
