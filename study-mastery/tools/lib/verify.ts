import { spawn } from 'node:child_process';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Question } from '../../src/types';
import { JS_PRELOAD, SANDBOX_DIR, VERIFY_PY } from './paths';

export interface VerifyOutcome {
  id: string;
  ok: boolean;
  method: string;
  details: string;
  errors: string[];
}

function run(cmd: string, args: string[], input: string | null, timeoutMs: number, cwd?: string): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, env: { PATH: process.env.PATH ?? '', HOME: os.tmpdir(), LANG: 'C.UTF-8' } });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
    if (input !== null) child.stdin.end(input);
    else child.stdin.end();
  });
}

const needsPython = (k: string) => ['limit', 'form', 'derivative', 'integral', 'definite', 'double', 'expr', 'function'].includes(k);

/** Verificação simbólica/numérica em lote (um processo Python por lote). */
export async function verifyMath(qs: Question[], batchSize = 25): Promise<VerifyOutcome[]> {
  const out: VerifyOutcome[] = [];
  for (let i = 0; i < qs.length; i += batchSize) {
    const slice = qs.slice(i, i + batchSize);
    const tasks = slice.map((q) => ({ id: q.id, kind: q.verification!.kind, params: q.verification!.params ?? {}, optionValues: q.verification!.optionValues ?? {}, correctOptionId: q.correctOptionId }));
    const r = await run('python3', ['-I', VERIFY_PY], JSON.stringify(tasks), 240_000);
    if (r.timedOut) {
      // reexecuta individualmente para isolar a questão lenta
      for (const t of tasks) {
        const one = await run('python3', ['-I', VERIFY_PY], JSON.stringify([t]), 70_000);
        out.push(...parsePy(one, [t.id]));
      }
      continue;
    }
    out.push(...parsePy(r, slice.map((q) => q.id)));
  }
  return out;
}

function parsePy(r: { code: number | null; stdout: string; stderr: string; timedOut: boolean }, ids: string[]): VerifyOutcome[] {
  if (r.timedOut) return ids.map((id) => ({ id, ok: false, method: 'sympy', details: 'tempo esgotado', errors: ['timeout na verificação matemática'] }));
  try {
    return JSON.parse(r.stdout) as VerifyOutcome[];
  } catch {
    return ids.map((id) => ({ id, ok: false, method: 'sympy', details: 'falha do verificador', errors: [`verificador Python falhou: ${r.stderr.slice(0, 300)}`] }));
  }
}

const normOut = (s: string) => s.replace(/\r/g, '').split('\n').map((l) => l.trimEnd()).join('\n').trim();

