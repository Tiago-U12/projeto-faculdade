/**
 * Investigação do relato "não abre no Chrome do Galaxy A52" (Chrome 155). EMULAÇÃO — não substitui o aparelho real.
 *   npm run build && CHROMIUM_PATH=... npx tsx tests/e2e/a52-diagnostico.ts
 * Servidor local com o comportamento do Cloudflare Pages (index.html → / com 308; rota desconhecida → index.html).
 * Cenários:
 *   1. aparelho com o service worker da 0.5.1 (navegação servida por resposta redirecionada → ERR_FAILED) e o site já
 *      corrigido: quantas recargas comuns, SEM chamar registration.update(), até o app abrir — e se o progresso fica;
 *   2. perfil "A52": tela 412×915 @2,625, toque, UA Android, CPU 4× mais lenta e rede 4G lenta: tempo até abrir,
 *      erros de console, rolagem horizontal, fórmulas (KaTeX), persistência e recarga offline;
 *   3. JavaScript principal que não carrega: a ajuda de inicialização aparece e "Reparar e recarregar" recupera sem
 *      apagar o progresso;
 *   4. tela Ajuda e diagnóstico: diagnóstico coletado e reparo pela interface preservando o progresso.
 * Capturas em docs/screenshots/v06/.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium, type BrowserContext, type Page } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '../..');
const dist = path.join(root, 'dist');
const shots = path.join(root, 'docs/screenshots/v06');
assert.ok(fs.existsSync(path.join(dist, 'sw.js')), 'Execute npm run build antes');
fs.mkdirSync(shots, { recursive: true });
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-a52-'));
const executablePath = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

let legacyWorker = false;
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url!, 'http://localhost').pathname);
  if (legacyWorker && pathname === '/sw.js') {
    // reconstrói o comportamento da 0.5.1: navegação atendida pelo index.html do cache (redirecionado no Cloudflare)
    const broken = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8')
      .replace('const shellUrl = scope.href;', "const shellUrl = new URL('index.html', scope).href;")
      .replace(/^const CACHE = .*;$/m, "const CACHE = PREFIX + 'legado-0.5.1';");
    res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
    res.end(broken);
    return;
  }
  if (pathname === '/index.html') {
    res.writeHead(308, { Location: '/' }).end();
    return;
  }
  let file = path.resolve(dist, pathname.slice(1) || 'index.html');
  if (!file.startsWith(dist) || !fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(dist, 'index.html');
  // como o Cloudflare: texto comprimido (sem isso o tempo medido fica artificialmente alto)
  const type = mime[path.extname(file)] ?? 'application/octet-stream';
  const gzip = /^(text\/|application\/(json|manifest)|image\/svg)/.test(type) && /gzip/.test(String(req.headers['accept-encoding']));
  const body = fs.readFileSync(file);
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=0, must-revalidate', ...(gzip ? { 'Content-Encoding': 'gzip' } : {}) });
  res.end(req.method === 'HEAD' ? undefined : gzip ? zlib.gzipSync(body) : body);
});

const A52 = {
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
  // UA reduzido do Chrome para Android (o navegador real não informa modelo nem versão do Android)
  userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36',
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
};

const results: { cenario: string; resultado: string; detalhes?: unknown }[] = [];
const log = (cenario: string, resultado: string, detalhes?: unknown) => {
  results.push({ cenario, resultado, detalhes });
  console.log(`• ${cenario}: ${resultado}${detalhes === undefined ? '' : ' ' + JSON.stringify(detalhes)}`);
};

async function persistent(name: string, opts: Record<string, unknown> = {}): Promise<BrowserContext> {
  return chromium.launchPersistentContext(path.join(temp, name), { executablePath, args: ['--no-sandbox'], serviceWorkers: 'allow', ...A52, ...opts });
}
async function throttle(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  // ~"4G lento": 150 ms de latência, 1,6 Mbit/s de download
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
}
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
async function startQuizAndAnswer(page: Page) {
  await page.getByRole('button', { name: 'Começar a estudar' }).click();
  await page.getByRole('heading', { name: /Configure seu/ }).waitFor();
  await page.locator('label.seg-btn', { hasText: /^\s*5\s*$/ }).click();
  await page.getByRole('button', { name: /Iniciar sessão/ }).click();
  await page.getByRole('heading', { name: 'Questão 1 de 5', exact: true }).waitFor();
  await page.keyboard.press('1');
  await page.locator('.feedback').waitFor();
}

async function main() {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  assert.ok(addr && typeof addr !== 'string');
  const base = `http://127.0.0.1:${addr.port}/`;

  // ---------- 1. service worker da 0.5.1 e site corrigido ----------
  {
    legacyWorker = true;
    const ctx = await persistent('upgrade');
    try {
      const page = await ctx.newPage();
      await page.goto(base);
      await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
      await startQuizAndAnswer(page);
      await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      const before = await page.evaluate(() => localStorage.getItem('study-mastery:state:v1'));
      let first = 'abriu';
      try {
        await page.reload();
      } catch (e) {
        first = String(e).match(/net::\w+/)?.[0] ?? 'erro';
      }
      log('1a. recarga com o worker da 0.5.1 (antes da correção)', first === 'abriu' ? 'abriu' : `não abre (${first}) — reproduz "não abre"`);
      // o site passa a servir o worker corrigido; o estudante só recarrega
      legacyWorker = false;
      const tries: string[] = [];
      let opened = false;
      for (let i = 0; i < 4 && !opened; i++) {
        await page.waitForTimeout(1500);
        try {
          await page.goto(base + '#/quiz');
          await page.getByRole('heading', { name: 'Questão 1 de 5', exact: true }).waitFor({ timeout: 8000 });
          opened = true;
          tries.push('abriu');
        } catch (e) {
          tries.push(String(e).match(/net::\w+/)?.[0] ?? 'não abriu');
        }
      }
      const after = await page.evaluate(() => localStorage.getItem('study-mastery:state:v1')).catch(() => null);
      log('1b. recargas comuns depois do deploy corrigido (sem update() manual)', opened ? `abriu na tentativa ${tries.length}` : 'continuou sem abrir', { tentativas: tries, progressoPreservado: after === before });
      assert.ok(opened, 'o app deveria se recuperar sozinho com recargas comuns');
      assert.equal(after, before, 'o progresso deveria continuar igual');
    } finally {
      await ctx.close();
    }
  }

  // ---------- 2. perfil A52 com CPU e rede limitadas ----------
  {
    const ctx = await persistent('a52');
    try {
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on('console', (m) => {
        if (m.type() !== 'error') return;
        // A faixa opcional não acompanha o app; o worker devolve 503 ao sondá-la offline.
        // Outros recursos/status continuam sendo falhas, como na homologação principal.
        if (/(?:404|503)/.test(m.text()) && /\/audio\/study-radio\.mp3$/.test(m.location().url)) {
          log('sondagem da faixa opcional', 'indisponível, como esperado sem música incluída');
          return;
        }
        errors.push(m.text() + ' · ' + m.location().url);
      });
      page.on('pageerror', (e) => errors.push(String(e)));
      await throttle(page);
      const t0 = Date.now();
      await page.goto(base);
      await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor({ timeout: 60000 });
      const firstOpen = Date.now() - t0;
      await page.screenshot({ path: path.join(shots, 'a52-inicio.png') });
      const homeOverflow = await overflow(page);
      await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, { timeout: 90000 });
      const t1 = Date.now();
      await page.reload();
      await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
      const secondOpen = Date.now() - t1;
      log('2a. tempo até a tela inicial (emulação, 1ª visita / com cache)', `${(firstOpen / 1000).toFixed(1)} s / ${(secondOpen / 1000).toFixed(1)} s`);
      // fórmulas: sessão de Cálculo II com dificuldade alta
      await page.goto(base + '#/setup?d=calculo2');
      await page.getByRole('heading', { name: /Configure seu/ }).waitFor();
      const setupOverflow = await overflow(page);
      await page.locator('label.seg-btn', { hasText: /^\s*5\s*$/ }).click();
      await page.getByRole('button', { name: /Iniciar sessão/ }).click();
      let katexErrors = 0;
      let quizOverflow = false;
      for (let i = 1; i <= 5; i++) {
        await page.getByRole('heading', { name: `Questão ${i} de 5`, exact: true }).waitFor();
        await page.locator('.choice').first().tap();
        await page.locator('.explain').waitFor();
        katexErrors += await page.locator('.katex-error').count();
        quizOverflow ||= await overflow(page);
        if (i === 1) await page.screenshot({ path: path.join(shots, 'a52-quiz-formulas.png'), fullPage: true });
        await page.getByRole('button', { name: i === 5 ? 'Ver resultados' : 'Próxima questão' }).tap();
      }
      await page.getByRole('heading', { name: /acertos|Excelente|caminho|partida/i }).first().waitFor().catch(() => undefined);
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('study-mastery:state:v1') ?? '{}').attempts?.length ?? 0);
      await page.reload();
      const savedAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('study-mastery:state:v1') ?? '{}').attempts?.length ?? 0);
      await ctx.setOffline(true);
      await page.goto(base + '#/progress');
      const offlineOk = await page.getByRole('heading', { name: /Seu/ }).first().isVisible().catch(() => false);
      await ctx.setOffline(false);
      log('2b. layout (rolagem horizontal em início/configuração/questões)', homeOverflow || setupOverflow || quizOverflow ? 'há rolagem horizontal' : 'sem rolagem horizontal');
      log('2c. fórmulas KaTeX em 5 questões de Cálculo II', katexErrors ? `${katexErrors} erro(s)` : 'sem erro de renderização');
      log('2d. persistência local e abertura offline', saved >= 1 && savedAfter === saved && offlineOk ? 'sessão salva, mantida após recarga e progresso abre offline' : 'falhou', { saved, savedAfter, offlineOk });
      log('2e. erros de console', errors.length ? `${errors.length}` : 'nenhum', errors.slice(0, 5));
      assert.ok(!homeOverflow && !setupOverflow && !quizOverflow && !katexErrors && offlineOk && savedAfter === saved && !errors.length);
    } finally {
      await ctx.close();
    }
  }

  // ---------- 3. JavaScript principal não carrega ----------
  {
    const ctx = await persistent('boot');
    try {
      const page = await ctx.newPage();
      await page.goto(base);
      await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
      await page.evaluate(() => localStorage.setItem('study-mastery:state:v1', JSON.stringify({ version: 1, attempts: [{ id: 'marcador', date: '2026-10-20T10:00:00.000Z', disciplineId: 'calculo2', mode: 'aprender', bankVersion: 'x', answers: [] }], stats: {}, settings: { theme: 'auto' } })));
      await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      // simula o arquivo principal indisponível (rede ruim / cache corrompido): o worker também não o encontra
      await page.evaluate(async () => {
        const name = (await caches.keys()).find((k) => k.startsWith('study-mastery-'))!;
        const c = await caches.open(name);
        for (const k of await c.keys()) if (/\/assets\/index-.*\.js$/.test(k.url)) await c.delete(k);
      });
      await ctx.route(/\/assets\/index-.*\.js$/, (r) => r.abort());
      await page.reload();
      await page.locator('#boot-help').waitFor({ state: 'visible', timeout: 10000 });
      await page.screenshot({ path: path.join(shots, 'a52-ajuda-inicializacao.png') });
      log('3a. JavaScript principal indisponível', 'mostra "O Study Mastery não terminou de abrir" com Tentar de novo / Reparar');
      await ctx.unroute(/\/assets\/index-.*\.js$/);
      await page.getByRole('button', { name: 'Reparar e recarregar' }).click();
      await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor({ timeout: 20000 });
      const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('study-mastery:state:v1') ?? '{}').attempts?.some((a: { id: string }) => a.id === 'marcador'));
      log('3b. "Reparar e recarregar"', kept ? 'app abriu de novo e o progresso continuou salvo' : 'progresso perdido!');
      assert.ok(kept);
    } finally {
      await ctx.close();
    }
  }

  // ---------- 4. Ajuda e diagnóstico ----------
  {
    const ctx = await persistent('ajuda');
    try {
      const page = await ctx.newPage();
      await page.goto(base);
      await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
      await startQuizAndAnswer(page);
      await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      const before = await page.evaluate(() => localStorage.getItem('study-mastery:state:v1'));
      await page.goto(base + '#/ajuda');
      await page.getByRole('heading', { name: /Ajuda e/ }).waitFor();
      await page.locator('pre.diag', { hasText: 'Service worker: controlando' }).waitFor();
      const diag = await page.locator('pre.diag').innerText();
      await page.screenshot({ path: path.join(shots, 'a52-ajuda-diagnostico.png'), fullPage: true });
      await page.getByRole('button', { name: 'Reparar o app' }).click();
      await page.getByRole('button', { name: 'Reparar e recarregar' }).click();
      await page.waitForEvent('load');
      await page.getByRole('heading', { name: /Ajuda e/ }).waitFor();
      const after = await page.evaluate(() => localStorage.getItem('study-mastery:state:v1'));
      const json = (s: string | null) => JSON.parse(s ?? '{}');
      const same = JSON.stringify(json(before).active) === JSON.stringify(json(after).active);
      log('4. tela Ajuda e diagnóstico', same ? 'diagnóstico coletado; reparo recarregou e manteve a sessão em andamento' : 'reparo alterou o progresso!', { linhas: diag.split('\n').length });
      assert.ok(same && /Study Mastery \d/.test(diag));
    } finally {
      await ctx.close();
    }
  }
  fs.writeFileSync(path.join(temp, 'resultado.json'), JSON.stringify(results, null, 2));
  console.log('\nTodos os cenários passaram (emulação; aparelho real não testado).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    server.close();
    fs.rmSync(temp, { recursive: true, force: true });
  });
