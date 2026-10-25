// Regras verificáveis da agenda: quando um evento acontece, o que está atrasado, conflitos, o planejamento até a prova
// e a sugestão de novo horário para uma sessão perdida. Funções puras (sem React, sem rede), testadas à parte.
import type { PEvent } from '../personal/types';
import { addDays, daysBetween, hhmm, instantToZoned, minutesOf, shortDate, todayIn, weekday, zonedToInstant, type YMD } from './time';

/** Duração usada para conflitos quando o evento não tem duração (o estudante não informou). */
export const DEFAULT_BUSY_MIN = 60;

export function eventDay(e: PEvent, tz: string): YMD {
  return e.allDay ? e.date! : instantToZoned(Date.parse(e.start!), tz).date;
}

export function eventTimes(e: PEvent, tz: string): { start: string; end?: string } | null {
  if (e.allDay) return null;
  const s = Date.parse(e.start!);
  return { start: instantToZoned(s, tz).time, ...(e.durationMin ? { end: instantToZoned(s + e.durationMin * 60000, tz).time } : {}) };
}

/** Agendado e já passou (dia inteiro: o dia acabou). Nunca vira "concluído" sozinho. */
export function isOverdue(e: PEvent, now: number, tz: string): boolean {
  if (e.status !== 'agendado') return false;
  if (e.allDay) return e.date! < todayIn(tz, now);
  return Date.parse(e.start!) + (e.durationMin ?? 0) * 60000 < now;
}

export interface Busy {
  id: string;
  start: number;
  end: number;
  title: string;
  /** prova e entrega: compromissos fixos (nunca movidos por sugestão) */
  fixed: boolean;
}

/** Horários ocupados: eventos agendados com horário (dia inteiro não ocupa horário). */
export function busyFrom(events: PEvent[], exceptId?: string): Busy[] {
  return events
    .filter((e) => e.id !== exceptId && e.status === 'agendado' && !e.allDay && e.start)
    .map((e) => {
      const start = Date.parse(e.start!);
      return { id: e.id, start, end: start + (e.durationMin ?? DEFAULT_BUSY_MIN) * 60000, title: e.title, fixed: e.type === 'prova' || e.type === 'entrega' };
    });
}

export const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start < b.end && b.start < a.end;

export function conflictsWith(range: { start: number; end: number }, busy: Busy[]): Busy[] {
  return busy.filter((b) => overlaps(range, b));
}

// ---------------------------------------------------------------- planejamento

export type Activity = 'estudo' | 'exercicios' | 'revisao' | 'simulado';
export const ACTIVITY_LABEL: Record<Activity, string> = { estudo: 'Estudo', exercicios: 'Exercícios', revisao: 'Revisão', simulado: 'Simulado' };

export interface Availability {
  /** 0 = domingo … 6 = sábado */
  weekdays: number[];
  windowStart: string;
  windowEnd: string;
  minutesPerDay: number;
}

export interface PlanInput {
  examDate: YMD;
  topics: { id: string; name: string }[];
  availability: Availability;
  sessionMin: number;
  /** pausa entre sessões no mesmo dia */
  gapMin?: number;
  now: number;
  timeZone: string;
  busy: Busy[];
  /** respostas por assunto no histórico (bancos e questões pessoais) */
  performance: Record<string, { answered: number; correct: number }>;
  disciplineName: string;
}

export interface PlanItem {
  activity: Activity;
  topicIds: string[];
  title: string;
}
export interface PlannedSession extends PlanItem {
  date: YMD;
  start: string;
  durationMin: number;
}
export interface PlanResult {
  sessions: PlannedSession[];
  unplaced: PlanItem[];
  /** horários livres não usados (o plano não "preenche" a agenda) */
  freeSlots: number;
  requiredMin: number;
  availableMin: number;
  conflictsAvoided: string[];
  errors: string[];
  warnings: string[];
}

/** Mínimo de respostas para considerar o desempenho de um assunto (uma resposta não diz nada). */
export const MIN_EVIDENCE = 5;

/** Desempenho observado: "fraco" (< 60% com evidência), "forte" (≥ 80% com evidência) ou sem dados. */
export function topicLevel(p: { answered: number; correct: number } | undefined): 'fraco' | 'forte' | 'sem_dados' | 'medio' {
  if (!p || p.answered < MIN_EVIDENCE) return 'sem_dados';
  const acc = p.correct / p.answered;
  return acc < 0.6 ? 'fraco' : acc >= 0.8 ? 'forte' : 'medio';
}