/** Executa código JS isolado (Node --permission: sem fs/rede de processos/worker) e compara a saída com cada alternativa. */
export async function verifyJs(q: Question): Promise<VerifyOutcome> {
  const v = q.verification!;
  const code = (v.params as { code?: string } | undefined)?.code;
  if (!code) return { id: q.id, ok: false, method: 'js-exec', details: 'sem params.code', errors: ['params.code ausente'] };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-js-'));
  // format=cjs reproduz a semântica de um script CommonJS (ex.: ordem de process.nextTick × Promises); o padrão é módulo ES
  const ext = (v.params as { format?: string }).format === 'cjs' ? 'cjs' : 'mjs';
  const file = path.join(dir, `case.${ext}`);
  fs.writeFileSync(file, code);
  try {
    const r = await run(process.execPath, ['--permission', `--allow-fs-read=${JS_PRELOAD}`, `--allow-fs-read=${file}`, '--disallow-code-generation-from-strings', '--max-old-space-size=128', '--require', JS_PRELOAD, file], null, 8000, dir);
    if (r.timedOut) return { id: q.id, ok: false, method: 'js-exec', details: 'tempo esgotado', errors: ['timeout na execução do código'] };
    let outText = '';
    try {
      outText = (JSON.parse(r.stdout.trim().split('\n').pop() ?? '{}') as { out: string }).out ?? '';
    } catch {
      return { id: q.id, ok: false, method: 'js-exec', details: 'saída inválida do executor', errors: [`executor falhou: ${(r.stderr || r.stdout).slice(0, 300)}`] };
    }
    return compareOutput(q, v.optionValues ?? {}, outText, 'js-exec (node --permission)');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}


function compareOutput(q: Question, optionValues: Record<string, string>, outText: string, method: string): VerifyOutcome {
  const actual = normOut(outText);
  const matches = Object.entries(optionValues).filter(([, val]) => normOut(val.replace(/\\n/g, '\n')) === actual).map(([id]) => id);
  const errors: string[] = [];
  if (matches.length !== 1 || matches[0] !== q.correctOptionId) errors.push(`saída real «${actual.slice(0, 80)}» corresponde a ${matches.length ? matches.join(',') : 'nenhuma alternativa'} (esperado apenas ${q.correctOptionId})`);
  return { id: q.id, ok: errors.length === 0, method, details: `saída: ${actual.slice(0, 120).replace(/\n/g, ' ⏎ ')}`, errors };
}

/**
 * kind=node: executa o código com as bibliotecas do sandbox (tools/sandbox: Express, jsonwebtoken, bcryptjs, React, jsdom…).
 * Isolamento: `node --permission` (sem processos filhos, sem workers; leitura de arquivos só no sandbox). `addons: true` libera módulos nativos
 * (necessário ao Vite/Rollup) e `files` cria arquivos de apoio lidos via DIR.
 * Observação: a permissão de rede do Node não é restringida — o código verificado é sempre escrito no repositório (nunca de terceiros);
 * os testes de API usam apenas servidores efêmeros em 127.0.0.1.
 */
export async function verifyNode(q: Question): Promise<VerifyOutcome> {
  const v = q.verification!;
  const p = (v.params ?? {}) as { code?: string; format?: string; jsx?: boolean; files?: Record<string, string>; addons?: boolean };
  if (!p.code) return { id: q.id, ok: false, method: 'node-exec', details: 'sem params.code', errors: ['params.code ausente'] };
  if (!fs.existsSync(path.join(SANDBOX_DIR, 'node_modules'))) return { id: q.id, ok: false, method: 'node-exec', details: 'sandbox não instalado', errors: ['execute: npm run sandbox:install'] };
  const casesDir = path.join(SANDBOX_DIR, 'casos');
  fs.mkdirSync(casesDir, { recursive: true });
  const file = path.join(casesDir, `${q.id}-${process.pid}.${p.format === 'cjs' ? 'cjs' : 'mjs'}`);
  let source = p.code;
  if (p.jsx) {
    // JSX é compilado pelo esbuild (já presente via Vite) antes de executar; o runtime automático importa react/jsx-runtime do sandbox
    const { transform } = await import('esbuild');
    source = (await transform(p.code, { loader: 'jsx', jsx: 'automatic', format: 'esm' })).code;
  }
  // params.files: arquivos de apoio (caminho relativo → conteúdo) criados ANTES da execução numa pasta própria; o código os lê via DIR
  const filesDir = path.join(casesDir, `${q.id}-${process.pid}-files`);
  if (p.files) {
    for (const [rel, content] of Object.entries(p.files)) {
      const destino = path.join(filesDir, rel);
      if (!destino.startsWith(filesDir + path.sep)) throw new Error(`caminho de arquivo inválido: ${rel}`);
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, content);
    }
    source = `const DIR = ${JSON.stringify(filesDir)};\n${source}`;
  }
  fs.writeFileSync(file, source);
  try {
    const r = await run(process.execPath, ['--permission', ...(p.addons ? ['--allow-addons'] : []), `--allow-fs-read=${SANDBOX_DIR}/*`, `--allow-fs-read=${JS_PRELOAD}`, '--max-old-space-size=256', '--no-warnings', '--require', JS_PRELOAD, file], null, p.addons ? 40000 : 20000, SANDBOX_DIR);
    if (r.timedOut) return { id: q.id, ok: false, method: 'node-exec', details: 'tempo esgotado', errors: ['timeout na execução do código'] };
    let outText = '';
    try {
      outText = (JSON.parse(r.stdout.trim().split('\n').pop() ?? '{}') as { out: string }).out ?? '';
    } catch {
      return { id: q.id, ok: false, method: 'node-exec', details: 'saída inválida do executor', errors: [`executor falhou: ${(r.stderr || r.stdout).slice(0, 300)}`] };
    }
    return compareOutput(q, v.optionValues ?? {}, outText, 'node-exec (--permission, sandbox)');
  } finally {
    fs.rmSync(file, { force: true });
    fs.rmSync(filesDir, { recursive: true, force: true });
  }
}

interface WebRoute { status?: number; headers?: Record<string, string>; type?: string; body?: string }
interface WebServer { name: string; routes: Record<string, WebRoute>; headers?: Record<string, string> }

