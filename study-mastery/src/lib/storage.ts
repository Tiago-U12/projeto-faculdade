import type { AnswerRecord, AnyDisciplineId, Attempt, DisciplineId, Mode, PersonalQuizQuestion, QuestionReport, QuestionStat, SessionConfig } from '../types';
import type { Session } from './engine';
import { nextStat } from './srs';

export const STATE_KEY = 'study-mastery:state:v1';
const LEGACY_KEY = 'study-mastery-attempts-v02';
export const MAX_ATTEMPTS = 200;
/** texto das questões pessoais guardado no aparelho só nas tentativas mais recentes (cabe no localStorage) */
export const MAX_LOCAL_SNAPSHOTS = 30;

export interface ActiveSession {
  session: Session;
  /** sessão com questões pessoais: cópia de cada questão sorteada (a sessão funciona offline e não muda se forem editadas) */
  personal?: Record<string, PersonalQuizQuestion>;
  /** respostas por questionId (id da alternativa escolhida) */
  answers: Record<string, string>;
  index: number;
  startedAt: string;
  /** última alteração (resposta, navegação): decide qual aparelho tem a versão mais nova */
  updatedAt?: string;
}

export interface Settings {
  theme: 'auto' | 'light' | 'dark';
  lastConfig?: SessionConfig;
}

export interface AppState {
  version: 1;
  attempts: Attempt[];
  stats: Record<string, QuestionStat>;
  settings: Settings;
  active?: ActiveSession;
  /** relatos de erro (opcional: estados antigos não têm) */
  reports?: QuestionReport[];
  /** só no espaço da conta: o que já foi enviado ao servidor */
  sync?: SyncInfo;
}

export interface SyncInfo {
  pushed?: string[];
  pushedReports?: string[];
  pulledAt?: string;
  /** quando a sessão em andamento foi encerrada ou descartada neste aparelho */
  activeClearedAt?: string;
}

export interface KeyValueStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export function emptyState(): AppState {
  return { version: 1, attempts: [], stats: {}, settings: { theme: 'auto' } };
}

export function browserStore(): KeyValueStore | null {
  try {
    const s = globalThis.localStorage;
    const probe = '__sm_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null; // modo privado / bloqueado: o app continua funcionando só em memória
  }
}

const TOPIC_BY_OLD_NAME: Record<string, [DisciplineId, string]> = {
  'HTML Semântico': ['fullstack', 'html'],
  'CSS Flexbox/Grid': ['fullstack', 'css'],
  'JS Funções': ['fullstack', 'js-funcoes'],
  'Fetch API': ['fullstack', 'fetch-async'],
  'Classes JS e Erros': ['fullstack', 'classes-erros'],
  'React Componentes': ['fullstack', 'react-componentes'],
  'React useEffect': ['fullstack', 'react-hooks-forms'],
  'React Forms': ['fullstack', 'react-hooks-forms'],
  'React Router': ['fullstack', 'react-router'],
  Express: ['fullstack', 'express-rest'],
  MySQL: ['fullstack', 'mysql'],
  JWT: ['fullstack', 'jwt-auth'],
  'Error Handlers': ['fullstack', 'validacao-erros'],
  "Regra de L'Hôpital": ['calculo2', 'lhopital'],
  'Integrais definidas': ['calculo2', 'integral-definida'],
  'Integração por substituição': ['calculo2', 'substituicao'],
};

/** Converte tentativas do protótipo v0.2 (sem perder o histórico). */
export function migrateLegacyAttempts(raw: unknown): Attempt[] {
  if (!Array.isArray(raw)) return [];
  const out: Attempt[] = [];
  for (const a of raw) {
    if (!a || typeof a !== 'object' || !Array.isArray((a as { answers?: unknown }).answers)) continue;
    const o = a as { id?: string; date?: string; discipline?: string; answers: { questionId: string; topic: string; correct: boolean }[] };
    const disciplineId: DisciplineId = o.discipline === 'calculo2' ? 'calculo2' : 'fullstack';
    out.push({
      id: `v02-${o.id ?? crypto.randomUUID()}`,
      date: o.date ?? new Date(0).toISOString(),
      disciplineId,
      mode: 'simulado' as Mode,
      bankVersion: 'v0.2-legacy',
      answers: o.answers.map(
        (x): AnswerRecord => ({
          questionId: x.questionId,
          topicId: TOPIC_BY_OLD_NAME[x.topic]?.[1] ?? x.topic,
          difficulty: 'medio',
          chosenOptionId: null,
          correct: !!x.correct,
        }),
      ),
    });
  }
  return out;
}

export function isAppState(x: unknown): x is AppState {
  if (!x || typeof x !== 'object') return false;
  const s = x as Partial<AppState>;
  return s.version === 1 && Array.isArray(s.attempts) && !!s.stats && typeof s.stats === 'object' && !!s.settings && typeof s.settings === 'object';
}

