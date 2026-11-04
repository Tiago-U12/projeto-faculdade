// Verificação no navegador da build offline (dist/Dungeon_Cooked_FINAL_OFFLINE.html via file://).
// Requer Playwright com Chromium. Uso: npm run build && npm run test:browser
// Se o Playwright não estiver no projeto, aponte PLAYWRIGHT_MODULE para o index.mjs dele.
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const file = path.join(root, 'dist/Dungeon_Cooked_FINAL_OFFLINE.html');
if (!existsSync(file)) {
  console.error('Rode "npm run build" antes.');
  process.exit(1);
}

let chromium;
try {
  ({ chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright'));
} catch {
  console.error('Playwright não encontrado. Instale com "npm i -D playwright" (e "npx playwright install chromium") ou defina PLAYWRIGHT_MODULE.');
  process.exit(1);
}

const URL_GAME = pathToFileURL(file).href;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '✔' : '✖'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function openGame(browser, { width = 1366, height = 768, touch = false, storage = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (!storage) await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } }); });
  await page.goto(URL_GAME);
  await page.waitForTimeout(400);
  const state = () => page.evaluate(() => {
    const s = window.__dungeonCooked.svc;
    return { phase: window.__dungeonCooked.app.phase, served: s.stats.served, hands: s.player.hands.map((i) => i.id || i.recipeId), cauldron: s.cook.cauldron.state, path: Boolean(s.player.path && s.player.path.length), time: s.time, x: s.player.x, paused: window.__dungeonCooked.app.paused };
  });
  async function clickWorld(x, y) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const pt = await page.evaluate(([wx, wy]) => {
        const v = window.__dungeonCooked.view;
        const r = document.getElementById('canvas').getBoundingClientRect();
        return { x: r.left + (wx - v.viewX) * v.scale + v.offX, y: r.top + (wy - v.viewY) * v.scale + v.offY, l: r.left, t: r.top, w: r.width, h: r.height };
      }, [x, y]);
      const inside = pt.x > pt.l + 6 && pt.x < pt.l + pt.w - 6 && pt.y > pt.t + 6 && pt.y < pt.t + pt.h - 6;
      const tx = inside ? pt.x : Math.min(Math.max(pt.x, pt.l + 30), pt.l + pt.w - 30);
      const ty = inside ? pt.y : Math.min(Math.max(pt.y, pt.t + pt.h * 0.45), pt.t + pt.h - 30);
      if (touch) await page.touchscreen.tap(tx, ty);
      else await page.mouse.click(tx, ty);
      await idle();
      if (inside) return;
      await page.waitForTimeout(300);
    }
  }
  async function idle() {
    await page.waitForTimeout(120);
    for (let i = 0; i < 80; i++) {
      if (!(await state()).path) return;
      await page.waitForTimeout(100);
    }
  }
  const center = (id) => page.evaluate((s) => { const r = window.__dungeonCooked.layout[s].rect; return { x: r.x + r.w / 2, y: r.y + r.h / 2, rx: r.x, ry: r.y }; }, id);
  const go = async (id) => { const c = await center(id); await clickWorld(c.x, c.y); };
  const ingredient = async (shelf, i) => { const c = await center(shelf); await clickWorld(c.rx + 30 + (i % 2) * 50, c.ry + 18 + Math.floor(i / 2) * 26); };
  async function startHistoria() {
    await page.getByRole('button', { name: /História/ }).click();
    await page.getByRole('button', { name: /Começar|Continuar campanha/ }).first().click();
    await page.getByRole('button', { name: 'Pular cena' }).click();
    await page.getByRole('button', { name: 'Começar o serviço' }).click();
    for (let i = 0; i < 100; i++) {
      const seated = await page.evaluate(() => window.__dungeonCooked.svc.seats.some((c) => c && c.state === 'SEATED'));
      if (seated) break;
      await page.waitForTimeout(100);
    }
  }
  return { page, errors, state, clickWorld, go, ingredient, startHistoria, close: () => context.close() };
}

async function tutorialLoop(g) {
  await g.ingredient('horta', 0);
  await g.go('board');
  await g.go('board');
  await g.go('cauldron');
  await g.ingredient('horta', 1);
  await g.go('board');
  await g.go('board');
  await g.go('cauldron');
  await g.go('cauldron');
  const early = await g.state();
  await g.page.waitForTimeout(5600);
  await g.go('cauldron');
  const took = await g.state();
  await g.clickWorld(484, 130);
  return { early, took, after: await g.state() };
}

