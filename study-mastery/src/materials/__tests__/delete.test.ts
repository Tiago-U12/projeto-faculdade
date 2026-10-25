// Excluir um material leva junto o texto, as questões e os guias gerados dele e o texto dessas questões no histórico.
// Questões e guias de OUTROS materiais (e as criadas pelo estudante) continuam.
import { describe, expect, it, vi } from 'vitest';
import type { Personal } from '../../personal/context';
import { memoryBackend } from '../../personal/backend';
import { LocalRepo, type PersonalRepo } from '../../personal/repo';
import type { EntityMap, Kind, PGuide, PMaterial, PQuestion } from '../../personal/types';
import { deleteMaterial, materialDeletion } from '../service';

const T = '2026-10-24T10:00:00.000Z';
const mat = (id: string): PMaterial => ({ id, disciplineId: 'd1', title: id, kind: 'texto', status: 'pronto', pageCount: 1, charCount: 10, issues: [], suggestedTopics: [], topicIds: [], version: 1, createdAt: T, updatedAt: T });
const q = (id: string, materialIds: string[]): PQuestion => ({ id, disciplineId: 'd1', topicId: 't1', status: materialIds.length ? 'gerada_ia' : 'criada_aluno', difficulty: 'medio', version: 1, materialIds, stem: id, options: [], correctOptionId: 'a', explanation: { correct: '', wrong: {}, steps: [] }, refs: [], origin: { kind: materialIds.length ? 'ia' : 'aluno' }, createdAt: T, updatedAt: T });
const guide = (id: string, materialIds: string[]): PGuide => ({ id, disciplineId: 'd1', title: id, materialIds, topicIds: ['t1'], allowComplement: false, sectionKinds: [], sections: {}, version: 1, createdAt: T, updatedAt: T });

/** Personal mínimo sobre um repositório real (sem React). */
function personalOver(repo: PersonalRepo): Personal {
  return {
    repo, space: repo.space, error: null, clearError: () => undefined,
    items: () => undefined, load: async () => undefined,
    save: async <K extends Kind>(kind: K, es: EntityMap[K] | EntityMap[K][]) => repo.putMany(kind, Array.isArray(es) ? es : [es]),
    removeIds: (kind, ids) => repo.remove(kind, ids),
  };
}

describe('excluir material neste aparelho', () => {
  it('leva texto, questões e guias dele; mantém o que é de outro material ou criado pelo estudante; limpa o histórico', async () => {
    const repo = new LocalRepo(memoryBackend());
    await repo.putMany('materials', [mat('m1'), mat('m2')]);
    await repo.putPages('m1', [{ page: 1, text: 'texto m1' }]);
    await repo.putPages('m2', [{ page: 1, text: 'texto m2' }]);
    await repo.putMany('questions', [q('q-m1', ['m1']), q('q-m1m2', ['m1', 'm2']), q('q-m2', ['m2']), q('q-aluno', [])]);
    await repo.putMany('guides', [guide('g-m1', ['m1']), guide('g-m2', ['m2'])]);
    const scrub = vi.fn();

    const preview = materialDeletion(mat('m1'), { questions: await repo.list('questions'), guides: await repo.list('guides') });
    expect(preview).toMatchObject({ questions: ['q-m1', 'q-m1m2'], guides: ['g-m1'] });

    const r = await deleteMaterial({ personal: personalOver(repo), scrub }, mat('m1'));
    expect(r).toEqual({ questoes: 2, guias: 1 });
    expect((await repo.list('materials')).map((x) => x.id)).toEqual(['m2']);
    expect(await repo.getPages('m1')).toEqual([]);
    expect(await repo.getPages('m2')).toHaveLength(1);
    expect((await repo.list('questions')).map((x) => x.id).sort()).toEqual(['q-aluno', 'q-m2']);
    expect((await repo.list('guides')).map((x) => x.id)).toEqual(['g-m2']);
    expect(scrub).toHaveBeenCalledWith(['q-m1', 'q-m1m2']);
  });
});

describe('excluir material na conta', () => {
  it('apaga o arquivo antes; se o arquivo não sai, nada é excluído', async () => {
    const repo = new LocalRepo(memoryBackend());
    await repo.putMany('materials', [{ ...mat('m1'), kind: 'pdf', sha256: 'x' }]);
    const cascade = vi.fn(async () => ({ questoes: 0, guias: 0 }));
    const cloudRepo = Object.assign(Object.create(repo) as PersonalRepo, { deleteMaterialCascade: cascade, space: { kind: 'account', uid: 'u1', email: 'a@b' } });
    const failing = { storage: { from: () => ({ remove: async () => ({ error: { message: 'offline' } }) }) } };
    const ctx = { personal: personalOver(cloudRepo), cloud: { uid: 'u1', client: async () => failing as never } };
    await expect(deleteMaterial(ctx, { ...mat('m1'), kind: 'pdf', sha256: 'x' })).rejects.toThrow(/nada foi excluído/);
    expect(cascade).not.toHaveBeenCalled();

    const removed: string[][] = [];
    const ok = { storage: { from: () => ({ remove: async (paths: string[]) => (removed.push(paths), { error: null }) }) } };
    const scrub = vi.fn();
    await deleteMaterial({ ...ctx, scrub, cloud: { uid: 'u1', client: async () => ok as never } }, { ...mat('m1'), kind: 'pdf', sha256: 'x' });
    expect(removed).toEqual([['u1/m1.pdf']]);
    expect(cascade).toHaveBeenCalledWith('m1');
    expect(scrub).toHaveBeenCalled();
  });
});
