// Dados pessoais do estudante (disciplinas próprias, materiais, guias, questões, calendário).
// Ficam no espaço atual: "neste aparelho" (IndexedDB) ou "conta" (Supabase, isolado por RLS). Separados do banco existente.

import type { MaterialIssue, TopicSuggestion } from '../../supabase/functions/_shared/materialQuality';
export type { MaterialIssue, PageText, TopicSuggestion } from '../../supabase/functions/_shared/materialQuality';

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

export const LIMITS = {
  disciplineName: 80,
  description: 500,
  period: 40,
  topicName: 120,
  disciplines: 30,
  topicsPerDiscipline: 60,
  materials: 40,
  materialTitle: 120,
} as const;

export interface EntityMap {
  disciplines: PDiscipline;
  topics: PTopic;
  materials: PMaterial;
}
export type Kind = keyof EntityMap;
export const KINDS: Kind[] = ['disciplines', 'topics', 'materials'];

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
