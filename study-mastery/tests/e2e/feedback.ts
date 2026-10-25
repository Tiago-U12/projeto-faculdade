/** Production bundle + real SQLite/API in-process. Only captcha and hosting transport are simulated. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { chromium } from 'playwright-core';
import { handleFeedback, type FeedbackDB, type Statement, type Env } from '../../server/feedback';
const ROOT = path.resolve(import.meta.dirname, '../..');
const BASE = 'https://study-mastery.test/';
const OUT = process.env.FEEDBACK_EVIDENCE ?? '/tmp/study-feedback-evidence';
fs.mkdirSync(OUT, { recursive: true });
const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(path.join(ROOT, 'migrations-feedback/0001_feedback.sql'), 'utf8'));
const adapter: FeedbackDB = { prepare(sql): Statement {
 let args: (string | number | null)[] = [];
 return { bind(...v) { args = v; return this; }, async first<T>() { return (db.prepare(sql).get(...args) ?? null) as T | null; }, async all<T>() { return { results: db.prepare(sql).all(...args) as T[] }; }, async run() { return { meta: { changes: Number(db.prepare(sql).run(...args).changes) } }; } };
} };
const adminKey = 'local-test-only-administrator-32-characters';
const env: Env = { FEEDBACK_DB: adapter, FEEDBACK_ADMIN_TOKEN_SHA256: createHash('sha256').update(adminKey).digest('hex'), TURNSTILE_SITE_KEY: 'test-site-key', TURNSTILE_SECRET_KEY: 'test-secret' };
let enabled = true;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors: string[] = [];page.on('pageerror', e => errors.push(String(e)));
await ctx.route('**/*', async route => {
 const req = route.request(), url = new URL(req.url());
 if (url.hostname === 'challenges.cloudflare.com') {
  await route.fulfill({ contentType: 'application/javascript', body: `window.turnstile={render:(el,o)=>{const b=document.createElement('button');b.type='button';b.textContent='Verificação simulada';b.onclick=()=>o.callback('test-challenge');el.appendChild(b);return 'test';},remove:()=>{document.querySelectorAll('.feedback-challenge button').forEach(x=>x.remove());}};` }); return;
 }
 if (url.origin !== new URL(BASE).origin) { await route.abort(); return; }
 if (url.pathname === '/api/feedback') {
  const headers = new Headers(req.headers());headers.set('CF-Connecting-IP', '192.0.2.42');
  const data = req.postData();const response = await handleFeedback(new Request(url, { method: req.method(), headers, ...(data ? { body: data } : {}) }), enabled ? env : {}, { fetch: async () => Response.json({ success: true, hostname: url.hostname, action: 'feedback' }) });
  await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });return;
 }
 if (url.pathname.endsWith('study-radio.mp3')) { await route.fulfill({ status: 404, body: '' }); return; }
 const safe = path.resolve(ROOT, 'dist', '.' + decodeURIComponent(url.pathname));
 const target = safe.startsWith(path.join(ROOT, 'dist') + path.sep) && fs.existsSync(safe) && fs.statSync(safe).isFile() ? safe : path.join(ROOT, 'dist/index.html');
 const mime: Record<string,string> = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2' };
 await route.fulfill({ body: fs.readFileSync(target), contentType: mime[path.extname(target)] ?? 'application/octet-stream' });
});
try {
 await page.goto(BASE + '#/feedback?question=c2-lhopital-001&version=1');
 await page.getByRole('heading', { name: /Feedback e melhorias/ }).waitFor();
 assert.equal(await page.getByLabel('Identificador da questão (opcional)').inputValue(), 'c2-lhopital-001');
 const png = await page.evaluate(() => { const c=document.createElement('canvas');c.width=600;c.height=250;const x=c.getContext('2d')!;x.fillStyle='#ffffff';x.fillRect(0,0,600,250);x.fillStyle='#333333';x.font='24px sans-serif';x.fillText('Print de teste: alternativa e explicação',20,90);return c.toDataURL('image/png'); });
 await page.getByLabel('O que aconteceu ou o que você sugere?').fill('A alternativa indicada parece diferente da explicação. Conferir a questão.');
 await page.getByLabel('Anexar prints (opcional)').setInputFiles({ name:'print.png', mimeType:'image/png', buffer:Buffer.from(png.split(',')[1], 'base64') });
 await page.getByRole('button', { name:'Remover print 1' }).waitFor();
 await page.getByRole('button', { name:'Salvar rascunho', exact:true }).click();
 await page.getByText('Rascunho salvo neste aparelho. Ainda não foi enviado.', { exact:true }).waitFor();
 assert.equal(db.prepare('SELECT count(*) AS n FROM feedback_reports').get()!.n, 0);
 await page.reload();
 await page.getByRole('button', { name:'Retomar rascunho' }).click();
 assert.equal(await page.getByRole('img', { name:/Print 1/ }).count(), 1);
 await ctx.setOffline(true);
 await page.getByText('Você está sem internet. Pode preparar e salvar um rascunho; o envio precisa de conexão.', { exact:true }).waitFor();
 assert.equal(await page.getByRole('button', { name:'Enviar feedback', exact:true }).isDisabled(), true);
 await ctx.setOffline(false);
 assert.equal(db.prepare('SELECT count(*) AS n FROM feedback_reports').get()!.n, 0);
 for (const width of [390,320]) { await page.setViewportSize({ width, height:844 });assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));await page.screenshot({ path:path.join(OUT,`feedback-${width}.png`), fullPage:true }); }
 await page.getByRole('checkbox', { name:/Revisei o texto/ }).check();
 await page.getByRole('button', { name:'Verificação simulada' }).click();
 await page.getByRole('button', { name:'Enviar feedback', exact:true }).click();
 await page.getByRole('heading', { name:'Feedback recebido' }).waitFor();
 const receipt = await page.locator('.feedback-receipt').innerText();
 assert.equal(db.prepare('SELECT count(*) AS n FROM feedback_reports').get()!.n, 1);
 const denied=await handleFeedback(new Request(BASE+'api/feedback?action=list'),env);assert.equal(denied.status,401);
 await page.goto(BASE+'#/feedback-admin');
 await page.getByLabel('Chave de acesso da administração').fill(adminKey);
 await page.getByRole('button',{name:'Abrir caixa'}).click();
 await page.getByRole('button',{name:/Erro em questão/}).click();
 await page.getByRole('img',{name:/Print 1 enviado/}).waitFor();
 assert.ok(await page.getByText('Protocolo: '+receipt,{exact:true}).isVisible());
 await page.getByLabel('Status',{exact:true}).selectOption('reviewing');
 await page.getByLabel('Anotações da análise (privadas)').fill('Revisar com o material de origem antes de alterar.');
 await page.getByRole('button',{name:'Salvar acompanhamento'}).click();await page.getByText('Acompanhamento atualizado.',{exact:true}).waitFor();
 assert.equal(db.prepare('SELECT status FROM feedback_reports').get()!.status,'reviewing');
 assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
 await page.screenshot({path:path.join(OUT,'inbox-320.png'),fullPage:true});
 await page.getByRole('button',{name:'Excluir relato',exact:true}).click();
 await page.getByRole('button',{name:'Excluir definitivamente'}).click();await page.getByText('Relato e anexos excluídos.',{exact:true}).waitFor();
 assert.equal(db.prepare('SELECT count(*) AS n FROM feedback_reports').get()!.n,0);
 await page.getByRole('button',{name:'Sair da administração'}).click();assert.equal(await page.getByLabel('Chave de acesso da administração').inputValue(),'');
 enabled=false;
 await page.goto(BASE+'#/feedback');await page.getByText('Envio ainda não disponível. Você pode salvar um rascunho neste aparelho.',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Enviar feedback',exact:true}).isDisabled(),true);
 assert.equal(errors.length,0, errors.join('\n'));
 console.log('PASS: contexto, print real regravado, rascunho persistente, offline sem envio, 320/390 px, POST/SQLite, caixa privada, status, exclusão, logout e configuração ausente. Captcha/transporte simulados; não é deploy real.');
} finally { await browser.close(); db.close(); }