const browser = await chromium.launch();
try {
  // 1. Desktop: menu, tutorial completo por clique, recusa de prato cru, entrega, recarga.
  {
    const g = await openGame(browser);
    check('abre via file:// sem erros', g.errors.length === 0, g.errors.join(' | '));
    await g.startHistoria();
    const { early, took, after } = await tutorialLoop(g);
    check('não deixa tirar prato durante o cozimento', early.cauldron === 'PROCESSING' && early.hands.length === 0);
    check('pega o prato pronto', took.hands.includes('soup'));
    check('entrega correta conta 1 prato', after.served === 1 && after.hands.length === 0);
    await g.page.keyboard.press('p');
    const t1 = (await g.state()).time;
    await g.page.waitForTimeout(1000);
    const t2 = (await g.state()).time;
    check('pausa congela o relógio', t1 === t2);
    await g.page.getByRole('button', { name: 'Continuar' }).click();
    await g.page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    check('aba oculta pausa o jogo', (await g.state()).paused === true);
    check('sem erros de JavaScript no fluxo', g.errors.length === 0, g.errors.join(' | '));
    await g.close();
  }
  // 2. Celular em pé com toque: joystick e pointercancel.
  {
    const g = await openGame(browser, { width: 360, height: 800, touch: true });
    await g.startHistoria();
    const over = await g.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    check('360x800 sem rolagem horizontal', over);
    const box = await g.page.locator('#joystick').boundingBox();
    check('joystick visível no toque', Boolean(box));
    const x0 = (await g.state()).x;
    await g.page.evaluate(([x, y]) => {
      const j = document.getElementById('joystick');
      j.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 3, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' }));
      j.dispatchEvent(new PointerEvent('pointermove', { pointerId: 3, clientX: x - 50, clientY: y, bubbles: true, pointerType: 'touch' }));
    }, [box.x + box.width / 2, box.y + box.height / 2]);
    await g.page.waitForTimeout(400);
    const x1 = (await g.state()).x;
    await g.page.evaluate(() => document.getElementById('joystick').dispatchEvent(new PointerEvent('pointercancel', { pointerId: 3, bubbles: true, pointerType: 'touch' })));
    await g.page.waitForTimeout(60);
    const x2 = (await g.state()).x;
    await g.page.waitForTimeout(400);
    const x3 = (await g.state()).x;
    check('joystick move o chef', x1 < x0 - 20);
    check('pointercancel para o movimento', x2 === x3);
    const { after } = await tutorialLoop(g);
    check('tutorial completo por toque (câmera seguindo o chef)', after.served === 1);
    await g.close();
  }
  // 3. Armazenamento bloqueado: continua jogável.
  {
    const g = await openGame(browser, { storage: false });
    const warn = await g.page.getByText('Este navegador não permite salvar agora').count();
    await g.startHistoria();
    check('sem armazenamento: aviso e jogo funcionando', warn > 0 && (await g.state()).phase === 'service');
    await g.close();
  }
  // 4. Recarregar mantém o save (salvo ao fim da noite).
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(URL_GAME);
    await page.evaluate(() => localStorage.setItem('dungeonCooked.save.v1', JSON.stringify({ saveVersion: 1, game: 'dungeon-cooked', slots: { historia: null, tranquilo: null }, meta: { challengeBest: 777, challengeBestServed: 5, challengeRuns: 1, achievements: [], endingsSeen: [], conflictsTotal: 0 } })));
    await page.reload();
    await page.waitForTimeout(300);
    const txt = await page.getByRole('button', { name: /Desafio/ }).textContent();
    check('recarregar lê o save local', /777/.test(txt));
    await page.evaluate(() => localStorage.setItem('dungeonCooked.save.v1', '{ quebrado'));
    await page.reload();
    await page.waitForTimeout(300);
    check('save corrompido não impede abrir', (await page.getByText('Save inválido ignorado').count()) > 0);
    await context.close();
  }
  // 5. Link de continuar: gerado num navegador, abre em outro (sem servidor).
  {
    const seed = { saveVersion: 1, game: 'dungeon-cooked', slots: { historia: null, tranquilo: null }, meta: { challengeBest: 555, challengeBestServed: 4, challengeRuns: 2, achievements: [], endingsSeen: [], conflictsTotal: 0 } };
    const a = await browser.newContext();
    const pa = await a.newPage();
    await pa.goto(URL_GAME);
    await pa.evaluate((s) => localStorage.setItem('dungeonCooked.save.v1', s), JSON.stringify(seed));
    await pa.reload();
    await pa.getByRole('button', { name: /Opções/ }).first().click();
    await pa.getByRole('button', { name: 'Link de continuar' }).click();
    const link = await pa.locator('#continue-link').inputValue();
    const code = link.split('#continuar=')[1] || '';
    check('gera link de continuar', /^DC1[zj]/.test(code), `${link.length} caracteres`);
    await a.close();
    const b = await browser.newContext();
    const pb = await b.newPage();
    const errors = [];
    pb.on('pageerror', (e) => errors.push(e.message));
    await pb.goto(`${URL_GAME}#continuar=${code}`);
    await pb.getByRole('button', { name: 'Carregar progresso' }).click({ timeout: 3000 });
    await pb.waitForTimeout(200);
    const best = await pb.evaluate(() => JSON.parse(localStorage.getItem('dungeonCooked.save.v1')).meta.challengeBest);
    check('link abre em outro navegador e carrega o progresso', best === 555 && !pb.url().includes('continuar='));
    const bad = code.slice(0, 30) + (code[30] === 'A' ? 'B' : 'A') + code.slice(31);
    await pb.goto('about:blank');
    await pb.goto(`${URL_GAME}#continuar=${bad}`);
    const refused = await pb.getByText('O link não abriu').isVisible({ timeout: 3000 }).catch(() => false);
    const kept = await pb.evaluate(() => JSON.parse(localStorage.getItem('dungeonCooked.save.v1')).meta.challengeBest);
    check('link alterado é recusado sem mexer no save', refused && kept === 555 && errors.length === 0, errors.join(' | '));
    await b.close();
  }
} finally {
  await browser.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} verificações passaram.`);
process.exit(failed ? 1 : 0);
