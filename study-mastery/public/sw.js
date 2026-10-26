// Os marcadores são preenchidos pelo plugin Vite depois do build.
const PREFIX = 'study-mastery-';
const CACHE = PREFIX + '__SM_VERSION__';
const CORE = /*__SM_ASSETS__*/ [];
const scope = new URL('./', self.location.href);
// Pages redireciona index.html para a raiz; uma resposta redirecionada não pode servir navegações.
// './' já é pré-cacheado sem redirecionamento, tanto na raiz quanto no subcaminho do GitHub Pages.
const shellUrl = scope.href;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});
const isAudio = (response) => response.status === 200 && /^(audio\/|application\/octet-stream(?:;|$))/i.test(response.headers.get('content-type') || '');

async function audioResponse(req) {
  let cache;
  try { cache = await caches.open(CACHE); } catch { /* reprodução online independe do cache */ }
  // Nunca guardar um 206: o cache contém o arquivo completo, para qualquer seek offline.
  let full;
  try { full = await cache?.match(req.url); } catch { /* cache indisponível */ }
  if (!full || !isAudio(full)) {
    if (req.method === 'HEAD') return fetch(req);
    const headers = new Headers(req.headers);
    headers.delete('range');
    full = await fetch(new Request(req.url, { headers, credentials: req.credentials }));
    if (!isAudio(full)) return full;
    try { await cache?.put(req.url, full.clone()); } catch { /* quota esgotada: toca online */ }
  }
  const headers = new Headers(full.headers);
  headers.set('Accept-Ranges', 'bytes');
  if (req.method === 'HEAD') return new Response(null, { status: 200, headers });
  const range = req.headers.get('range');
  if (!range) return full;
  // Múltiplos intervalos e unidades desconhecidas são ignorados (resposta completa 200).
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return full;
  const bytes = await full.arrayBuffer();
  const size = bytes.byteLength;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  headers.delete('Content-Encoding');
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(bytes.slice(start, end + 1), { status: 206, headers });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  // Relatos/prints e autorização administrativa nunca passam pelo cache do PWA.
  if (url.pathname.startsWith(scope.pathname + 'api/')) return;
  if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname.endsWith('.mp3')) {
    e.respondWith(audioResponse(req).catch(() => new Response(null, { status: 503 })));
    return;
  }
  if (req.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    // Shell e chunks pertencem à mesma versão instalada, também durante atualizações.
    const hit = await cache.match(req.mode === 'navigate' ? shellUrl : req);
    if (hit) return hit;
    const response = await fetch(req);
    // Arquivos com hash fora do pré-cache (fontes alternativas, leitor de PDF): guardados no primeiro uso.
    if (response.ok && url.pathname.startsWith(scope.pathname + 'assets/')) cache.put(req, response.clone()).catch(() => undefined);
    return response;
  }).catch(() => new Response('Indisponível offline. Abra o app com internet para completar a instalação.', { status: 503 })));
});
