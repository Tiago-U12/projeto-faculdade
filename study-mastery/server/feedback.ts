/** Cloudflare Pages + D1. This module never exposes a database or administrator credential. */
export interface Statement {
  bind(...values: (string | number | null)[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes?: number } }>;
}
export interface FeedbackDB { prepare(sql: string): Statement }
export interface Env {
  FEEDBACK_DB?: FeedbackDB;
  FEEDBACK_ADMIN_TOKEN_SHA256?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
}
type Kind = 'question' | 'bug' | 'suggestion';
export type Status = 'new' | 'reviewing' | 'resolved' | 'dismissed';
interface Attachment { name: string; dataUrl: string }
interface Payload {
  id: string; kind: Kind; message: string; questionId?: string; questionVersion?: number;
  appVersion: string; page: string; images: Attachment[];
}
interface Row { id: string; created_at: string; ip_hash: string; payload_json: string; payload_hash: string; status: Status; note: string; image_count?: number }
interface Dependencies { fetch?: typeof fetch; now?: () => Date }
const MAX_BODY = 650 * 1024;
const MAX_IMAGE = 200 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATES: Status[] = ['new', 'reviewing', 'resolved', 'dismissed'];
const HOUR = 3600_000, DAY = 24 * HOUR;
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
class RequestError extends Error { constructor(message: string, readonly status = 400) { super(message); } }
const fail = (message: string, status = 400): never => { throw new RequestError(message, status); };
function ready(env: Env): boolean {
  return !!(env.FEEDBACK_DB && /^[a-f0-9]{64}$/i.test(env.FEEDBACK_ADMIN_TOKEN_SHA256 ?? '') && env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY);
}
async function sha(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
}
async function admin(request: Request, env: Env): Promise<boolean> {
  const match = /^Bearer ([\x21-\x7e]{32,256})$/.exec(request.headers.get('Authorization') ?? '');
  if (!match || !env.FEEDBACK_ADMIN_TOKEN_SHA256) return false;
  const actual = await sha(match[1]), expected = env.FEEDBACK_ADMIN_TOKEN_SHA256.toLowerCase();
  let difference = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ (expected.charCodeAt(i) || 0);
  return difference === 0;
}
async function body(request: Request): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') ?? '')) fail('Envie os dados em JSON.', 415);
  const declared = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > MAX_BODY) fail('O envio excede o limite de tamanho.', 413);
  if (!request.body) fail('O formulário está vazio.');
  const reader = request.body!.getReader();
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY) { await reader.cancel(); fail('O envio excede o limite de tamanho.', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { fail('O formulário contém dados inválidos.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail('O formulário contém dados inválidos.');
  return parsed as Record<string, unknown>;
}
/** Bounds decoded pixel allocation without trusting the extension or browser MIME claim. */
function imageDimensions(binary: string, type: string): [number, number] | null {
  const b = (i: number) => binary.charCodeAt(i);
  const be16 = (i: number) => (b(i) << 8) | b(i + 1);
  const be32 = (i: number) => b(i) * 0x1000000 + (b(i + 1) << 16) + (b(i + 2) << 8) + b(i + 3);
  const le24 = (i: number) => b(i) + (b(i + 1) << 8) + (b(i + 2) << 16);
  const le32 = (i: number) => le24(i) + b(i + 3) * 0x1000000;
  if (type === 'png') return binary.length >= 45 && be32(8) === 13 ? [be32(16), be32(20)] : null;
  if (type === 'webp') {
    if (binary.length < 25 || le32(4) + 8 !== binary.length) return null;
    const variant = binary.slice(12, 16);
    if (variant === 'VP8X') {
      // Animated images can contain many frames: this inbox accepts static screenshots only.
      if (binary.length < 30 || (b(20) & 2)) return null;
      return [le24(24) + 1, le24(27) + 1];
    }
    if (variant === 'VP8L' && b(20) === 0x2f) return [((b(21) | (b(22) << 8)) & 0x3fff) + 1, ((b(22) >> 6) | (b(23) << 2) | ((b(24) & 15) << 10)) + 1];
    if (variant === 'VP8 ' && binary.length >= 30 && binary.slice(23, 26) === '\x9d\x01\x2a') return [(b(26) | (b(27) << 8)) & 0x3fff, (b(28) | (b(29) << 8)) & 0x3fff];
    return null;
  }
  if (type === 'jpeg') {
    let i = 2;
    while (i + 3 < binary.length) {
      if (b(i++) !== 255) return null;
      while (b(i) === 255) i++;
      const marker = b(i++);
      if (marker === 0xda || marker === 0xd9) return null;
      if (marker === 1 || (marker >= 0xd0 && marker <= 0xd8)) continue;
      const length = be16(i);
      if (length < 2 || i + length > binary.length) return null;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) return length >= 8 ? [be16(i + 5), be16(i + 3)] : null;
      i += length;
    }
  }
  return null;
}
function attachment(input: unknown): Attachment {
  if (!input || typeof input !== 'object') fail('Print inválido.');
  const { name, dataUrl } = input as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim() || name.length > 120 || typeof dataUrl !== 'string') fail('Print inválido.');
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl as string);
  if (!match || match[2].length > Math.ceil(MAX_IMAGE / 3) * 4) fail('Use prints PNG, JPEG ou WebP de até 200 KB.');
  let binary = '';
  try { binary = atob(match![2]); } catch { fail('Print inválido.'); }
  if (!binary || binary.length > MAX_IMAGE || btoa(binary) !== match![2]) fail('Print inválido.');
  const b = (i: number) => binary.charCodeAt(i);
  const png = binary.startsWith('\x89PNG\r\n\x1a\n') && binary.slice(12, 16) === 'IHDR' && binary.slice(-8, -4) === 'IEND';
  const jpeg = b(0) === 255 && b(1) === 216 && b(2) === 255 && b(binary.length - 2) === 255 && b(binary.length - 1) === 217;
  const webp = binary.startsWith('RIFF') && binary.slice(8, 12) === 'WEBP' && /^(VP8 |VP8L|VP8X)$/.test(binary.slice(12, 16));
  if (!(match![1] === 'png' ? png : match![1] === 'jpeg' ? jpeg : webp)) fail('O conteúdo do print não corresponde ao tipo informado.');
  const dimensions = imageDimensions(binary, match![1]);
  if (!dimensions || dimensions.some(x => !Number.isSafeInteger(x) || x < 1 || x > 4096) || dimensions[0] * dimensions[1] > 16_000_000) fail('O print tem dimensões inválidas ou muito grandes. Use uma imagem estática de até 4.096 pixels por lado.');
  return { name: (name as string).replace(/[\x00-\x1f\x7f/\\]/g, '_').trim(), dataUrl: dataUrl as string };
}
function payload(input: Record<string, unknown>): Payload {
  if (typeof input.id !== 'string' || !UUID.test(input.id)) fail('Identificador de envio inválido.');
  if (!['question', 'bug', 'suggestion'].includes(String(input.kind))) fail('Escolha o tipo de feedback.');
  if (typeof input.message !== 'string' || input.message.trim().length < 10 || input.message.trim().length > 4000) fail('Descreva o feedback em 10 a 4.000 caracteres.');
  if (typeof input.appVersion !== 'string' || !/^[\w.-]{1,40}$/.test(input.appVersion)) fail('Versão do app inválida.');
  if (typeof input.page !== 'string' || !/^#?\/[a-z0-9/-]{0,80}$/i.test(input.page)) fail('A página não pode conter dados pessoais nem parâmetros.');
  if (input.questionId !== undefined && (typeof input.questionId !== 'string' || !/^[\w-]{1,120}$/.test(input.questionId))) fail('Identificador da questão inválido.');
  if (input.questionVersion !== undefined && (!Number.isSafeInteger(input.questionVersion) || Number(input.questionVersion) < 1 || Number(input.questionVersion) > 1e6)) fail('Versão da questão inválida.');
  if (!Array.isArray(input.images) || input.images.length > 2) fail('Anexe no máximo dois prints.');
  return {
    id: (input.id as string).toLowerCase(), kind: input.kind as Kind, message: (input.message as string).trim(),
    ...(input.questionId ? { questionId: input.questionId as string } : {}),
    ...(input.questionVersion ? { questionVersion: input.questionVersion as number } : {}),
    appVersion: input.appVersion as string, page: input.page as string, images: (input.images as unknown[]).map(attachment),
  };
}
function summary(row: Row, includeImages = false) {
  const p = JSON.parse(row.payload_json) as Payload;
  const { images = [], ...rest } = p;
  return { ...rest, id: row.id, createdAt: row.created_at, status: row.status, note: row.note, imageCount: row.image_count ?? images.length, ...(includeImages ? { images } : {}) };
}
async function verifyCaptcha(token: unknown, request: Request, env: Env, fetcher: typeof fetch): Promise<boolean> {
  if (typeof token !== 'string' || token.length < 1 || token.length > 2048) return false;
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY!, response: token }), signal: controller.signal,
    });
    if (!response.ok) return false;
    const value = await response.json() as { success?: boolean; hostname?: string; action?: string };
    return value.success === true && value.hostname === new URL(request.url).hostname && value.action === 'feedback';
  } catch { return false; } finally { clearTimeout(timeout); }
}
export async function handleFeedback(request: Request, env: Env, deps: Dependencies = {}): Promise<Response> {
  const url = new URL(request.url), action = url.searchParams.get('action');
  const now = (deps.now ?? (() => new Date()))();
  try {
    if (request.method === 'GET' && action === 'config') return reply(ready(env) ? { enabled: true, siteKey: env.TURNSTILE_SITE_KEY } : { enabled: false });
    if (!ready(env)) return reply({ error: 'O recebimento de feedbacks ainda não foi configurado. Nada foi enviado.' }, 503);
    const db = env.FEEDBACK_DB!;
    const origin = request.headers.get('Origin');
    if ((request.method === 'POST' && origin !== url.origin) || (origin && origin !== url.origin)) return reply({ error: 'Origem não permitida.' }, 403);
    if (request.method === 'POST') {
      const raw = await body(request), p = payload(raw);
      const serialized = JSON.stringify(p), digest = await sha(serialized);
      const existing = await db.prepare('SELECT id, payload_hash FROM feedback_reports WHERE id = ?').bind(p.id).first<{ id: string; payload_hash: string }>();
      // Retrying an identical request returns only its receipt, never any stored content.
      if (existing) return existing.payload_hash === digest ? reply({ id: p.id }) : reply({ error: 'Esse identificador já foi usado. Inicie outro feedback.' }, 409);
      if (!await verifyCaptcha(raw.turnstileToken, request, env, deps.fetch ?? fetch)) return reply({ error: 'Confirme a verificação de segurança e tente novamente.' }, 422);
      const ip = request.headers.get('CF-Connecting-IP');
      if (!ip || !/^[0-9a-f.:]{3,64}$/i.test(ip)) return reply({ error: 'Não foi possível verificar a origem da conexão.' }, 503);
      const currentDay = now.toISOString().slice(0, 10), previousDay = new Date(now.getTime() - DAY).toISOString().slice(0, 10);
      const hashIP = (day: string) => sha(`${env.FEEDBACK_ADMIN_TOKEN_SHA256}:${day}:${ip}`);
      const [ipHash, previousHash] = await Promise.all([hashIP(currentDay), hashIP(previousDay)]);
      const expires = new Date(now.getTime() - 90 * DAY).toISOString();
      await db.prepare('DELETE FROM feedback_reports WHERE created_at < ?').bind(expires).run();
      // SQLite evaluates the quota predicates and insertion in ONE write statement.
      const inserted = await db.prepare(`INSERT INTO feedback_reports (id, created_at, ip_hash, payload_json, payload_hash)
        SELECT ?, ?, ?, ?, ? WHERE
        (SELECT count(*) FROM feedback_reports WHERE ip_hash IN (?, ?) AND created_at >= ?) < 5 AND
        (SELECT count(*) FROM feedback_reports WHERE created_at >= ?) < 100 AND
        (SELECT count(*) FROM feedback_reports) < 200
        ON CONFLICT(id) DO NOTHING`).bind(p.id, now.toISOString(), ipHash, serialized, digest, ipHash, previousHash,
          new Date(now.getTime() - HOUR).toISOString(), currentDay + 'T00:00:00.000Z').run();
      if (!inserted.meta.changes) {
        const raced = await db.prepare('SELECT payload_hash FROM feedback_reports WHERE id = ?').bind(p.id).first<{ payload_hash: string }>();
        if (raced?.payload_hash === digest) return reply({ id: p.id });
        return reply({ error: 'O limite de envios foi atingido. Guarde seu rascunho e tente mais tarde.' }, 429);
      }
      return reply({ id: p.id }, 201);
    }
    if (!await admin(request, env)) return reply({ error: 'Acesso restrito à administração.' }, 401);
    // Retention also applies on reads: expired rows are never delivered, even without new submissions.
    const cutoff = new Date(now.getTime() - 90 * DAY).toISOString();
    await db.prepare('DELETE FROM feedback_reports WHERE created_at < ?').bind(cutoff).run();
    if (request.method === 'GET' && action === 'list') {
      let before = '9999', beforeId = 'zzzz';
      const cursor = url.searchParams.get('cursor');
      if (cursor) {
        try {
          if (cursor.length > 200) throw new Error();
          const parsed = JSON.parse(atob(cursor)) as unknown;
          if (!Array.isArray(parsed) || parsed.length !== 2 || typeof parsed[0] !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(parsed[0]) || !UUID.test(parsed[1])) throw new Error();
          [before, beforeId] = parsed;
        } catch { return reply({ error: 'Página inválida.' }, 400); }
      }
      const { results } = await db.prepare(`SELECT id, created_at, status, note,
        json_remove(payload_json, '$.images', '$.turnstileToken') AS payload_json,
        json_array_length(payload_json, '$.images') AS image_count
        FROM feedback_reports WHERE created_at < ? OR (created_at = ? AND id < ?)
        ORDER BY created_at DESC, id DESC LIMIT 51`).bind(before, before, beforeId).all<Row>();
      const rows = results.slice(0, 50), last = rows.at(-1);
      return reply({ items: rows.map(row => summary(row)), ...(results.length > 50 && last ? { next: btoa(JSON.stringify([last.created_at, last.id])) } : {}) });
    }
    const id = url.searchParams.get('id');
    if (!id || !UUID.test(id)) return reply({ error: 'Identificador inválido.' }, 400);
    if (request.method === 'GET' && action === 'detail') {
      const row = await db.prepare('SELECT * FROM feedback_reports WHERE id = ?').bind(id).first<Row>();
      return row ? reply({ item: summary(row, true) }) : reply({ error: 'Feedback não encontrado.' }, 404);
    }
    if (request.method === 'PATCH') {
      const raw = await body(request);
      if (!STATES.includes(raw.status as Status) || typeof raw.note !== 'string' || raw.note.length > 2000) return reply({ error: 'Status ou anotação inválidos.' }, 400);
      const result = await db.prepare('UPDATE feedback_reports SET status = ?, note = ? WHERE id = ?').bind(raw.status as string, raw.note.trim(), id).run();
      return result.meta.changes ? reply({ id }) : reply({ error: 'Feedback não encontrado.' }, 404);
    }
    if (request.method === 'DELETE') {
      const result = await db.prepare('DELETE FROM feedback_reports WHERE id = ?').bind(id).run();
      return result.meta.changes ? reply({ id }) : reply({ error: 'Feedback não encontrado.' }, 404);
    }
    return reply({ error: 'Operação não permitida.' }, 405);
  } catch (error) {
    if (error instanceof RequestError) return reply({ error: error.message }, error.status);
    return reply({ error: 'Não foi possível concluir agora. Guarde seu rascunho e tente novamente.' }, 503);
  }
}
