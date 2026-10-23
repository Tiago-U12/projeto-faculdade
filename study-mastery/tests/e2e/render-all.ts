/**
 * Integridade visual do banco: renderiza TODAS as questões publicadas (enunciado, alternativas e explicação completa)
 * no build de produção, em Chromium com viewport de celular, e falha se alguma:
 *   - gerar erro de KaTeX (`.katex-error`) ou erro de console;
 *   - provocar rolagem horizontal da página (390 px e 320 px);
 *   - não mostrar a explicação, o passo a passo declarado ou a fonte.
 *   npm run build && npm run e2e:render
 * Para isso injeta no localStorage uma sessão "Aprender" com todas as questões já respondidas (sem tocar no banco).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright-core';
import type { PublishedQuestion } from '../../src/types';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const PORT = 4180;
const URL = `http://127.0.0.1:${PORT}/`;
const load = (d: string) => JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/published', `${d}.json`), 'utf8')) as PublishedQuestion[];

async function audit(page: Page, questions: PublishedQuestion[], width: number, wrongFirst: boolean) {
  const problems: string[] = [];
  const items = questions.map((q) => ({ questionId: q.id, order: q.options.map((o) => o.id) }));
  // alterna entre resposta errada e certa para exibir também o bloco "por que sua resposta não serve"
  const answers = Object.fromEntries(questions.map((q, i) => [q.id, wrongFirst && i % 2 === 0 ? q.options.find((o) => o.id !== q.correctOptionId)!.id : q.correctOptionId]));
  const cfg = { disciplineId: questions[0].disciplineId, topicIds: [], scope: 'desafio', difficulties: ['facil', 'medio', 'dificil'], mode: 'aprender', size: questions.length };
  const state = {
    version: 1,
    attempts: [],
    stats: {},
    settings: { theme: 'dark', radio: { enabled: false } },
    active: { session: { id: 'audit', seed: 1, config: cfg, requested: items.length, items, composition: { errors: 0, due: 0, fresh: items.length, other: 0 }, createdAt: new Date().toISOString() }, answers, index: 0, startedAt: new Date().toISOString() },
  };
  await page.setViewportSize({ width, height: 800 });
  await page.goto(URL);
  await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor(); // o app já gravou o estado inicial
  await page.evaluate((s) => localStorage.setItem('study-mastery:state:v1', JSON.stringify(s)), state);
  await page.goto(URL + '#/quiz');
  await page.reload();
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await page.locator('.quiztop').getByText(`QUESTÃO ${i + 1} DE ${questions.length}`).waitFor();
    await page.locator('.explain').waitFor();
    // abre a fonte para medir também o bloco recolhido
    await page.locator('.explain details.src-details').evaluate((d) => ((d as HTMLDetailsElement).open = true));
    const r = await page.evaluate(() => ({
      hscroll: document.documentElement.scrollWidth > window.innerWidth + 1,
      widest: [...document.querySelectorAll('main *')]
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && !el.closest('.code-block, .math-display, .katex-display'))
        .slice(0, 2)
        .map((el) => `${el.tagName.toLowerCase()}.${(el as HTMLElement).className}`),
      katexErrors: document.querySelectorAll('.katex-error').length,
      steps: document.querySelectorAll('.explain .steps li').length,
      hasCorrect: !!document.querySelector('.why-right p'),
      hasWrong: !!document.querySelector('.why-wrong p'),
      sources: document.querySelectorAll('.explain .sources li').length,
    }));
    const tag = `${q.id} @${width}px`;
    if (r.hscroll) problems.push(`${tag}: rolagem horizontal (${r.widest.join(', ')})`);
    if (r.katexErrors) problems.push(`${tag}: ${r.katexErrors} erro(s) de KaTeX`);
    if (!r.hasCorrect) problems.push(`${tag}: sem explicação da correta`);
    if ((q.explanation.steps?.length ?? 0) !== r.steps) problems.push(`${tag}: passo a passo ${r.steps}/${q.explanation.steps?.length ?? 0}`);
    if (answers[q.id] !== q.correctOptionId && q.explanation.wrong?.[answers[q.id]] && !r.hasWrong) problems.push(`${tag}: explicação da errada não apareceu`);
    if (r.sources !== q.sourceRefs.length) problems.push(`${tag}: fontes ${r.sources}/${q.sourceRefs.length}`);
    if (i < questions.length - 1) await page.getByRole('button', { name: 'Próxima questão' }).click();
  }
  return problems;
}

async function main() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(URL)).ok) break;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ locale: 'pt-BR', colorScheme: 'dark', serviceWorkers: 'block' })).newPage();
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  const problems: string[] = [];
  let total = 0;
  try {
    for (const d of ['calculo2', 'fullstack']) {
      const qs = load(d);
      total += qs.length;
      for (const [w, wrong] of [[390, true], [320, false]] as const) {
        const p = await audit(page, qs, w, wrong);
        console.log(`${d} @${w}px: ${qs.length} questões renderizadas, ${p.length} problema(s)`);
        problems.push(...p);
      }
    }
  } finally {
    await browser.close();
    server.kill();
  }
  for (const p of problems.slice(0, 80)) console.log('  ✗ ' + p);
  if (errors.length) console.log(`  ✗ erros de console: ${errors.slice(0, 5).join(' | ')}`);
  const ok = !problems.length && !errors.length;
  console.log(ok ? `\nRenderização ok: ${total} questões × 2 larguras` : `\n${problems.length + (errors.length ? 1 : 0)} falha(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