export function inputErrors(i: Pick<PlanInput, 'examDate' | 'topics' | 'availability' | 'sessionMin' | 'now' | 'timeZone'>): string[] {
  const e: string[] = [];
  const today = todayIn(i.timeZone, i.now);
  if (!i.examDate) e.push('Informe a data da prova.');
  else if (i.examDate <= today) e.push('A data da prova precisa ser depois de hoje (não há preparação depois da avaliação).');
  if (!i.topics.length) e.push('Escolha ao menos um assunto.');
  if (!i.availability.weekdays.length) e.push('Marque ao menos um dia da semana disponível.');
  if (minutesOf(i.availability.windowEnd) <= minutesOf(i.availability.windowStart)) e.push('O horário final precisa ser depois do inicial.');
  if (i.sessionMin < 15 || i.sessionMin > 180) e.push('A duração da sessão deve ficar entre 15 e 180 minutos.');
  if (i.availability.minutesPerDay < i.sessionMin) e.push('O tempo por dia precisa comportar ao menos uma sessão.');
  if (minutesOf(i.availability.windowEnd) - minutesOf(i.availability.windowStart) < i.sessionMin) e.push('A janela de horário é menor que uma sessão.');
  return e;
}

/** Horários possíveis até a véspera da prova, dentro da disponibilidade e sem conflito com a agenda. */
export function freeSlots(i: PlanInput): { slots: { date: YMD; start: string; startAt: number }[]; conflictsAvoided: string[] } {
  const today = todayIn(i.timeZone, i.now);
  const gap = i.gapMin ?? 10;
  const slots: { date: YMD; start: string; startAt: number }[] = [];
  const avoided = new Set<string>();
  const ws = minutesOf(i.availability.windowStart);
  const we = minutesOf(i.availability.windowEnd);
  for (let d = today; d < i.examDate; d = addDays(d, 1)) {
    if (!i.availability.weekdays.includes(weekday(d))) continue;
    let used = 0;
    let cursor = ws;
    while (cursor + i.sessionMin <= we && used + i.sessionMin <= i.availability.minutesPerDay) {
      const start = zonedToInstant(d, hhmm(cursor), i.timeZone);
      const range = { start, end: start + i.sessionMin * 60000 };
      if (start <= i.now) {
        cursor += 15;
        continue;
      }
      const hit = conflictsWith(range, i.busy);
      if (hit.length) {
        for (const h of hit) avoided.add(h.title);
        // pula para o fim do compromisso (arredondado para 5 min)
        const endLocal = instantToZoned(Math.max(...hit.map((h) => h.end)), i.timeZone);
        const next = endLocal.date === d ? Math.ceil(endLocal.minutes / 5) * 5 : we;
        cursor = Math.max(cursor + 5, next);
        continue;
      }
      slots.push({ date: d, start: hhmm(cursor), startAt: start });
      used += i.sessionMin;
      cursor += i.sessionMin + gap;
    }
  }
  return { slots, conflictsAvoided: [...avoided] };
}

/**
 * Plano até a véspera da prova. Para cada assunto: estudo e exercícios (assunto com desempenho fraco ganha mais uma
 * sessão de exercícios; forte dispensa a de exercícios) e uma revisão espaçada; no fim, um simulado. Se o tempo não
 * basta, nada é espremido: o que não coube é listado com o tamanho da falta.
 */
