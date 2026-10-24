// Adicionar, reprocessar e excluir materiais nos dois espaços.
//  - neste aparelho: o PDF é lido aqui e só o texto extraído é guardado (o arquivo não fica salvo nem é enviado);
//  - na conta: o arquivo vai para a pasta privada da conta e o servidor confere tipo real, tamanho e hash.
// Toda etapa é idempotente: tentar de novo continua de onde parou, sem duplicar material, páginas ou arquivo.
import type { SupabaseClient } from '@supabase/supabase-js';
import { analyzeMaterial, LIMITS, segmentText, sha256Hex, suggestTopics, type PageText } from '../../supabase/functions/_shared/materialQuality';
import type { Personal } from '../personal/context';
import { planDeletion } from '../personal/repo';
import { newId, nowIso, type PGuide, type PMaterial, type PQuestion, type PTopic } from '../personal/types';
import { checkPdfFile, extractPdf, ExtractError, loadPdfJs } from './extract';

export type Step = 'lendo' | 'extraindo' | 'salvando' | 'enviando' | 'conferindo';
export type Progress = (step: Step, done?: number, total?: number) => void;

export interface Ctx {
  personal: Personal;
  /** presente só no espaço da conta */
  cloud?: { client: () => Promise<SupabaseClient>; uid: string };
  /** tira do histórico deste aparelho o texto das questões excluídas (o acerto/erro continua) */
  scrub?: (questionIds: string[]) => void;
}

export class MaterialError extends Error {}

export function duplicateOf(materials: PMaterial[], disciplineId: string, sha256: string): PMaterial | undefined {
  return materials.find((m) => m.disciplineId === disciplineId && m.sha256 === sha256);
}

function baseMaterial(disciplineId: string, title: string, kind: PMaterial['kind'], pages: PageText[], topics: PTopic[]): PMaterial {
  const a = analyzeMaterial(pages, kind);
  const s = suggestTopics(pages, topics.filter((t) => t.disciplineId === disciplineId).map((t) => t.name));
  const now = nowIso();
  return {
    id: newId(), disciplineId, title: title.trim().slice(0, 120), kind, status: 'recebido', pageCount: pages.length, charCount: a.charCount,
    issues: a.issues, suggestedTopics: s.suggested, topicIds: topics.filter((t) => s.found.some((f) => f.name === t.name)).map((t) => t.id),
    version: 1, createdAt: now, updatedAt: now,
  };
}

/** Lê e confere o PDF no aparelho (antes de criar qualquer registro: arquivo inválido não deixa lixo). */
export async function readPdf(file: File, progress?: Progress): Promise<{ bytes: Uint8Array; pages: PageText[]; sha256: string }> {
  progress?.('lendo');
  const bytes = new Uint8Array(await file.arrayBuffer());
  checkPdfFile(bytes, file.name);
  const sha256 = await sha256Hex(bytes);
  progress?.('extraindo', 0);
  const pages = await extractPdf(await loadPdfJs(), bytes, (d, t) => progress?.('extraindo', d, t));
  return { bytes, pages, sha256 };
}

export async function addPdf(ctx: Ctx, input: { disciplineId: string; title: string; file: File; read: { bytes: Uint8Array; pages: PageText[]; sha256: string }; topics: PTopic[] }, progress?: Progress): Promise<PMaterial> {
  const { read } = input;
  const m: PMaterial = { ...baseMaterial(input.disciplineId, input.title || input.file.name.replace(/\.pdf$/i, ''), 'pdf', read.pages, input.topics), fileName: input.file.name.slice(0, 200), fileSize: read.bytes.byteLength, sha256: read.sha256 };
  progress?.('salvando');
  if (!ctx.cloud) {
    // neste aparelho a análise é o resultado final
    const a = analyzeMaterial(read.pages, 'pdf');
    const final = { ...m, status: a.status } as PMaterial;
    // material antes das páginas (na conta, as páginas têm chave estrangeira para o material)
    await ctx.personal.save('materials', final);
    await ctx.personal.repo.putPages(final.id, read.pages);
    return final;
  }
  await ctx.personal.save('materials', m);
  return syncToServer(ctx, m, read.pages, input.file, progress);
}

export async function addText(ctx: Ctx, input: { disciplineId: string; title: string; text: string; topics: PTopic[] }, progress?: Progress): Promise<PMaterial> {
  if (input.text.length > LIMITS.maxPastedChars) throw new MaterialError(`O texto tem ${input.text.length.toLocaleString('pt-BR')} caracteres; o limite é ${LIMITS.maxPastedChars.toLocaleString('pt-BR')}. Divida em mais de um material.`);
  const pages = segmentText(input.text);
  if (!pages.length) throw new MaterialError('Cole algum texto antes de salvar.');
  const m = baseMaterial(input.disciplineId, input.title || 'Texto colado', 'texto', pages, input.topics);
  progress?.('salvando');
  const final = { ...m, status: analyzeMaterial(pages, 'texto').status } as PMaterial;
  await ctx.personal.save('materials', final);
  await ctx.personal.repo.putPages(final.id, pages);
  if (ctx.cloud) {
    // a conferência do servidor registra a análise feita lá (mesmo módulo)
    progress?.('conferindo');
    await invokeProcess(ctx, final.id).catch(() => undefined);
    return (await reload(ctx, final.id)) ?? final;
  }
  return final;
}

