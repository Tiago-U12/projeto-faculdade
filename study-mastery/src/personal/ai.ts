// Pedidos de geração (questões e seções de guia) à função "generate" do servidor e acompanhamento da tarefa.
// A IA só roda no servidor e só para quem tem conta: a chave nunca chega ao navegador. Neste aparelho (sem conta) a
// geração por IA fica indisponível — e o app diz isso, em vez de simular um resultado.
import { useEffect, useState } from 'react';
import { useAccount } from '../account';
import { usePersonalOptional } from './context';
import type { Difficulty } from '../types';
import type { SectionKind } from './types';

export type AiStatus =
  | { kind: 'device' }
  | { kind: 'loading' }
  | { kind: 'off'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'on'; model: string; used: number; limit: number };

export interface JobView {
  id: string;
  status: 'running' | 'done' | 'failed';
  attempts: number;
  result: Record<string, unknown> | null;
  error: string | null;
}

export type GenRequest =
  | { op: 'questoes'; disciplineId: string; topicId: string; materialIds: string[]; quantidade: number; dificuldade?: Difficulty }
  | { op: 'secao'; guideId: string; topicId: string; kind: SectionKind; regenerar?: boolean };

/** Parte do supabase-js usada aqui (permite testar sem rede). */
export interface AiClient {
  functions: { invoke(name: string, o: { body: unknown }): Promise<{ data: unknown; error: unknown }> };
  from(table: string): {
    select(cols: string): { eq(col: string, v: string): { maybeSingle(): PromiseLike<{ data: unknown; error: { message: string } | null }> } };
  };
}

export class AiClientError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

export const DEVICE_AI_MESSAGE = 'A geração por IA usa o servidor e precisa de conta. Neste aparelho você pode criar questões e montar guias com os trechos do seu material.';
const NOT_DEPLOYED = 'A geração por IA não está disponível neste site (o servidor de geração não foi configurado).';

/** Corpo do erro de uma Edge Function (o supabase-js guarda a resposta em error.context). */
async function fnError(error: unknown): Promise<{ status?: number; message: string; code?: string }> {
  const res = (error as { context?: Response }).context;
  if (res && typeof res.json === 'function') {
    const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
    if (res.status === 404 && !body?.error) return { status: 404, message: NOT_DEPLOYED };
    return { status: res.status, message: body?.error ?? `O servidor respondeu ${res.status}.`, code: body?.code };
  }
  const msg = String((error as Error)?.message ?? error);
  if (/Failed to send|fetch|network/i.test(msg)) return { message: 'Sem conexão com o servidor de geração. Tente de novo quando estiver online.' };
  return { message: msg };
}

export async function fetchAiStatus(sb: AiClient): Promise<AiStatus> {
  const { data, error } = await sb.functions.invoke('generate', { body: { op: 'status' } });
  if (error) {
    const e = await fnError(error);
    return e.status === 404 ? { kind: 'off', message: e.message } : { kind: 'error', message: e.message };
  }
  const d = (data ?? {}) as { ia?: boolean; modelo?: string; usadoHoje?: number; limiteDiario?: number };
  if (!d.ia) return { kind: 'off', message: 'A geração por IA ainda não foi configurada neste site. Guias com trechos do material e questões criadas por você continuam disponíveis.' };
  return { kind: 'on', model: d.modelo ?? '', used: d.usadoHoje ?? 0, limit: d.limiteDiario ?? 0 };
}

/** Pede a geração. Pedido repetido devolve a mesma tarefa (o servidor usa uma chave do pedido): não gera em dobro. */
export async function requestGeneration(sb: AiClient, req: GenRequest): Promise<{ job?: JobView; reused: boolean }> {
  const { data, error } = await sb.functions.invoke('generate', { body: req });
  if (error) {
    const e = await fnError(error);
    throw new AiClientError(e.message, e.code);
  }
  const d = (data ?? {}) as { job?: JobView; reused?: boolean };
  return { job: d.job, reused: !!d.reused };
}

/** Acompanha a tarefa na tabela "jobs" (cada conta só enxerga as suas). */
export async function waitJob(sb: AiClient, jobId: string, o: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal; sleep?: (ms: number) => Promise<void> } = {}): Promise<JobView> {
  const interval = o.intervalMs ?? 2500;
  const deadline = Date.now() + (o.timeoutMs ?? 200_000);
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  for (;;) {
    if (o.signal?.aborted) throw new AiClientError('Acompanhamento interrompido. O resultado fica salvo quando a geração terminar.');
    const { data, error } = await sb.from('jobs').select('id, status, attempts, result, error').eq('id', jobId).maybeSingle();
    if (error) throw new AiClientError('Não foi possível consultar a geração: ' + error.message);
    if (!data) throw new AiClientError('Tarefa de geração não encontrada.');
    const j = data as JobView;
    if (j.status !== 'running') return j;
    if (Date.now() > deadline) throw new AiClientError('A geração está demorando. Volte a esta tela em instantes: o resultado fica salvo quando terminar.');
    await sleep(interval);
  }
}

/** Situação da IA no espaço atual (consulta o servidor uma vez por tela). */
export function useAiStatus(): { status: AiStatus; client: (() => Promise<AiClient>) | null } {
  const p = usePersonalOptional();
  const account = useAccount();
  const inAccount = p?.space.kind === 'account' && account.status === 'signedIn';
  const [status, setStatus] = useState<AiStatus>(inAccount ? { kind: 'loading' } : { kind: 'device' });
  useEffect(() => {
    if (!inAccount) return setStatus({ kind: 'device' });
    let live = true;
    setStatus({ kind: 'loading' });
    account
      .client()
      .then((sb) => fetchAiStatus(sb as unknown as AiClient))
      .then((s) => live && setStatus(s), (e) => live && setStatus({ kind: 'error', message: String((e as Error).message ?? e) }));
    return () => {
      live = false;
    };
  }, [inAccount, account.client]); // eslint-disable-line react-hooks/exhaustive-deps
  return { status, client: inAccount ? async () => (await account.client()) as unknown as AiClient : null };
}

export function aiStatusText(s: AiStatus): string {
  switch (s.kind) {
    case 'device':
      return DEVICE_AI_MESSAGE;
    case 'loading':
      return 'Consultando o servidor de geração…';
    case 'off':
    case 'error':
      return s.message;
    case 'on':
      return `Geração por IA disponível · ${s.used} de ${s.limit} pedidos usados nas últimas 24 horas.`;
  }
}
