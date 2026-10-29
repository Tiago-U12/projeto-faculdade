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
import { WEB_EXERCISES } from '../../src/labs/web/exercises';

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
/** navegação provocada de propósito pelo teste do risco documentado (não conta como vazamento do app) */
const scriptNavigation: string[] = [];
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
  // conta o que de fato saiu: pedidos a outros domínios que terminaram (ou falharam por outro motivo que não o CSP)
  const external = (u: string) => !u.startsWith(origin) && !/^(data|blob|chrome-extension|about):/.test(u);
  ctx.on('requestfinished', (r) => {
    if (external(r.url())) foreign.push(r.url());
  });
  ctx.on('requestfailed', (r) => {
    if (!external(r.url())) return;
    if (/BLOCKED_BY_CSP|blocked/i.test(r.failure()?.errorText ?? '')) return;
    else foreign.push(`${r.url()} (${r.failure()?.errorText})`);
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    // erros provocados de propósito pelo código "do estudante" dentro do sandbox (o pageerror inclui os iframes)
    if (/naoExiste is not defined|Laço interrompido|Pacote não disponível no laboratório/.test(e.message)) return;
    problems.push(`pageerror: ${e.message}`);
  });
  page.on('console', (m) => {
    // a música padrão não faz parte do repositório: o 404 dela é esperado (como nos outros e2e)
    if (/(?:404|503)/.test(m.text()) && /study-radio\.mp3$/.test(m.location()?.url ?? '')) return;
    // mensagens de dentro do sandbox (código do estudante, bloqueios do CSP) são o assunto dos testes, não falhas do app
    if ((m.location()?.url ?? '').startsWith('about:srcdoc')) return;
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
  // só SQL: sem o assunto MySQL não sobra exercício SQL — e nada de outros assuntos entra para completar
  await page.locator('fieldset', { hasText: 'Tipo de prática' }).getByRole('button', { name: 'SQL Lab' }).click();
  await chip.click();
  ok('desmarcar o único assunto com SQL não completa com outros assuntos', await page.getByText(/Nada de outros assuntos é usado para completar/).isVisible() && (await page.getByRole('button', { name: /Exercício rápido/ }).isDisabled()));
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

// ———————————————————————— Web Lab e React Lab ————————————————————————
const webEx = (id: string) => WEB_EXERCISES.find((e) => e.id === id)!;
async function openWeb(page: Page, id: string) {
  await hash(page, `#/lab?id=${id}`);
  await page.locator('#web-editor').waitFor({ state: 'attached' });
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll('.web-code button')].find((x) => x.textContent?.includes('Executar'));
    return !!b && !(b as HTMLButtonElement).disabled;
  }, null, { timeout: 20_000 });
}
async function showPanel(page: Page, name: 'Código' | 'Prévia' | 'Console' | 'Testes') {
  const tab = page.getByRole('tab', { name: new RegExp('^' + name) });
  if (await tab.count()) await tab.first().click();
}
async function setFiles(page: Page, files: Record<string, string>) {
  await showPanel(page, 'Código');
  for (const [name, content] of Object.entries(files)) {
    await page.getByRole('tab', { name: new RegExp('^' + name.replace('.', '\\.')) }).click();
    await page.locator('#web-editor').fill(content);
  }
}
async function verifyWeb(page: Page): Promise<{ passed: boolean; text: string }> {
  await showPanel(page, 'Código');
  const before = await page.locator('.lab-attempts li').count();
  await page.getByRole('button', { name: /Verificar resposta/ }).click();
  await page.waitForFunction((n) => document.querySelectorAll('.lab-attempts li').length > n, before, { timeout: 60_000 }).catch(async (e) => {
    console.log('DIAG url', page.url(), 'attempts', await page.locator('.lab-attempts li').count(), 'btn', await page.locator('.web-code .ghost').first().innerText().catch(() => '?'));
    console.log('DIAG tests', (await page.locator('.web-tests').innerText().catch(() => '?')).slice(0, 400));
    console.log('DIAG hist', (await page.locator('section', { hasText: 'Histórico de tentativas' }).last().innerText().catch(() => '?')).slice(0, 300));
    throw e;
  });
  await showPanel(page, 'Testes');
  const text = await page.locator('.web-tests').innerText();
  return { passed: text.includes('Resposta correta!'), text };
}
const preview = (page: Page) => page.frameLocator('iframe.web-frame');
async function runWeb(page: Page) {
  await showPanel(page, 'Código');
  await page.getByRole('button', { name: 'Executar' }).click();
}
async function consoleText(page: Page, until: RegExp) {
  await showPanel(page, 'Console');
  await page.locator('.web-log').getByText(until).first().waitFor({ timeout: 10_000 });
  return page.locator('.web-log').innerText();
}

