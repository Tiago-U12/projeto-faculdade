/**
 * Fluxos novos da 0.6 no navegador (build de produção, Chromium, celular 390 px e 320 px), no espaço
 * "neste aparelho" — o que funciona sem conta configurada. Contas no Supabase real ficam em
 * tests/integration (precisam do projeto e de rede até *.supabase.co).
 *   npm run build && CHROMIUM_PATH=... npx tsx tests/e2e/v06.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium, type Page } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '../..');
const PORT = 4193;
const BASE = `http://127.0.0.1:${PORT}/`;
const SHOTS = path.join(ROOT, 'docs/screenshots/v06');
fs.mkdirSync(SHOTS, { recursive: true });
const axeSrc = fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');

let failures = 0;
let passes = 0;
function ok(name: string, cond: boolean, detail?: unknown) {
  if (cond) passes++;
  else failures++;
  console.log(`  ${cond ? '✓' : '✗'} ${name}${!cond && detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 300) : ''}`);
}
const noHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
async function axe(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: axeSrc });
  const r = (await page.evaluate(() => (window as unknown as { axe: { run: (c: Element, o: object) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe.run(document.body, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }))) as { violations: { id: string; nodes: { target: string[] }[] }[] };
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 2).join(', ')}`);
}

export const sections: { name: string; run: (page: Page) => Promise<void> }[] = [];
const section = (name: string, run: (page: Page) => Promise<void>) => sections.push({ name, run });

// ---------------------------------------------------------------- Etapa B: disciplinas no aparelho
section('Disciplinas neste aparelho', async (page) => {
  await page.goto(BASE + '#/disciplinas');
  await page.getByRole('heading', { name: /Suas disciplinas/ }).waitFor();
  await page.locator('.empty-card').waitFor();
  ok('estado vazio explica o que fazer', /Nenhuma disciplina sua ainda/.test(await page.locator('main').innerText()));
  await page.getByRole('button', { name: 'Nova disciplina' }).click();
  await page.getByRole('button', { name: 'Criar disciplina' }).click();
  ok('nome obrigatório (formulário não envia vazio)', await page.getByRole('heading', { name: /Suas disciplinas/ }).isVisible());
  await page.getByLabel('Nome', { exact: true }).fill('Física I');
  await page.getByLabel(/Período/).fill('2026.2');
  await page.locator('.swatch', { hasText: 'Coral' }).click();
  await page.getByLabel(/Assuntos/).fill('Cinemática\nLeis de Newton\n  cinemática \nTrabalho e energia');
  await page.screenshot({ path: path.join(SHOTS, 'b-disciplina-nova.png'), fullPage: true });
  await page.getByRole('button', { name: 'Criar disciplina' }).click();
  await page.getByRole('heading', { name: 'Física I' }).waitFor();
  const topics = await page.locator('.topic-rows li').allInnerTexts();
  ok('cria disciplina com assuntos, sem repetir “cinemática”', topics.length === 3, topics);
  await page.getByLabel('Adicionar assunto').fill('Leis de newton');
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
  ok('não aceita assunto repetido (maiúsculas/minúsculas)', /já existe/.test(await page.locator('[role=status].hint').innerText()));
  await page.getByLabel('Adicionar assunto').fill('Gravitação');
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await page.locator('.topic-rows li', { hasText: 'Gravitação' }).waitFor();
  await page.getByRole('button', { name: 'Renomear Gravitação' }).click();
  await page.getByLabel('Novo nome de Gravitação').fill('Gravitação universal');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await page.locator('.topic-rows li', { hasText: 'Gravitação universal' }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: 'Física I' }).waitFor();
  ok('assuntos e renomeação continuam após recarregar', (await page.locator('.topic-rows li').count()) === 4);
  ok('sem rolagem horizontal (detalhe)', await noHScroll(page));
  await page.screenshot({ path: path.join(SHOTS, 'b-disciplina-detalhe.png'), fullPage: true });
  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Física I — turma B');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await page.getByRole('heading', { name: 'Física I — turma B' }).waitFor();
  ok('edita nome da disciplina', true);
  // segunda disciplina para conferir que excluir uma não leva dados da outra
  await page.goto(BASE + '#/disciplinas');
  await page.getByRole('button', { name: 'Nova disciplina' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Química');
  await page.getByLabel(/Assuntos/).fill('Estequiometria');
  await page.getByRole('button', { name: 'Criar disciplina' }).click();
  await page.getByRole('heading', { name: 'Química' }).waitFor();
  await page.goto(BASE + '#/disciplinas');
  await page.locator('.disc-card', { hasText: 'Física I' }).click();
  await page.getByRole('button', { name: 'Excluir disciplina' }).click();
  ok('confirmação informa quantos assuntos serão excluídos', /os 4 assuntos/.test(await page.getByRole('alertdialog').innerText()));
  await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click();
  await page.getByRole('heading', { name: /Suas disciplinas/ }).waitFor();
  const left = await page.locator('.disc-card').allInnerTexts();
  ok('excluir uma disciplina preserva as outras', left.length === 1 && /Química/.test(left[0]) && /1 assunto/.test(left[0]), left);
  const stored = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open('study-mastery-personal');
        req.onsuccess = () => {
          const g = req.result.transaction('topics').objectStore('topics').getAll();
          g.onsuccess = () => resolve(g.result.length);
        };
      }),
  );
  ok('assuntos da disciplina excluída saem do armazenamento local', stored === 1, stored);
  ok('axe-core: Disciplinas sem violações', (await axe(page)).length === 0, await axe(page));
});

section('Conta sem configuração e navegação', async (page) => {
  await page.goto(BASE + '#/conta');
  await page.getByRole('heading', { name: /Sua conta/ }).waitFor();
  const txt = await page.locator('main').innerText();
  ok('sem Supabase configurado, a conta diz que não está ativa (nada simulado)', /ainda não estão ativadas/.test(txt) && !(await page.getByLabel('Senha').count()));
  ok('axe-core: Conta sem violações', (await axe(page)).length === 0, await axe(page));
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
  ok('barra inferior navega e marca a seção atual', (await page.getByRole('button', { name: 'Início', exact: true }).getAttribute('aria-current')) === 'page');
  await page.getByRole('button', { name: 'Começar a estudar' }).click();
  await page.getByRole('heading', { name: /Configure seu/ }).waitFor();
  const overlap = await page.evaluate(() => {
    const a = document.querySelector('.footer-action')!.getBoundingClientRect();
    const b = document.querySelector('.tabbar')!.getBoundingClientRect();
    return a.bottom > b.top + 1;
  });
  ok('na configuração, “Iniciar sessão” fica acima da barra inferior', !overlap);
  await page.locator('label.seg-btn', { hasText: /^\s*5\s*$/ }).click();
  await page.getByRole('button', { name: /Iniciar sessão/ }).click();
  await page.getByRole('heading', { name: 'Questão 1 de 5', exact: true }).waitFor();
  ok('no quiz a barra inferior some (foco na questão)', (await page.locator('.tabbar').count()) === 0);
  await page.getByRole('button', { name: /Sair/ }).click();
});

async function main() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const errors: string[] = [];
  try {
    for (const width of [390, 320]) {
      console.log(`\n=== ${width}px ===`);
      const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', colorScheme: width === 390 ? 'dark' : 'light', serviceWorkers: 'block' });
      const page = await ctx.newPage();
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(String(e)));
      for (const s of sections) {
        console.log(`## ${s.name}`);
        try {
          await s.run(page);
        } catch (e) {
          ok(`${s.name}: executou até o fim`, false, String(e).split('\n')[0]);
          await page.screenshot({ path: path.join(SHOTS, `falha-${width}-${s.name.replace(/\W+/g, '-')}.png`), fullPage: true }).catch(() => undefined);
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }
  ok('sem erros de console', errors.length === 0, errors.slice(0, 5));
  console.log(`\n${passes} ok · ${failures} falha(s)`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