/** Envia o que falta para o servidor e pede a conferência. Pode ser chamada de novo após qualquer falha. */
export async function syncToServer(ctx: Ctx, m: PMaterial, pages: PageText[] | null, file: File | null, progress?: Progress): Promise<PMaterial> {
  const cloud = ctx.cloud!;
  const sb = await cloud.client();
  if (pages) await ctx.personal.repo.putPages(m.id, pages);
  await ctx.personal.save('materials', { ...m, status: 'processando', statusDetail: undefined, updatedAt: nowIso() });
  if (m.kind === 'pdf') {
    progress?.('enviando');
    const path = `${cloud.uid}/${m.id}.pdf`;
    const { data: existing } = await sb.storage.from('materiais').list(cloud.uid, { search: `${m.id}.pdf`, limit: 1 });
    if (!existing?.length) {
      if (!file) throw new MaterialError('Para reenviar, escolha de novo o mesmo arquivo PDF.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      if ((await sha256Hex(bytes)) !== m.sha256) throw new MaterialError('Esse não é o mesmo arquivo lido antes. Escolha o PDF original ou crie um novo material.');
      const { error } = await sb.storage.from('materiais').upload(path, file, { contentType: 'application/pdf', upsert: false });
      if (error && !/exist/i.test(error.message)) {
        await ctx.personal.save('materials', { ...m, status: 'falhou', statusDetail: 'O envio do arquivo falhou: ' + error.message, updatedAt: nowIso() });
        throw new MaterialError(/size|large|exceed/i.test(error.message) ? 'O servidor recusou o arquivo: acima de 10 MB.' : /mime|type/i.test(error.message) ? 'O servidor recusou o arquivo: não é PDF.' : 'O envio do arquivo falhou. Verifique a conexão e tente de novo.');
      }
    }
  }
  progress?.('conferindo');
  await invokeProcess(ctx, m.id);
  return (await reload(ctx, m.id)) ?? m;
}

async function invokeProcess(ctx: Ctx, materialId: string): Promise<void> {
  const sb = await ctx.cloud!.client();
  const { error } = await sb.functions.invoke('process-material', { body: { materialId } });
  if (error) {
    const ctxRes = (error as { context?: Response }).context;
    const body = ctxRes ? await ctxRes.json().catch(() => null) : null;
    // 422 = conferido e recusado: o estado "Falhou" já foi gravado pelo servidor
    if (ctxRes?.status === 422) return;
    throw new MaterialError(body?.error ?? 'O servidor não conferiu o material agora. Use “Tentar de novo”.');
  }
}

async function reload(ctx: Ctx, id: string): Promise<PMaterial | undefined> {
  await ctx.personal.load('materials');
  return (await ctx.personal.repo.list('materials')).find((x) => x.id === id);
}

/** O que sai junto com o material (para avisar antes de excluir). */
export function materialDeletion(m: PMaterial, all: { questions: PQuestion[]; guides: PGuide[] }): { file: boolean; pages: number; questions: string[]; guides: string[] } {
  const plan = planDeletion({ kind: 'materials', id: m.id }, { topics: [], questions: all.questions, guides: all.guides });
  return { file: m.kind === 'pdf' && !!m.sha256, pages: m.pageCount, questions: plan.questions, guides: plan.guides };
}

/**
 * Exclui o material com o arquivo, o texto extraído, as questões e os guias gerados dele e o texto dessas questões no
 * histórico (fica só o acerto/erro). Na conta, o banco faz tudo numa operação (delete_material_cascade).
 */
export async function deleteMaterial(ctx: Ctx, m: PMaterial): Promise<{ questoes: number; guias: number }> {
  const repo = ctx.personal.repo;
  const plan = planDeletion({ kind: 'materials', id: m.id }, { topics: [], questions: await repo.list('questions'), guides: await repo.list('guides') });
  if (ctx.cloud) {
    if (m.kind === 'pdf') {
      const sb = await ctx.cloud.client();
      const { error } = await sb.storage.from('materiais').remove([`${ctx.cloud.uid}/${m.id}.pdf`]);
      if (error) throw new MaterialError('Não foi possível apagar o arquivo no servidor; nada foi excluído. Tente de novo.');
    }
    if (!repo.deleteMaterialCascade) throw new MaterialError('Exclusão indisponível neste espaço.');
    const r = await repo.deleteMaterialCascade(m.id);
    // logo depois do banco: uma tentativa ainda não enviada não leva de volta o texto excluído
    ctx.scrub?.(plan.questions);
    await Promise.all([ctx.personal.load('materials'), ctx.personal.load('questions'), ctx.personal.load('guides')]);
    return r;
  }
  await ctx.personal.removeIds('questions', plan.questions);
  await ctx.personal.removeIds('guides', plan.guides);
  ctx.scrub?.(plan.questions);
  await repo.removePages(m.id);
  await ctx.personal.removeIds('materials', [m.id]);
  return { questoes: plan.questions.length, guias: plan.guides.length };
}

export function describeExtractError(e: unknown): string {
  if (e instanceof ExtractError || e instanceof MaterialError) return e.message;
  return 'Não foi possível ler o arquivo: ' + String((e as Error)?.message ?? e);
}
