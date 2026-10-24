// Dados pessoais do estudante (disciplinas próprias, materiais, guias, questões, calendário).
// Ficam no espaço atual: "neste aparelho" (IndexedDB) ou "conta" (Supabase, isolado por RLS). Separados do banco existente.

import type { MaterialIssue, TopicSuggestion } from '../../supabase/functions/_shared/materialQuality';
import type { GuideItem, QuestionChecks, Ref, SectionKind } from '../../supabase/functions/_shared/generation';
import type { Difficulty } from '../types';
export type { MaterialIssue, PageText, TopicSuggestion } from '../../supabase/functions/_shared/materialQuality';
export type { GuideItem, QuestionChecks, Ref, SectionKind } from '../../supabase/functions/_shared/generation';

export const COLORS = ['menta', 'lilas', 'ambar', 'coral', 'ceu', 'rosa', 'lima', 'ardosia'] as const;
export type Color = (typeof COLORS)[number];
export const COLOR_LABEL: Record<Color, string> = { menta: 'Menta', lilas: 'Lilás', ambar: 'Âmbar', coral: 'Coral', ceu: 'Céu', rosa: 'Rosa', lima: 'Lima', ardosia: 'Ardósia' };

interface Base {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface PDiscipline extends Base {
  name: string;
  description: string;
  period?: string;
  color: Color;
}

export interface PTopic extends Base {
  disciplineId: string;
  name: string;
  position: number;
  origin: 'manual' | 'material';
}

export type MaterialStatus = 'recebido' | 'processando' | 'pronto' | 'atencao' | 'falhou';
export const MATERIAL_STATUS_LABEL: Record<MaterialStatus, string> = { recebido: 'Recebido', processando: 'Processando', pronto: 'Pronto', atencao: 'Precisa de atenção', falhou: 'Falhou' };

export interface PMaterial extends Base {
  disciplineId: string;
  title: string;
  kind: 'pdf' | 'texto';
  status: MaterialStatus;
  statusDetail?: string;
  fileName?: string;
  fileSize?: number;
  sha256?: string;
  pageCount: number;
  charCount: number;
  issues: MaterialIssue[];
  suggestedTopics: TopicSuggestion[];
  /** assuntos da disciplina associados pelo estudante */
  topicIds: string[];
  /** sobe quando o texto muda (guias e questões guardam a versão usada) */
  version: number;
  /** só na conta: quando o servidor conferiu o arquivo/texto */
  serverCheckedAt?: string;
}

export type QuestionStatus = 'gerada_ia' | 'criada_aluno' | 'reportada' | 'arquivada';
export const QUESTION_STATUS_LABEL: Record<QuestionStatus, string> = {
  gerada_ia: 'Gerada por IA',
  criada_aluno: 'Criada por você',
  reportada: 'Com erro relatado',
  arquivada: 'Arquivada',
};

/** Questão pessoal: separada do banco existente e SEM as verificações dele (ver "checks"). */
export interface PQuestion extends Base {
  disciplineId: string;
  topicId: string;
  status: QuestionStatus;
  difficulty: Difficulty;
  version: number;
  materialIds: string[];
  stem: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: { correct: string; wrong: Record<string, string>; steps: string[] };
  refs: Ref[];
  /** checagens automáticas feitas na geração (estrutura, alternativas, trecho conferido, duplicata) */
  checks?: QuestionChecks;
  origin: { kind: 'ia' | 'aluno'; model?: string; jobId?: string; materialVersions?: Record<string, number>; generatedAt?: string; editedAt?: string };
  /** motivo do relato, quando reportada */
  reportNote?: string;
}

export type SectionStatus = 'pendente' | 'gerando' | 'pronta' | 'falhou';
export interface GuideSection {
  key: string;
  topicId: string;
  kind: SectionKind | 'trechos';
  status: SectionStatus;
  generator?: 'trechos' | 'ia';
  model?: string;
  items?: GuideItem[];
  dropped?: number;
  notes?: string[];
  materialVersions?: Record<string, number>;
  version?: number;
  generatedAt?: string;
  error?: string | null;
  jobId?: string;
  previous?: Omit<GuideSection, 'previous'>;
}

export interface PGuide extends Base {
  disciplineId: string;
  title: string;
  materialIds: string[];
  /** assuntos confirmados pelo estudante antes de gerar */
  topicIds: string[];
  allowComplement: boolean;
  /** preparação para avaliação: data e escopo confirmado (nunca "o que vai cair") */
  exam?: { date: string; scopeMaterialId?: string; confirmedAt: string } | null;
  sectionKinds: SectionKind[];
  sections: Record<string, GuideSection>;
  version: number;
}

export const LIMITS = {
  disciplineName: 80,
  description: 500,
  period: 40,
  topicName: 120,
  disciplines: 30,
  topicsPerDiscipline: 60,
  materials: 40,
  materialTitle: 120,
  questionsPerBatch: 10,
  guides: 60,
} as const;

export interface EntityMap {
  disciplines: PDiscipline;
  topics: PTopic;
  materials: PMaterial;
  questions: PQuestion;
  guides: PGuide;
}
export type Kind = keyof EntityMap;
export const KINDS: Kind[] = ['disciplines', 'topics', 'materials', 'questions', 'guides'];

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}

/** Remove espaços extras; devolve mensagem de erro em português ou null. */
export function validateDiscipline(d: Pick<PDiscipline, 'name' | 'description' | 'period' | 'color'>): string | null {
  if (!d.name.trim()) return 'Dê um nome à disciplina.';
  if (d.name.trim().length > LIMITS.disciplineName) return `O nome pode ter até ${LIMITS.disciplineName} caracteres.`;
  if (d.description.length > LIMITS.description) return `A descrição pode ter até ${LIMITS.description} caracteres.`;
  if ((d.period ?? '').length > LIMITS.period) return `O período pode ter até ${LIMITS.period} caracteres.`;
  if (!COLORS.includes(d.color)) return 'Escolha uma cor da lista.';
  return null;
}

/** Normaliza para comparar nomes de assuntos (sem diferenciar maiúsculas e espaços nas pontas). */
export const topicKey = (name: string) => name.trim().toLocaleLowerCase('pt-BR');
