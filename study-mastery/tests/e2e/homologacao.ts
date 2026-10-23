/**
 * Homologação v0.5: percorre o checklist de uso real (acesso, filtros, modos, gabarito, resultados, progresso, Study Radio,
 * offline/PWA, visual/acessibilidade, acervo e privacidade) no BUILD DE PRODUÇÃO servido no mesmo subcaminho do GitHub Pages,
 * em Chromium com emulação de celular e perfil persistente (fechar e reabrir offline é real).
 *   npm run build && npm run e2e:homologacao [-- --relatorio caminho.md]
 * Layout do Cloudflare Pages (app na raiz e index.html devolvido com 200 para arquivos inexistentes):
 *   HOMOLOG_LAYOUT=cloudflare npm run e2e:homologacao
 * Arquivos auxiliares (MP3 de SILÊNCIO sintético, arquivos inválidos) são gerados em um diretório temporário — nenhuma música
 * é criada ou gravada no repositório. Sai com código 1 se algum item automatizado falhar.
 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium, type BrowserContext, type Page } from 'playwright-core';
import type { PublishedQuestion, Taxonomy } from '../../src/types';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DIST = path.join(ROOT, 'dist');
// github (padrão): subcaminho do GitHub Pages, 404 real para arquivos ausentes.
// cloudflare: raiz do domínio e fallback de SPA (o Cloudflare Pages serve o index.html com 200 quando não há 404.html).
const LAYOUT = process.env.HOMOLOG_LAYOUT === 'cloudflare' ? 'cloudflare' : 'github';
const PREFIX = LAYOUT === 'cloudflare' ? '/' : '/projeto-faculdade/study-mastery/';
const KEY = 'study-mastery:state:v1';
const EXE = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-homolog-'));
const reportArg = process.argv.indexOf('--relatorio');
const REPORT = reportArg > 0 ? path.resolve(process.argv[reportArg + 1]) : null;

const tax = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/taxonomy.json'), 'utf8')) as Taxonomy;
const bank = ['calculo2', 'fullstack'].flatMap((d) => JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/published', `${d}.json`), 'utf8')) as PublishedQuestion[]);
const byId = new Map(bank.map((q) => [q.id, q]));
const topicName = (id: string) => tax.disciplines.flatMap((d) => d.topics).find((t) => t.id === id)!.name;
const EXAM = tax.disciplines.find((d) => d.id === 'calculo2')!.topics.filter((t) => t.examFocus).map((t) => t.id);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- arquivos auxiliares (temporários, fora do repositório) ----------
const MP3 = path.join(TMP, 'silencio-teste.mp3');
// MPEG-1 Layer III 128 kbps 44,1 kHz mono, side info zerado: ~2 s de SILÊNCIO (não é música)
fs.writeFileSync(MP3, Buffer.concat(Array.from({ length: 77 }, () => Buffer.concat([Buffer.from([0xff, 0xfb, 0x90, 0xc0]), Buffer.alloc(413)]))));
const TXT = path.join(TMP, 'nao-e-audio.txt');
fs.writeFileSync(TXT, 'isto não é um mp3');
const BIG = path.join(TMP, 'grande-demais.mp3');
fs.closeSync(fs.openSync(BIG, 'w'));
fs.truncateSync(BIG, 61 * 1024 * 1024);
const BAD_JSON = path.join(TMP, 'historico-invalido.json');
fs.writeFileSync(BAD_JSON, '{"app":"outra-coisa"');

// ---------- resultados ----------
type Item = { sec: string; item: string; ok: boolean | null; det?: string };
const results: Item[] = [];
let sec = '';
const ok = (item: string, cond: unknown, det?: unknown) => {
  results.push({ sec, item, ok: !!cond, det: det === undefined ? undefined : String(det) });
  console.log(`  ${cond ? '✓' : '✗'} ${item}${det !== undefined ? ` — ${det}` : ''}`);
};
const manual = (item: string, det: string) => {
  results.push({ sec, item, ok: null, det });
  console.log(`  • ${item} — ${det}`);
};
async function section(name: string, fn: () => Promise<void>) {
  sec = name;
  console.log(`\n## ${name}`);
  try {
    await fn();
  } catch (e) {
    const m = (e as Error).message.split('\n');
    const dbg = process.env.HOMOLOG_DEBUG;
    if (dbg && page && !page.isClosed()) {
      await page.screenshot({ path: path.join(dbg, `falha-${name.split('.')[0]}.png`), fullPage: true }).catch(() => undefined);
      fs.writeFileSync(path.join(dbg, `falha-${name.split('.')[0]}.txt`), `${(e as Error).message}\n\n${page.url()}\n${await page.locator('body').ariaSnapshot().catch((x) => String(x))}`);
    }
    ok('seção concluída sem erro inesperado', false, [m[0], m.find((l) => /waiting for/.test(l))].filter(Boolean).join(' · ').slice(0, 260));
  }
}

// ---------- servidor no layout do GitHub Pages ----------
const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url!, 'http://x').pathname);
  if (!p.startsWith(PREFIX)) return void res.writeHead(404).end();
  // Pages canonicaliza /index.html para /: respostas redirecionadas precisam entrar na homologação.
  if (LAYOUT === 'cloudflare' && p === '/index.html') return void res.writeHead(308, { Location: '/' }).end();
  let f = path.resolve(DIST, p.slice(PREFIX.length) || 'index.html');
  if (!f.startsWith(DIST)) return void res.writeHead(404).end();
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) {
    if (LAYOUT === 'cloudflare') f = path.join(DIST, 'index.html'); // fallback de SPA: o MP3 ausente “existe” como HTML
    else return void res.writeHead(404, { 'Content-Type': 'text/html' }).end('<h1>404</h1>'); // como o GitHub Pages
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] ?? 'application/octet-stream' });
  res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(f));
});

let BASE = '';
let page: Page;
let dialogPolicy: 'accept' | 'dismiss' = 'accept';
const dialogs: string[] = [];
const consoleErrors: string[] = [];
const requests: { url: string; method: string }[] = [];

function watch(p: Page) {
  p.on('dialog', (d) => {
    dialogs.push(d.message());
    void (dialogPolicy === 'accept' ? d.accept() : d.dismiss());
  });
  p.on('console', (m) => {
    if (m.type() !== 'error') return;
    // a sondagem HEAD do MP3 ausente gera um 404 esperado (nenhuma música acompanha o app)
    if (/404/.test(m.text()) && /study-radio\.mp3$/.test(m.location()?.url ?? '')) return;
    consoleErrors.push(m.text());
  });
  p.on('pageerror', (e) => consoleErrors.push(String(e)));
}

const S = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY);
const goHash = async (h: string) => {
  await page.evaluate((x) => (location.hash = x), h);
  await page.waitForTimeout(80);
};
const home = async () => {
  await goHash('#/');
  await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
};

type SetupOpts = { d: 'calculo2' | 'fullstack'; topics?: string[] | 'exam' | 'all'; diffs?: ('facil' | 'medio' | 'dificil')[]; scope?: 'aula' | 'aprofundamento' | 'desafio'; mode?: 'Aprender' | 'Simulado' | 'Revisão' | 'Misto'; size?: 5 | 10 | 20 };
const SCOPE_TXT = { aula: 'Só o conteúdo das aulas', aprofundamento: 'Aulas + aprofundamento', desafio: 'Também desafios' };
const DIFF_TXT = { facil: 'Fácil', medio: 'Média', dificil: 'Difícil' };

/** Configura a sessão pela interface (como o estudante faria) e devolve o resumo do rodapé. Não inicia. */
async function setup(o: SetupOpts): Promise<string> {
  await home();
  await goHash(`#/setup?d=${o.d}`);
  await page.getByRole('heading', { name: /Configure seu/ }).waitFor();
  const all = page.locator('.head-actions .text-btn', { hasText: /^(Selecionar todos|Limpar)$/ });
  if ((await all.innerText()).trim() === 'Selecionar todos') await all.click();
  if (o.topics !== undefined && o.topics !== 'all') {
    await all.click(); // nenhum marcado
    if (o.topics === 'exam') await page.getByRole('button', { name: 'Foco da prova' }).click();
    else for (const id of o.topics) await page.locator('label.topic').filter({ has: page.locator('.topic-name', { hasText: new RegExp('^' + esc(topicName(id))) }) }).click();
  }
  for (const d of ['facil', 'medio', 'dificil'] as const) {
    const chip = page.getByRole('button', { name: DIFF_TXT[d], exact: true });
    const want = !o.diffs || o.diffs.includes(d);
    if (((await chip.getAttribute('aria-pressed')) === 'true') !== want) await chip.click();
  }
  await page.locator('label.depth', { hasText: SCOPE_TXT[o.scope ?? 'desafio'] }).click();
  await page.locator('label.mode').filter({ has: page.locator('b', { hasText: new RegExp(`^${o.mode ?? 'Aprender'}$`) }) }).click();
  await page.locator('label.seg-btn', { hasText: new RegExp(`^\\s*${o.size ?? 5}\\s*$`) }).click();
  return (await page.locator('.footer-action').innerText()).replace(/\s+/g, ' ');
}
async function startSession() {
  await page.locator('.footer-action button.primary').click();
  await page.locator('.qnum').waitFor({ timeout: 8000 });
  return (await S()).active;
}
async function cur() {
  const s = await S();
  const it = s.active.session.items[s.active.index];
  return { s, it, q: byId.get(it.questionId)! };
}
async function answer(correct: boolean) {
  const { it, q } = await cur();
  const k = correct ? it.order.indexOf(q.correctOptionId) : it.order.findIndex((id: string) => id !== q.correctOptionId);
  await page.locator('.choice').nth(k).click();
}
async function next() {
  const before = await page.locator('.qnum').innerText();
  await page.locator('.quizactions button.primary').click();
  await page.waitForFunction((b) => document.querySelector('.qnum')?.textContent !== b, before);
}
/** Responde a sessão Aprender inteira: `pattern[i]` = acertar a questão i. Termina na tela de resultados. */
async function runAprender(pattern: boolean[]) {
  for (let i = 0; i < pattern.length; i++) {
    await answer(pattern[i]);
    await page.locator('.feedback').waitFor();
    await page.locator('.quizactions button.primary').click();
    if (i < pattern.length - 1) await page.locator('.qnum', { hasText: `Questão ${i + 2} de` }).waitFor();
  }
  await page.locator('.result').waitFor();
}

