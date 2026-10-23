/**
 * Regressão: Cloudflare redireciona index.html para a URL canônica.
 * Uma resposta redirecionada em cache não pode atender navegação com redirect=manual.
 * Verifica a navegação real em Chromium, com rede, sem rede e após reabrir o perfil.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '../..');
const dist = path.join(root, 'dist');
assert.ok(fs.existsSync(path.join(dist, 'sw.js')), 'Execute npm run build antes');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-canonical-'));
const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
let prefix = '/';
let canonical = true;
let legacyWorker = false;
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url!, 'http://localhost').pathname;
  if (!pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
  if (legacyWorker && pathname === prefix + 'sw.js') {
    const broken = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8')
      .replace('const shellUrl = scope.href;', "const shellUrl = new URL('index.html', scope).href;")
      .replace(/^const CACHE = .*;$/m, "const CACHE = PREFIX + 'legacy-redirect-test';");
    res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
    res.end(broken); return;
  }
  if (canonical && pathname === prefix + 'index.html') {
    res.writeHead(308, { Location: prefix }).end(); return;
  }
  const relative = pathname.slice(prefix.length) || 'index.html';
  let file = path.resolve(dist, relative);
  if (!file.startsWith(dist + path.sep)) { res.writeHead(404).end(); return; }
  if (!fs.existsSync(file)) {
    if (canonical) file = path.join(dist, 'index.html');
    else { res.writeHead(404).end(); return; }
  }
  if (!fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
  res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(file));
});

async function main() {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const origin = 'http://127.0.0.1:' + address.port;
  const executablePath = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium';
  for (const layout of ['cloudflare', 'github'] as const) {
    canonical = layout === 'cloudflare';
    prefix = canonical ? '/' : '/projeto-faculdade/study-mastery/';
    const base = origin + prefix;
    const profile = path.join(temp, layout);
    const options = { executablePath, args: ['--no-sandbox'], viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' as const };
    let context = await chromium.launchPersistentContext(profile, options);
    try {
      let page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(base);
      await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
      await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      const cache = await page.evaluate(async () => {
        const name = (await caches.keys()).find(key => key.startsWith('study-mastery-'))!;
        const c = await caches.open(name);
        const rows = [];
        for (const key of await c.keys()) {
          if (key.url.endsWith('index.html') || key.url.endsWith('/')) {
            const response = (await c.match(key))!;
            rows.push({ key: key.url, url: response.url, redirected: response.redirected });
          }
        }
        return rows;
      });
      console.log(JSON.stringify({ layout, cachedDocuments: cache }));
      // Este reload reproduz net::ERR_FAILED com o worker anterior no Cloudflare.
      await page.reload();
      await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
      await page.getByRole('button', { name: 'Começar a estudar' }).click();
      await page.getByRole('heading', { name: /Configure seu/ }).waitFor();
      await page.locator('label.seg-btn', { hasText: /^\s*5\s*$/ }).click();
      await page.getByRole('button', { name: /Iniciar sessão/ }).click();
      await page.getByRole('heading', { name: 'Questão 1 de 5', exact: true }).waitFor();
      await page.keyboard.press('1');
      await page.locator('.feedback').waitFor();
      const before = await page.evaluate(() => localStorage.getItem('study-mastery:state:v1'));
      await page.reload();
      await page.getByRole('heading', { name: 'Questão 1 de 5', exact: true }).waitFor();
      await page.locator('.feedback').waitFor();
      await context.setOffline(true);
      await page.reload();
      await page.getByRole('heading', { name: 'Questão 1 de 5', exact: true }).waitFor();
      await context.close();

      context = await chromium.launchPersistentContext(profile, options);
      await context.setOffline(true);
      page = await context.newPage();
      await page.goto(base + '#/quiz');
      await page.getByRole('heading', { name: 'Questão 1 de 5', exact: true }).waitFor();
      await page.locator('.feedback').waitFor();
      assert.equal(await page.evaluate(() => localStorage.getItem('study-mastery:state:v1')), before);
      assert.deepEqual(errors, []);
      console.log(layout + ': reload online/offline e perfil reaberto preservam sessão e resposta.');
    } finally { await context.close(); }
  }

  // Recupera um perfil já controlado pelo worker defeituoso sem apagar os dados locais.
  canonical = true;
  prefix = '/';
  legacyWorker = true;
  const context = await chromium.launchPersistentContext(path.join(temp, 'upgrade'), {
    executablePath, args: ['--no-sandbox'], viewport: { width: 390, height: 844 }, serviceWorkers: 'allow',
  });
  try {
    const page = await context.newPage();
    await page.goto(origin + '/');
    await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
    await page.getByRole('button', { name: 'Começar a estudar' }).click();
    await page.getByRole('heading', { name: /Configure seu/ }).waitFor();
    await page.locator('label.seg-btn', { hasText: /^\s*5\s*$/ }).click();
    await page.getByRole('button', { name: /Iniciar sessão/ }).click();
    await page.getByRole('heading', { name: 'Questão 1 de 5', exact: true }).waitFor();
    await page.keyboard.press('1');
    await page.locator('.feedback').waitFor();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const before = await page.evaluate(() => localStorage.getItem('study-mastery:state:v1'));
    const old = context.serviceWorkers()[0];
    await assert.rejects(page.reload(), /ERR_FAILED/);
    legacyWorker = false;
    const next = context.waitForEvent('serviceworker');
    await old.evaluate('self.registration.update()');
    const installed = await next;
    await installed.evaluate("new Promise(resolve => { const w = self.registration.installing || self.registration.waiting || self.registration.active; if (w.state === 'activated') resolve(); else w.addEventListener('statechange', () => { if (w.state === 'activated') resolve(); }); })");
    await page.goto(origin + '/#/quiz');
    await page.getByRole('heading', { name: 'Questão 1 de 5', exact: true }).waitFor();
    await page.locator('.feedback').waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('study-mastery:state:v1')), before);
    assert.ok(!(await page.evaluate(() => caches.keys())).includes('study-mastery-legacy-redirect-test'));
    console.log('upgrade: perfil com ERR_FAILED recuperado sem apagar a sessão.');
  } finally { await context.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  server.close();
  fs.rmSync(temp, { recursive: true, force: true });
});
