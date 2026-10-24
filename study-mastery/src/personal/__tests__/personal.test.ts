import { describe, expect, it } from 'vitest';
import { cloudConfig } from '../../cloud/config';
import { emptyState } from '../../lib/storage';
import type { Attempt } from '../../types';
import { memoryBackend } from '../backend';
import { planImport } from '../importPlan';
import { CloudRepo, executeDeletion, LocalRepo, MAPPERS, planDeletion, type TableClient } from '../repo';
import type { PDiscipline, PTopic } from '../types';

const T = '2026-10-24T10:00:00.000Z';
const disc = (id: string, name: string): PDiscipline => ({ id, name, description: '', color: 'menta', createdAt: T, updatedAt: T });
const topic = (id: string, disciplineId: string, name: string): PTopic => ({ id, disciplineId, name, position: 0, origin: 'manual', createdAt: T, updatedAt: T });
const att = (id: string, disciplineId = 'calculo2'): Attempt => ({ id, date: T, disciplineId: disciplineId as Attempt['disciplineId'], mode: 'aprender', bankVersion: 'v', answers: [] });

describe('importação do aparelho para a conta', () => {
  const device = {
    state: { ...emptyState(), attempts: [att('a1'), att('a2')], reports: [{ id: 'r1', questionId: 'c2-1', questionVersion: 1, source: 'banco' as const, reason: 'gabarito' as const, comment: '', createdAt: T }] },
    disciplines: [disc('d-calc', 'Cálculo III'), disc('d-novo', 'Física')],
    topics: [topic('t-1', 'd-calc', 'Séries'), topic('t-2', 'd-calc', 'Integrais duplas'), topic('t-3', 'd-novo', 'Cinemática')],
  };

  it('conta vazia: tudo é importado uma vez', () => {
    const p = planImport(device, { attemptIds: new Set(), reportIds: new Set(), disciplines: [], topics: [] });
    expect([p.attempts.length, p.reports.length, p.disciplines.length, p.topics.length]).toEqual([2, 1, 2, 3]);
    expect(p.blocked).toBeNull();
  });

  it('reimportar não duplica nada', () => {
    const p = planImport(device, { attemptIds: new Set(['a1', 'a2']), reportIds: new Set(['r1']), disciplines: device.disciplines, topics: device.topics });
    expect([p.attempts.length, p.reports.length, p.disciplines.length, p.topics.length]).toEqual([0, 0, 0, 0]);
    expect(p.alreadyThere).toEqual({ attempts: 2, reports: 1, disciplines: 2, topics: 3 });
  });

  it('disciplina e assunto com o mesmo nome na conta são juntados (sem cópia), e as referências são remapeadas', () => {
    const p = planImport(
      { ...device, state: { ...device.state, attempts: [{ ...att('a3', 'd-calc'), source: 'pessoal', answers: [{ questionId: 'q', topicId: 't-1', difficulty: 'medio', chosenOptionId: 'a', correct: true }] }] } },
      { attemptIds: new Set(), reportIds: new Set(), disciplines: [disc('conta-calc', ' cálculo iii ')], topics: [topic('conta-series', 'conta-calc', 'séries')] },
    );
    expect(p.merged).toEqual([{ name: ' cálculo iii ', deviceId: 'd-calc', accountId: 'conta-calc' }]);
    expect(p.disciplines.map((d) => d.id)).toEqual(['d-novo']);
    expect(p.topics.map((t) => [t.id, t.disciplineId])).toEqual([['t-2', 'conta-calc'], ['t-3', 'd-novo']]);
    expect(p.remap).toMatchObject({ 'd-calc': 'conta-calc', 't-1': 'conta-series' });
    expect(p.attempts[0].disciplineId).toBe('conta-calc');
    expect(p.attempts[0].answers[0].topicId).toBe('conta-series');
  });

  it('não ultrapassa o limite de disciplinas da conta', () => {
    const many = Array.from({ length: 30 }, (_, i) => disc(`c${i}`, `C${i}`));
    expect(planImport(device, { attemptIds: new Set(), reportIds: new Set(), disciplines: many, topics: [] }).blocked).toMatch(/mais de 30/);
  });
});

describe('repositório neste aparelho e exclusão em cascata', () => {
  it('excluir uma disciplina leva os assuntos dela e nada de outras', async () => {
    const repo = new LocalRepo(memoryBackend());
    await repo.putMany('disciplines', [disc('d1', 'A'), disc('d2', 'B')]);
    await repo.putMany('topics', [topic('t1', 'd1', 'x'), topic('t2', 'd1', 'y'), topic('t3', 'd2', 'z')]);
    const plan = planDeletion({ kind: 'disciplines', id: 'd1' }, { topics: await repo.list('topics') });
    expect(plan).toEqual({ disciplines: ['d1'], topics: ['t1', 't2'] });
    await executeDeletion(repo, plan);
    expect((await repo.list('disciplines')).map((d) => d.id)).toEqual(['d2']);
    expect((await repo.list('topics')).map((t) => t.id)).toEqual(['t3']);
  });
});

describe('conta: mapeamento para o banco (cliente simulado — não substitui o teste no Supabase real)', () => {
  it('ida e volta preserva os campos; período vazio vira null; owner_id é sempre o da sessão', () => {
    const d = { ...disc('d1', 'Cálculo'), period: '' };
    const row = MAPPERS.disciplines.toRow(d, 'uid-1');
    expect(row).toMatchObject({ owner_id: 'uid-1', id: 'd1', period: null, color: 'menta' });
    expect(MAPPERS.disciplines.fromRow(row)).toEqual({ ...disc('d1', 'Cálculo'), period: undefined });
    const t = topic('t1', 'd1', 'Séries');
    expect(MAPPERS.topics.fromRow(MAPPERS.topics.toRow(t, 'uid-1'))).toEqual(t);
  });

  it('erros do servidor viram mensagens em português', async () => {
    const fake: TableClient = {
      from: () => ({
        select: () => ({ order: async () => ({ data: null, error: { message: 'new row violates row-level security policy', code: '42501' } }) }),
        upsert: async () => ({ error: { message: 'limite de 30 registros em disciplines atingido', code: '23514' } }),
        delete: () => ({ in: async () => ({ error: { message: 'TypeError: Failed to fetch' } }) }),
      }),
    };
    const repo = new CloudRepo(fake, 'uid', 'a@b.c');
    await expect(repo.list('disciplines')).rejects.toThrow(/Sem permissão/);
    await expect(repo.put('disciplines', disc('d', 'x'))).rejects.toThrow(/limite/);
    await expect(repo.remove('disciplines', ['d'])).rejects.toThrow(/Sem conexão/);
  });
});

describe('configuração da conta no navegador', () => {
  const url = 'https://abcdefghijklmnop.supabase.co';
  it('aceita URL do projeto e chave publicável', () => {
    expect(cloudConfig({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' })).toEqual({ url, key: 'sb_publishable_x' });
  });
  it('sem variáveis: contas desativadas', () => {
    expect(cloudConfig({})).toBeNull();
  });
  it('recusa chave secreta colada por engano (nunca vai para o navegador)', () => {
    expect(cloudConfig({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc' })).toBeNull();
    const legacyService = 'x.' + btoa(JSON.stringify({ role: 'service_role' })).replace(/=+$/, '') + '.y';
    expect(cloudConfig({ VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: legacyService })).toBeNull();
  });
  it('recusa URL que não é de projeto Supabase', () => {
    expect(cloudConfig({ VITE_SUPABASE_URL: 'https://evil.example.com', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' })).toBeNull();
  });
});
