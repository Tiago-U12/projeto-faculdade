// Cliente da geração: situação da IA, mensagens de erro do servidor e acompanhamento da tarefa.
import { describe, expect, it } from 'vitest';
import { AiClientError, fetchAiStatus, requestGeneration, waitJob, type AiClient } from '../ai';

const res = (status: number, body: unknown) => ({ status, json: async () => body }) as unknown as Response;
function client(o: { invoke?: (body: unknown) => { data: unknown; error: unknown }; jobs?: unknown[] }): AiClient & { polls: number } {
  const c = {
    polls: 0,
    functions: { invoke: async (_: string, x: { body: unknown }) => o.invoke!(x.body) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: o.jobs![Math.min(c.polls++, o.jobs!.length - 1)], error: null }) }) }) }),
  };
  return c;
}

describe('situação da IA', () => {
  it('servidor com IA: mostra modelo e limite; sem chave: diz que não foi configurada', async () => {
    expect(await fetchAiStatus(client({ invoke: () => ({ data: { ia: true, modelo: 'm', usadoHoje: 2, limiteDiario: 20 }, error: null }) }))).toEqual({ kind: 'on', model: 'm', used: 2, limit: 20 });
    expect((await fetchAiStatus(client({ invoke: () => ({ data: { ia: false }, error: null }) }))).kind).toBe('off');
  });
  it('função não publicada (404) conta como "não configurada", não como erro de rede', async () => {
    const s = await fetchAiStatus(client({ invoke: () => ({ data: null, error: { context: res(404, null) } }) }));
    expect(s).toMatchObject({ kind: 'off', message: expect.stringMatching(/não foi configurado/) });
  });
});

describe('pedido de geração', () => {
  it('erro do servidor chega em português, com o código', async () => {
    const c = client({ invoke: () => ({ data: null, error: { context: res(429, { error: 'Limite de 20 gerações por dia atingido nesta conta. Tente amanhã.' }) } }) });
    await expect(requestGeneration(c, { op: 'secao', guideId: 'g', topicId: 't', kind: 'resumo' })).rejects.toThrow(/Limite de 20/);
    const c2 = client({ invoke: () => ({ data: null, error: { context: res(503, { code: 'ia_nao_configurada', error: 'não configurada' }) } }) });
    await expect(requestGeneration(c2, { op: 'secao', guideId: 'g', topicId: 't', kind: 'resumo' })).rejects.toMatchObject({ code: 'ia_nao_configurada' });
  });
  it('pedido repetido devolve a tarefa reaproveitada', async () => {
    const c = client({ invoke: () => ({ data: { job: { id: 'j1', status: 'done' }, reused: true }, error: null }) });
    expect(await requestGeneration(c, { op: 'questoes', disciplineId: 'd', topicId: 't', materialIds: ['m'], quantidade: 5 })).toMatchObject({ reused: true, job: { id: 'j1' } });
  });
});

describe('acompanhamento da tarefa', () => {
  it('consulta até terminar', async () => {
    const c = client({ jobs: [{ id: 'j', status: 'running' }, { id: 'j', status: 'running' }, { id: 'j', status: 'done', result: { criadas: 3 } }] });
    const j = await waitJob(c, 'j', { sleep: async () => undefined });
    expect(j).toMatchObject({ status: 'done', result: { criadas: 3 } });
    expect(c.polls).toBe(3);
  });
  it('falha volta com o motivo; demora demais vira aviso (sem dar a geração por perdida)', async () => {
    expect(await waitJob(client({ jobs: [{ id: 'j', status: 'failed', error: 'sem trecho' }] }), 'j', { sleep: async () => undefined })).toMatchObject({ status: 'failed', error: 'sem trecho' });
    await expect(waitJob(client({ jobs: [{ id: 'j', status: 'running' }] }), 'j', { timeoutMs: -1, sleep: async () => undefined })).rejects.toThrow(/resultado fica salvo/);
    await expect(waitJob(client({ jobs: [null] }), 'outra-conta', { sleep: async () => undefined })).rejects.toBeInstanceOf(AiClientError);
  });
});
