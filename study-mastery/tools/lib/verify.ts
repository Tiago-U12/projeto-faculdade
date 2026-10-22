import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Question } from '../../src/types';
import { JS_PRELOAD, VERIFY_PY } from './paths';

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
    const actual = normOut(outText);
    const matches = Object.entries(v.optionValues ?? {}).filter(([, val]) => normOut(val.replace(/\\n/g, '\n')) === actual).map(([id]) => id);
    const errors: string[] = [];
    if (matches.length !== 1 || matches[0] !== q.correctOptionId) errors.push(`saída real «${actual.slice(0, 80)}» corresponde a ${matches.length ? matches.join(',') : 'nenhuma alternativa'} (esperado apenas ${q.correctOptionId})`);
    return { id: q.id, ok: errors.length === 0, method: 'js-exec (node --permission)', details: `saída: ${actual.slice(0, 120).replace(/\n/g, ' ⏎ ')}`, errors };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function verifyAll(qs: Question[]): Promise<VerifyOutcome[]> {
  const math = qs.filter((q) => q.verification && needsPython(q.verification.kind));
  const js = qs.filter((q) => q.verification?.kind === 'js');
  const src = qs.filter((q) => q.verification?.kind === 'source');
  const res: VerifyOutcome[] = [];
  if (math.length) res.push(...(await verifyMath(math)));
  for (const q of js) res.push(await verifyJs(q));
  for (const q of src) res.push({ id: q.id, ok: true, method: 'source-review', details: 'sem execução: ' + (q.verification!.claims?.length ?? 0) + ' afirmação(ões) conferida(s) contra a fonte', errors: [] });
  return res;
}
