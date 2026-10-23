/** Build real sob o subcaminho do Pages; nenhum MP3 é gravado no repositório. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '../..');
const prefix = '/projeto-faculdade/study-mastery/';
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-pages-'));
const dist = path.join(stage, 'TrocaTicket/dist/study-mastery');
assert.ok(fs.existsSync(path.join(root, 'dist/sw.js')), 'Execute npm run build antes');
fs.mkdirSync(dist, { recursive: true });
fs.cpSync(path.join(root, 'dist'), dist, { recursive: true });
const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url!, 'http://localhost').pathname;
  if (pathname === '/seed') { res.setHeader('Content-Type', 'text/html'); res.end('<title>Cache fixtures</title>'); return; }
  // Bytes sintéticos para testar o transporte Range; não é música nem um MP3 distribuído.
  if (pathname === prefix + 'audio/study-radio.mp3') {
    res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': '10' });
    res.end(req.method === 'HEAD' ? undefined : '0123456789'); return;
  }
  if (!pathname.startsWith(prefix)) { res.writeHead(404); res.end(); return; }
  const file = path.resolve(dist, pathname.slice(prefix.length) || 'index.html');
  if (!file.startsWith(dist + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
  res.end(fs.readFileSync(file));
});

async function main() {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ serviceWorkers: 'allow', viewport: { width: 320, height: 800 } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(origin + '/seed');
    await page.evaluate(async () => {
      for (const name of ['trocaticket-sentinel', 'aysha-park-sentinel', 'dungeon-cooked-sentinel', 'study-mastery-old']) {
        await (await caches.open(name)).put('/sentinel', new Response(name));
      }
    });
    await page.goto(origin + prefix);
    await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const keys = await page.evaluate(() => caches.keys());
    for (const name of ['trocaticket-sentinel', 'aysha-park-sentinel', 'dungeon-cooked-sentinel']) assert.ok(keys.includes(name));
    assert.ok(!keys.includes('study-mastery-old'));
    const cachedAssets = await page.evaluate(async () => {
      const key = (await caches.keys()).find((name) => name.startsWith('study-mastery-'))!;
      return (await (await caches.open(key)).keys()).map((req) => new URL(req.url).pathname);
    });
    for (const file of fs.readdirSync(path.join(dist, 'assets'))) assert.ok(cachedAssets.includes(prefix + 'assets/' + file), `asset pré-cacheado: ${file}`);
    const firstRange = await page.evaluate(async () => {
      const r = await fetch('./audio/study-radio.mp3', { headers: { Range: 'bytes=2-5' } });
      return { status: r.status, body: await r.text() };
    });
    assert.deepEqual(firstRange, { status: 206, body: '2345' });
    await context.setOffline(true);
    await page.reload();
    await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
    await page.getByText(/Banco completo/).waitFor();
    page.on('dialog', (dialog) => dialog.accept());
    for (const discipline of ['calculo2', 'fullstack']) {
      await page.evaluate((id) => { location.hash = `#/setup?d=${id}`; }, discipline);
      await page.getByRole('heading', { name: /Configure seu/ }).waitFor();
      await page.locator('label.seg-btn', { hasText: /^\s*5\s*$/ }).click();
      await page.getByRole('button', { name: /Iniciar/ }).click();
      await page.getByRole('heading', { name: 'Questão 1 de 5', exact: true }).waitFor();
      await page.keyboard.press('1');
      await page.locator('.feedback').waitFor();
      assert.ok(await page.locator('.explanation-text').count());
    }
    const offlineRange = await page.evaluate(async () => {
      const r = await fetch('./audio/study-radio.mp3', { headers: { Range: 'bytes=-3' } });
      return { status: r.status, body: await r.text(), range: r.headers.get('Content-Range') };
    });
    assert.deepEqual(offlineRange, { status: 206, body: '789', range: 'bytes 7-9/10' });
    assert.deepEqual(errors, []);
    console.log('Offline/Pages OK: assets, duas disciplinas, Range 206 e caches vizinhos preservados.');
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  server.close();
  fs.rmSync(stage, { recursive: true, force: true });
});
