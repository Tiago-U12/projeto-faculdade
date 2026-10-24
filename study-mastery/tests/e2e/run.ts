/**
 * E2E (Chromium headless, viewport de celular) sobre o build de produção.
 *   npm run build && npm run e2e
 * Percorre: home → configuração (foco da prova) → modos Aprender e Simulado → resultados → histórico/persistência →
 * retomada de sessão → exportar/importar → tema escuro. Falha (exit 1) em qualquer asserção ou erro de console.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'screenshots');
const PORT = 4179;
const URL = `http://127.0.0.1:${PORT}/`;
const shot = (n: string) => path.join(SHOTS, n);
let failures = 0;
const check = (cond: unknown, msg: string) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    failures++;
    console.log(`  ✗ ${msg}`);
  }
};

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(URL)).ok) break;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true, locale: 'pt-BR', colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await run(page);
  } finally {
    check(errors.length === 0, `sem erros de console (${errors.slice(0, 3).join(' | ')})`);
    await browser.close();
    server.kill();
  }
  console.log(failures ? `\n${failures} falha(s)` : '\nE2E ok');
  process.exit(failures ? 1 : 0);
}

const noHScroll = async (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

async function run(page: Page) {
  console.log('Home');
  await page.goto(URL);
  await page.getByRole('heading', { name: /Aprenda mais/ }).waitFor();
  check(await noHScroll(page), 'sem rolagem horizontal na home (390px)');
  await page.screenshot({ path: shot('01-home.png'), fullPage: true });
  check(await page.getByText(/Banco existente: 600 questões disponíveis/).isVisible(), 'mostra a contagem real do banco');

  console.log('Configuração (foco da prova)');
  await page.getByRole('button', { name: /Foco da prova de 26\/10/ }).click();
  await page.getByRole('heading', { name: /Configure seu/ }).waitFor();
  const lh = page.getByRole('checkbox', { name: /Regra de L’Hôpital|Regra de L'Hôpital/ });
  check(await lh.isChecked(), "L'Hôpital marcado pelo preset da prova");
  const deriv = page.getByRole('checkbox', { name: /Regras de derivação/ });
  check(!(await deriv.isDisabled()), 'assunto com questões aprovadas pode ser selecionado');
  check(await noHScroll(page), 'sem rolagem horizontal na configuração');
  await page.screenshot({ path: shot('02-setup.png'), fullPage: true });
  const summary = page.getByRole('region', { name: 'Resumo da sessão' });
  check(/elegíveis/.test(await summary.innerText()), 'resumo de elegíveis visível');
  // só “Regras de derivação” (17 aprovadas, menos que 20 elegíveis) com sessão de 20: o app avisa em vez de completar com outro conteúdo
  await page.getByRole('button', { name: 'Selecionar todos' }).click();
  await page.getByRole('button', { name: 'Limpar' }).click();
  await deriv.check();
  await page.locator('label.seg-btn', { hasText: /^\s*20\s*$/ }).click();
  check(/Só há (\d+) questões disponíveis/.test(await summary.innerText()) && Number(/Só há (\d+)/.exec(await summary.innerText())![1]) < 20, 'avisa quando há menos questões do que o pedido (20) em vez de completar');
  await page.getByRole('button', { name: 'Foco da prova' }).click();
  await page.getByRole('checkbox', { name: /Regra de L’Hôpital|Regra de L'Hôpital/ }).waitFor();
  check(await page.getByRole('checkbox', { name: /Regra de L’Hôpital|Regra de L'Hôpital/ }).isChecked(), 'preset da prova restaurado');

  console.log('Modo Aprender');
  await page.getByRole('radio', { name: /^Aprender/ }).check();
  await page.locator('label.seg-btn', { hasText: /^\s*5\s*$/ }).click();
  await page.getByRole('button', { name: /Iniciar/ }).click();
  await page.getByRole('radiogroup').first().waitFor();
  check(/QUESTÃO 1 DE 5/.test(await page.locator('.quiztop').innerText()), 'sessão de 5 questões');
  check((await page.locator('.katex').count()) > 0, 'fórmulas renderizadas com KaTeX');
  await page.screenshot({ path: shot('03-quiz.png'), fullPage: false });
  const seen = new Set<string>();
  for (let i = 0; i < 5; i++) {
    await page.getByRole('heading', { name: `Questão ${i + 1} de 5`, exact: true }).waitFor();
    seen.add(await page.locator('#q-stem').innerText());
    await page.keyboard.press('1');
    await page.locator('.feedback').waitFor();
    check(!(await page.getByRole('button', { name: /Próxima|Ver resultados/ }).isDisabled()), `feedback imediato na questão ${i + 1}`);
    if (i === 0) {
      await page.screenshot({ path: shot('04-feedback.png'), fullPage: true });
      check(await page.getByText('Por que a alternativa correta está certa').isVisible(), 'explicação detalhada visível');
      const before = await page.locator('.choice.chosen').count();
      await page.locator('.choice').nth(1).click({ force: true }).catch(() => undefined);
      check((await page.locator('.choice.chosen').count()) === before, 'resposta travada após o feedback');
    }
    await page.getByRole('button', { name: /Próxima|Ver resultados/ }).click();
  }
  check(seen.size === 5, 'cinco questões diferentes na sessão (sem repetição)');
  await page.getByRole('heading', { name: /Você está/ }).waitFor();
  await page.screenshot({ path: shot('05-results.png'), fullPage: true });
  check(/\/ 5 acertos/.test(await page.locator('.score').innerText()), 'resultado mostra acertos');

  console.log('Modo Simulado');
  await page.getByRole('button', { name: 'Outra sessão' }).click();
  await page.getByRole('radio', { name: /^Simulado/ }).check();
  await page.locator('label.seg-btn', { hasText: /^\s*5\s*$/ }).click();
  await page.getByRole('button', { name: /Iniciar/ }).click();
  await page.locator('#q-stem').waitFor();
  await page.getByRole('heading', { name: 'Questão 1 de 5', exact: true }).waitFor();
  await page.keyboard.press('2');
  check((await page.locator('.feedback').count()) === 0, 'simulado não mostra gabarito durante a prova');
  check(await page.getByText(/aparecem ao final/).isVisible(), 'aviso do modo simulado');
  await page.getByRole('heading', { name: 'Questão 1 de 5', exact: true }).waitFor();
  await page.keyboard.press('3'); // troca a resposta
  check((await page.locator('.choice.chosen').count()) === 1, 'dá para trocar a resposta no simulado');
  await page.getByRole('button', { name: 'Próxima questão' }).click();
  await page.getByRole('button', { name: 'Questão 1, respondida' }).click();
  check(/QUESTÃO 1 DE 5/.test(await page.locator('.quiztop').innerText()), 'mapa de questões navega');
  await page.screenshot({ path: shot('06-simulado.png'), fullPage: true });
  await page.getByRole('button', { name: 'Questão 5, sem resposta' }).click();
  await page.getByRole('button', { name: 'Finalizar simulado' }).click();
  check(await page.getByRole('alertdialog').isVisible(), 'pede confirmação com questões em branco');
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await page.getByRole('heading', { name: /Você está/ }).waitFor();
  check((await page.locator('.review-item.no').count()) >= 4, 'em branco contam como erro na revisão');
  check((await page.getByText('em branco').count()) === 4, 'questões em branco sinalizadas');

  console.log('Persistência, retomada e revisão');
  await page.getByRole('button', { name: /Refazer os \d+ erros?/ }).click();
  await page.locator('#q-stem').waitFor();
  check(/revisão/i.test(await page.locator('.mode-pill').innerText()), 'refazer erros abre modo Revisão');
  await page.getByRole('heading', { name: /^Questão 1 de [45]$/ }).waitFor();
  await page.keyboard.press('1');
  await page.locator('.feedback').waitFor();
  await page.reload();
  await page.locator('#q-stem').waitFor();
  check((await page.locator('.choice.correct, .choice.incorrect').count()) > 0, 'sessão e resposta sobrevivem ao recarregamento');
  await page.getByRole('button', { name: /Sair/ }).click();
  await page.getByText('Continuar sessão em andamento').waitFor({ timeout: 5000 }).catch(() => undefined);
  check(await page.getByText('Continuar sessão em andamento').isVisible(), 'home oferece continuar sessão');
  await page.screenshot({ path: shot('07-home-after.png'), fullPage: true });

  console.log('Progresso, exportar e importar');
  await page.getByRole('button', { name: 'Meu progresso' }).click();
  await page.getByRole('heading', { name: 'Seu progresso.' }).waitFor();
  await page.getByRole('button', { name: 'Cálculo II', exact: true }).click();
  check(/2/.test(await page.locator('.metrics').first().innerText()), 'histórico registra as sessões concluídas');
  await page.screenshot({ path: shot('08-progress.png'), fullPage: true });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar histórico' }).click()]);
  const file = path.join(SHOTS, 'export-teste.json');
  await dl.saveAs(file);
  const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
  check(exported.app === 'study-mastery' && exported.state.attempts.length === 2, 'exportação contém as tentativas');
  await page.getByRole('button', { name: 'Apagar meus dados' }).click();
  await page.getByRole('button', { name: 'Apagar tudo' }).click();
  check(/Dados apagados/.test(await page.getByRole('status').innerText()), 'dados apagados');
  await page.getByLabel('Arquivo de histórico para importar').setInputFiles(file);
  await page.getByText(/Importado:/).waitFor();
  check(/2/.test(await page.locator('.metrics').first().innerText()), 'importação restaura o histórico');
  fs.rmSync(file);

  console.log('Full Stack (código e explicações)');
  await page.evaluate(() => { location.hash = '#/setup?d=fullstack'; });
  await page.getByRole('heading', { name: /Configure seu/ }).waitFor();
  if (await page.getByRole('button', { name: 'Selecionar todos' }).count()) await page.getByRole('button', { name: 'Selecionar todos' }).click();
  await page.getByRole('radio', { name: /^Aprender/ }).check();
  await page.locator('label.seg-btn', { hasText: /^\s*10\s*$/ }).click();
  await page.getByRole('button', { name: /Iniciar/ }).click();
  await page.getByRole('radiogroup').first().waitFor();
  let codigos = 0;
  for (let i = 0; i < 10; i++) {
    await page.getByRole('heading', { name: `Questão ${i + 1} de 10`, exact: true }).waitFor();
    codigos += await page.locator('#q-stem code, .choice code').count();
    await page.keyboard.press('1');
    await page.locator('.feedback').waitFor();
    if (i === 0) {
      check(await page.getByText('Por que a alternativa correta está certa').isVisible(), 'Full Stack mostra a explicação detalhada');
      await page.screenshot({ path: shot('10-fullstack-feedback.png'), fullPage: true });
    }
    await page.getByRole('button', { name: /Próxima|Ver resultados/ }).click();
  }
  check(codigos > 0, 'Full Stack renderiza trechos de código (inline ou em bloco)');
  check(await noHScroll(page), 'sem rolagem horizontal em Full Stack (390px)');
  await page.getByRole('heading', { name: /Você está/ }).waitFor();

  console.log('Acervo e tema');
  await page.getByRole('button', { name: 'Acervo e fontes' }).click();
  await page.getByRole('heading', { name: /Fontes que/ }).waitFor();
  check(/Revisão humana\s*Pendente\./.test(await page.locator('main').innerText()), 'acervo declara que a revisão humana está pendente');
  await page.getByRole('button', { name: 'Usar tema claro' }).click();
  await page.screenshot({ path: shot('09-library-light.png'), fullPage: true });
  check((await page.locator('html').getAttribute('data-theme')) === 'light', 'tema claro aplicado');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