async function webLabs() {
  section('Web Lab e React Lab — subcaminho do GitHub Pages (390 px, celular)');
  const { ctx, page } = await newContext();
  await page.goto(origin + PREFIX);
  await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
  await waitController(page);
  await page.evaluate(() => localStorage.setItem('sm-sentinela', 'intacto'));
  await hash(page, '#/labs');
  await page.locator('.lab-card', { hasText: 'Web Lab' }).getByText(/8 exercícios/).waitFor();
  await page.locator('.lab-card', { hasText: 'React Lab' }).getByText(/4 exercícios/).waitFor();
  ok('Hub mostra Web Lab (8) e React Lab (4), com filtro por tipo de prática', await page.getByRole('group', { name: 'Tipo de prática' }).or(page.locator('fieldset', { hasText: 'Tipo de prática' })).first().isVisible());

  // cada exercício: o código inicial não passa e a solução de referência passa (no navegador de verdade)
  const failures: string[] = [];
  for (const e of WEB_EXERCISES) {
    await openWeb(page, e.id);
    const starter = await verifyWeb(page);
    await setFiles(page, Object.fromEntries(Object.entries(e.solution).filter(([n]) => e.editable.includes(n as never))) as Record<string, string>);
    const solved = await verifyWeb(page);
    if (starter.passed || !solved.passed) failures.push(`${e.id}: inicial ${starter.passed ? 'PASSOU' : 'falhou'}, solução ${solved.passed ? 'passou' : 'FALHOU — ' + solved.text.replace(/\s+/g, ' ').slice(0, 300)}`);
  }
  ok(`12 exercícios: o código inicial falha e a solução de referência passa em todos`, failures.length === 0, failures.join(' | ') || `${WEB_EXERCISES.length} conferidos`);

  // prévia isolada mostrando o resultado
  await openWeb(page, 'web-funcoes-carrinho');
  await runWeb(page);
  await showPanel(page, 'Prévia');
  ok('prévia mostra a página do estudante (rascunho restaurado com a solução)', (await preview(page).locator('#total').innerText({ timeout: 10_000 })) === 'Total: R$ 155,34');

  // console didático: log com objeto e erro com a linha do editor
  await setFiles(page, { 'script.js': "console.log('olá', { a: 1 }, [1, 2]);\nconsole.warn('cuidado');\nnaoExiste();\n" });
  await runWeb(page);
  const log = await consoleText(page, /naoExiste/);
  ok('console mostra log, aviso e o erro na linha certa do script.js', /olá \{a: 1\} \[1, 2\]/.test(log) && log.includes('cuidado') && /script\.js:3 — .*naoExiste/.test(log), log.replace(/\n/g, ' | '));

  // laço infinito: a proteção interrompe e a página do app continua respondendo
  await setFiles(page, { 'script.js': "let n = 0;\nwhile (true) { n++; }\n" });
  await runWeb(page);
  const t0 = Date.now();
  const loopLog = await consoleText(page, /Laço interrompido/);
  const elapsed = Date.now() - t0;
  const lat0 = Date.now();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(1))));
  ok('laço infinito no script é interrompido (~1,5 s) e a interface segue respondendo', /Laço interrompido/.test(loopLog) && elapsed < 6000 && Date.now() - lat0 < 500, `${elapsed} ms`);
  await setFiles(page, { 'script.js': "document.body.addEventListener('click', () => { for (;;) {} });\ndocument.body.click();\nconsole.log('depois do clique');\n" });
  await runWeb(page);
  ok('laço infinito dentro de um evento também é interrompido', /Laço interrompido/.test(await consoleText(page, /Laço interrompido/)));

  // isolamento: armazenamento, DOM do app, popups, navegação e rede ficam bloqueados
  const probe = `const r = [];
const tenta = (nome, f) => { try { const v = f(); r.push(nome + ':' + (v === null || v === undefined ? 'bloqueado' : 'aberto')); } catch (e) { r.push(nome + ':bloqueado'); } };
tenta('localStorage', () => { localStorage.setItem('x', '1'); return 1; });
tenta('cookie', () => { document.cookie = 'a=1'; return document.cookie || null; });
tenta('indexedDB', () => indexedDB.open('x'));
tenta('parent', () => parent.document.body);
tenta('popup', () => window.open('https://example.com/'));
tenta('top', () => { top.location.href = 'https://example.com/'; return 1; });
fetch('https://example.com/x').then(() => console.log('fetch:aberto'), () => console.log('fetch:bloqueado'));
fetch('../index.html').then(() => console.log('fetch-app:aberto'), () => console.log('fetch-app:bloqueado'));
new Image().src = 'https://example.com/pixel.png';
parent.postMessage({ v: 1, nonce: 'adivinhado', exerciseId: 'web-pagina-semantica', version: 1, type: 'result', payload: { testId: 'estrutura', passed: true, message: null } }, '*');
console.log(r.join(' '));
const link = document.createElement('a');
link.href = 'https://example.com/link';
document.body.append(link);
setTimeout(() => link.click(), 100);
`;
  await openWeb(page, 'web-pagina-semantica');
  await setFiles(page, { 'index.html': webEx('web-pagina-semantica').files['index.html']!, 'script.js': probe });
  await runWeb(page);
  const iso = await consoleText(page, /fetch-app:/);
  const allBlocked = ['localStorage', 'cookie', 'indexedDB', 'parent', 'popup'].every((k) => iso.includes(k + ':bloqueado'));
  ok('sandbox sem acesso a localStorage, cookies, IndexedDB, DOM do app e popups', allBlocked, iso.replace(/\n/g, ' | '));
  ok('sandbox sem rede: fetch externo, fetch ao próprio app e imagem externa bloqueados (CSP)', iso.includes('fetch:bloqueado') && iso.includes('fetch-app:bloqueado') && /Bloqueado: https:\/\/example\.com\/pixel\.png/.test(iso));
  await consoleText(page, /Link barrado: https:\/\/example\.com\/link/);
  ok('link para outro endereço é barrado dentro do sandbox', !page.frames().some((f) => f.url().includes('example.com')));
  ok('a página do app não foi navegada nem teve o armazenamento alterado', page.url().startsWith(origin + PREFIX) && (await page.evaluate(() => localStorage.getItem('sm-sentinela'))) === 'intacto');
  const forged = await verifyWeb(page);
  ok('mensagem forjada de "teste aprovado" com nonce errado é ignorada', !forged.passed && /estrutura|header/i.test(forged.text));
  // risco conhecido: a CSP não cobre a navegação do próprio iframe por script; o app detecta e encerra a prévia
  await setFiles(page, { 'script.js': "setTimeout(() => { location.href = 'https://example.com/navegar'; }, 100);\n" });
  await runWeb(page);
  await showPanel(page, 'Prévia');
  await page.getByText(/A página saiu do laboratório/).waitFor({ timeout: 10_000 });
  ok('script que navega o iframe para outro endereço: a prévia é encerrada e explicada (a requisição em si não é impedida — risco documentado)', (await page.locator('iframe.web-frame').count()) === 0);
  scriptNavigation.push('https://example.com/navegar');

  // abas no celular e acessibilidade automática
  await openWeb(page, 'react-contador');
  await setFiles(page, { 'App.jsx': webEx('react-contador').solution['App.jsx']! });
  await runWeb(page);
  await showPanel(page, 'Prévia');
  await preview(page).locator('#mais').click();
  ok('React: a prévia renderiza o componente e responde a cliques', (await preview(page).locator('#valor').innerText()) === 'Cliques: 1');
  await setFiles(page, { 'App.jsx': 'export default function App() {\n  return <main>\n    <p>sem fechar\n  </main>;\n}\n' });
  await runWeb(page);
  ok('React: erro de JSX aparece no console com a linha do App.jsx', /Erro de sintaxe no App\.jsx, linha \d/.test(await consoleText(page, /Erro de sintaxe/)));
  await setFiles(page, { 'App.jsx': "import x from 'lodash';\nexport default function App() { return <p>oi</p>; }\n" });
  await runWeb(page);
  ok('React: pacote fora do laboratório gera erro explicado (nada é baixado)', /Pacote não disponível no laboratório: lodash/.test(await consoleText(page, /Pacote não disponível/)));
  const axeSrc = fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
  const axe = async () => {
    await page.addScriptTag({ content: axeSrc });
    const r = (await page.evaluate(() => (window as unknown as { axe: { run: (c: Element, o: object) => Promise<{ violations: { id: string; nodes: unknown[] }[] }> } }).axe.run(document.body, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }))) as { violations: { id: string; nodes: unknown[] }[] };
    return r.violations.map((v) => `${v.id}(${v.nodes.length})`);
  };
  const v: string[] = [];
  for (const p of ['Código', 'Prévia', 'Console', 'Testes'] as const) {
    await showPanel(page, p);
    v.push(...(await axe()));
  }
  ok('axe-core (WCAG 2.2 A/AA) sem violações nas quatro abas do celular', v.length === 0, v.join(' ') || '0 violações');
  const tabs = await page.getByRole('tablist', { name: 'Áreas do laboratório' }).getByRole('tab').allInnerTexts();
  ok('celular: Código, Prévia, Console e Testes em abas', tabs.length === 4, tabs.join(' / '));

  // larguras
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: width < 700 ? 800 : 900 });
    await openWeb(page, 'web-galeria-mobile-first');
    await runWeb(page);
    ok(`${width} px: Web Lab sem rolagem lateral da página`, await noHScroll(page));
    if (width === 390) {
      await showPanel(page, 'Código');
      await page.screenshot({ path: path.join(SHOTS, 'web-390.png') });
    }
    if (width === 1280) {
      await openWeb(page, 'react-busca-lista');
      await setFiles(page, { 'App.jsx': webEx('react-busca-lista').solution['App.jsx']! });
      await runWeb(page);
      await preview(page).locator('#busca').fill('dados');
      await page.locator('.web-lab').evaluate((el) => el.scrollIntoView());
      await page.screenshot({ path: path.join(SHOTS, 'react-1280.png') });
      ok('desktop: código, prévia, console e testes visíveis lado a lado', (await page.locator('.web-lab.wide').count()) === 1 && (await page.getByRole('tablist', { name: 'Áreas do laboratório' }).count()) === 0);
    }
  }
  await ctx.close();
}

