// Agenda: isolamento entre contas, regra de dia inteiro × horário e exclusão junto com a disciplina.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findPgBin, rejects, startDb, type Db } from './harness';

const enabled = !!findPgBin();

describe.skipIf(!enabled)('agenda: isolamento e regras', () => {
  let db: Db;
  let A: string;
  let B: string;
  const DISC = '11111111-1111-4111-8111-111111111111';
  const EV = '99999999-9999-4999-8999-999999999999';
  const EV2 = '98999999-9999-4999-8999-999999999999';
  const EVB = '97999999-9999-4999-8999-999999999999';

  beforeAll(async () => {
    db = await startDb();
    A = await db.createUser('a@teste.local');
    B = await db.createUser('b@teste.local');
    const a = db.as(A);
    await a.q(`insert into disciplines (id, name, color) values ($1, 'Cálculo', 'menta')`, [DISC]);
    await a.q(`insert into events (id, discipline_id, type, title, status, all_day, date, time_zone) values ($1, $2, 'prova', 'P1', 'agendado', true, '2026-11-20', 'America/Sao_Paulo')`, [EV, DISC]);
    await a.q(`insert into events (id, discipline_id, type, title, status, all_day, start_at, duration_min, time_zone) values ($1, 'calculo2', 'estudo', 'Estudo', 'agendado', false, '2026-11-10T22:00:00Z', 50, 'America/Sao_Paulo')`, [EV2]);
    await db.as(B).q(`insert into events (id, discipline_id, type, title, status, all_day, date, time_zone) values ($1, $2, 'entrega', 'Trabalho de B', 'agendado', true, '2026-11-21', 'UTC')`, [EVB, DISC]);
  }, 60000);
  afterAll(async () => db?.stop());

  it('B não lê, não altera e não apaga eventos de A, mesmo sabendo o ID', async () => {
    const b = db.as(B);
    expect((await b.q('select id from events')).rows.map((r) => r.id)).toEqual([EVB]);
    expect((await b.q(`update events set status = 'cancelado' where id = $1`, [EV])).rowCount).toBe(0);
    expect((await b.q(`delete from events where id = $1`, [EV])).rowCount).toBe(0);
    expect(await rejects(b.q(`insert into events (owner_id, discipline_id, type, title, status, all_day, date, time_zone) values ($1, 'x', 'prova', 'x', 'agendado', true, '2026-01-01', 'UTC')`, [A]))).toBe('42501');
    expect(await rejects(db.anon().q('select * from events'))).toBe('42501');
  });

  it('dia inteiro exige só a data; com horário exige o instante; concluído é o único com data de conclusão', async () => {
    const a = db.as(A);
    expect(await rejects(a.q(`insert into events (discipline_id, type, title, status, all_day, start_at, time_zone) values ('x', 'prova', 'x', 'agendado', true, now(), 'UTC')`))).toBe('23514');
    expect(await rejects(a.q(`insert into events (discipline_id, type, title, status, all_day, date, time_zone) values ('x', 'prova', 'x', 'agendado', false, '2026-01-01', 'UTC')`))).toBe('23514');
    expect(await rejects(a.q(`insert into events (discipline_id, type, title, status, all_day, date, time_zone) values ('x', 'aula', 'x', 'agendado', true, '2026-01-01', 'UTC')`))).toBe('23514');
    expect(await rejects(a.q(`update events set completed_at = now() where id = $1`, [EV]))).toBe('23514');
    await a.q(`update events set status = 'concluido', completed_at = now() where id = $1`, [EV2]);
    expect((await a.q<{ date: string }>(`select to_char(date, 'YYYY-MM-DD') as date from events where id = $1`, [EV])).rows[0].date).toBe('2026-11-20');
  });

  it('excluir a disciplina leva os eventos dela; os de outra disciplina e os da outra conta ficam', async () => {
    await db.as(A).q('delete from disciplines where id = $1', [DISC]);
    expect((await db.as(A).q('select id from events')).rows.map((r) => r.id)).toEqual([EV2]);
    expect((await db.as(B).q('select id from events')).rows.map((r) => r.id)).toEqual([EVB]);
  });
});
