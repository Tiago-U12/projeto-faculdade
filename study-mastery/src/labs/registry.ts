// Registro dos laboratórios. Para adicionar um laboratório: criar a pasta dele (exercícios + página), exportar um
// LabDefinition e incluí-lo em LABS. O Core (catálogo, filtros, sessões, progresso, rotas) não muda.
import type { ComponentType } from 'react';
import { sqlLab } from './sql';
import type { LabAttempt, LabDraft, LabExerciseBase, LabGrade } from './types';

/** O que a página de um laboratório recebe do Core (o Core cuida de rascunho, tentativas e sessão). */
export interface LabPageProps<E extends LabExerciseBase = LabExerciseBase> {
  exercise: E;
  /** rascunho restaurado (mesma versão do exercício), se houver */
  initialDraft?: LabDraft;
  /** salva o rascunho (com espera para agrupar digitação) */
  saveDraft(d: Pick<LabDraft, 'sql' | 'files'>): void;
  /** apaga o rascunho (Restaurar exercício) */
  clearDraft(): Promise<void>;
  /** tentativas anteriores deste exercício (mais recentes primeiro) */
  attempts: LabAttempt[];
  /** registra uma tentativa avaliada (Verificar resposta) */
  recordAttempt(grade: LabGrade): Promise<void>;
  /** já concluído alguma vez */
  completed: boolean;
}

export interface LabDefinition {
  kind: string;
  /** nome mostrado (ex.: "SQL Lab") */
  name: string;
  summary: string;
  /** runtime em linguagem simples (ex.: "SQLite no navegador") */
  runtime: string;
  /** funciona sem internet depois de carregado/instalado */
  offline: boolean;
  /** aviso quando há dependência de rede ou limitação relevante */
  note?: string;
  /** catálogo carregado sob demanda (não pesa no carregamento inicial do app) */
  loadExercises(): Promise<LabExerciseBase[]>;
  /** código da página, baixado só quando o estudante abre um exercício (pode ser chamado de novo após uma falha) */
  loadPage(): Promise<{ default: ComponentType<LabPageProps<never>> }>;
}

/** Laboratórios disponíveis nesta versão. */
export const LABS: LabDefinition[] = [sqlLab];

export const labByKind = (kind: string, labs: readonly LabDefinition[] = LABS) => labs.find((l) => l.kind === kind);