export function buildPlan(i: PlanInput): PlanResult {
  const errors = inputErrors(i);
  const empty = { sessions: [], unplaced: [], freeSlots: 0, requiredMin: 0, availableMin: 0, conflictsAvoided: [], warnings: [] };
  if (errors.length) return { ...empty, errors };

  const levels = new Map(i.topics.map((t) => [t.id, topicLevel(i.performance[t.id])]));
  const rank = { fraco: 0, sem_dados: 1, medio: 2, forte: 3 } as const;
  const topics = [...i.topics].sort((a, b) => rank[levels.get(a.id)!] - rank[levels.get(b.id)!]);
  const item = (activity: Activity, t?: { id: string; name: string }): PlanItem => ({ activity, topicIds: t ? [t.id] : i.topics.map((x) => x.id), title: `${ACTIVITY_LABEL[activity]}: ${t ? t.name : i.disciplineName}` });

  // prioridade (o que entra primeiro quando falta tempo)
  const priority: PlanItem[] = [];
  for (const t of topics) priority.push(item('estudo', t));
  for (const t of topics) if (levels.get(t.id) !== 'forte') priority.push(item('exercicios', t));
  priority.push(item('simulado'));
  for (const t of topics) priority.push(item('revisao', t));
  for (const t of topics) if (levels.get(t.id) === 'fraco') priority.push(item('exercicios', t));

  const { slots, conflictsAvoided } = freeSlots(i);
  const chosen = priority.slice(0, slots.length);
  const unplaced = priority.slice(slots.length);

  // ordem no tempo: estudo e exercícios de cada assunto; a revisão do assunto anterior vem depois do seguinte
  // (espaçamento); simulado por último
  const seq: PlanItem[] = [];
  const has = (x: PlanItem) => chosen.includes(x);
  const of = (a: Activity, id: string) => chosen.filter((x) => x.activity === a && x.topicIds.length === 1 && x.topicIds[0] === id);
  let pendingReview: PlanItem[] = [];
  for (const t of topics) {
    seq.push(...of('estudo', t.id), ...of('exercicios', t.id));
    seq.push(...pendingReview);
    pendingReview = of('revisao', t.id);
  }
  seq.push(...pendingReview);
  const sim = chosen.find((x) => x.activity === 'simulado');
  if (sim) seq.push(sim);
  for (const x of chosen) if (!seq.includes(x) && has(x)) seq.splice(seq.length - (sim ? 1 : 0), 0, x);

  // distribui por todo o período (não amontoa no começo); o simulado fica no último horário
  const n = seq.length;
  const L = slots.length;
  const sessions: PlannedSession[] = seq.map((x, k) => {
    const idx = x === sim ? L - 1 : n === 1 ? 0 : Math.min(L - (sim ? 2 : 1), Math.floor((k * (L - (sim ? 1 : 0))) / (n - (sim ? 1 : 0))));
    return { ...x, date: slots[idx].date, start: slots[idx].start, durationMin: i.sessionMin };
  });
  // índices distintos garantidos pela fórmula quando n ≤ L; conferência final abaixo
  const warnings: string[] = [];
  const requiredMin = priority.length * i.sessionMin;
  const availableMin = L * i.sessionMin;
  if (unplaced.length) {
    const falta = unplaced.length * i.sessionMin;
    warnings.push(
      `Tempo insuficiente: o plano completo pede ${priority.length} sessões de ${i.sessionMin} min (${fmtH(requiredMin)}) e há ${L} horário${L === 1 ? '' : 's'} livre${L === 1 ? '' : 's'} (${fmtH(availableMin)}) até a véspera da prova. Faltam ${fmtH(falta)}. Ficaram de fora: ${unplaced.map((u) => u.title).join('; ')}. Para caber: inclua mais dias, aumente o tempo por dia ou reduza os assuntos.`,
    );
  }
  if (!L) warnings.push('Não há nenhum horário livre na disponibilidade informada antes da prova.');
  const weak = topics.filter((t) => levels.get(t.id) === 'fraco').map((t) => t.name);
  if (weak.length) warnings.push(`Mais exercícios para: ${weak.join(', ')} (acertos abaixo de 60% em pelo menos ${MIN_EVIDENCE} respostas).`);
  return { sessions, unplaced, freeSlots: L - sessions.length, requiredMin, availableMin, conflictsAvoided, errors: [], warnings };
}

