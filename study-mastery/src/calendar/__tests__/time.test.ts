// Datas e fusos da agenda: conversões nos dois sentidos, troca de horário de verão e datas de dia inteiro.
import { describe, expect, it } from 'vitest';
import { addDays, addMonths, daysBetween, instantToZoned, isHHMM, isValidTimeZone, isYMD, monthGrid, shortDate, startOfWeek, todayIn, weekday, zonedToInstant } from '../time';

describe('fusos', () => {
  it('São Paulo (UTC−3, sem horário de verão): 19:00 local = 22:00 UTC', () => {
    const t = zonedToInstant('2026-11-20', '19:00', 'America/Sao_Paulo');
    expect(new Date(t).toISOString()).toBe('2026-11-20T22:00:00.000Z');
    expect(instantToZoned(t, 'America/Sao_Paulo')).toMatchObject({ date: '2026-11-20', time: '19:00' });
    expect(instantToZoned(t, 'America/Manaus')).toMatchObject({ date: '2026-11-20', time: '18:00' });
  });
  it('horário de verão: o mesmo 09:00 local muda de offset antes e depois da troca (Nova York)', () => {
    expect(new Date(zonedToInstant('2026-03-07', '09:00', 'America/New_York')).toISOString()).toBe('2026-03-07T14:00:00.000Z');
    expect(new Date(zonedToInstant('2026-03-09', '09:00', 'America/New_York')).toISOString()).toBe('2026-03-09T13:00:00.000Z');
    expect(new Date(zonedToInstant('2026-10-26', '09:00', 'Europe/Lisbon')).toISOString()).toBe('2026-10-26T09:00:00.000Z');
    expect(new Date(zonedToInstant('2026-10-24', '09:00', 'Europe/Lisbon')).toISOString()).toBe('2026-10-24T08:00:00.000Z');
  });
  it('ida e volta preserva data e hora em vários fusos', () => {
    for (const tz of ['America/Sao_Paulo', 'America/Noronha', 'America/Rio_Branco', 'Europe/Lisbon', 'Asia/Tokyo', 'UTC']) {
      for (const [d, h] of [['2026-01-01', '00:00'], ['2026-06-15', '23:45'], ['2026-12-31', '12:30']]) {
        expect(instantToZoned(zonedToInstant(d, h, tz), tz), tz).toMatchObject({ date: d, time: h });
      }
    }
  });
  it('"hoje" depende do fuso perto da meia-noite', () => {
    const t = Date.parse('2026-10-25T02:30:00Z');
    expect(todayIn('America/Sao_Paulo', t)).toBe('2026-10-24');
    expect(todayIn('UTC', t)).toBe('2026-10-25');
  });
  it('valida fuso, data e hora', () => {
    expect(isValidTimeZone('America/Sao_Paulo')).toBe(true);
    expect(isValidTimeZone('Marte/Base')).toBe(false);
    expect(isYMD('2026-02-30')).toBe(false);
    expect(isYMD('2026-02-28')).toBe(true);
    expect(isHHMM('24:00')).toBe(false);
    expect(isHHMM('07:05')).toBe(true);
  });
});

describe('aritmética de datas (sem fuso)', () => {
  it('soma dias atravessando meses e anos bissextos', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-10-24', '2026-11-20')).toBe(27);
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-01');
  });
  it('semana começa no domingo e a grade do mês tem 6 semanas', () => {
    expect(weekday('2026-10-24')).toBe(6);
    expect(startOfWeek('2026-10-24')).toBe('2026-10-18');
    const g = monthGrid('2026-10-15');
    expect(g).toHaveLength(42);
    expect(g[0]).toBe('2026-09-27');
    expect(g).toContain('2026-10-31');
    expect(shortDate('2026-10-28')).toBe('qua., 28/10');
  });
});