/** Sobe servidores HTTP efêmeros em 127.0.0.1 (cada porta = uma origem distinta) para testar CORS e fetch de verdade. */
async function startWebServers(defs: WebServer[]): Promise<{ bases: Record<string, string>; hits: Record<string, number>; stop: () => Promise<void> }> {
  const bases: Record<string, string> = {};
  const hits: Record<string, number> = {};
  const servers: http.Server[] = [];
  const raw: Array<{ def: WebServer; srv: http.Server }> = [];
  for (const def of defs) {
    hits[def.name] = 0;
    const srv = http.createServer((req, res) => {
      hits[def.name]++;
      const pathname = (req.url ?? '/').split('?')[0];
      const route = def.routes[`${req.method} ${pathname}`] ?? def.routes[pathname];
      if (!route) {
        res.writeHead(404, { ...(def.headers ?? {}), 'Content-Type': 'text/plain' });
        res.end('nao encontrado');
        return;
      }
      const body = (route.body ?? '').replace(/\{\{(\w+)\}\}/g, (_, n) => bases[n] ?? '');
      const cab: Record<string, string> = { 'Content-Type': route.type ?? 'text/plain; charset=utf-8', ...(def.headers ?? {}), ...(route.headers ?? {}) };
      for (const k of Object.keys(cab)) cab[k] = String(cab[k]).replace(/\{\{(\w+)\}\}/g, (_, n) => bases[n] ?? ''); // {{app}} nos cabeçalhos = origem do servidor "app"
      res.writeHead(route.status ?? 200, cab);
      res.end(req.method === 'HEAD' ? undefined : body);
    });
    servers.push(srv);
    raw.push({ def, srv });
    await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', resolve));
    bases[def.name] = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
  }
  return { bases, hits, stop: () => Promise.all(servers.map((sv) => new Promise<void>((r) => sv.close(() => r())))).then(() => undefined) };
}

/**
 * kind=web: carrega params.html no Chromium (sem rede externa) e avalia params.probe (corpo de função JS que pode retornar uma
 * Promise) com a janela params.width×params.height (padrão 390×800; params.mobile liga a emulação de celular). Com params.aria
 * (seletor), a árvore de acessibilidade calculada pelo Chromium fica em window.__aria. Com params.servers (lista de servidores
 * efêmeros em 127.0.0.1, uma origem por servidor) e params.page (nome do servidor cuja rota "/" é aberta), é possível testar
 * fetch/CORS de verdade (o probe lê as URLs em __bases.<nome>); params.hits (nome de servidor) acrescenta " hits=N" ao resultado. O valor medido é comparado às alternativas.
 */
export async function verifyWebAll(qs: Question[]): Promise<VerifyOutcome[]> {
  if (!qs.length) return [];
  const { chromium } = await import('playwright-core');
  const exe = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const out: VerifyOutcome[] = [];
  let browser: Awaited<ReturnType<typeof chromium.launch>>;
  try {
    browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  } catch (e) {
    return qs.map((q) => ({ id: q.id, ok: false, method: 'web-chromium', details: 'Chromium indisponível', errors: [`não foi possível abrir o Chromium (${exe}): ${(e as Error).message.slice(0, 120)}`] }));
  }
  try {
    for (const q of qs) {
      const p = (q.verification!.params ?? {}) as { html?: string; probe?: string; width?: number; height?: number; mobile?: boolean; aria?: string; servers?: WebServer[]; page?: string; hits?: string };
      if ((!p.html && !p.servers) || !p.probe) {
        out.push({ id: q.id, ok: false, method: 'web-chromium', details: 'params incompletos', errors: ['params.html (ou servers) e params.probe são obrigatórios'] });
        continue;
      }
      const ctx = await browser.newContext({ viewport: { width: p.width ?? 390, height: p.height ?? 800 }, javaScriptEnabled: true, isMobile: p.mobile === true, hasTouch: p.mobile === true });
      const page = await ctx.newPage();
      const srvs = p.servers ? await startWebServers(p.servers) : null;
      // Sem servidores locais: bloqueia qualquer rede. Com servidores NÃO se intercepta nada, porque a interceptação do
      // Playwright altera o tratamento das pré-checagens (preflight) de CORS e falsearia o resultado.
      if (!srvs) await page.route('**/*', (route) => (route.request().url().startsWith('data:') ? route.continue() : route.abort()));
      try {
        if (srvs && p.page) await page.goto(`${srvs.bases[p.page]}/`, { waitUntil: 'load' });
        else await page.setContent(p.html!, { waitUntil: 'load' });
        if (srvs) await page.evaluate((b) => ((window as unknown as { __bases: Record<string, string> }).__bases = b), srvs.bases); // URLs dos servidores para o probe: __bases.api
        // params.aria = seletor cuja árvore de acessibilidade (roles reais calculados pelo Chromium) fica em window.__aria para o probe
        if (p.aria) {
          const snap = await page.locator(p.aria).ariaSnapshot();
          await page.evaluate((t) => ((window as unknown as { __aria: string }).__aria = t), snap);
        }
        const value = await page.evaluate(`(async () => { ${p.probe} })()`);
        let text = typeof value === 'string' ? value : JSON.stringify(value);
        if (srvs && p.hits) text += ` hits=${srvs.hits[p.hits] ?? 0}`;
        out.push(compareOutput(q, q.verification!.optionValues ?? {}, text, 'web-chromium (servidores locais)'));
      } catch (e) {
        out.push({ id: q.id, ok: false, method: 'web-chromium', details: 'falha ao medir', errors: [(e as Error).message.slice(0, 200)] });
      } finally {
        await ctx.close();
        await srvs?.stop();
      }
    }
  } finally {
    await browser.close();
  }
  return out;
}

