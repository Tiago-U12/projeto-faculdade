import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleFeedback, type Env, type FeedbackDB, type Statement } from '../../server/feedback';

const TOKEN = 'test-administrator-key-32-characters-minimum';
const BASE = 'https://study-mastery.pages.dev/api/feedback';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=';
let db: DatabaseSync;
let env: Env;
let fetcher: ReturnType<typeof vi.fn<typeof fetch>>;
let now: Date;
async function hash(s: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), x => x.toString(16).padStart(2, '0')).join('');
}
function adapter(database: DatabaseSync): FeedbackDB {
  return { prepare(sql: string): Statement {
    let values: (string | number | null)[] = [];
    return {
      bind(...v) { values = v; return this; },
      async first<T>() { return (database.prepare(sql).get(...values) ?? null) as T | null; },
      async all<T>() { return { results: database.prepare(sql).all(...values) as T[] }; },
      async run() { return { meta: { changes: Number(database.prepare(sql).run(...values).changes) } }; },
    };
  } };
}
function data(overrides: Record<string, unknown> = {}) {
  return { id: crypto.randomUUID(), kind: 'bug', message: 'O botão de iniciar não responde.', appVersion: '0.6.1', page: '#/setup', images: [], turnstileToken: 'valid-token', ...overrides };
}
function req(method: string, query = '', value?: unknown, extra: Record<string, string> = {}) {
  return new Request(BASE + query, { method, headers: { Origin: new URL(BASE).origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...extra }, ...(value === undefined ? {} : { body: JSON.stringify(value) }) });
}
const auth = { Authorization: `Bearer ${TOKEN}` };
const call = (request: Request) => handleFeedback(request, env, { fetch: fetcher, now: () => now });
async function insert(overrides: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  const p = data(overrides); const res = await call(req('POST', '', p, headers));
  return { p, res };
}
function seed(n: number, when: string) {
  const stmt = db.prepare('INSERT INTO feedback_reports(id,created_at,ip_hash,payload_json,payload_hash) VALUES (?,?,?,?,?)');
  for (let i = 0; i < n; i++) { const p = data(); stmt.run(p.id, when, 'other', JSON.stringify(p), 'hash'); }
}
beforeEach(async () => {
  db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../../migrations-feedback/0001_feedback.sql', import.meta.url), 'utf8'));
  env = { FEEDBACK_DB: adapter(db), FEEDBACK_ADMIN_TOKEN_SHA256: await hash(TOKEN), TURNSTILE_SECRET_KEY: 'server-only-secret', TURNSTILE_SITE_KEY: 'public-site-key' };
  now = new Date('2026-10-25T12:00:00.000Z');
  fetcher = vi.fn<typeof fetch>(async () => Response.json({ success: true, hostname: 'study-mastery.pages.dev', action: 'feedback' }));
});
afterEach(() => { db.close(); });