async function main() {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  BASE = `http://127.0.0.1:${(server.address() as { port: number }).port}${PREFIX}`;
  console.log(`Layout: ${LAYOUT} · ${BASE}`);
  const profile = path.join(TMP, 'perfil');
  const ctxOpts = { executablePath: EXE, args: ['--no-sandbox', '--autoplay-policy=user-gesture-required'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR', colorScheme: 'dark' as const, acceptDownloads: true, serviceWorkers: 'allow' as const };
  let ctx: BrowserContext = await chromium.launchPersistentContext(profile, ctxOpts);
  const track = (c: BrowserContext) => {
    c.on('request', (r) => requests.push({ url: r.url(), method: r.method() }));
    void c.addInitScript({ content: 'window.__name = (f) => f;' }); // esbuild (tsx) envolve funções nomeadas em __name
    // registra os <audio> criados pelo app (o player não fica no DOM)
    void c.addInitScript(() => {
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
  };
  track(ctx);
  // página nova: os scripts de inicialização do contexto valem desde o primeiro carregamento
  const old = ctx.pages();
  page = await ctx.newPage(); // abre antes de fechar: fechar a última aba encerra o perfil persistente
  for (const p of old) await p.close();
  watch(page);

  // ================= 1. Acesso e navegação =================
  await section('1. Acesso e navegação', async () => {
    const r = await page.goto(BASE);
    await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
    ok('página inicial abre (HTTP 200) sem tela em branco', r?.status() === 200);
    const cards = await page.locator('.course').allInnerTexts();
    for (const d of tax.disciplines) {
      const card = cards.find((c) => c.includes(d.name)) ?? '';
      ok(`“${d.name}” aparece com o nome correto`, !!card);
      ok(`“${d.name}” mostra 300 questões aprovadas`, /300 questões aprovadas/.test(card), card.split('\n').find((l) => /aprovadas/.test(l)));
    }
    await page.getByRole('button', { name: /Começar a estudar/ }).click();
    ok('“Começar a estudar” abre a configuração', await page.getByRole('heading', { name: /Configure seu/ }).isVisible());
    await page.getByRole('button', { name: 'Meu progresso' }).click();
    ok('“Meu progresso” abre o progresso', await page.getByRole('heading', { name: /Seu progresso/ }).isVisible());
    await page.getByRole('button', { name: 'Acervo e fontes' }).click();
    ok('“Acervo e fontes” abre o acervo', await page.getByRole('heading', { name: /Fontes que/ }).isVisible());
    await page.getByRole('button', { name: /Study Mastery — início/ }).click();
    ok('a marca volta à página inicial', await page.getByRole('heading', { name: /Aprenda mais/ }).isVisible());
    await goHash('#/setup?d=calculo2');
    await page.getByRole('heading', { name: /Configure seu/ }).waitFor();
    const fsShort = tax.disciplines.find((d) => d.id === 'fullstack')!.short;
    await page.getByRole('button', { name: fsShort, exact: true }).click();
    const firstTopic = await page.locator('.topic-name').first().innerText();
    ok('alterna de disciplina na configuração', (await page.getByRole('button', { name: fsShort, exact: true }).getAttribute('aria-pressed')) === 'true' && firstTopic.includes(tax.disciplines[1].topics[0].name), firstTopic);
    for (const h of ['#/setup?d=fullstack', '#/progress', '#/library', '#/results', '#/quiz', '#/']) {
      const resp = await page.goto(BASE + h);
      await page.waitForTimeout(250);
      const txt = (await page.locator('main').innerText()).trim();
      ok(`recarregar ${h} não dá 404 nem tela em branco`, (resp?.status() ?? 200) === 200 && txt.length > 20, `${resp?.status() ?? 'cache'} · ${txt.split('\n')[0].slice(0, 50)}`);
    }
  });

  // ================= 2. Filtros =================
  await section('2. Filtros e configuração', async () => {
    const check = async (label: string, o: SetupOpts, pred: (q: PublishedQuestion) => boolean, expectN?: number) => {
      await setup(o);
      const a = await startSession();
      const ids: string[] = a.session.items.map((i: { questionId: string }) => i.questionId);
      const bad = ids.filter((id) => !pred(byId.get(id)!));
      ok(label, bad.length === 0 && new Set(ids).size === ids.length && (expectN === undefined || ids.length === expectN), `${ids.length} questões, ${bad.length} fora do filtro, ${ids.length - new Set(ids).size} repetidas`);
      return ids;
    };
    await check('um assunto (L’Hôpital, 20): só questões dele', { d: 'calculo2', topics: ['lhopital'], size: 20 }, (q) => q.topicId === 'lhopital', 20);
    const two = await check('vários assuntos (primitivas + substituição, 20): só os marcados', { d: 'calculo2', topics: ['primitivas', 'substituicao'], size: 20 }, (q) => ['primitivas', 'substituicao'].includes(q.topicId), 20);
    ok('…e mistura os dois marcados', new Set(two.map((id) => byId.get(id)!.topicId)).size === 2);
    await check('Full Stack, um assunto (React Router): só ele', { d: 'fullstack', topics: ['react-router'], size: 10 }, (q) => q.topicId === 'react-router', 10);

    await setup({ d: 'calculo2', topics: 'exam' });
    const marked = (await page.locator('label.topic.on .topic-name').allInnerTexts()).map((t) => t.replace(/prova 26\/10/i, '').trim()).sort();
    ok('“Foco da prova” marca exatamente os 4 assuntos da prova', JSON.stringify(marked) === JSON.stringify(EXAM.map(topicName).sort()), marked.join(' · '));
    await home();
    await page.getByRole('button', { name: /Foco da prova de 26\/10/ }).click();
    await page.getByRole('heading', { name: /Configure seu/ }).waitFor();
    const fromHome = (await page.locator('label.topic.on .topic-name').allInnerTexts()).map((t) => t.replace(/prova 26\/10/i, '').trim()).sort();
    ok('o atalho da página inicial abre com os mesmos 4 assuntos', JSON.stringify(fromHome) === JSON.stringify(marked));
    await check('prova (20 questões): só os 4 assuntos', { d: 'calculo2', topics: 'exam', size: 20 }, (q) => EXAM.includes(q.topicId), 20);

    for (const d of ['facil', 'medio', 'dificil'] as const) await check(`só ${DIFF_TXT[d]}: respeita a dificuldade`, { d: 'calculo2', topics: 'exam', diffs: [d], size: 20 }, (q) => q.difficulty === d && EXAM.includes(q.topicId), 20);
    await check('profundidade “Só aulas”: nenhuma de aprofundamento/desafio e só os assuntos marcados', { d: 'calculo2', topics: 'exam', scope: 'aula', size: 20 }, (q) => q.scope === 'aula' && EXAM.includes(q.topicId), 20);
    await check('profundidade “Aulas + aprofundamento”: nenhum desafio e só os assuntos marcados', { d: 'calculo2', topics: 'exam', scope: 'aprofundamento', size: 20 }, (q) => q.scope !== 'desafio' && EXAM.includes(q.topicId), 20);
    await check('profundidade “Também desafios”: não acrescenta outros assuntos', { d: 'calculo2', topics: ['lhopital'], scope: 'desafio', size: 20 }, (q) => q.topicId === 'lhopital', 20);
    for (const n of [5, 10, 20] as const) await check(`sessão de ${n}`, { d: 'fullstack', size: n }, () => true, n);

    await setup({ d: 'calculo2', topics: 'exam', diffs: [] });
    const btn = page.locator('.footer-action button.primary');
    ok('sem questões elegíveis o botão fica desabilitado, com aviso', (await btn.isDisabled()) && /Selecione ao menos/.test(await page.locator('.footer-action').innerText()));
    await setup({ d: 'calculo2', topics: [], diffs: ['facil', 'medio', 'dificil'] });
    ok('sem nenhum assunto marcado também não inicia', await btn.isDisabled());

    const foot = await setup({ d: 'calculo2', topics: ['derivadas'], scope: 'desafio', size: 20 });
    ok('teste especial — “Regras de derivação” pedindo 20: avisa que só há 17', /Só há 17/.test(foot) && /Iniciar com 17/.test(foot), foot.slice(0, 120));
    const a = await startSession();
    const ids: string[] = a.session.items.map((i: { questionId: string }) => i.questionId);
    ok('…e a sessão tem 17, todas de Regras de derivação, sem completar com outros assuntos', ids.length === 17 && ids.every((id) => byId.get(id)!.topicId === 'derivadas') && new Set(ids).size === 17);
  });

  // ================= 3. Modos =================
  await section('3. Modos de estudo', async () => {
    // Aprender
    await setup({ d: 'calculo2', topics: 'exam', mode: 'Aprender', size: 5 });
    await startSession();
    ok('Aprender: “Próxima” só libera depois de responder', await page.locator('.quizactions button.primary').isDisabled());
    await answer(false);
    await page.locator('.feedback').waitFor();
    ok('Aprender: mostra na hora quando a resposta está errada', /Ainda não/.test(await page.locator('.feedback').innerText()));
    ok('Aprender: explica por que a escolhida está errada', await page.locator('.why-wrong').isVisible());
    ok('Aprender: explica por que a correta está certa', await page.locator('.why-right').isVisible());
    const chosen = (await cur()).s.active.answers;
    await page.locator('.choice').first().click({ force: true }).catch(() => undefined);
    ok('Aprender: resposta travada após a correção', JSON.stringify((await S()).active.answers) === JSON.stringify(chosen));
    ok('Aprender: permite avançar após a correção', await page.locator('.quizactions button.primary').isEnabled());
    await next();
    await answer(true);
    await page.locator('.feedback').waitFor();
    ok('Aprender: mostra na hora quando a resposta está certa', /Correto/.test(await page.locator('.feedback').innerText()));

    // Simulado
    await setup({ d: 'calculo2', topics: 'exam', mode: 'Simulado', size: 5 });
    await startSession();
    await answer(false);
    await page.waitForTimeout(150);
    ok('Simulado: não revela gabarito nem explicação antes do fim', (await page.locator('.feedback').count()) === 0 && (await page.locator('.explain').count()) === 0 && (await page.locator('.choice.correct, .choice.incorrect').count()) === 0);
    ok('Simulado: avisa que o gabarito vem no final', /gabarito e as explicações aparecem ao final/.test(await page.locator('main').innerText()));
    const before = (await cur()).s.active.answers;
    await answer(true);
    await page.waitForTimeout(100);
    ok('Simulado: permite trocar a resposta', JSON.stringify((await S()).active.answers) !== JSON.stringify(before));
    await page.getByRole('button', { name: /^Questão 3,/ }).click();
    await page.waitForTimeout(150);
    ok('Simulado: mapa de questões navega', /Questão 3 de 5/i.test(await page.locator('.qnum').innerText()), await page.locator('.qnum').innerText());
    await page.getByRole('button', { name: /Anterior/ }).click();
    await page.waitForTimeout(150);
    ok('Simulado: permite voltar', /Questão 2 de 5/i.test(await page.locator('.qnum').innerText()), await page.locator('.qnum').innerText());
    await page.getByRole('button', { name: /^Questão 5,/ }).click();
    await page.getByRole('button', { name: /Finalizar simulado/ }).click();
    ok('Simulado: pede confirmação com questões em branco', /sem resposta/.test(await page.locator('.confirm').innerText()));
    await page.locator('.confirm').getByRole('button', { name: 'Finalizar' }).click();
    await page.locator('.result').waitFor();
    const badges = await page.locator('.rv-badge').allInnerTexts();
    ok('Simulado: finaliza com 4 em branco, marcadas como “em branco”', badges.filter((b) => /em branco/i.test(b)).length === 4, badges.join(','));
    ok('Simulado: correção completa aparece no resultado', (await page.locator('.review-item .explain').count()) === 5);

    // Revisão — histórico controlado: 3 erros, 3 vencidas, 2 em dia, resto nunca visto
    const deriv = bank.filter((q) => q.topicId === 'derivadas').map((q) => q.id).sort();
    const [errs, due, ok2] = [deriv.slice(0, 3), deriv.slice(3, 6), deriv.slice(6, 8)];
    await page.evaluate(
      ({ k, errs, due, ok2 }) => {
        const s = JSON.parse(localStorage.getItem(k)!);
        const day = 864e5;
        const t = (d: number) => new Date(Date.now() + d * day).toISOString();
        for (const id of errs) s.stats[id] = { seen: 1, correct: 0, lastSeen: t(-2), lastCorrect: false, box: 0, due: t(-2) };
        for (const id of due) s.stats[id] = { seen: 1, correct: 1, lastSeen: t(-10), lastCorrect: true, box: 1, due: t(-9) };
        for (const id of ok2) s.stats[id] = { seen: 1, correct: 1, lastSeen: t(-1), lastCorrect: true, box: 3, due: t(6) };
        s.active = undefined;
        localStorage.setItem(k, JSON.stringify(s));
      },
      { k: KEY, errs, due, ok2 },
    );
    await page.reload();
    const hintFoot = await setup({ d: 'calculo2', topics: ['derivadas'], mode: 'Revisão', size: 10 });
    const hint = await page.locator('.hint').first().innerText();
    ok('Revisão: a configuração mostra 3 erros e 3 vencidas', /3 para refazer/.test(hint) && /3 vencidas/.test(hint), hint.slice(0, 90));
    void hintFoot;
    const ra = await startSession();
    const rids: string[] = ra.session.items.map((i: { questionId: string }) => i.questionId);
    ok('Revisão: os erros vêm primeiro', rids.slice(0, 3).every((id) => errs.includes(id)), rids.slice(0, 3).join(','));
    ok('Revisão: depois as vencidas na repetição espaçada', rids.slice(3, 6).every((id) => due.includes(id)));
    ok('Revisão: completa com não vistas dos mesmos assuntos', rids.slice(6).every((id) => !errs.includes(id) && !due.includes(id) && !ok2.includes(id) && byId.get(id)!.topicId === 'derivadas'), JSON.stringify(ra.session.composition));

    // Misto
    await setup({ d: 'calculo2', topics: 'all', mode: 'Misto', size: 20 });
    const ma = await startSession();
    const mq = ma.session.items.map((i: { questionId: string }) => byId.get(i.questionId)!);
    ok('Misto: intercala assuntos e dificuldades', new Set(mq.map((q: PublishedQuestion) => q.topicId)).size >= 5 && new Set(mq.map((q: PublishedQuestion) => q.difficulty)).size === 3, `${new Set(mq.map((q: PublishedQuestion) => q.topicId)).size} assuntos, ${new Set(mq.map((q: PublishedQuestion) => q.difficulty)).size} dificuldades`);
    await setup({ d: 'calculo2', topics: 'exam', diffs: ['medio', 'dificil'], mode: 'Misto', size: 20 });
    const mb = await startSession();
    ok('Misto: mantém os filtros configurados', mb.session.items.every((i: { questionId: string }) => EXAM.includes(byId.get(i.questionId)!.topicId) && byId.get(i.questionId)!.difficulty !== 'facil'));
    await answer(true);
    await page.locator('.feedback').waitFor();
    ok('Misto: corrige a resposta normalmente', /Correto/.test(await page.locator('.feedback').innerText()));
  });

  // ================= 4. Gabarito, explicações e matemática =================
  await section('4. Gabarito, explicações e matemática', async () => {
    await setup({ d: 'calculo2', topics: 'exam', mode: 'Aprender', size: 10 });
    const a = await startSession();
    let rightOk = 0;
    let fourOpts = 0;
    let katex = 0;
    let katexErr = 0;
    let shuffled = 0;
    for (let i = 0; i < 10; i++) {
      const { it, q } = await cur();
      if (JSON.stringify(it.order) !== JSON.stringify(q.options.map((o) => o.id))) shuffled++;
      if ((await page.locator('.choice').count()) === 4) fourOpts++;
      katex += await page.locator('.quizcard .katex').count();
      katexErr += await page.locator('.katex-error').count();
      await answer(true);
      await page.locator('.feedback').waitFor();
      if (/Correto/.test(await page.locator('.feedback').innerText())) rightOk++;
      await page.locator('.quizactions button.primary').click();
      if (i < 9) await page.locator('.qnum', { hasText: `Questão ${i + 2} de` }).waitFor();
    }
    await page.locator('.result').waitFor();
    void a;
    ok('as 10 questões têm 4 alternativas', fourOpts === 10);
    ok('embaralhamento não altera o gabarito (a correta, onde quer que esteja, dá “Correto!”)', rightOk === 10, `${rightOk}/10 · ${shuffled} com ordem embaralhada`);
    ok('fórmulas aparecem formatadas pelo KaTeX, sem erro de renderização', katex > 0 && katexErr === 0, `${katex} fórmulas, ${katexErr} erros`);

    // questões específicas: código com indentação e passo a passo
    const withCode = bank.find((q) => q.disciplineId === 'fullstack' && /```[a-z]*\n[^\n]*\n {2}\S/.test(q.stem))!;
    const withSteps = bank.find((q) => q.disciplineId === 'calculo2' && (q.explanation.steps?.length ?? 0) >= 3 && q.topicId === 'substituicao')!;
    const pick = [withCode, withSteps];
    await page.evaluate(
      ({ k, items }) => {
        const s = JSON.parse(localStorage.getItem(k)!);
        s.active = { session: { id: 'homolog', seed: 1, config: { disciplineId: 'fullstack', topicIds: [], scope: 'desafio', difficulties: ['facil', 'medio', 'dificil'], mode: 'aprender', size: items.length }, requested: items.length, items, composition: { errors: 0, due: 0, fresh: items.length, other: 0 }, createdAt: new Date().toISOString() }, answers: {}, index: 0, startedAt: new Date().toISOString() };
        localStorage.setItem(k, JSON.stringify(s));
      },
      { k: KEY, items: pick.map((q) => ({ questionId: q.id, order: q.options.map((o) => o.id) })) },
    );
    await page.goto(BASE + '#/quiz');
    await page.reload();
    await page.locator('.qnum').waitFor();
    const srcBlock = /```[a-z]*\n([\s\S]*?)\n?```/.exec(withCode.stem)![1].replace(/\n$/, '');
    const shown = await page.locator('.stem .code-block code').first().textContent();
    ok('código mantém a indentação exata', shown === srcBlock, withCode.id);
    await answer(true);
    await page.locator('.feedback').waitFor();
    await next();
    await answer(true);
    await page.locator('.feedback').waitFor();
    const steps = await page.locator('.explain .steps li').count();
    ok('explicação mostra o passo a passo completo', steps === withSteps.explanation.steps!.length, `${withSteps.id}: ${steps} passos`);
    ok('cada questão traz fonte/referência', (await page.locator('.explain .sources li').count()) >= 1);
    manual('as 600 questões: 4 alternativas distintas, explicação de cada errada, fonte existente, LaTeX pareado', 'coberto por `bank-integrity.test.ts` (600 questões) e `e2e:render` (600 × 2 larguras, sem erro de KaTeX)');
    manual('a alternativa marcada como correta realmente resolve o problema', '600/600 reexecutadas por SymPy/mpmath, Node, MariaDB e Chromium (`validate --recheck-approved`); amostra revisada à mão no relatório');
  });

  // ================= 5. Resultados =================
  await section('5. Resultados e desempenho', async () => {
    await setup({ d: 'calculo2', topics: 'exam', mode: 'Aprender', size: 10 });
    const a = await startSession();
    const pattern = [true, true, true, true, true, true, true, true, false, false];
    await runAprender(pattern);
    const score = (await page.locator('.score').innerText()).replace(/\s+/g, ' ');
    ok('pontuação e porcentagem corretas (8 de 10 = 80%)', /8 \/ 10 acertos · 80%/.test(score), score);
    const rows = await page.locator('.result ~ .panel .bar-row .bar-val').allInnerTexts();
    const sum = (vals: string[]) => vals.reduce((s, v) => s + Number(v.split('/')[1]), 0);
    const topicRows = await page.locator('.panel').first().locator('.bar-row').count();
    ok('mostra desempenho por assunto', topicRows >= 1);
    ok('mostra desempenho por dificuldade (soma = 10 em cada quadro)', sum(rows) === 20, rows.join(' '));
    const wrong = await page.locator('.review-item.no').count();
    const wrongTxt = await page.locator('.review-item.no').first().innerText();
    ok('revisão individual mostra a resposta dada e a correta', wrong === 2 && wrongTxt.includes('Sua resposta') && wrongTxt.includes('Correta'), `${wrong} erradas abertas`);
    const wrongIds = a.session.items.slice(8).map((i: { questionId: string }) => i.questionId).sort();
    await page.getByRole('button', { name: /Refazer os 2 erros/ }).click();
    await page.locator('.qnum').waitFor();
    const redo = (await S()).active;
    ok('“Refazer os erros” traz exatamente as 2 erradas daquela tentativa', JSON.stringify(redo.session.items.map((i: { questionId: string }) => i.questionId).sort()) === JSON.stringify(wrongIds) && redo.session.config.mode === 'revisao');
    await runAprender([true, true]);
    await goHash('#/progress');
    await page.getByRole('heading', { name: /Seu progresso/ }).waitFor();
    const link = page.locator('.hist li', { hasText: '8/10' }).first().locator('a');
    const href = await link.getAttribute('href');
    await link.click();
    await page.locator('.result').waitFor();
    ok('resultado antigo reabre pelo histórico com a pontuação daquela tentativa', /8 \/ 10 acertos/.test(await page.locator('.score').innerText()) && /#\/results\?id=/.test(href ?? ''), href);
  });

  // ================= 6. Progresso e armazenamento =================
  await section('6. Progresso e armazenamento', async () => {
    const st0 = await S();
    const calcN = st0.attempts.filter((x: { disciplineId: string }) => x.disciplineId === 'calculo2').length;
    await setup({ d: 'fullstack', mode: 'Aprender', size: 5 });
    await startSession();
    await runAprender([true, false, true, true, false]);
    await goHash('#/progress');
    await page.getByRole('heading', { name: /Seu progresso/ }).waitFor();
    const calcBtn = page.getByRole('button', { name: tax.disciplines[0].short, exact: true });
    const fsBtn = page.getByRole('button', { name: tax.disciplines[1].short, exact: true });
    await calcBtn.click();
    const calcSess = (await page.locator('.metrics > div').first().innerText()).match(/\d+/)?.[0];
    ok('histórico registra as sessões concluídas (Cálculo II)', Number(calcSess) === calcN, `${calcSess} sessões`);
    await fsBtn.click();
    const fsSess = (await page.locator('.metrics > div').first().innerText()).match(/\d+/)?.[0];
    ok('estatísticas de Full Stack separadas das de Cálculo II', Number(fsSess) === 1, `Full Stack: ${fsSess} · Cálculo II: ${calcSess}`);
    await calcBtn.click();
    const st = await S();
    const distinct = Object.keys(st.stats).filter((id) => byId.get(id)?.topicId === 'lhopital').length;
    const row = await page.locator('.bar-row', { hasText: "Regra de L'Hôpital" }).innerText();
    ok('desempenho por assunto atualizado', row.includes(`${distinct}/45 questões praticadas`), row.replace(/\s+/g, ' '));

    // sair e voltar / recarregar
    await setup({ d: 'calculo2', topics: 'exam', mode: 'Aprender', size: 5 });
    await startSession();
    await answer(true);
    await page.locator('.feedback').waitFor();
    await next();
    await answer(false);
    await page.locator('.feedback').waitFor();
    const sid = (await S()).active.session.id;
    await page.getByRole('button', { name: /Sair \(sessão fica salva\)/ }).click();
    const resume = await page.locator('.resume').innerText();
    ok('sair da sessão e voltar: a página inicial oferece continuar (2 de 5)', /2 de 5 respondidas/.test(resume), resume.replace(/\s+/g, ' '));
    await page.locator('.resume').click();
    await page.locator('.qnum').waitFor();
    ok('…e continua na mesma questão', /Questão 2 de 5/i.test(await page.locator('.qnum').innerText()), await page.locator('.qnum').innerText());
    await page.reload();
    await page.locator('.qnum').waitFor();
    const rs = await S();
    ok('recarregar preserva a sessão em andamento e as respostas', /Questão 2 de 5/i.test(await page.locator('.qnum').innerText()) && rs.active.session.id === sid && Object.keys(rs.active.answers).length === 2, `${await page.locator('.qnum').innerText()} · ${Object.keys(rs.active.answers).length} respostas · mesma sessão: ${rs.active.session.id === sid}`);

    // substituir sessão
    const answersBefore = JSON.stringify((await S()).active.answers);
    dialogPolicy = 'dismiss';
    const nDialogs = dialogs.length;
    await setup({ d: 'fullstack', size: 5 });
    await page.locator('.footer-action button.primary').click();
    await page.waitForTimeout(300);
    ok('iniciar outra sessão com uma ativa pede confirmação', dialogs.length === nDialogs + 1, dialogs.at(-1));
    const kept = (await S()).active;
    ok('cancelar preserva a sessão e as respostas', kept.session.id === sid && JSON.stringify(kept.answers) === answersBefore);
    dialogPolicy = 'accept';
    await page.locator('.footer-action button.primary').click();
    await page.locator('.qnum').waitFor();
    ok('confirmar substitui pela nova sessão', (await S()).active.session.id !== sid);

    // exportar / importar / apagar
    await goHash('#/progress');
    await page.getByRole('heading', { name: /Seu progresso/ }).waitFor();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar histórico' }).click()]);
    const exp = path.join(TMP, 'export.json');
    await dl.saveAs(exp);
    const file = JSON.parse(fs.readFileSync(exp, 'utf8'));
    const nA = (await S()).attempts.length;
    ok('exportar gera JSON do Study Mastery com todas as sessões', file.app === 'study-mastery' && file.state.attempts.length === nA, `${dl.suggestedFilename()} · ${file.state.attempts.length} sessões`);
    const importar = async (btn: string, f: string) => {
      const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: btn }).click()]);
      await fc.setFiles(f);
      await page.waitForTimeout(250);
      return page.locator('p[role=status]').innerText();
    };
    const m1 = await importar('Importar e mesclar', exp);
    ok('importar e mesclar o mesmo arquivo não duplica', (await S()).attempts.length === nA && /0 sessão/.test(m1), m1);
    const m2 = await importar('Importar e mesclar', BAD_JSON);
    ok('arquivo inválido é recusado sem danificar os dados', (await S()).attempts.length === nA && /não é um JSON válido|não reconhecido/.test(m2), m2);
    await page.getByRole('button', { name: 'Apagar meus dados' }).click();
    ok('“Apagar meus dados” pede confirmação', await page.locator('.confirm[role=alertdialog]').isVisible());
    await page.locator('.confirm').getByRole('button', { name: 'Cancelar' }).click();
    ok('cancelar não apaga', (await S()).attempts.length === nA);
    await page.getByRole('button', { name: 'Apagar meus dados' }).click();
    await page.getByRole('button', { name: 'Apagar tudo' }).click();
    await page.waitForTimeout(150);
    ok('apagar remove histórico e estatísticas', (await S()).attempts.length === 0 && Object.keys((await S()).stats).length === 0);
    const m3 = await importar('Importar e mesclar', exp);
    ok('importar e mesclar acrescenta as sessões do arquivo', (await S()).attempts.length === nA, m3);
    await setup({ d: 'fullstack', size: 5 });
    await startSession();
    await runAprender([true, true, true, true, true]);
    const m4 = await (async () => {
      await goHash('#/progress');
      await page.getByRole('heading', { name: /Seu progresso/ }).waitFor();
      return importar('Importar e substituir', exp);
    })();
    ok('importar e substituir restaura exatamente o histórico do arquivo', (await S()).attempts.length === nA, m4);
  });

  // ================= 7. Study Radio =================
  await section('7. Study Radio', async () => {
    await home();
    const radioBtn = page.getByRole('button', { name: /^Study Radio/ });
    await radioBtn.click();
    const panel = page.locator('section.radio-panel');
    ok('o painel da rádio abre', await panel.isVisible());
    await page.waitForTimeout(400);
    ok('sem MP3: informa que não há música e o Play fica desabilitado', /Sem música ainda/.test(await panel.innerText()) && (await panel.getByRole('button', { name: /Tocar música/ }).isDisabled()));
    const escolher = async (f: string) => {
      const [fc] = await Promise.all([page.waitForEvent('filechooser'), panel.getByRole('button', { name: /^(Escolher|Trocar) MP3 do aparelho$/ }).click()]);
      await fc.setFiles(f);
      await page.waitForTimeout(300);
      return panel.innerText();
    };
    ok('arquivo que não é MP3 é recusado com mensagem clara', /Escolha um arquivo MP3/.test(await escolher(TXT)));
    ok('MP3 acima de 60 MB é recusado com mensagem clara', /grande demais/.test(await escolher(BIG)));
    const t = await escolher(MP3);
    ok('é possível escolher um MP3 do aparelho', /salvo neste aparelho/.test(t) && t.includes('silencio-teste.mp3'));
    await panel.getByRole('button', { name: 'Tocar música' }).click();
    await panel.getByText('Tocando em loop').waitFor({ timeout: 8000 });
    const au = () => page.evaluate(() => { const w = window as unknown as { __audios: HTMLMediaElement[]; __ev: Record<string, number> }; const a = w.__audios[0]; return { n: w.__audios.length, paused: a?.paused, loop: a?.loop, t: a?.currentTime, vol: a?.volume, dur: a?.duration, ev: { ...w.__ev } }; });
    const a1 = await au();
    ok('Play inicia a reprodução', a1.n === 1 && a1.paused === false, JSON.stringify(a1));
    ok('o botão do cabeçalho indica que está tocando', (await radioBtn.getAttribute('aria-label')) === 'Study Radio (tocando)');
    await panel.locator('input[type=range]').evaluate((el: HTMLInputElement) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, '30');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    ok('ajustar o volume funciona', Math.abs((await au()).vol! - 0.3) < 0.01, (await au()).vol);
    await panel.getByRole('button', { name: 'Pausar música' }).click();
    await page.waitForTimeout(200);
    ok('pausar funciona', (await au()).paused === true && /Pausada/.test(await panel.innerText()));
    await panel.getByRole('button', { name: 'Tocar música' }).click();
    await panel.getByText('Tocando em loop').waitFor();
    ok('retomar funciona', (await au()).paused === false);
    await page.keyboard.press('Escape');
    const loads = (await au()).ev.loadstart;
    await setup({ d: 'calculo2', topics: 'exam', size: 5 });
    await startSession();
    await answer(true);
    await page.locator('.feedback').waitFor();
    await next();
    await goHash('#/progress');
    await page.waitForTimeout(2500); // mais que a duração do arquivo (~2 s): o loop precisa recomeçar
    const a2 = await au();
    ok('a música continua ao trocar de questão e de tela, sem reiniciar o carregamento', a2.n === 1 && a2.paused === false && a2.ev.loadstart === loads, JSON.stringify({ paused: a2.paused, loadstart: a2.ev.loadstart }));
    ok('a música recomeça sozinha ao chegar ao fim (loop)', a2.loop === true && a2.ev.ended === 0 && a2.paused === false, `duração ${a2.dur?.toFixed(2)} s · ended=${a2.ev.ended}`);
    await page.reload();
    await page.getByRole('button', { name: /^Study Radio/ }).click();
    await page.waitForTimeout(400);
    ok('o MP3 escolhido continua disponível depois de fechar e reabrir', (await page.locator('section.radio-panel').innerText()).includes('silencio-teste.mp3'));
    await page.keyboard.press('Escape');
    ok('requisições da rádio: o arquivo não é enviado a servidor', !requests.some((r) => r.method !== 'GET' && r.method !== 'HEAD'), requests.filter((r) => r.method !== 'GET' && r.method !== 'HEAD').map((r) => r.method + ' ' + r.url).join(', ') || 'só GET/HEAD');
  });

  // ================= 8. Offline e instalação =================
  await section('8. Offline e instalação', async () => {
    await page.goto(BASE);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    const cdp = await ctx.newCDPSession(page);
    const inst = (await cdp.send('Page.getInstallabilityErrors')) as { installabilityErrors: { errorId: string }[] };
    ok('o navegador considera o app instalável (manifest + service worker)', inst.installabilityErrors.length === 0, inst.installabilityErrors.map((e) => e.errorId).join(', ') || 'sem erros de instalabilidade');
    const man = await page.evaluate(async () => (await fetch('./manifest.webmanifest')).json());
    const icons = await page.evaluate(async (list: { src: string; sizes: string; type?: string }[]) => Promise.all(list.map(async (i) => { const r = await fetch(i.src); if (!r.ok) return `${i.src}:HTTP${r.status}=${i.sizes}`; if (/svg/.test(i.type ?? i.src)) return `${i.src}:svg=${i.sizes}`; const bmp = await createImageBitmap(await r.blob()); return `${i.src}:${bmp.width}x${bmp.height}=${i.sizes}`; })), man.icons);
    ok('nome e ícones corretos no manifest', man.name === 'Study Mastery' && !icons.some((s: string) => /HTTP/.test(s)) && icons.filter((s: string) => /png/.test(s)).every((s: string) => { const [, wh, decl] = /:(\d+x\d+)=(.*)$/.exec(s)!; return decl === 'any' || decl === wh; }) && man.icons.some((i: { purpose?: string }) => /maskable/.test(i.purpose ?? '')), icons.join(' · '));
    manual('instalar e abrir pelo ícone em um celular real', 'depende do aparelho; o Chromium aceitou os critérios de instalação');

    // fecha TUDO e reabre sem rede (perfil persistente)
    const nAttempts = (await S()).attempts.length;
    await ctx.close();
    ctx = await chromium.launchPersistentContext(profile, { ...ctxOpts, offline: true });
    track(ctx);
    page = ctx.pages()[0] ?? (await ctx.newPage());
    watch(page);
    await page.goto(BASE);
    await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor({ timeout: 15000 });
    ok('navegador fechado e reaberto sem internet: a página inicial abre', true);
    await setup({ d: 'calculo2', topics: 'exam', size: 5 });
    await startSession();
    const katex = await page.locator('.quizcard .katex').count();
    await runAprender([true, false, true, true, true]);
    ok('Cálculo II funciona offline (questões, fórmulas, explicações)', (await page.locator('.review-item .explain').count()) === 5, `${katex} fórmulas na 1ª questão`);
    await setup({ d: 'fullstack', size: 5 });
    await startSession();
    await runAprender([true, true, false, true, true]);
    ok('Full Stack funciona offline', (await page.locator('.review-item').count()) === 5);
    ok('sessões e progresso são salvos sem internet', (await S()).attempts.length === nAttempts + 2);
    await page.getByRole('button', { name: /^Study Radio/ }).click();
    await page.locator('section.radio-panel').getByRole('button', { name: 'Tocar música' }).click();
    await page.locator('section.radio-panel').getByText('Tocando em loop').waitFor({ timeout: 8000 });
    ok('a música do aparelho toca offline', true);
    await page.locator('section.radio-panel').getByRole('button', { name: 'Pausar música' }).click();
    await page.locator('section.radio-panel').getByRole('button', { name: /Remover/ }).click();
    await page.waitForTimeout(300);
    const idb = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('study-mastery-radio'); r.onsuccess = () => { const g = r.result.transaction('faixas').objectStore('faixas').get('aparelho'); g.onsuccess = () => res(g.result === undefined); }; r.onerror = () => res(true); }));
    ok('remover a música apaga o arquivo guardado pelo app', idb === true && /removida/.test(await page.locator('section.radio-panel').innerText()));
    await page.keyboard.press('Escape');
    await ctx.setOffline(false);
    await page.goto(BASE + '#/');
    await page.reload();
    await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
    ok('volta a funcionar normalmente com a conexão restabelecida', (await S()).attempts.length === nAttempts + 2);
  });

  // ================= 9. Visual e acessibilidade =================
  await section('9. Visual e acessibilidade', async () => {
    const axeSrc = fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
    const screens: [string, () => Promise<void>][] = [
      ['início', async () => { await page.goto(BASE + '#/'); await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor(); }],
      ['configuração', async () => { await page.goto(BASE + '#/setup?d=calculo2'); await page.getByRole('heading', { name: /Configure seu/ }).waitFor(); }],
      ['questão com explicação', async () => {
        await page.goto(BASE + '#/');
        await page.evaluate(({ k, q }) => { const s = JSON.parse(localStorage.getItem(k) ?? 'null') ?? { version: 1, attempts: [], stats: {}, settings: { theme: 'auto' } }; s.active = { session: { id: 'v', seed: 1, config: { disciplineId: 'calculo2', topicIds: [], scope: 'desafio', difficulties: ['facil', 'medio', 'dificil'], mode: 'aprender', size: 1 }, requested: 1, items: [{ questionId: q.id, order: q.options.map((o: { id: string }) => o.id) }], composition: { errors: 0, due: 0, fresh: 1, other: 0 }, createdAt: '' }, answers: { [q.id]: (q.options.find((o: { id: string }) => o.id !== q.correctOptionId) as { id: string }).id }, index: 0, startedAt: '' }; localStorage.setItem(k, JSON.stringify(s)); }, { k: KEY, q: byId.get('c2-lhopital-041')! });
        await page.goto(BASE + '#/quiz');
        await page.reload();
        await page.locator('.explain').waitFor();
      }],
      ['resultados', async () => { await page.goto(BASE + '#/results'); await page.waitForTimeout(300); await page.locator('.review-item details').evaluateAll((ds) => ds.forEach((d) => ((d as HTMLDetailsElement).open = true))); }],
      ['progresso', async () => { await page.goto(BASE + '#/progress'); await page.getByRole('heading', { name: /Seu progresso/ }).waitFor(); }],
      ['acervo', async () => { await page.goto(BASE + '#/library'); await page.getByRole('heading', { name: /Fontes que/ }).waitFor(); }],
      ['painel da rádio', async () => { await page.goto(BASE + '#/'); await page.getByRole('button', { name: /^Study Radio/ }).click(); await page.locator('section.radio-panel').waitFor(); }],
    ];
    const viewports: [string, number, number][] = [['320×640', 320, 640], ['360×780', 360, 780], ['390×844', 390, 844], ['412×915', 412, 915], ['paisagem 844×390', 844, 390], ['zoom 150% (260 px)', 260, 560]];
    for (const [vname, w, h] of viewports) {
      await page.setViewportSize({ width: w, height: h });
      const bad: string[] = [];
      for (const [sname, open] of screens) {
        await open();
        // além da rolagem, detecta quando o navegador do celular precisa ENCOLHER a página para caber (layout mais largo que a tela)
        const fit = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth <= innerWidth + 1, layout: innerWidth }));
        if (!fit.scroll || fit.layout > w + 1) bad.push(`${sname}${fit.layout > w + 1 ? ` (precisa de ${fit.layout} px)` : ''}`);
        await page.keyboard.press('Escape');
      }
      if (vname.startsWith('zoom')) manual(`telas em ${vname} (texto ampliado)`, bad.length ? `rolagem horizontal em: ${bad.join(', ')} (abaixo da largura mínima de 320 px exigida pela WCAG)` : 'sem rolagem horizontal');
      else ok(`sem rolagem horizontal em ${vname} (7 telas)`, bad.length === 0, bad.join(', ') || undefined);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    // aba nova: depois de passar por 260 px, a emulação de celular do Playwright mantém um deslocamento no cálculo de clique
    // (o DOM está correto; um celular real não muda de largura assim)
    const oldTab = page;
    page = await ctx.newPage();
    watch(page);
    await oldTab.close();
    await page.goto(BASE + '#/');

    // alvos de toque e texto cortado
    const small: string[] = [];
    const tiny: string[] = [];
    const clipped: string[] = [];
    for (const [sname, open] of screens) {
      await open();
      const r = await page.evaluate(() => {
        const vis = (e: Element) => { const b = e.getBoundingClientRect(); const st = getComputedStyle(e); return b.width > 0 && b.height > 0 && st.visibility !== 'hidden' && !e.closest('.sr-only'); };
        const targets = [...document.querySelectorAll('main button, header button, main a[href], label.topic, label.depth, label.mode, label.seg-btn, summary, input[type=range]')].filter(vis).filter((e) => !(e.tagName === 'A' && e.closest('p, li span')));
        const dims = targets.map((e) => { const b = e.getBoundingClientRect(); return { n: (e.getAttribute('aria-label') ?? (e as HTMLElement).innerText ?? e.tagName).trim().slice(0, 30), w: Math.round(b.width), h: Math.round(b.height) }; });
        const cut = [...document.querySelectorAll('main *')].filter((e) => { const st = getComputedStyle(e); return /hidden|clip/.test(st.overflowX) && e.scrollWidth > e.clientWidth + 1 && !e.closest('.katex, .rv-stem, .code-block, .math-display, .meter, .progress, .sr-only') && !e.classList.contains('hero'); }).map((e) => `${e.tagName.toLowerCase()}.${(e.getAttribute('class') ?? '').split(' ')[0]}`);
        return { dims, cut };
      });
      for (const d of r.dims) {
        if (Math.min(d.w, d.h) < 24) tiny.push(`${sname}: ${d.n} ${d.w}×${d.h}`);
        else if (Math.min(d.w, d.h) < 40) small.push(`${sname}: ${d.n} ${d.w}×${d.h}`);
      }
      clipped.push(...r.cut.map((c) => `${sname}: ${c}`));
      await page.keyboard.press('Escape');
    }
    ok('alvos de toque com pelo menos 24 px (WCAG 2.5.8)', tiny.length === 0, tiny.slice(0, 6).join(' | ') || 'todos ≥ 24 px');
    manual('alvos entre 24 e 40 px (confortáveis, abaixo do ideal de 44 px)', small.length ? `${small.length}: ${[...new Set(small)].slice(0, 6).join(' | ')}` : 'nenhum');
    ok('textos não ficam cortados', clipped.length === 0, clipped.slice(0, 5).join(' | ') || undefined);

    // temas + axe (leitores de tela, rótulos, contraste) nos dois temas
    const violations: string[] = [];
    for (const theme of ['dark', 'light'] as const) {
      await page.goto(BASE + '#/');
      await page.evaluate(({ k, theme }) => { const s = JSON.parse(localStorage.getItem(k)!); s.settings.theme = theme; localStorage.setItem(k, JSON.stringify(s)); }, { k: KEY, theme });
      await page.reload();
      for (const [sname, open] of screens) {
        await open();
        if (sname === 'início') {
          const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
          ok(`tema ${theme === 'dark' ? 'escuro' : 'claro'} aplicado`, (await page.locator('html').getAttribute('data-theme')) === theme && (theme === 'light' ? /24[0-9], 24[0-9], 25[0-9]|244, 245, 251/.test(bg) : !/24[0-9], 24[0-9], 25/.test(bg)), bg);
        }
        await page.addScriptTag({ content: axeSrc });
        const res = (await page.evaluate(() => (window as unknown as { axe: { run: (c: Element, o: object) => Promise<{ violations: { id: string; impact: string; nodes: unknown[] }[] }> } }).axe.run(document.body, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }))) as { violations: { id: string; impact: string; nodes: unknown[] }[] };
        for (const v of res.violations) violations.push(`${theme}/${sname}: ${v.id} (${v.impact}, ${v.nodes.length})`);
        await page.keyboard.press('Escape');
      }
    }
    ok('axe-core (WCAG 2.2 A/AA): sem violações nos dois temas e 7 telas', violations.length === 0, violations.slice(0, 8).join(' | ') || '0 violações');
    const t = await page.goto(BASE + '#/');
    void t;
    await page.getByRole('button', { name: /Usar tema/ }).click();
    ok('o botão alterna o tema', ['light', 'dark'].includes((await page.locator('html').getAttribute('data-theme')) ?? ''));

    // teclado
    await page.goto(BASE + '#/');
    await page.reload();
    await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
    await page.keyboard.press('Tab');
    ok('Tab: o primeiro foco é “Pular para o conteúdo”', /Pular para o conteúdo/.test(await page.evaluate(() => document.activeElement?.textContent ?? '')));
    await setup({ d: 'calculo2', topics: 'exam', size: 5 });
    await startSession();
    const qn = await page.locator('.qnum').innerText();
    await page.locator('a.skip').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    ok('“Pular para o conteúdo” no quiz não tira o estudante da sessão', (await page.locator('.qnum').count()) === 1 && (await page.locator('.qnum').innerText()) === qn, await page.evaluate(() => location.hash));
    await page.goto(BASE + '#/quiz');
    await page.locator('.qnum').waitFor();
    await page.locator('.stem').click();
    await page.keyboard.press('2');
    await page.locator('.feedback').waitFor({ timeout: 3000 }).catch(() => undefined);
    const fb = await page.locator('.feedback').count();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    ok('teclado: 1–4 respondem e Enter avança', fb === 1 && /Questão 2 de 5/i.test(await page.locator('.qnum').innerText()));

    // movimento reduzido
    const ctxRM = await (await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] })).newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
    await ctxRM.addInitScript({ content: 'window.__name = (f) => f;' });
    const pr = await ctxRM.newPage();
    await pr.goto(BASE + '#/');
    await pr.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
    const rm = await pr.evaluate(() => { const i = document.createElement('span'); i.className = 'eq'; i.innerHTML = '<i></i>'; document.body.append(i); return { t: getComputedStyle(document.querySelector('.primary')!).transitionDuration, a: getComputedStyle(i.firstElementChild!).animationName }; });
    ok('preferência de movimento reduzido respeitada', rm.t === '0s' && rm.a === 'none', JSON.stringify(rm));
    await ctxRM.browser()?.close();
    manual('leitor de tela real (TalkBack/VoiceOver) e ampliação de fonte do sistema', 'não automatizável aqui; axe-core cobre nomes acessíveis, rótulos e papéis ARIA');
  });

  // ================= 10. Acervo =================
  await section('10. Acervo e cobertura', async () => {
    await page.goto(BASE + '#/library');
    await page.getByRole('heading', { name: /Fontes que/ }).waitFor();
    const txt = await page.locator('main').innerText();
    ok('acervo mostra 600 de 600 aprovadas', /600 de 600 questões aprovadas/.test(txt));
    const rows = await page.locator('.lib-disc').evaluateAll((ds) => ds.map((d) => [...d.querySelectorAll(':scope > .bar-row .bar-val')].map((b) => b.textContent)));
    ok('100/100 por dificuldade em cada disciplina', rows.length === 2 && rows.every((r) => r.join() === '100/100,100/100,100/100'), JSON.stringify(rows));
    await page.locator('.lib-disc details').evaluateAll((ds) => ds.forEach((d) => ((d as HTMLDetailsElement).open = true)));
    const cov = await page.locator('.cov li').evaluateAll((ls) => ls.map((l) => [l.querySelector('span')!.textContent, l.querySelector('b')!.textContent]));
    const expected = tax.disciplines.flatMap((d) => d.topics.map((t) => [t.name, `${bank.filter((q) => q.topicId === t.id).length}/${t.quota.facil + t.quota.medio + t.quota.dificil}`]));
    ok('cobertura por assunto bate com o banco e com as cotas', JSON.stringify(cov) === JSON.stringify(expected), `${cov.length} assuntos`);
    ok('acervo declara revisão humana pendente', /revisão humana ainda pendente|revisão humana pendente/.test(txt));
  });

  // ================= 11. Segurança e privacidade =================
  await section('11. Segurança e privacidade', async () => {
    let pw = 0;
    for (const h of ['#/', '#/setup', '#/quiz', '#/results', '#/progress', '#/library']) {
      await page.goto(BASE + h);
      await page.waitForTimeout(200);
      pw += await page.locator('input[type=password], input[type=email]').count();
    }
    ok('nenhum login ou senha é pedido', pw === 0);
    const origin = new URL(BASE).origin;
    const ext = [...new Set(requests.filter((r) => !r.url.startsWith(origin) && !/^(data|blob):/.test(r.url)).map((r) => new URL(r.url).host))];
    ok('nenhuma requisição para fora do próprio site (Moodle, Google Drive ou outros)', ext.length === 0, ext.join(', ') || `${requests.length} requisições, todas do próprio site`);
    ok('nenhum envio de dados (só GET/HEAD durante toda a homologação)', requests.every((r) => r.method === 'GET' || r.method === 'HEAD'));
    const storage = await page.evaluate(async () => ({ ls: Object.keys(localStorage), caches: await caches.keys(), idb: (await indexedDB.databases()).map((d) => d.name) }));
    ok('dados locais só sob o nome do Study Mastery', storage.ls.every((k) => k.startsWith('study-mastery:')) && storage.caches.every((k) => k.startsWith('study-mastery-')) && storage.idb.every((n) => n === 'study-mastery-radio'), JSON.stringify(storage));
    const files = fs.readdirSync(DIST, { recursive: true }).map(String);
    const blobs = files.filter((f) => fs.statSync(path.join(DIST, f)).isFile()).map((f) => fs.readFileSync(path.join(DIST, f), 'latin1')).join('\n');
    const secrets = [/sk-ant-[A-Za-z0-9-]{10,}/, /AIza[0-9A-Za-z_-]{30,}/, /gh[pousr]_[A-Za-z0-9]{30,}/, /ANTHROPIC_API_KEY\s*[=:]\s*["'][^"']+/, /GOOGLE_DRIVE_TOKEN\s*[=:]\s*["'][^"']+/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/].filter((r) => r.test(blobs));
    ok('nenhuma chave de API ou segredo nos arquivos publicados', secrets.length === 0, secrets.map(String).join(', ') || `${files.length} arquivos verificados`);
    const priv = files.filter((f) => /\.(pdf|zip|docx?|pptx?)$/i.test(f) || /materiais|extracted/.test(f));
    ok('nenhum material privado da faculdade na publicação (PDF, ZIP, texto extraído)', priv.length === 0 && !/content\/extracted|materiais\//.test(blobs), priv.join(', ') || undefined);
    ok('nenhum MP3 incluído na publicação', !files.some((f) => /\.mp3$/i.test(f)));
  });

  ok('sem erros de console durante a homologação', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | ') || undefined);
  await ctx.close();
}

function report(): string {
  const auto = results.filter((r) => r.ok !== null);
  const fail = auto.filter((r) => !r.ok);
  const lines = [`Automatizados: ${auto.length - fail.length}/${auto.length} passaram · ${results.length - auto.length} itens manuais/informativos`, ''];
  let last = '';
  for (const r of results) {
    if (r.sec !== last) {
      lines.push('', `### ${r.sec}`, '', '| | Verificação | Detalhe |', '|:-:|---|---|');
      last = r.sec;
    }
    lines.push(`| ${r.ok === null ? '•' : r.ok ? '✓' : '✗'} | ${r.item} | ${(r.det ?? '').replace(/\|/g, '/').replace(/\n/g, ' ')} |`);
  }
  return lines.join('\n') + '\n';
}

main()
  .catch((e) => {
    console.error(e);
    results.push({ sec: 'execução', item: 'homologação terminou', ok: false, det: String(e).slice(0, 200) });
  })
  .finally(() => {
    server.close();
    const md = report();
    if (REPORT) fs.writeFileSync(REPORT, md);
    const fails = results.filter((r) => r.ok === false).length;
    console.log(`\n${md.split('\n')[0]}`);
    fs.rmSync(TMP, { recursive: true, force: true });
    process.exit(fails ? 1 : 0);
  });
