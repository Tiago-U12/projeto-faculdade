import crypto from 'node:crypto';
import fs from 'node:fs';
import type { Difficulty, DisciplineId, Question, Scope, SourceRecord, Taxonomy } from '../../src/types';
import { DIFFICULTY_LABEL, SCOPE_LABEL } from '../../src/types';
import { toQuestion, type DraftSpec } from './dsl';
import { newId } from './store';

export interface GenRequest {
  system: string;
  user: string;
  maxTokens: number;
}

/** Provedor de IA injetável. Chaves vêm SOMENTE de variáveis de ambiente do serviço de manutenção. */
export interface Provider {
  name: string;
  model: string;
  generate(req: GenRequest): Promise<string>;
}

export class MockProvider implements Provider {
  name = 'mock';
  model = 'mock-1';
  calls: GenRequest[] = [];
  constructor(private reply: string | ((r: GenRequest) => string)) {}
  async generate(req: GenRequest): Promise<string> {
    this.calls.push(req);
    return typeof this.reply === 'function' ? this.reply(req) : this.reply;
  }
}

export class AnthropicProvider implements Provider {
  name = 'anthropic';
  model: string;
  constructor(private apiKey = process.env.ANTHROPIC_API_KEY ?? '', model = process.env.SM_GENERATOR_MODEL ?? 'claude-sonnet-5-5', private fetchFn: typeof fetch = fetch) {
    this.model = model;
    if (!this.apiKey) throw new Error('ANTHROPIC_API_KEY não definida (configure apenas no ambiente do serviço de manutenção).');
  }
  async generate(req: GenRequest): Promise<string> {
    const r = await this.fetchFn('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: this.model, max_tokens: req.maxTokens, system: req.system, messages: [{ role: 'user', content: req.user }] }),
    });
    if (!r.ok) throw new Error(`Anthropic API: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
    const body = (await r.json()) as { content: { type: string; text?: string }[] };
    return body.content.filter((c) => c.type === 'text').map((c) => c.text).join('');
  }
}

export const MAX_BATCH = 20;

export interface GenOptions {
  tax: Taxonomy;
  sources: SourceRecord[];
  existing: Question[];
  disciplineId: DisciplineId;
  topicId: string;
  difficulty: Difficulty;
  scope: Scope;
  count: number;
  provider: Provider;
  /** trechos de material (já extraídos) usados como base; limitado a ~8k caracteres */
  excerpts?: string;
  now?: Date;
}

const SYSTEM = `Você é um elaborador de questões universitárias em português do Brasil.
Gere SOMENTE um array JSON (sem markdown, sem comentários) de questões de múltipla escolha ORIGINAIS.
Cada item segue exatamente este formato:
{"stem": string, "opts": [correta, errada1, errada2, errada3], "why": [motivo errada1, motivo errada2, motivo errada3],
 "exp": string (explicação didática da correta), "steps": [string] (passo a passo quando for cálculo/código), "mistakes": [string],
 "src": [[sourceId, localizador]], "verify": {"kind": "limit|derivative|integral|definite|expr|js|source", "params": {...}, "values": [v0,v1,v2,v3] (paralelos a opts) , "claims": [string]}}
Regras: exatamente UMA alternativa correta, sempre a PRIMEIRA em opts; fórmulas em LaTeX entre $...$; nada de "todas as anteriores";
varie o formato (conceito, cálculo, análise de erro, contexto aplicado) — NUNCA repita o mesmo exercício trocando números;
use apenas as fontes fornecidas; não copie enunciados de terceiros; todo cálculo deve ter verify executável (sympy: expressões em sintaxe SymPy com ** para potência).`;

export function buildPrompt(o: GenOptions): GenRequest {
  const disc = o.tax.disciplines.find((d) => d.id === o.disciplineId)!;
  const topic = disc.topics.find((t) => t.id === o.topicId)!;
  const existing = o.existing.filter((q) => q.disciplineId === o.disciplineId && q.topicId === o.topicId && q.status !== 'rejected').map((q) => '- ' + q.stem.replace(/\s+/g, ' ').slice(0, 140));
  const srcs = o.sources.filter((s) => topic.sourceIds.includes(s.id)).map((s) => `- ${s.id}: ${s.title}${s.accessed ? '' : ' (NÃO ACESSADA — não use)'}`);
  const user = [
    `Disciplina: ${disc.name}`,
    `Assunto: ${topic.name} — ${topic.blurb ?? ''}`,
    `Dificuldade: ${DIFFICULTY_LABEL[o.difficulty]} (${o.difficulty}); camada: ${SCOPE_LABEL[o.scope]} (${o.scope})`,
    `Quantidade: ${Math.min(o.count, MAX_BATCH)}`,
    `Fontes permitidas (use estes ids em "src"):\n${srcs.join('\n') || '- nenhuma'}`,
    o.excerpts ? `Trechos de material de apoio:\n${o.excerpts.slice(0, 8000)}` : '',
    `Questões JÁ EXISTENTES neste assunto (não repita nem reformule):\n${existing.slice(-60).join('\n') || '- nenhuma'}`,
  ].filter(Boolean).join('\n\n');
  return { system: SYSTEM, user, maxTokens: 8000 };
}

export interface GenResult {
  drafts: Question[];
  rejected: { raw: unknown; reason: string }[];
  promptHash: string;
}

function parseJsonArray(text: string): unknown[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end < start) throw new Error('resposta sem array JSON');
  const arr = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(arr)) throw new Error('resposta não é um array');
  return arr;
}

export function validSpecShape(x: any): string | null {
  if (!x || typeof x !== 'object') return 'item não é objeto';
  if (typeof x.stem !== 'string' || !x.stem.trim()) return 'stem ausente';
  if (!Array.isArray(x.opts) || x.opts.length !== 4 || x.opts.some((o: unknown) => typeof o !== 'string')) return 'opts deve ter 4 strings';
  if (!Array.isArray(x.why) || x.why.length !== 3) return 'why deve ter 3 motivos';
  if (typeof x.exp !== 'string') return 'exp ausente';
  if (!Array.isArray(x.src) || !x.src.length) return 'src ausente';
  return null;
}

/** Gera RASCUNHOS (status draft). Nunca aprova nem publica; a validação/revisão é outro processo. */
export async function generateDrafts(o: GenOptions): Promise<GenResult> {
  const req = buildPrompt(o);
  const promptHash = crypto.createHash('sha256').update(req.system + req.user).digest('hex').slice(0, 12);
  const text = await o.provider.generate(req);
  const items = parseJsonArray(text).slice(0, MAX_BATCH);
  const prefix = `${o.disciplineId === 'calculo2' ? 'c2' : 'fs'}-${o.topicId}`;
  const used = new Set(o.existing.map((q) => q.id));
  const drafts: Question[] = [];
  const rejected: GenResult['rejected'] = [];
  const now = (o.now ?? new Date()).toISOString();
  for (const it of items as any[]) {
    const bad = validSpecShape(it);
    if (bad) {
      rejected.push({ raw: it, reason: bad });
      continue;
    }
    const id = newId(prefix, used);
    used.add(id);
    const spec: DraftSpec = {
      id, d: o.disciplineId, topic: o.topicId, diff: o.difficulty, scope: o.scope, stem: it.stem, opts: it.opts, why: it.why, exp: it.exp,
      steps: it.steps, mistakes: it.mistakes, src: it.src, verify: it.verify, tags: [`gen:${o.provider.name}`],
    };
    const q = toQuestion(spec, now);
    q.status = 'draft'; // garantia: o gerador nunca produz nada além de rascunho
    drafts.push(q);
  }
  return { drafts, rejected, promptHash };
}

export function loadExcerpts(files: string[], max = 8000): string {
  let out = '';
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    out += `\n--- ${f.split('/').pop()} ---\n` + fs.readFileSync(f, 'utf8').slice(0, Math.max(0, (max - out.length) / Math.max(1, files.length)));
    if (out.length >= max) break;
  }
  return out;
}
