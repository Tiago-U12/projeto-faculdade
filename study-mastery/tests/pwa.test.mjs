import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { injectPrecache } from '../tools/pwa.ts';

const template = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const base = 'https://example.org/projeto-faculdade/study-mastery/';

function worker({ failPut = false } = {}) {
  const methods = [];
  const listeners = {};
  const entries = new Map();
  const removed = [];
  const cache = { match: async (req) => entries.get(typeof req === 'string' ? req : req.url)?.clone(), put: async (url, response) => { if (failPut) throw Error('QuotaExceededError'); entries.set(url, response.clone()); } };
  let fetches = 0;
  const context = vm.createContext({
    URL, Request, Response, Headers, Number,
    self: { location: { href: base + 'sw.js' }, addEventListener: (name, fn) => { listeners[name] = fn; }, clients: { claim: async () => {} } },
    caches: { open: async () => cache, keys: async () => ['study-mastery-old', 'study-mastery-__SM_VERSION__', 'trocaticket-v1', 'aysha-park-v1', 'dungeon-cooked-v1'], delete: async (key) => { removed.push(key); } },
    fetch: async (req) => { fetches++; methods.push(req.method); assert.equal(req.headers.get('range'), null); return new Response(req.method === 'HEAD' ? null : '0123456789', { headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': '10' } }); },
  });
  vm.runInContext(template, context);
  const request = (range, url = base + 'audio/study-radio.mp3', method = 'GET') => {
    let response;
    listeners.fetch({ request: new Request(url, { method, headers: range ? { Range: range } : {} }), respondWith: (r) => { response = r; } });
    return response;
  };
  return { request, listeners, removed, context, methods, get fetches() { return fetches; } };
}

test('pré-cache inclui chunks, fontes e ícones; hash muda com qualquer conteúdo', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-precache-'));
  try {
    fs.mkdirSync(path.join(dir, 'assets'));
    for (const name of ['index.html', 'assets/lazy.js', 'assets/font.woff2', 'icon.png']) fs.writeFileSync(path.join(dir, name), name);
    const assets = injectPrecache(dir, template, '0.5.0');
    assert.deepEqual(assets, ['./', './assets/font.woff2', './assets/lazy.js', './icon.png', './index.html']);
    const first = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
    assert.ok(!first.includes('__SM_'));
    injectPrecache(dir, template, '0.5.0');
    assert.equal(fs.readFileSync(path.join(dir, 'sw.js'), 'utf8'), first);
    fs.writeFileSync(path.join(dir, 'assets/lazy.js'), 'alterado');
    injectPrecache(dir, template, '0.5.0');
    assert.notEqual(fs.readFileSync(path.join(dir, 'sw.js'), 'utf8'), first);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('activate preserva todos os caches dos outros aplicativos', async () => {
  const w = worker();
  let pending;
  w.listeners.activate({ waitUntil: (p) => { pending = p; } });
  await pending;
  assert.deepEqual(w.removed, ['study-mastery-old']);
});

test('MP3 busca e guarda o arquivo completo; Range funciona sem rede', async () => {
  const w = worker();
  const first = await w.request('bytes=2-5');
  assert.equal(first.status, 206);
  assert.equal(first.headers.get('Content-Range'), 'bytes 2-5/10');
  assert.equal(first.headers.get('Content-Length'), '4');
  assert.equal(await first.text(), '2345');
  w.context.fetch = () => { throw Error('offline'); };
  for (const [range, body] of [['bytes=7-', '789'], ['bytes=-3', '789'], ['bytes=8-100', '89'], [null, '0123456789']]) {
    const response = await w.request(range);
    assert.equal(response.status, range ? 206 : 200);
    assert.equal(await response.text(), body);
  }
  for (const range of ['bytes=10-', 'bytes=5-3', 'bytes=-0']) {
    const response = await w.request(range);
    assert.equal(response.status, 416);
    assert.equal(response.headers.get('Content-Range'), 'bytes */10');
  }
  const head = await w.request(null, undefined, 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal(w.fetches, 1);
});

test('não intercepta URLs fora da pasta do Study Mastery', () => {
  const w = worker();
  assert.equal(w.request(null, 'https://example.org/projeto-faculdade/aysha-park/theme.mp3'), undefined);
  assert.equal(w.request(null, 'https://another.org/audio.mp3'), undefined);
});


test('HEAD sem cache consulta apenas metadados, sem baixar o MP3', async () => {
  const w = worker();
  const response = await w.request(null, undefined, 'HEAD');
  assert.equal(response.status, 200);
  assert.deepEqual(w.methods, ['HEAD']);
  assert.equal(await response.text(), '');
});

test('quota esgotada não impede reprodução online nem Range', async () => {
  const w = worker({ failPut: true });
  const response = await w.request('bytes=1-3');
  assert.equal(response.status, 206);
  assert.equal(await response.text(), '123');
});
