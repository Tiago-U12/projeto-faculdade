// Datas da agenda sem bibliotecas: dias como "AAAA-MM-DD" (sem fuso) e horários convertidos com o Intl.
// Regra: evento de dia inteiro guarda só a data — ela é a mesma em qualquer fuso. Evento com horário guarda o instante
// (UTC) e é mostrado no fuso escolhido pelo estudante, como no Google Agenda.

export type YMD = string;

export const DEFAULT_TZ = 'America/Sao_Paulo';

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
}

export function isValidTimeZone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const fmts = new Map<string, Intl.DateTimeFormat>();
function parts(instant: number, tz: string) {
  let f = fmts.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    fmts.set(tz, f);
  }
  const p: Record<string, number> = {};
  for (const x of f.formatToParts(new Date(instant))) if (x.type !== 'literal') p[x.type] = Number(x.value);
  return { y: p.year, m: p.month, d: p.day, h: p.hour === 24 ? 0 : p.hour, min: p.minute, s: p.second };
}

/** Diferença (ms) entre o relógio local do fuso e o UTC naquele instante. */
function offsetAt(instant: number, tz: string): number {
  const p = parts(instant, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(instant / 1000) * 1000;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const toYMD = (y: number, m: number, d: number): YMD => `${y}-${pad(m)}-${pad(d)}`;
export const hhmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
export const minutesOf = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
export const isYMD = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().startsWith(s);
export const isHHMM = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** Data + hora no fuso → instante (ms). Duas passadas acertam a troca de horário de verão. */
export function zonedToInstant(date: YMD, time: string, tz: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const local = Date.UTC(y, m - 1, d, Math.floor(minutesOf(time) / 60), minutesOf(time) % 60);
  let t = local - offsetAt(local, tz);
  t = local - offsetAt(t, tz);
  return t;
}

/** Instante → data e hora no fuso. */
export function instantToZoned(instant: number, tz: string): { date: YMD; time: string; minutes: number } {
  const p = parts(instant, tz);
  return { date: toYMD(p.y, p.m, p.d), time: hhmm(p.h * 60 + p.min), minutes: p.h * 60 + p.min };
}

export function todayIn(tz: string, now = Date.now()): YMD {
  return instantToZoned(now, tz).date;
}

const utc = (d: YMD) => Date.parse(d + 'T00:00:00Z');
export function addDays(d: YMD, n: number): YMD {
  return new Date(utc(d) + n * 864e5).toISOString().slice(0, 10);
}
export function daysBetween(a: YMD, b: YMD): number {
  return Math.round((utc(b) - utc(a)) / 864e5);
}
/** 0 = domingo … 6 = sábado */
export function weekday(d: YMD): number {
  return new Date(utc(d)).getUTCDay();
}
export function addMonths(d: YMD, n: number): YMD {
  const [y, m] = d.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return toYMD(t.getUTCFullYear(), t.getUTCMonth() + 1, 1);
}
export function startOfWeek(d: YMD): YMD {
  return addDays(d, -weekday(d));
}
/** 6 semanas (domingo a sábado) que cobrem o mês da data. */
export function monthGrid(d: YMD): YMD[] {
  const first = d.slice(0, 8) + '01';
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export const WEEKDAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const WEEKDAY_LONG = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "qua., 29/10" (sem depender do fuso do aparelho: a data já é do calendário). */
export function shortDate(d: YMD): string {
  const [, m, day] = d.split('-');
  return `${WEEKDAY_SHORT[weekday(d)]}., ${day}/${m}`;
}
export function longDate(d: YMD): string {
  const [y, m, day] = d.split('-').map(Number);
  return `${WEEKDAY_LONG[weekday(d)]}, ${day} de ${MONTHS[m - 1]} de ${y}`;
}
/** Primeira letra maiúscula (títulos que começam com o dia da semana). */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export function monthTitle(d: YMD): string {
  const [y, m] = d.split('-').map(Number);
  return `${MONTHS[m - 1][0].toUpperCase()}${MONTHS[m - 1].slice(1)} de ${y}`;
}
export const brDate = (d: YMD) => d.split('-').reverse().join('/');

/** Fusos oferecidos na configuração (o do aparelho entra sempre). */
export const COMMON_TZ = ['America/Sao_Paulo', 'America/Manaus', 'America/Cuiaba', 'America/Belem', 'America/Fortaleza', 'America/Recife', 'America/Bahia', 'America/Porto_Velho', 'America/Boa_Vista', 'America/Rio_Branco', 'America/Noronha', 'Europe/Lisbon', 'UTC'];