async function webOffline() {
  section('Web Lab e React Lab — offline (raiz)');
  const { ctx, page } = await newContext();
  await page.goto(origin + '/');
  await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
  await waitController(page);
  await ctx.setOffline(true);
  await page.reload();
  for (const id of ['react-formulario-controlado', 'web-validacao-cadastro']) {
    const e = webEx(id);
    await openWeb(page, id);
    await setFiles(page, Object.fromEntries(Object.entries(e.solution).filter(([n]) => e.editable.includes(n as never))) as Record<string, string>);
    const r = await verifyWeb(page);
    ok(`offline: ${id} abre (${e.kind === 'react' ? 'React e JSX do pré-cache' : 'sem rede'}) e passa nos testes`, r.passed, r.passed ? undefined : r.text.slice(0, 300));
  }
  // medição informativa: uma expressão regular catastrófica trava sem passar por nenhum laço protegido
  await openWeb(page, 'web-funcoes-carrinho');
  await setFiles(page, { 'script.js': "setTimeout(() => {\n  console.log('regex:inicio');\n  setTimeout(() => console.log(/^(a+)+$/.test('a'.repeat(30) + 'b')), 100);\n}, 300);\n" });
  await runWeb(page);
  await consoleText(page, /regex:inicio/);
  await page.waitForTimeout(400);
  const r0 = Date.now();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(1))));
  const lag = Date.now() - r0;
  console.log(`  • informativo: regex catastrófica no sandbox — a interface do app respondeu em ${lag} ms neste Chromium (${lag > 1000 ? 'sandbox no mesmo processo: travou junto' : 'sandbox em processo separado'}).`);
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
    // LABS_ONLY=sql|web roda só uma parte (para depurar); sem a variável, roda tudo
    if (process.env.LABS_ONLY !== 'web') {
      await sqlOnSubpath();
      await sqlOnRoot();
    }
    if (process.env.LABS_ONLY !== 'sql') {
      await webLabs();
      await webOffline();
    }
  } finally {
    await browser.close();
  }
  const leaks = foreign.filter((u) => !scriptNavigation.some((x) => u.startsWith(x)));
  ok('nenhuma conexão a outros domínios além da navegação provocada no teste do risco documentado', leaks.length === 0, leaks.slice(0, 3).join(' ') || `nenhuma${foreign.length ? ` (provocada: ${foreign.length})` : ''}`);
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