/** Chave do estado de cada espaço: o aparelho (sem conta) usa a chave original; cada conta tem a sua. */
export const accountStateKey = (uid: string) => `study-mastery:acct:${uid}:state:v1`;

export function loadState(store: KeyValueStore | null, key = STATE_KEY): AppState {
  if (!store) return emptyState();
  try {
    const raw = store.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isAppState(parsed)) return parsed;
    } else if (key === STATE_KEY) {
      const legacy = store.getItem(LEGACY_KEY);
      if (legacy) {
        const st = emptyState();
        st.attempts = migrateLegacyAttempts(JSON.parse(legacy));
        return st;
      }
    }
  } catch {
    /* estado corrompido: começa limpo sem quebrar o app */
  }
  return emptyState();
}

export function saveState(store: KeyValueStore | null, state: AppState, key = STATE_KEY): boolean {
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify({ ...state, attempts: trimSnapshots(state.attempts.slice(0, MAX_ATTEMPTS)) }));
    return true;
  } catch {
    return false;
  }
}

/** Mantém o texto das questões pessoais só nas tentativas recentes; as antigas guardam acerto/erro (na conta, tudo). */
export function trimSnapshots(attempts: Attempt[]): Attempt[] {
  let kept = 0;
  return attempts.map((a) => {
    if (!a.snapshots) return a;
    if (kept++ < MAX_LOCAL_SNAPSHOTS) return a;
    const { snapshots: _s, ...rest } = a;
    return rest;
  });
}

export interface FinishInput {
  attemptId: string;
  disciplineId: AnyDisciplineId;
  mode: Mode;
  bankVersion: string;
  answers: AnswerRecord[];
  now: Date;
  source?: 'banco' | 'pessoal';
  snapshots?: Record<string, PersonalQuizQuestion>;
}

/** Registra a tentativa e atualiza as estatísticas por questão (repetição espaçada). Imutável. */
export function recordAttempt(state: AppState, input: FinishInput): AppState {
  const attempt: Attempt = {
    id: input.attemptId, date: input.now.toISOString(), disciplineId: input.disciplineId, mode: input.mode, bankVersion: input.bankVersion, answers: input.answers,
    ...(input.source === 'pessoal' ? { source: 'pessoal' as const, snapshots: input.snapshots } : {}),
  };
  const stats = { ...state.stats };
  for (const a of input.answers) stats[a.questionId] = nextStat(stats[a.questionId], a.correct, input.now);
  return { ...state, attempts: [attempt, ...state.attempts.filter((x) => x.id !== attempt.id)].slice(0, MAX_ATTEMPTS), stats, active: undefined, ...(state.sync ? { sync: { ...state.sync, activeClearedAt: input.now.toISOString() } } : {}) };
}

// ---------- exportar / importar ----------

export interface ExportFile {
  app: 'study-mastery';
  schema: 1;
  exportedAt: string;
  state: AppState;
}

export function exportState(state: AppState, now = new Date()): string {
  // o arquivo leva só o progresso: nada de controle de sincronização da conta
  const { sync: _sync, ...rest } = state;
  const file: ExportFile = { app: 'study-mastery', schema: 1, exportedAt: now.toISOString(), state: { ...rest, active: undefined } };
  return JSON.stringify(file, null, 2);
}

export type ImportResult = { ok: true; state: AppState; attemptsAdded: number } | { ok: false; error: string };

export function importState(current: AppState, text: string, mode: 'merge' | 'replace'): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'O arquivo não é um JSON válido.' };
  }
  const f = parsed as Partial<ExportFile>;
  if (!f || f.app !== 'study-mastery' || f.schema !== 1 || !isAppState(f.state)) return { ok: false, error: 'Arquivo não reconhecido como histórico do Study Mastery.' };
  const incoming = f.state;
  if (mode === 'replace') return { ok: true, state: { ...incoming, active: undefined }, attemptsAdded: incoming.attempts.length };
  const known = new Set(current.attempts.map((a) => a.id));
  const added = incoming.attempts.filter((a) => !known.has(a.id));
  const attempts = [...current.attempts, ...added].sort((a, b) => b.date.localeCompare(a.date)).slice(0, MAX_ATTEMPTS);
  const stats = { ...current.stats };
  for (const [id, s] of Object.entries(incoming.stats)) {
    const cur = stats[id];
    if (!cur || s.lastSeen > cur.lastSeen) stats[id] = s;
  }
  const knownReports = new Set((current.reports ?? []).map((r) => r.id));
  const reports = [...(current.reports ?? []), ...(incoming.reports ?? []).filter((r) => !knownReports.has(r.id))];
  return { ok: true, state: { ...current, attempts, stats, ...(reports.length ? { reports } : {}) }, attemptsAdded: added.length };
}