const fmtH = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`);

/** Confere um plano contra as regras (antes de criar os eventos). Lista vazia = pode aplicar. */
export function checkPlan(sessions: PlannedSession[], i: PlanInput): string[] {
  const p: string[] = [];
  const perDay = new Map<string, number>();
  const ranges: { start: number; end: number; title: string }[] = [];
  for (const s of sessions) {
    const start = zonedToInstant(s.date, s.start, i.timeZone);
    const r = { start, end: start + s.durationMin * 60000, title: s.title };
    if (s.date >= i.examDate) p.push(`${s.title} em ${shortDate(s.date)} fica no dia da prova ou depois`);
    if (!i.availability.weekdays.includes(weekday(s.date))) p.push(`${s.title} em ${shortDate(s.date)}: dia não disponível`);
    if (minutesOf(s.start) < minutesOf(i.availability.windowStart) || minutesOf(s.start) + s.durationMin > minutesOf(i.availability.windowEnd)) p.push(`${s.title} fora do horário disponível`);
    if (start <= i.now) p.push(`${s.title} está no passado`);
    if (conflictsWith(r, i.busy).length) p.push(`${s.title} conflita com ${conflictsWith(r, i.busy).map((b) => b.title).join(', ')}`);
    if (ranges.some((x) => overlaps(x, r))) p.push(`${s.title} sobrepõe outra sessão do plano`);
    ranges.push(r);
    perDay.set(s.date, (perDay.get(s.date) ?? 0) + s.durationMin);
  }
  for (const [d, m] of perDay) if (m > i.availability.minutesPerDay) p.push(`${shortDate(d)} passa do tempo por dia (${m} de ${i.availability.minutesPerDay} min)`);
  return p;
}

// ---------------------------------------------------------------- sessão perdida

export interface Suggestion {
  date: YMD;
  start: string;
  startAt: number;
  impact: string;
}

/**
 * Próximo horário livre para uma sessão perdida (estudo, revisão ou simulado). Provas e entregas não são movidas.
 * Com planejamento: mesma disponibilidade e antes da prova. Sem: mesmo horário do dia, nos próximos 14 dias.
 */
export function suggestReschedule(e: PEvent, all: PEvent[], now: number, tz: string): { suggestion: Suggestion | null; reason?: string } {
  if (e.type === 'prova' || e.type === 'entrega') return { suggestion: null, reason: 'Provas e entregas são compromissos fixos: escolha a nova data no formulário, se ela mudou.' };
  const dur = e.durationMin ?? DEFAULT_BUSY_MIN;
  const busy = busyFrom(all, e.id);
  const today = todayIn(tz, now);
  const plan = e.plan;
  const origTime = e.allDay ? '19:00' : instantToZoned(Date.parse(e.start!), tz).time;
  const ws = plan ? minutesOf(plan.windowStart) : minutesOf(origTime);
  const we = plan ? minutesOf(plan.windowEnd) : Math.min(24 * 60, minutesOf(origTime) + dur + 180);
  const last = plan ? addDays(plan.examDate, -1) : addDays(today, 14);
  if (plan && plan.examDate <= today) return { suggestion: null, reason: 'A prova deste planejamento já passou: não há como encaixar a preparação antes dela.' };
  const dayMinutes = (d: YMD) =>
    all
      .filter((x) => x.id !== e.id && x.status === 'agendado' && !x.allDay && x.plan?.id && x.plan.id === plan?.id && eventDay(x, tz) === d)
      .reduce((s, x) => s + (x.durationMin ?? DEFAULT_BUSY_MIN), 0);
  for (let d = today; d <= last; d = addDays(d, 1)) {
    if (plan && !plan.weekdays.includes(weekday(d))) continue;
    if (plan && dayMinutes(d) + dur > plan.minutesPerDay) continue;
    for (let m = ws; m + dur <= we; m += 15) {
      const startAt = zonedToInstant(d, hhmm(m), tz);
      if (startAt <= now) continue;
      if (conflictsWith({ start: startAt, end: startAt + dur * 60000 }, busy).length) continue;
      const parts = [`A sessão passa para ${shortDate(d)} às ${hhmm(m)} (${dur} min).`];
      if (plan) {
        const left = daysBetween(d, plan.examDate);
        parts.push(`Fica ${left === 1 ? 'na véspera da prova' : `a ${left} dias da prova`}.`);
        const already = dayMinutes(d);
        if (already) parts.push(`Nesse dia você terá ${already + dur} min de estudo planejados.`);
      }
      parts.push('Provas, entregas e outros compromissos com horário não mudam.');
      return { suggestion: { date: d, start: hhmm(m), startAt, impact: parts.join(' ') } };
    }
  }
  return { suggestion: null, reason: plan ? 'Não há horário livre na sua disponibilidade antes da prova. Escolha um horário manualmente, aumente o tempo por dia ou cancele esta sessão.' : 'Não há horário livre nos próximos 14 dias no mesmo período. Escolha um horário manualmente.' };
}
