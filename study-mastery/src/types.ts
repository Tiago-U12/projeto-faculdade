// Tipos compartilhados entre o app do estudante (src/) e as ferramentas editoriais (tools/).

export type DisciplineId = 'calculo2' | 'fullstack';
export type Difficulty = 'facil' | 'medio' | 'dificil';
export type Scope = 'aula' | 'aprofundamento' | 'desafio';
export type Mode = 'aprender' | 'simulado' | 'revisao' | 'misto';
export type Status = 'draft' | 'verified' | 'approved' | 'rejected';

export const DIFFICULTIES: Difficulty[] = ['facil', 'medio', 'dificil'];
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { facil: 'Fácil', medio: 'Média', dificil: 'Difícil' };
export const SCOPES: Scope[] = ['aula', 'aprofundamento', 'desafio'];
export const SCOPE_LABEL: Record<Scope, string> = { aula: 'Aula', aprofundamento: 'Aprofundamento', desafio: 'Desafio' };
export const MODE_LABEL: Record<Mode, string> = { aprender: 'Aprender', simulado: 'Simulado', revisao: 'Revisão', misto: 'Misto' };

export interface SourceRef {
  /** id em content/sources.json */
  sourceId: string;
  /** página, slide, seção ou exercício — o mais específico possível */
  locator?: string;
  /** como a fonte foi usada */
  usage: 'aula' | 'aprofundamento' | 'verificacao';
}

export interface Option {
  id: string;
  text: string;
}

export interface Explanation {
  /** por que a alternativa correta está certa */
  correct: string;
  /** resolução passo a passo, quando cabível */
  steps?: string[];
  /** por que cada alternativa errada está errada (chave = id da alternativa) */
  wrong?: Record<string, string>;
  /** erros frequentes dos estudantes */
  commonMistakes?: string[];
}

/** Resultado de verificação automática registrado na questão. */
export interface VerificationSpec {
  /** sympy = verificação simbólica + numérica; js = execução isolada; node = execução com bibliotecas (Express, JWT, React…); sql = consultas reais em um MariaDB (compatível com MySQL) temporário; web = HTML/CSS no Chromium; source = checagem contra fonte oficial */
  kind: 'limit' | 'form' | 'derivative' | 'integral' | 'definite' | 'double' | 'expr' | 'function' | 'js' | 'node' | 'sql' | 'web' | 'source';
  /** parâmetros específicos de cada tipo (ver tools/lib/verify) */
  params?: Record<string, unknown>;
  /** valor verificável de cada alternativa, por id (expressões sympy, saídas do js ou rótulos) */
  optionValues?: Record<string, string>;
  /** para kind=source: afirmações conferidas na fonte */
  claims?: string[];
  result?: {
    ok: boolean;
    method: string;
    ranAt: string;
    details: string;
  };
}

export interface ReviewRecord {
  decision: 'approved' | 'rejected';
  reviewer: string;
  reviewerType: 'human' | 'ai-assisted';
  at: string;
  notes?: string;
  checklist?: Record<string, boolean>;
}

export interface Question {
  /** ID persistente: nunca reutilizar nem alterar. */
  id: string;
  disciplineId: DisciplineId;
  topicId: string;
  subtopic?: string;
  difficulty: Difficulty;
  scope: Scope;
  type: 'multiple-choice';
  stem: string;
  options: Option[];
  correctOptionId: string;
  /** não embaralhar as alternativas (ex.: opções que referenciam a ordem) */
  fixedOrder?: boolean;
  explanation: Explanation;
  sourceRefs: SourceRef[];
  status: Status;
  version: number;
  createdAt: string;
  updatedAt: string;
  legacyId?: string;
  tags?: string[];
  verification?: VerificationSpec;
  review?: ReviewRecord;
}

/** Forma publicada para o estudante: sem scripts de verificação. */
export interface PublishedQuestion extends Omit<Question, 'verification' | 'review' | 'status'> {
  status: 'approved';
  verifiedBy: string; // método: sympy+numeric | js-exec | source
  reviewedBy: 'human' | 'ai-assisted';
}

export interface PublishedSource {
  id: string;
  title: string;
  kind: SourceRecord['kind'];
  author?: string;
  institution?: string;
  license?: string;
  url?: string;
}

export interface BankManifest {
  schemaVersion: 1;
  bankVersion: string;
  generatedAt: string;
  totals: { approved: number };
  byDiscipline: Record<string, Record<Difficulty, number>>;
}

export interface Topic {
  id: string;
  name: string;
  /** quota de questões aprovadas por dificuldade (meta) */
  quota: Record<Difficulty, number>;
  /** fontes das aulas ligadas ao assunto */
  sourceIds: string[];
  blurb?: string;
  /** assunto cobrado na prova de 26/10 (apenas Cálculo II) */
  examFocus?: boolean;
}

export interface Discipline {
  id: DisciplineId;
  name: string;
  short: string;
  subtitle: string;
  icon: string;
  accent: 'mint' | 'purple';
  topics: Topic[];
}

export interface Taxonomy {
  semester: string;
  disciplines: Discipline[];
}

export interface SourceRecord {
  id: string;
  title: string;
  kind: 'aula-pdf' | 'aula-readme' | 'lista' | 'programa' | 'externa-oficial' | 'externa-livro';
  disciplineId: DisciplineId;
  /** origem: URL ou Drive ID */
  origin: string;
  author?: string;
  institution?: string;
  license?: string;
  /** como podemos usar */
  usage: string;
  /** true somente se o conteúdo foi efetivamente lido */
  accessed: boolean;
  accessedAt?: string;
  sha256?: string;
  topicIds: string[];
  notes?: string;
}

// ---------- Estado do estudante (localStorage) ----------

export interface AnswerRecord {
  questionId: string;
  topicId: string;
  difficulty: Difficulty;
  chosenOptionId: string | null;
  correct: boolean;
  ms?: number;
}

export interface Attempt {
  id: string;
  date: string;
  disciplineId: DisciplineId;
  mode: Mode;
  bankVersion: string;
  answers: AnswerRecord[];
}

export interface QuestionStat {
  seen: number;
  correct: number;
  lastSeen: string;
  lastCorrect: boolean;
  /** caixa de Leitner: 0 = errada recentemente, cresce a cada acerto seguido */
  box: number;
  /** ISO — quando volta a ser devida na revisão */
  due: string;
}

export interface SessionConfig {
  disciplineId: DisciplineId;
  topicIds: string[];
  scope: Scope; // profundidade máxima: aula < aprofundamento < desafio
  difficulties: Difficulty[];
  mode: Mode;
  size: number; // 5, 10 ou 20 na interface
}