/** Sobe um MariaDB descartável (compatível com MySQL; sem autenticação, só em 127.0.0.1) para verificar questões de SQL. */
async function startMariaDb(): Promise<{ port: number; stop: () => Promise<void> } | null> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-mariadb-'));
  const data = path.join(dir, 'data');
  const free = await new Promise<number>((resolve) => {
    const s = http.createServer();
    s.listen(0, '127.0.0.1', () => {
      const port = (s.address() as AddressInfo).port;
      s.close(() => resolve(port));
    });
  });
  const install = await run('mariadb-install-db', ['--no-defaults', `--datadir=${data}`, '--auth-root-authentication-method=normal', '--skip-test-db', '--user=root'], null, 60000);
  if (install.code !== 0) {
    fs.rmSync(dir, { recursive: true, force: true });
    return null;
  }
  const child = spawn('mariadbd', ['--no-defaults', `--datadir=${data}`, `--socket=${path.join(dir, 's.sock')}`, `--port=${free}`, '--bind-address=127.0.0.1', '--skip-grant-tables', '--user=root', '--skip-name-resolve', '--innodb-buffer-pool-size=32M', '--innodb-log-file-size=16M', '--skip-log-bin'], { stdio: 'ignore', env: { PATH: process.env.PATH ?? '' } });
  const stop = async () => {
    child.kill('SIGTERM');
    await new Promise<void>((r) => {
      const t = setTimeout(() => (child.kill('SIGKILL'), r()), 5000);
      child.once('exit', () => (clearTimeout(t), r()));
    });
    fs.rmSync(dir, { recursive: true, force: true });
  };
  const net = await import('node:net');
  for (let i = 0; i < 100; i++) {
    const ok = await new Promise<boolean>((resolve) => {
      const c = net.connect(free, '127.0.0.1');
      c.once('connect', () => (c.end(), resolve(true)));
      c.once('error', () => resolve(false));
    });
    if (ok) return { port: free, stop };
    await new Promise((r) => setTimeout(r, 150));
  }
  await stop();
  return null;
}

/** kind=sql: roda params.code (JS com `conn` do mysql2 já conectado a um banco novo) contra o MariaDB temporário. */
async function verifySql(q: Question, port: number): Promise<VerifyOutcome> {
  const p = (q.verification!.params ?? {}) as { code?: string };
  if (!p.code) return { id: q.id, ok: false, method: 'sql', details: 'sem params.code', errors: ['params.code ausente'] };
  const modo = "ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION";
  const prefix = `import mysql from 'mysql2/promise';
const conn = await mysql.createConnection({ host: '127.0.0.1', port: ${port}, user: 'root', multipleStatements: true });
await conn.query("DROP DATABASE IF EXISTS q; CREATE DATABASE q; USE q; SET SESSION sql_mode='${modo}'");
`;
  const clone = { ...q, verification: { ...q.verification!, kind: 'node' as const, params: { code: `${prefix}${p.code}\nawait conn.end();\nprocess.exit(0);` } } } as Question;
  const o = await verifyNode(clone);
  return { ...o, method: 'sql (MariaDB 10.x compatível com MySQL, sql_mode do MySQL 8)' };
}

export async function verifyAll(qs: Question[]): Promise<VerifyOutcome[]> {
  const math = qs.filter((q) => q.verification && needsPython(q.verification.kind));
  const js = qs.filter((q) => q.verification?.kind === 'js');
  const nodeQs = qs.filter((q) => q.verification?.kind === 'node');
  const web = qs.filter((q) => q.verification?.kind === 'web');
  const sql = qs.filter((q) => q.verification?.kind === 'sql');
  const src = qs.filter((q) => q.verification?.kind === 'source');
  const res: VerifyOutcome[] = [];
  if (math.length) res.push(...(await verifyMath(math)));
  for (const q of js) res.push(await verifyJs(q));
  for (const q of nodeQs) res.push(await verifyNode(q));
  res.push(...(await verifyWebAll(web)));
  if (sql.length) {
    const db = await startMariaDb();
    if (!db) res.push(...sql.map((q) => ({ id: q.id, ok: false, method: 'sql', details: 'MariaDB indisponível', errors: ['não foi possível iniciar o MariaDB (apt-get install mariadb-server)'] })));
    else {
      try {
        for (const q of sql) res.push(await verifySql(q, db.port));
      } finally {
        await db.stop();
      }
    }
  }
  for (const q of src) res.push({ id: q.id, ok: true, method: 'source-review', details: 'sem execução: ' + (q.verification!.claims?.length ?? 0) + ' afirmação(ões) conferida(s) contra a fonte', errors: [] });
  return res;
}
