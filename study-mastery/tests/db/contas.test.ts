// Isolamento entre contas no banco (migração de contas, disciplinas e progresso), em Postgres local com o mesmo
// auth.uid() do Supabase. Cada "requisição" roda como o papel authenticated com o JWT do usuário, como na API real.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findPgBin, rejects, startDb, type Db } from './harness';

const enabled = !!findPgBin();
if (!enabled) console.warn('[test:db] Postgres não encontrado: testes de banco ignorados (defina PG_BIN).');

describe.skipIf(!enabled)('contas: duas contas tentando acessar os mesmos IDs', () => {
  let db: Db;
  let A: string;
  let B: string;
  const DISC = '11111111-1111-4111-8111-111111111111';
  const TOPIC = '22222222-2222-4222-8222-222222222222';

  beforeAll(async () => {
    db = await startDb();
    A = await db.createUser('a@teste.local');
    B = await db.createUser('b@teste.local');
    await db.as(A).q(`insert into profiles (id, time_zone) values ($1, 'America/Sao_Paulo')`, [A]);
    await db.as(B).q(`insert into profiles (id) values ($1)`, [B]);
    await db.as(A).q(`insert into disciplines (id, name, color) values ($1, 'Cálculo II', 'menta')`, [DISC]);
    await db.as(A).q(`insert into topics (id, discipline_id, name) values ($1, $2, 'Integrais')`, [TOPIC, DISC]);
    await db.as(A).q(`insert into attempts (id, date, discipline_id, mode, bank_version, answers) values ('att-1', now(), 'calculo2', 'aprender', 'v', '[]')`);
    await db.as(A).q(`insert into question_reports (id, question_id, question_version, source, reason) values (gen_random_uuid(), 'c2-x', 1, 'banco', 'gabarito')`);
  }, 60000);
  afterAll(async () => db?.stop());

  it('B não vê nada de A, nem pedindo pelo ID', async () => {
    const b = db.as(B);
    expect((await b.q('select * from disciplines where id = $1', [DISC])).rowCount).toBe(0);
    expect((await b.q('select * from topics where id = $1', [TOPIC])).rowCount).toBe(0);
    expect((await b.q(`select * from attempts where id = 'att-1'`)).rowCount).toBe(0);
    expect((await b.q('select * from question_reports')).rowCount).toBe(0);
    expect((await b.q('select * from profiles where id = $1', [A])).rowCount).toBe(0);
    expect((await b.q('select * from disciplines')).rowCount).toBe(0);
  });

  it('B não altera nem apaga dados de A (0 linhas afetadas) e os dados de A ficam intactos', async () => {
    const b = db.as(B);
    expect((await b.q(`update disciplines set name = 'invadido' where id = $1`, [DISC])).rowCount).toBe(0);
    expect((await b.q(`update topics set name = 'invadido' where id = $1`, [TOPIC])).rowCount).toBe(0);
    expect((await b.q(`update profiles set time_zone = 'UTC' where id = $1`, [A])).rowCount).toBe(0);
    expect((await b.q('delete from disciplines where id = $1', [DISC])).rowCount).toBe(0);
    expect((await b.q(`delete from attempts where id = 'att-1'`)).rowCount).toBe(0);
    const a = await db.as(A).q<{ name: string }>('select name from disciplines where id = $1', [DISC]);
    expect(a.rows).toEqual([{ name: 'Cálculo II' }]);
    expect((await db.as(A).q(`select 1 from attempts where id = 'att-1'`)).rowCount).toBe(1);
    expect((await db.as(A).q<{ time_zone: string }>('select time_zone from profiles')).rows[0].time_zone).toBe('America/Sao_Paulo');
  });

  it('B não grava em nome de A nem se "apropria" de linhas trocando owner_id', async () => {
    const b = db.as(B);
    expect(await rejects(b.q(`insert into disciplines (owner_id, name, color) values ($1, 'x', 'menta')`, [A]))).toBe('42501');
    // o RLS recusa antes da chave única: a resposta não revela se o perfil de A existe
    expect(await rejects(b.q(`insert into profiles (id) values ($1)`, [A]))).toBe('42501');
    await b.q(`insert into disciplines (id, name, color) values ('33333333-3333-4333-8333-333333333333', 'Minha', 'lilas')`);
    expect(await rejects(b.q(`update disciplines set owner_id = $1 where id = '33333333-3333-4333-8333-333333333333'`, [A]))).toBe('42501');
  });

  it('B não liga um assunto à disciplina de A (FK composta), mesmo sabendo o ID', async () => {
    expect(await rejects(db.as(B).q(`insert into topics (discipline_id, name) values ($1, 'intruso')`, [DISC]))).toBe('23503');
    expect(await rejects(db.as(B).q(`insert into topics (owner_id, discipline_id, name) values ($1, $2, 'intruso')`, [A, DISC]))).toBe('42501');
    expect((await db.as(A).q('select * from topics')).rowCount).toBe(1);
  });

  it('o mesmo ID gerado no aparelho pode existir nas duas contas sem colidir nem vazar', async () => {
    const b = db.as(B);
    await b.q(`insert into disciplines (id, name, color) values ($1, 'Cópia do aparelho', 'ambar')`, [DISC]);
    await b.q(`insert into attempts (id, date, discipline_id, mode, bank_version, answers) values ('att-1', now(), 'fullstack', 'simulado', 'v', '[]')`);
    expect((await b.q<{ name: string }>('select name from disciplines where id = $1', [DISC])).rows).toEqual([{ name: 'Cópia do aparelho' }]);
    expect((await db.as(A).q<{ name: string }>('select name from disciplines where id = $1', [DISC])).rows).toEqual([{ name: 'Cálculo II' }]);
    expect((await db.as(A).q<{ discipline_id: string }>(`select discipline_id from attempts where id = 'att-1'`)).rows).toEqual([{ discipline_id: 'calculo2' }]);
  });

  it('tentativas: reenviar não duplica e o histórico não pode ser alterado', async () => {
    const a = db.as(A);
    const again = await a.q(`insert into attempts (id, date, discipline_id, mode, bank_version, answers) values ('att-1', now(), 'calculo2', 'aprender', 'v', '[]') on conflict (owner_id, id) do nothing`);
    expect(again.rowCount).toBe(0);
    expect((await a.q('select * from attempts')).rowCount).toBe(1);
    expect(await rejects(a.q(`update attempts set mode = 'simulado' where id = 'att-1'`))).toBe('42501');
  });

  it('visitante sem login não lê nem grava nada', async () => {
    const v = db.anon();
    for (const t of ['profiles', 'disciplines', 'topics', 'attempts', 'question_reports']) expect(await rejects(v.q(`select * from ${t}`))).toBe('42501');
    expect(await rejects(v.q(`insert into disciplines (owner_id, name, color) values ($1, 'x', 'menta')`, [A]))).toBe('42501');
  });

  it('validação no banco: nome vazio, cor fora da paleta, texto longo e assunto repetido são recusados', async () => {
    const a = db.as(A);
    expect(await rejects(a.q(`insert into disciplines (name, color) values ('   ', 'menta')`))).toBe('23514');
    expect(await rejects(a.q(`insert into disciplines (name, color) values ('ok', '#fff; drop')`))).toBe('23514');
    expect(await rejects(a.q(`insert into disciplines (name, color, description) values ('ok', 'menta', repeat('x', 501))`))).toBe('23514');
    expect(await rejects(a.q(`insert into topics (discipline_id, name) values ($1, ' integrais ')`, [DISC]))).toBe('23505');
  });

  it('limite de disciplinas por conta', async () => {
    const c = await db.createUser('c@teste.local');
    const q = db.as(c);
    for (let i = 0; i < 30; i++) await q.q(`insert into disciplines (name, color) values ($1, 'menta')`, [`D${i}`]);
    expect(await rejects(q.q(`insert into disciplines (name, color) values ('D31', 'menta')`))).toBe('23514');
    // no limite, editar (o app grava por upsert) e reenviar o que já existe continuam funcionando
    const id = (await q.q<{ id: string }>(`select id from disciplines where name = 'D0'`)).rows[0].id;
    await q.q(`insert into disciplines (id, name, color) values ($1, 'D0 renomeada', 'lilas') on conflict (owner_id, id) do update set name = excluded.name, color = excluded.color`, [id]);
    await q.q(`insert into disciplines (id, name, color) values ($1, 'D0 renomeada', 'lilas') on conflict (owner_id, id) do nothing`, [id]);
    expect((await q.q<{ name: string }>('select name from disciplines where id = $1', [id])).rows[0].name).toBe('D0 renomeada');
    expect(await rejects(q.q(`insert into disciplines (id, name, color) values (gen_random_uuid(), 'D32', 'menta') on conflict (owner_id, id) do nothing`))).toBe('23514');
  });

  it('excluir a conta apaga todos os dados dela e nada da outra', async () => {
    await db.admin('delete from auth.users where id = $1', [B]);
    for (const t of ['disciplines', 'topics', 'attempts']) expect((await db.admin(`select 1 from ${t} where owner_id = $1`, [B])).rowCount).toBe(0);
    expect((await db.admin('select 1 from profiles where id = $1', [B])).rowCount).toBe(0);
    expect((await db.as(A).q('select * from disciplines')).rowCount).toBe(1);
  });
});
