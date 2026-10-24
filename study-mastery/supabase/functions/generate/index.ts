// POST { op: 'status' | 'questoes' | 'secao', ... } — geração com IA no servidor. Responde rápido com a tarefa
// (status consultável na tabela jobs) e termina o trabalho em segundo plano.
import { cors, json, requireUser, serviceClient, userClient } from '../_shared/http.ts';
import { providerFromEnv } from '../_shared/ai.ts';
import { handleGenerate, type GenDeps, type GenRequest, type GuideRow, type JobRow } from '../_shared/generateCore.ts';

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

const sha256 = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), (b) => b.toString(16).padStart(2, '0')).join('');
const num = (k: string, d: number) => Number(Deno.env.get(k) ?? '') || d;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'Use POST.' }, 405);
  const user = await requireUser(req);
  if (!user) return json(req, { error: 'Entre na sua conta para continuar.' }, 401);
  let body: GenRequest;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: 'Corpo inválido.' }, 400);
  }
  const db = userClient(req);
  const admin = serviceClient();
  const uid = user.id;
  const must = <T>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message);
    return r.data;
  };
  const deps: GenDeps = {
    ai: providerFromEnv(),
    limits: { daily: num('AI_DAILY_LIMIT', 20), maxAttempts: num('AI_MAX_ATTEMPTS', 2), staleMs: 10 * 60 * 1000 },
    now: () => new Date(),
    hash: (s) => sha256(uid + '|' + s),
    newId: () => crypto.randomUUID(),
    getDiscipline: async (id) => must(await db.from('disciplines').select('id, name').eq('id', id).maybeSingle()),
    getTopic: async (id) => must(await db.from('topics').select('id, discipline_id, name').eq('id', id).maybeSingle()),
    getMaterials: async (ids) => must(await db.from('materials').select('id, title, kind, status, version, discipline_id').in('id', ids)) ?? [],
    getPages: async (id) => must(await db.from('material_pages').select('page, text').eq('material_id', id).order('page')) ?? [],
    existingStems: async (d, t) => (must(await db.from('questions').select('data->>stem').eq('discipline_id', d).eq('topic_id', t)) ?? []).map((r: Record<string, string>) => r.stem),
    getGuide: async (id) => must(await db.from('guides').select('id, discipline_id, material_ids, data').eq('id', id).maybeSingle()) as GuideRow | null,
    // tarefas e consumo: só o servidor grava; sempre com owner_id do usuário autenticado
    findJob: async (key) => must(await admin.from('jobs').select('*').eq('owner_id', uid).eq('idem_key', key).maybeSingle()) as JobRow | null,
    insertJob: async (j) => void must(await admin.from('jobs').insert({ ...j, owner_id: uid })),
    updateJob: async (id, patch) => void must(await admin.from('jobs').update(patch).eq('owner_id', uid).eq('id', id)),
    usageLast24h: async () => {
      const r = await admin.from('usage_events').select('id', { count: 'exact', head: true }).eq('owner_id', uid).gte('created_at', new Date(Date.now() - 864e5).toISOString());
      if (r.error) throw new Error(r.error.message);
      return r.count ?? 0;
    },
    addUsage: async (ev) => void must(await admin.from('usage_events').insert({ ...ev, owner_id: uid, provider: 'anthropic' })),
    // conteúdo do estudante: gravado com o JWT dele (RLS)
    insertQuestions: async (rows) => void must(await db.from('questions').insert(rows.map((r) => ({ ...r, owner_id: uid })))),
    setGuideSection: async (guideId, key, patch) => void must(await db.rpc('set_guide_section', { p_guide: guideId, p_key: key, p_patch: patch })),
    background: (p) => (typeof EdgeRuntime !== 'undefined' ? EdgeRuntime.waitUntil(p) : void p),
  };
  try {
    const r = await handleGenerate(deps, body);
    return json(req, r.body, r.http);
  } catch (e) {
    console.error('generate', (e as Error).message);
    return json(req, { error: 'Falha temporária ao preparar a geração. Tente de novo em instantes.' }, 500);
  }
});
