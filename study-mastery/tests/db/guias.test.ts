// Guias, questões pessoais, tarefas e consumo: isolamento entre contas e exclusão em cascata a partir do material.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findPgBin, rejects, startDb, type Db } from './harness';

const enabled = !!findPgBin();

describe.skipIf(!enabled)('guias e questões: isolamento e exclusão', () => {
  let db: Db;
  let A: string;
  let B: string;
  const DISC = '11111111-1111-4111-8111-111111111111';
  const TOPIC = '22222222-2222-4222-8222-222222222222';
  const MAT = '44444444-4444-4444-8444-444444444444';
  const MAT2 = '45444444-4444-4444-8444-444444444444';
  const Q1 = '66666666-6666-4666-8666-666666666666';
  const Q2 = '67666666-6666-4666-8666-666666666666';
  const GUIDE = '77777777-7777-4777-8777-777777777777';
  const JOB = '88888888-8888-4888-8888-888888888888';

  beforeAll(async () => {
    db = await startDb();
    A = await db.createUser('a@teste.local');
    B = await db.createUser('b@teste.local');
    const a = db.as(A);
    await a.q(`insert into disciplines (id, name, color) values ($1, 'Cálculo', 'menta')`, [DISC]);
    await a.q(`insert into topics (id, discipline_id, name) values ($1, $2, 'Integrais')`, [TOPIC, DISC]);
    await a.q(`insert into materials (id, discipline_id, title, kind, status) values ($1, $3, 'Resumo', 'texto', 'recebido'), ($2, $3, 'Outro', 'texto', 'recebido')`, [MAT, MAT2, DISC]);
    // "pronto" só pela conferência do servidor
    await db.service().q(`update materials set status = 'pronto', server_checked_at = now() where owner_id = $1`, [A]);
    await a.q(`insert into material_pages (material_id, page, text) values ($1, 1, 'texto')`, [MAT]);
    await a.q(`insert into questions (id, discipline_id, topic_id, status, difficulty, material_ids, data) values ($1, $3, $4, 'gerada_ia', 'medio', $5, '{"stem":"Q1"}'), ($2, $3, $4, 'gerada_ia', 'medio', $6, '{"stem":"Q2"}')`, [Q1, Q2, DISC, TOPIC, [MAT], [MAT2]]);
    await a.q(`insert into guides (id, discipline_id, title, material_ids, data) values ($1, $2, 'Guia', $3, '{"topicIds":[],"allowComplement":false,"sections":{}}')`, [GUIDE, DISC, [MAT]]);
    await a.q(`insert into attempts (id, date, discipline_id, source, mode, bank_version, answers, snapshots) values ('att-p', now(), $1, 'pessoal', 'aprender', 'pessoal', '[]', $2)`, [DISC, JSON.stringify({ [Q1]: { stem: 'Q1' }, [Q2]: { stem: 'Q2' } })]);
    await db.service().q(`insert into jobs (owner_id, id, kind, idem_key, status, input, result) values ($1, $2, 'questoes', $3, 'done', $4, $5)`, [A, JOB, 'a'.repeat(64), JSON.stringify({ materials: [[MAT, 1]] }), JSON.stringify({ rejeitadas: [{ stem: 'trecho derivado do material' }] })]);
    await db.service().q(`insert into jobs (owner_id, id, kind, idem_key, status, input) values ($1, gen_random_uuid(), 'questoes', $2, 'done', $3)`, [A, 'c'.repeat(64), JSON.stringify({ materials: [[MAT2, 1]] })]);
    await db.service().q(`insert into usage_events (owner_id, job_id, kind, provider, model, input_tokens, output_tokens, cost_usd) values ($1, $2, 'questoes', 'anthropic', 'claude-opus-5-5', 1000, 200, 0.008)`, [A, JOB]);
  }, 60000);
  afterAll(async () => db?.stop());

  it('B não lê, não altera e não apaga questões, guias, tarefas e consumo de A', async () => {
    const b = db.as(B);
    for (const t of ['questions', 'guides', 'jobs', 'usage_events']) expect((await b.q(`select * from ${t}`)).rowCount, t).toBe(0);
    expect((await b.q(`update questions set status = 'arquivada' where id = $1`, [Q1])).rowCount).toBe(0);
    expect((await b.q(`delete from guides where id = $1`, [GUIDE])).rowCount).toBe(0);
    expect(await rejects(b.q(`insert into questions (discipline_id, topic_id, status, difficulty, data) values ($1, $2, 'criada_aluno', 'facil', '{}')`, [DISC, TOPIC]))).toBe('23503');
  });

  it('o estudante não grava tarefas nem consumo (só o servidor)', async () => {
    const a = db.as(A);
    expect((await a.q('select * from jobs')).rowCount).toBe(2);
    expect(await rejects(a.q(`insert into jobs (owner_id, id, kind, idem_key, status) values ($1, gen_random_uuid(), 'questoes', $2, 'running')`, [A, 'b'.repeat(64)]))).toBe('42501');
    expect(await rejects(a.q(`update jobs set status = 'done' where id = $1`, [JOB]))).toBe('42501');
    expect(await rejects(a.q(`delete from usage_events`))).toBe('42501');
    expect(await rejects(a.q(`insert into usage_events (owner_id, kind, provider, model) values ($1, 'x', 'x', 'x')`, [A]))).toBe('42501');
  });

  it('a mesma chave de tarefa não se repete para o mesmo dono (pedido repetido)', async () => {
    expect(await rejects(db.service().q(`insert into jobs (owner_id, id, kind, idem_key, status) values ($1, gen_random_uuid(), 'questoes', $2, 'running')`, [A, 'a'.repeat(64)]))).toBe('23505');
  });

  it('seção do guia: mescla sem perder o resto e guarda a versão anterior; B não altera o guia de A', async () => {
    const a = db.as(A);
    await a.q(`select set_guide_section($1, 'T:resumo', $2)`, [GUIDE, JSON.stringify({ status: 'pronta', items: [{ title: 'v1' }], version: 1 })]);
    await a.q(`select set_guide_section($1, 'T:conceitos', $2)`, [GUIDE, JSON.stringify({ status: 'pronta', items: [{ title: 'c1' }], version: 1 })]);
    await a.q(`select set_guide_section($1, 'T:resumo', $2)`, [GUIDE, JSON.stringify({ status: 'gerando' })]);
    let s = (await a.q<{ data: { sections: Record<string, { status: string; items: { title: string }[]; previous?: { items: { title: string }[] } }> } }>('select data from guides where id = $1', [GUIDE])).rows[0].data.sections;
    expect(s['T:resumo']).toMatchObject({ status: 'gerando', items: [{ title: 'v1' }] });
    await a.q(`select set_guide_section($1, 'T:resumo', $2)`, [GUIDE, JSON.stringify({ status: 'pronta', items: [{ title: 'v2' }], version: 2 })]);
    s = (await a.q<{ data: { sections: Record<string, { status: string; items: { title: string }[]; previous?: { items: { title: string }[] } }> } }>('select data from guides where id = $1', [GUIDE])).rows[0].data.sections;
    expect(s['T:resumo'].items).toEqual([{ title: 'v2' }]);
    expect(s['T:resumo'].previous?.items).toEqual([{ title: 'v1' }]);
    expect(s['T:conceitos'].items).toEqual([{ title: 'c1' }]);
    await db.as(B).q(`select set_guide_section($1, 'T:resumo', $2)`, [GUIDE, JSON.stringify({ items: [{ title: 'invadido' }] })]);
    const after = (await a.q<{ data: { sections: Record<string, { items: { title: string }[] }> } }>('select data from guides where id = $1', [GUIDE])).rows[0].data.sections;
    expect(after['T:resumo'].items).toEqual([{ title: 'v2' }]);
  });

  it('B chamando a exclusão em cascata com o material de A não apaga nada', async () => {
    const r = await db.as(B).q<{ delete_material_cascade: { questoes: number; guias: number } }>('select delete_material_cascade($1)', [MAT]);
    expect(r.rows[0].delete_material_cascade).toEqual({ questoes: 0, guias: 0 });
    expect((await db.as(A).q('select * from materials where id = $1', [MAT])).rowCount).toBe(1);
    expect(await rejects(db.anon().q('select delete_material_cascade($1)', [MAT]))).toBe('42501');
  });

  it('excluir o material leva texto, questões e guias dele e tira o texto dessas questões do histórico', async () => {
    const r = await db.as(A).q<{ delete_material_cascade: { questoes: number; guias: number } }>('select delete_material_cascade($1)', [MAT]);
    expect(r.rows[0].delete_material_cascade).toEqual({ questoes: 1, guias: 1 });
    const a = db.as(A);
    expect((await a.q('select * from material_pages where material_id = $1', [MAT])).rowCount).toBe(0);
    expect((await a.q<{ id: string }>('select id from questions')).rows.map((x) => x.id)).toEqual([Q2]);
    const snap = (await a.q<{ snapshots: Record<string, unknown> }>(`select snapshots from attempts where id = 'att-p'`)).rows[0].snapshots;
    expect(Object.keys(snap)).toEqual([Q2]);
    expect((await a.q(`select * from attempts where id = 'att-p'`)).rowCount).toBe(1); // o acerto/erro continua
    // a tarefa que usou o material sai (o resultado citava trechos); a de outro material e o consumo ficam
    expect((await a.q<{ idem_key: string }>('select idem_key from jobs')).rows.map((r) => r.idem_key)).toEqual(['c'.repeat(64)]);
    expect((await a.q('select * from usage_events')).rowCount).toBe(1);
  });
});
