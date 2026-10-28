// Study Labs: exercícios práticos executáveis. São entidades próprias — não são questões de múltipla escolha e não
// herdam de Question. O Core só conhece este modelo base; cada laboratório (SQL, Web, React…) estende o exercício com
// os dados do seu runtime e se registra em registry.ts.
import type { Difficulty, Scope } from '../types';

/** Tipo de laboratório registrado (ex.: "sql", "web", "react"). Novos tipos entram pelo registro, sem mudar o Core. */
export type LabKind = string;

export interface LabExerciseBase {
  /** estável: muda nunca; um conteúdo diferente ganha outro id */
  id: string;
  /** sobe quando o enunciado, os dados ou a correção mudam (rascunhos antigos são identificados) */
  version: number;
  kind: LabKind;
  /** disciplina e assuntos do banco existente a que o exercício pertence */
  disciplineId: string;
  topicIds: string[];
  /**
   * Capacidades praticadas (skills.ts). É por elas que uma disciplina PESSOAL encontra exercícios: o estudante associa
   * explicitamente cada assunto seu a capacidades — nada é deduzido do nome da disciplina.
   */
  skills: string[];
  difficulty: Difficulty;
  /** mesma escala do quiz: aula < aprofundamento < desafio */
  scope: Scope;
  title: string;
  /** enunciado (aceita **negrito** e `código`) */
  prompt: string;
  objectives: string[];
  estimatedMinutes: number;
  /** dicas graduais: reveladas uma de cada vez */
  hints: string[];
  /** explicação mostrada depois de concluir */
  explanation: string;
  tags?: string[];
  /** metadados para relacionar com guias, materiais e atividades (palavras do assunto, não código executável) */
  relations?: { keywords?: string[] };
}

export interface LabTestResult {
  id: string;
  /** descrição do que o teste confere (pode ser mostrada) */
  label: string;
  passed: boolean;
  /** feedback educativo quando falha (sem revelar a solução) */
  message?: string;
}

export interface LabGrade {
  passed: boolean;
  /** 0–100: proporção de testes obrigatórios aprovados */
  score: number;
  results: LabTestResult[];
  summary: string;
}

/** Tentativa avaliada ("Verificar resposta"). Executar sem verificar não é tentativa. */
export interface LabAttempt {
  id: string;
  exerciseId: string;
  exerciseVersion: number;
  kind: LabKind;
  disciplineId: string;
  topicIds: string[];
  startedAt: string;
  finishedAt: string;
  score: number;
  passed: boolean;
  testResults: LabTestResult[];
  summary: string;
}

/** Rascunho do estudante (SQL ou arquivos), salvo automaticamente. */
export interface LabDraft {
  exerciseId: string;
  exerciseVersion: number;
  sql?: string;
  files?: Record<string, string>;
  updatedAt: string;
}

export type LabSessionSize = 1 | 3;

export interface LabFilter {
  disciplineId: string;
  topicIds: string[];
  difficulties: Difficulty[];
  kinds: LabKind[];
  /** profundidade máxima (cumulativa, como no quiz) */
  scope: Scope;
}

/** Sessão prática: 1 exercício (rápido) ou 3 (sessão). A estrutura aceita até 5 no futuro. */
export interface LabSession {
  id: string;
  exerciseIds: string[];
  index: number;
  startedAt: string;
  filter: LabFilter;
}

export const LAB_SESSION_MAX = 5;
