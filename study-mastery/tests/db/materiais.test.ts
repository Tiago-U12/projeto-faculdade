// Materiais, páginas extraídas e políticas do Storage (o esqueleto de storage.objects do teste é local: os limites de
// tipo/tamanho do bucket são aplicados pela API real do Storage e precisam do projeto hospedado).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findPgBin, rejects, startDb, type Db } from './harness';

const enabled = !!findPgBin();

describe.skipIf(!enabled)('materiais: isolamento, campos do servidor e Storage', () => {
  let db: Db;
  let A: string;
  let B: string;
  const DISC = '11111111-1111-4111-8111-111111111111';
  const MAT = '44444444-4444-4444-8444-444444444444';
  const SHA = 'a'.repeat(64);
  const pdf = (id: string, size = 1000): [string, unknown[]] => [`insert into materials (id, discipline_id, title, kind, file_name, file_size, sha256) values ($1, $2, 'Aula 1', 'pdf', 'aula1.pdf', $3, $4)`, [id, DISC, size, SHA]];

  beforeAll(async () => {
    db = await startDb();
    A = await db.createUser('a@teste.local');
    B = await db.createUser('b@teste.local');
    await db.as(A).q(`insert into disciplines (id, name, color) values ($1, 'Cálculo', 'menta')`, [DISC]);
    await db.as(A).q(...pdf(MAT));
    await db.as(A).q(`insert into material_pages (material_id, page, text) values ($1, 1, 'Integrais por partes'), ($1, 2, 'Exercícios')`, [MAT]);
  }, 60000);
  afterAll(async () => db?.stop());

  it('B não vê, não altera, não apaga e não acrescenta páginas ao material de A', async () => {
    const b = db.as(B);
    expect((await b.q('select * from materials where id = $1', [MAT])).rowCount).toBe(0);
    expect((await b.q('select * from material_pages where material_id = $1', [MAT])).rowCount).toBe(0);
    expect((await b.q(`update materials set title = 'x' where id = $1`, [MAT])).rowCount).toBe(0);
    expect((await b.q(`update material_pages set text = 'x' where material_id = $1`, [MAT])).rowCount).toBe(0);
    expect((await b.q('delete from materials where id = $1', [MAT])).rowCount).toBe(0);
    expect(await rejects(b.q(`insert into material_pages (material_id, page, text) values ($1, 3, 'intruso')`, [MAT]))).toBe('23503');
    expect(await rejects(b.q(`insert into materials (discipline_id, title, kind) values ($1, 'x', 'texto')`, [DISC]))).toBe('23503');
    expect((await db.as(A).q('select * from material_pages where material_id = $1', [MAT])).rowCount).toBe(2);
  });

  it('o navegador não marca PDF como conferido nem como pronto; o servidor marca', async () => {
    const a = db.as(A);
    expect(await rejects(a.q(`update materials set server_checked_at = now() where id = $1`, [MAT]))).toBe('42501');
    expect(await rejects(a.q(`update materials set status = 'pronto' where id = $1`, [MAT]))).toBe('42501');
    expect(await rejects(a.q(`update materials set sha256 = $2 where id = $1`, [MAT, 'b'.repeat(64)]))).toBe('42501');
    expect(await rejects(a.q(`insert into materials (discipline_id, title, kind, file_name, file_size, sha256, status) values ($1, 'x', 'pdf', 'x.pdf', 10, $2, 'pronto')`, [DISC, SHA]))).toBe('23514');
    await a.q(`update materials set status = 'processando', title = 'Aula 1 — integrais' where id = $1`, [MAT]);
    await db.service().q(`update materials set status = 'pronto', server_checked_at = now() where id = $1`, [MAT]);
    expect((await a.q<{ status: string }>('select status from materials where id = $1', [MAT])).rows[0].status).toBe('pronto');
  });

  it('mudar o texto depois da conferência volta a "recebido" e sobe a versão', async () => {
    const a = db.as(A);
    const before = (await a.q<{ version: number }>('select version from materials where id = $1', [MAT])).rows[0].version;
    await a.q(`update material_pages set text = 'Integrais por partes (revisado)' where material_id = $1 and page = 1`, [MAT]);
    const r = (await a.q<{ status: string; version: number; server_checked_at: string | null }>('select status, version, server_checked_at from materials where id = $1', [MAT])).rows[0];
    expect(r).toMatchObject({ status: 'recebido', version: before + 1, server_checked_at: null });
  });

  it('texto colado pode ficar pronto sem arquivo; PDF exige nome, tamanho e hash', async () => {
    const a = db.as(A);
    await a.q(`insert into materials (discipline_id, title, kind, status) values ($1, 'Resumo colado', 'texto', 'pronto')`, [DISC]);
    expect(await rejects(a.q(`insert into materials (discipline_id, title, kind) values ($1, 'PDF sem arquivo', 'pdf')`, [DISC]))).toBe('23514');
    expect(await rejects(a.q(`insert into materials (discipline_id, title, kind, file_name, file_size, sha256) values ($1, 'grande', 'pdf', 'g.pdf', 10485761, $2)`, [DISC, SHA]))).toBe('23514');
  });

  it('cota de 50 MB de PDFs por conta', async () => {
    const c = await db.createUser('c@teste.local');
    const q = db.as(c);
    await q.q(`insert into disciplines (id, name, color) values ($1, 'D', 'menta')`, [DISC]);
    for (let i = 0; i < 5; i++) await q.q(`insert into materials (discipline_id, title, kind, file_name, file_size, sha256) values ($1, $2, 'pdf', 'x.pdf', 10485760, $3)`, [DISC, `M${i}`, SHA]);
    expect(await rejects(q.q(`insert into materials (discipline_id, title, kind, file_name, file_size, sha256) values ($1, 'M6', 'pdf', 'x.pdf', 1000, $2)`, [DISC, SHA]))).toBe('23514');
  });

  it('Storage: só o caminho <usuário>/<material>.pdf de um PDF próprio ainda não conferido; nada de outra conta', async () => {
    const M2 = '55555555-5555-4555-8555-555555555555';
    await db.as(A).q(...pdf(M2));
    const put = (who: string, name: string) => db.as(who).q(`insert into storage.objects (bucket_id, name, owner) values ('materiais', $1, $2)`, [name, who]);
    await put(A, `${A}/${M2}.pdf`);
    expect(await rejects(put(A, `${A}/qualquer-coisa.pdf`))).toBe('42501');
    expect(await rejects(put(B, `${A}/${M2}.pdf`))).toBe('42501');
    expect(await rejects(put(B, `${B}/${M2}.pdf`))).toBe('42501'); // o material é de A
    expect((await db.as(B).q(`select * from storage.objects where name like $1`, [`${A}/%`])).rowCount).toBe(0);
    expect((await db.as(B).q(`delete from storage.objects where name = $1`, [`${A}/${M2}.pdf`])).rowCount).toBe(0);
    // depois da conferência, o arquivo não pode ser trocado
    await db.service().q(`update materials set status = 'pronto', server_checked_at = now() where id = $1`, [M2]);
    await db.as(A).q(`delete from storage.objects where name = $1`, [`${A}/${M2}.pdf`]);
    expect(await rejects(put(A, `${A}/${M2}.pdf`))).toBe('42501');
  });

  it('excluir a disciplina leva materiais e páginas', async () => {
    await db.as(A).q('delete from disciplines where id = $1', [DISC]);
    expect((await db.admin('select 1 from materials where owner_id = $1', [A])).rowCount).toBe(0);
    expect((await db.admin('select 1 from material_pages where owner_id = $1', [A])).rowCount).toBe(0);
  });
});