describe('feedback private service with real SQLite quota statements', () => {
  it('reports configuration without secrets and fails closed until configured', async () => {
    expect(await (await call(req('GET', '?action=config'))).json()).toEqual({ enabled: true, siteKey: 'public-site-key' });
    env.TURNSTILE_SECRET_KEY = undefined;
    const conf = await call(req('GET', '?action=config'));
    expect(await conf.json()).toEqual({ enabled: false });
    expect((await call(req('POST', '', data()))).status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('accepts a validated report with screenshots and returns a receipt only', async () => {
    const { p, res } = await insert({ kind: 'question', questionId: 'c2-lhopital-001', questionVersion: 3, images: [{ name: 'print.png', dataUrl: PNG }] });
    expect(res.status).toBe(201); expect(await res.json()).toEqual({ id: p.id });
    const row = db.prepare('SELECT * FROM feedback_reports').get()!;
    expect(row.ip_hash).toMatch(/^[0-9a-f]{64}$/); expect(JSON.stringify(row)).not.toContain('192.0.2.1');
    expect(row.payload_json).not.toContain('turnstileToken');
    expect(row.payload_json).not.toContain('server-only-secret');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });
  it.each([['jpeg', '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q=='], ['webp', 'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoCAAIAAUAmJaQAA3AA/vz0AAA=']])('accepts a real %s screenshot', async (format, encoded) => {
    const { res } = await insert({ images: [{ name: 'print.' + format, dataUrl: 'data:image/' + format + ';base64,' + encoded }] });
    expect(res.status).toBe(201);
  });
  it('does not accept cross-origin submissions', async () => {
    expect((await call(req('POST', '', data(), { Origin: 'https://unrelated.test' }))).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('requires a valid same-host challenge and correct action', async () => {
    for (const answer of [{ success: false }, { success: true, hostname: 'evil.test', action: 'feedback' }, { success: true, hostname: 'study-mastery.pages.dev', action: 'login' }]) {
      fetcher.mockResolvedValueOnce(Response.json(answer));
      expect((await insert()).res.status).toBe(422);
    }
    expect((await insert({ turnstileToken: '' })).res.status).toBe(422);
    expect(db.prepare('SELECT count(*) AS n FROM feedback_reports').get()!.n).toBe(0);
  });
  it('rejects untrusted connection information when Cloudflare IP is absent', async () => {
    const request = req('POST', '', data()); request.headers.delete('CF-Connecting-IP');
    expect((await call(request)).status).toBe(503);
  });
  it.each([
    { message: 'short' }, { message: 'x'.repeat(4001) }, { id: 'arbitrary' }, { kind: 'other' },
    { appVersion: '<script>' }, { page: '#/quiz?email=someone@example.com' },
    { questionId: '../../secrets' }, { questionVersion: -1 }, { images: [{ name: 'evil.svg', dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' }] },
    { images: [{ name: 'fake.png', dataUrl: 'data:image/png;base64,PGh0bWw+SGk8L2h0bWw+' }] },
    { images: [{ name: 'fake.jpg', dataUrl: PNG.replace('image/png', 'image/jpeg') }] },
    { images: [1, 2, 3] },
  ])('rejects invalid form or attachment %#', async invalid => {
    expect((await insert(invalid)).res.status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects decoded image data larger than 200KiB', async () => {
    const huge = 'data:image/png;base64,' + Buffer.alloc(200 * 1024 + 1).toString('base64');
    expect((await insert({ images: [{ name: 'big.png', dataUrl: huge }] })).res.status).toBe(400);
  });
  it('rejects oversized decoded dimensions and JPEG signatures without a frame header', async () => {
    const bytes = Buffer.from(PNG.split(',')[1], 'base64'); bytes.writeUInt32BE(10000, 16);
    expect((await insert({ images: [{ name: 'huge.png', dataUrl: 'data:image/png;base64,' + bytes.toString('base64') }] })).res.status).toBe(400);
    const fake = Buffer.from([255,216,255,224,0,2,255,217]);
    expect((await insert({ images: [{ name: 'empty.jpg', dataUrl: 'data:image/jpeg;base64,' + fake.toString('base64') }] })).res.status).toBe(400);
  });
  it('enforces body bounds while streaming even when Content-Length lies', async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(data({ message: 'x'.repeat(700 * 1024) })));
    const request = new Request(BASE, { method: 'POST', headers: { Origin: new URL(BASE).origin, 'Content-Type': 'application/json', 'Content-Length': '1' }, body: new ReadableStream({ start(c) { c.enqueue(bytes.slice(0, 300000)); c.enqueue(bytes.slice(300000)); c.close(); } }), duplex: 'half' } as RequestInit);
    expect((await call(request)).status).toBe(413);
    expect((await call(new Request(BASE, { method: 'POST', headers: { Origin: new URL(BASE).origin, 'Content-Type': 'text/plain' }, body: '{}' }))).status).toBe(415);
  });
  it('makes identical retries idempotent without allowing content replacement', async () => {
    const { p, res } = await insert(); expect(res.status).toBe(201);
    const retried = await call(req('POST', '', { ...p, turnstileToken: '' }));
    expect(retried.status).toBe(200); expect(await retried.json()).toEqual({ id: p.id });
    expect((await call(req('POST', '', { ...p, message: 'Changed message of another request' }))).status).toBe(409);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('atomically caps concurrent distinct reports at five per IP per rolling hour', async () => {
    const replies = await Promise.all(Array.from({ length: 9 }, () => insert()));
    expect(replies.filter(r => r.res.status === 201)).toHaveLength(5);
    expect(replies.filter(r => r.res.status === 429)).toHaveLength(4);
    expect(db.prepare('SELECT count(*) AS n FROM feedback_reports').get()!.n).toBe(5);
    now = new Date(now.getTime() + 3600_001);
    expect((await insert()).res.status).toBe(201);
  });
  it('preserves the rolling IP limit across the midnight salt change', async () => {
    now = new Date('2026-10-25T23:59:00Z');
    for (let i = 0; i < 5; i++) expect((await insert()).res.status).toBe(201);
    now = new Date('2026-10-26T00:01:00Z');
    expect((await insert()).res.status).toBe(429);
  });
  it('caps global daily submissions and total retained reports', async () => {
    seed(100, now.toISOString());
    expect((await insert()).res.status).toBe(429);
    db.exec('DELETE FROM feedback_reports'); seed(200, '2026-10-24T00:00:00Z');
    expect((await insert()).res.status).toBe(429);
  });
  it('expires old reports on write and on administrator access', async () => {
    seed(200, '2026-01-01T00:00:00Z'); expect((await insert()).res.status).toBe(201);
    expect(db.prepare('SELECT count(*) AS n FROM feedback_reports').get()!.n).toBe(1);
    seed(5, '2026-01-01T00:00:00Z');
    const r = await call(req('GET', '?action=list', undefined, auth)); expect((await r.json()).items).toHaveLength(1);
    expect(db.prepare('SELECT count(*) AS n FROM feedback_reports').get()!.n).toBe(1);
  });
  it('requires administrator authentication for listing, details, updates and deletion', async () => {
    const { p } = await insert();
    for (const request of [req('GET', '?action=list'), req('GET', '?action=detail&id=' + p.id), req('PATCH', '?id=' + p.id, { status: 'resolved', note: '' }), req('DELETE', '?id=' + p.id)]) {
      expect((await call(request)).status).toBe(401);
    }
    expect((await call(req('GET', '?action=list', undefined, { Authorization: 'Bearer wrong-key-long-enough-to-pass-length' }))).status).toBe(401);
  });
  it('lists without screenshots/IP and allows authenticated detail, status and deletion', async () => {
    const { p } = await insert({ images: [{ name: 'print.png', dataUrl: PNG }] });
    const listed = await (await call(req('GET', '?action=list', undefined, auth))).json();
    expect(listed.items[0]).toMatchObject({ id: p.id, imageCount: 1, status: 'new' });
    expect(JSON.stringify(listed)).not.toContain('data:image'); expect(JSON.stringify(listed)).not.toContain('ip_hash');
    const detailed = await (await call(req('GET', '?action=detail&id=' + p.id, undefined, auth))).json();
    expect(detailed.item.images).toEqual(p.images);
    expect((await call(req('PATCH', '?id=' + p.id, { status: 'reviewing', note: 'Conferir a alternativa B.' }, auth))).status).toBe(200);
    const updated = await (await call(req('GET', '?action=detail&id=' + p.id, undefined, auth))).json(); expect(updated.item.status).toBe('reviewing');
    expect((await call(req('DELETE', '?id=' + p.id, undefined, auth))).status).toBe(200);
    expect((await call(req('GET', '?action=detail&id=' + p.id, undefined, auth))).status).toBe(404);
  });
  it('paginates deterministically and never silently drops older reports', async () => {
    seed(65, now.toISOString());
    const first = await (await call(req('GET', '?action=list', undefined, auth))).json();
    expect(first.items).toHaveLength(50); expect(first.next).toBeTruthy();
    const second = await (await call(req('GET', '?action=list&cursor=' + encodeURIComponent(first.next), undefined, auth))).json();
    expect(second.items).toHaveLength(15); expect(second.next).toBeUndefined();
    expect(new Set([...first.items, ...second.items].map(x => x.id)).size).toBe(65);
  });
  it('returns generic storage errors without exposing server details', async () => {
    env.FEEDBACK_DB = { prepare() { throw new Error('credential or database-internal-detail'); } };
    const res = await call(req('POST', '', data())); expect(res.status).toBe(503);
    expect(await res.text()).not.toContain('database-internal-detail');
  });
});
