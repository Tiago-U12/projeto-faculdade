/**
 * Study Labs no Chromium real, com o build de produção servido na RAIZ (como no Cloudflare Pages) e no SUBCAMINHO do
 * GitHub Pages: worker e WebAssembly do SQL Lab, laço infinito interrompido sem travar a interface, cancelamento,
 * rascunho após recarregar, funcionamento offline pelo service worker, larguras 360/390/768/1280 sem rolagem lateral,
 * axe-core (WCAG 2.2 A/AA, verificação automática — não é auditoria completa), Study Radio sem reiniciar e nenhuma
 * conexão a outros domínios.  Requer `npm run build` antes.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { SQL_EXERCISES } from '../../src/labs/sql/exercises';

const ROOT = path.resolve(import.meta.dirname, '../..');
const DIST = path.join(ROOT, 'dist');
const PREFIX = '/projeto-faculdade/study-mastery/';
const SHOTS = path.join(ROOT, 'docs/screenshots/labs');
const EXE = process.env.CHROMIUM_PATH ?? ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-labs-'));
const MP3 = path.join(TMP, 'silencio-teste.mp3');
// ~2 s de silêncio MPEG (quadros com side info zerado): não é música
fs.writeFileSync(MP3, Buffer.concat(Array.from({ length: 77 }, () => Buffer.concat([Buffer.from([0xff, 0xfb, 0x90, 0xc0]), Buffer.alloc(413)]))));
assert.ok(fs.existsSync(path.join(DIST, 'sw.js')), 'Execute npm run build antes');

const MIME: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url!, 'http://x').pathname);
  const rel = pathname.startsWith(PREFIX) ? pathname.slice(PREFIX.length) : pathname.slice(1);
  const file = path.resolve(DIST, rel || 'index.html');
  if (!file.startsWith(DIST) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream');
  res.end(fs.readFileSync(file));
});

const results: { item: string; ok: boolean; det?: string }[] = [];
const ok = (item: string, cond: unknown, det?: unknown) => {
  results.push({ item, ok: !!cond, det: det === undefined ? undefined : String(det) });
  console.log(`  ${cond ? '✓' : '✗'} ${item}${det !== undefined ? ` — ${det}` : ''}`);
};
const section = (t: string) => console.log(`\n${t}`);

let origin = '';
let browser: Browser;
const foreign: string[] = [];
const problems: string[] = [];

async function newContext(width = 390, height = 844): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: width < 700, hasTouch: width < 700, locale: 'pt-BR', colorScheme: 'dark', serviceWorkers: 'allow' });
  await ctx.addInitScript({ content: 'window.__name = (f) => f;' });
  await ctx.addInitScript(() => {
    const w = window as unknown as { __audios: HTMLMediaElement[]; __ev: Record<string, number> };
    w.__audios = [];
    w.__ev = { loadstart: 0, ended: 0, emptied: 0 };
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (!w.__audios.includes(this)) {
        w.__audios.push(this);
        for (const ev of Object.keys(w.__ev)) this.addEventListener(ev, () => w.__ev[ev]++);
      }
      return play.call(this);
    };
  });
  ctx.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(origin) && !/^(data|blob|chrome-extension):/.test(u)) foreign.push(u);
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    // a música padrão não faz parte do repositório: o 404 dela é esperado (como nos outros e2e)
    if (/(?:404|503)/.test(m.text()) && /study-radio\.mp3$/.test(m.location()?.url ?? '')) return;
    if (m.type() === 'error') problems.push(`console: ${m.text()} (${m.location()?.url ?? ''})`);
  });
  return { ctx, page };
}

const hash = (page: Page, h: string) => page.evaluate((x) => (location.hash = x), h);
const editor = (page: Page) => page.getByLabel('Editor de SQL');
const ready = (page: Page) => page.getByText(/^SQLite 3\.\d+\.\d+ pronto\.$/).waitFor({ timeout: 20_000 });
async function openLab(page: Page, id: string) {
  await hash(page, `#/lab?id=${id}`);
  await editor(page).waitFor();
  await ready(page);
}
async function run(page: Page, sql: string) {
  await editor(page).fill(sql);
  await page.getByRole('button', { name: 'Executar' }).click();
}
const sol = (id: string) => SQL_EXERCISES.find((e) => e.id === id)!.solutionSql;
const noHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

async function waitController(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15_000 });
}

async function sqlOnSubpath() {
  section('SQL Lab — subcaminho do GitHub Pages (390 px, celular)');
  const { ctx, page } = await newContext();
  const base = origin + PREFIX;
  await page.goto(base);
  await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
  await waitController(page);

  // Study Radio tocando antes de entrar nos Labs
  await page.getByRole('button', { name: /^Study Radio/ }).click();
  const panel = page.locator('section.radio-panel');
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), panel.getByRole('button', { name: /^(Escolher|Trocar) MP3 do aparelho$/ }).click()]);
  await fc.setFiles(MP3);
  await panel.getByRole('button', { name: 'Tocar música' }).click();
  await panel.getByText('Tocando em loop').waitFor({ timeout: 8000 });
  await page.keyboard.press('Escape');
  const audio = () => page.evaluate(() => { const w = window as unknown as { __audios: HTMLMediaElement[]; __ev: Record<string, number> }; return { n: w.__audios.length, paused: w.__audios[0]?.paused, loadstart: w.__ev.loadstart }; });
  const before = await audio();

  await page.getByRole('button', { name: /Study Labs/ }).click();
  await page.getByRole('heading', { name: /Study Labs/ }).waitFor();
  const card = page.locator('.lab-card', { hasText: 'SQL Lab' });
  await card.getByText(/12 exercícios/).waitFor();
  ok('Hub mostra o SQL Lab com 12 exercícios e o aviso de offline', /Funciona offline/.test(await card.innerText()));
  const chip = page.getByRole('button', { name: /^MySQL e persistência · 12$/ });
  ok('assunto com exercícios vem marcado, com a contagem', (await chip.getAttribute('aria-pressed')) === 'true');
  await chip.click();
  ok('desmarcar o único assunto não completa com outros assuntos', await page.getByText(/Nada de outros assuntos é usado para completar/).isVisible() && (await page.getByRole('button', { name: /Exercício rápido/ }).isDisabled()));
  await chip.click();
  await page.getByRole('button', { name: /Exercício rápido/ }).click();
  await page.waitForURL(/#\/lab\?id=sql-/);
  await editor(page).waitFor();
  ok('"Exercício rápido" abre um exercício do assunto escolhido', /#\/lab\?id=sql-[a-z0-9-]+&s=/.test(page.url()), page.url().split('#')[1]);
  await ready(page);
  ok('SQLite (WebAssembly) carrega no Web Worker sob o subcaminho', true);
  ok('dialeto informado na tela', await page.getByText('Dialeto deste laboratório: SQLite.').isVisible());

  await openLab(page, 'sql-clientes-sem-cidade');
  await run(page, 'SELECT * FROM clientes ORDER BY id');
  const table = page.getByRole('region', { name: 'Resultado da consulta' });
  await table.waitFor();
  ok('Executar mostra a tabela de resultado, com NULL visível', (await table.locator('tbody tr').count()) === 5 && (await table.getByText('NULL').count()) === 2);
  await editor(page).fill(sol('sql-clientes-sem-cidade').replace('IS NULL', '= NULL'));
  await page.getByRole('button', { name: 'Verificar resposta' }).click();
  await page.getByText('Ainda não.').waitFor();
  ok('resposta errada: feedback por banco de teste, com a dica de IS NULL', (await page.locator('.sql-tests li.bad').count()) === 2 && (await page.locator('.sql-tests').innerText()).includes('IS NULL'));
  await editor(page).fill(sol('sql-clientes-sem-cidade'));
  await page.getByRole('button', { name: 'Verificar resposta' }).click();
  await page.getByText('Resposta correta!').waitFor();
  await page.getByText('Aprovado · 100%').waitFor();
  ok('resposta certa: concluído, explicação liberada e tentativas no histórico', (await page.locator('.lab-done').isVisible()) && (await page.locator('.lab-attempts li').count()) === 2);

  // laço infinito: a interface continua respondendo e o worker é encerrado no limite
  const loop = 'WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n) SELECT COUNT(*) FROM n;';
  await run(page, loop);
  const t0 = Date.now();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))));
  const uiLatency = Date.now() - t0;
  const busyShown = await page.getByRole('button', { name: /Executando/ }).isVisible();
  await page.getByText(/passou de 3 s e foi interrompida/).waitFor({ timeout: 8000 });
  const elapsed = Date.now() - t0;
  ok('laço infinito: a interface segue respondendo durante a execução', uiLatency < 500 && busyShown, `${uiLatency} ms`);
  ok('laço infinito: interrompido pelo limite de tempo (worker encerrado)', elapsed >= 2500 && elapsed < 8000, `${elapsed} ms`);
  await run(page, 'SELECT COUNT(*) AS total FROM clientes');
  await page.getByRole('region', { name: 'Resultado da consulta' }).getByText('5').waitFor();
  ok('depois do limite, um worker novo executa normalmente', true);
  await run(page, loop);
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await page.getByText('Execução cancelada.').waitFor();
  ok('Cancelar interrompe a execução', true);

  // Study Radio não reiniciou com a navegação e as execuções
  const after = await audio();
  ok('Study Radio continua tocando sem reiniciar o carregamento', after.n === 1 && after.paused === false && after.loadstart === before.loadstart, JSON.stringify({ before, after }));

  // rascunho sobrevive a recarregar — inclusive logo depois de digitar (gravado ao sair da página)
  await editor(page).fill('SELECT nome FROM clientes -- meu rascunho');
  await page.reload();
  await editor(page).waitFor();
  ok('rascunho restaurado depois de recarregar', (await editor(page).inputValue()) === 'SELECT nome FROM clientes -- meu rascunho' && (await page.getByText(/Rascunho restaurado/).isVisible()));
  await page.getByRole('button', { name: 'Restaurar exercício' }).click();
  await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await page.waitForFunction(() => (document.querySelector('#sql-editor') as HTMLTextAreaElement | null)?.value.startsWith('SELECT *'));
  ok('Restaurar exercício volta ao código inicial', true);

  // offline: outro exercício (nunca aberto) funciona só com o pré-cache
  await ctx.setOffline(true);
  await page.reload();
  await page.getByRole('heading', { name: /Study Labs|Vitrine|Clientes/ }).first().waitFor();
  await openLab(page, 'sql-criar-avaliacoes');
  await editor(page).fill(sol('sql-criar-avaliacoes'));
  await page.getByRole('button', { name: 'Verificar resposta' }).click();
  await page.getByText('Resposta correta!').waitFor();
  ok('offline: SQL Lab abre, carrega o SQLite e corrige (DDL) sem rede', true);
  await hash(page, '#/labs');
  await page.locator('.lab-card', { hasText: 'SQL Lab' }).getByText(/12 exercícios/).waitFor();
  ok('offline: Hub dos Labs lista os exercícios', true);
  await ctx.setOffline(false);

  // acessibilidade automática na página do exercício (com resultado e correção na tela)
  await openLab(page, 'sql-pedidos-com-cliente');
  await run(page, sol('sql-pedidos-com-cliente'));
  await page.getByRole('region', { name: 'Resultado da consulta' }).waitFor();
  const axeSrc = fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
  const axe = async () => {
    await page.addScriptTag({ content: axeSrc });
    const r = (await page.evaluate(() => (window as unknown as { axe: { run: (c: Element, o: object) => Promise<{ violations: { id: string; nodes: unknown[] }[] }> } }).axe.run(document.body, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }))) as { violations: { id: string; nodes: unknown[] }[] };
    return r.violations.map((v) => `${v.id}(${v.nodes.length})`);
  };
  const v1 = await axe();
  await page.emulateMedia({ colorScheme: 'light' });
  await page.locator('details.sql-data > summary').click();
  await page.getByRole('region', { name: 'Tabela clientes', exact: true }).waitFor();
  const v2 = await axe();
  await page.emulateMedia({ colorScheme: 'dark' });
  ok('axe-core (WCAG 2.2 A/AA) sem violações na página do SQL Lab, temas claro e escuro', !v1.length && !v2.length, [...v1, ...v2].join(' ') || '0 violações');
  // teclado: Tab sai do editor e chega ao Executar (sem armadilha de foco)
  await editor(page).focus();
  await page.keyboard.press('Tab');
  ok('teclado: Tab sai do editor e chega ao botão Executar', (await page.evaluate(() => document.activeElement?.textContent?.trim())) === 'Executar');
  const touch = await page.evaluate(() => [...document.querySelectorAll('.sql-actions button')].map((b) => b.getBoundingClientRect().height));
  const fontSize = await editor(page).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  ok('alvos de toque ≥ 44 px e editor com fonte de 16 px (sem zoom no celular)', touch.every((h) => h >= 44) && fontSize >= 16, `${touch.join('/')} px · ${fontSize} px`);
  await ctx.close();
}

async function sqlOnRoot() {
  section('SQL Lab — raiz (como no Cloudflare Pages) e larguras de tela');
  fs.mkdirSync(SHOTS, { recursive: true });
  const { ctx, page } = await newContext(1280, 900);
  await page.goto(origin + '/');
  await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
  await waitController(page);
  await openLab(page, 'sql-clientes-acima-de-100');
  await run(page, sol('sql-clientes-acima-de-100'));
  await page.getByRole('region', { name: 'Resultado da consulta' }).waitFor();
  ok('na raiz: worker e WebAssembly carregam e executam', (await page.locator('.sql-table tbody tr').count()) === 2);
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: width < 700 ? 800 : 900 });
    await openLab(page, 'sql-pedidos-com-cliente');
    await run(page, 'SELECT p.id, p.data, c.nome, c.cidade, i.produto_id, i.quantidade, i.preco_unit, i.quantidade * i.preco_unit AS subtotal FROM pedidos p JOIN clientes c ON c.id = p.cliente_id JOIN itens_pedido i ON i.pedido_id = p.id ORDER BY p.id');
    await page.getByRole('region', { name: 'Resultado da consulta' }).waitFor();
    const wrap = await page.locator('.sql-table-wrap').first().evaluate((el) => ({ scroll: el.scrollWidth > el.clientWidth, fits: el.getBoundingClientRect().right <= window.innerWidth + 1 }));
    ok(`${width} px: sem rolagem lateral da página; tabela larga rola dentro da própria caixa`, (await noHScroll(page)) && wrap.fits, JSON.stringify(wrap));
    if (width === 390 || width === 1280) {
      if (width === 1280) await page.locator('.sql-dialect').evaluate((el) => el.scrollIntoView());
      await page.screenshot({ path: path.join(SHOTS, `sql-${width}.png`) });
    }
  }
  await ctx.setOffline(true);
  await page.reload();
  await openLab(page, 'sql-reajuste-papelaria');
  await editor(page).fill(sol('sql-reajuste-papelaria'));
  await page.getByRole('button', { name: 'Verificar resposta' }).click();
  await page.getByText('Resposta correta!').waitFor();
  ok('na raiz, offline: abre e corrige um exercício de UPDATE', true);
  await ctx.close();
}

async function main() {
  assert.ok(EXE, 'Chromium não encontrado (defina CHROMIUM_PATH)');
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const a = server.address();
  assert.ok(a && typeof a !== 'string');
  origin = `http://127.0.0.1:${a.port}`;
  browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  try {
    await sqlOnSubpath();
    await sqlOnRoot();
  } finally {
    await browser.close();
  }
  ok('nenhuma conexão a outros domínios durante os testes', foreign.length === 0, foreign.slice(0, 3).join(' ') || 'nenhuma');
  ok('sem erros de página ou de console', problems.length === 0, problems.slice(0, 5).join(' | ') || 'nenhum');
  const failed = results.filter((r) => !r.ok);
  console.log(`\nLabs: ${results.length - failed.length}/${results.length} verificações passaram.`);
  if (failed.length) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    server.close();
    fs.rmSync(TMP, { recursive: true, force: true });
  });
