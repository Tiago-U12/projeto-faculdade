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

// ---------------------------------------------------------------- Etapa C: materiais no aparelho
const FIX = path.join(ROOT, 'tests/fixtures/materiais');
async function openDiscipline(page: Page, name: string) {
  await page.goto(BASE + '#/disciplinas');
  await page.getByRole('heading', { name: /Suas disciplinas/ }).waitFor();
  const card = page.locator('.disc-card', { hasText: name });
  if (!(await card.count())) {
    await page.getByRole('button', { name: 'Nova disciplina' }).click();
    await page.getByLabel('Nome', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Criar disciplina' }).click();
  } else await card.click();
  await page.getByRole('heading', { name }).waitFor();
}
async function addPdf(page: Page, file: string) {
  await page.getByRole('button', { name: 'Adicionar material' }).click();
  await page.getByRole('heading', { name: /Novo material/ }).waitFor();
  await page.locator('input[type=file]').setInputFiles(path.join(FIX, file));
  await page.getByRole('button', { name: 'Adicionar material' }).click();
}

section('Materiais neste aparelho', async (page) => {
  await openDiscipline(page, 'Cálculo II (minha)');
  await addPdf(page, 'aula-integrais.pdf');
  await page.getByRole('heading', { name: 'aula-integrais' }).waitFor({ timeout: 30000 });
  const status = await page.locator('.panel', { hasText: 'Processamento' }).innerText();
  ok('PDF válido: Pronto, com aviso de fórmulas', /Pronto/.test(status) && /fórmulas/.test(status), status.slice(0, 200));
  await page.locator('.page-preview details').first().locator('summary').click();
  ok('prévia mostra o texto por página', /Página 1/.test(await page.locator('.page-preview').innerText()) && /∫ u dv = u·v − ∫ v du/.test(await page.locator('.page-text').first().innerText()));
  const sugg = await page.locator('.pick-list li').allInnerTexts();
  ok('assuntos sugeridos com a página de origem', sugg.some((x) => /Integração por partes.*página 1/.test(x)) && sugg.some((x) => /Frações parciais.*página 3/.test(x)), sugg);
  ok('sem rolagem horizontal na página do material (prévia aberta)', await noHScroll(page));
  await page.screenshot({ path: path.join(SHOTS, 'c-material-pronto.png'), fullPage: true });
  await page.getByLabel(/Integração por partes/).check();
  await page.getByLabel(/Frações parciais/).check();
  await page.getByRole('button', { name: /Adicionar 2 assuntos/ }).click();
  await page.locator('.form-ok').waitFor();
  ok('assuntos confirmados entram na disciplina e ficam associados ao material', (await page.locator('ul.chips .chip.on').count()) === 2);
  // duplicado
  await page.getByRole('button', { name: /Cálculo II \(minha\)/ }).click();
  await addPdf(page, 'aula-integrais.pdf');
  ok('o mesmo arquivo de novo não duplica', /já foi adicionado nesta disciplina/.test(await page.getByRole('alert').innerText()));
  // inválidos: nada é criado
  await page.locator('input[type=file]').setInputFiles(path.join(FIX, 'nao-e-pdf.pdf'));
  await page.getByRole('button', { name: 'Adicionar material' }).click();
  ok('arquivo que não é PDF (só a extensão) é recusado', /não é um PDF/.test(await page.getByRole('alert').innerText()));
  await page.locator('input[type=file]').setInputFiles(path.join(FIX, 'protegido.pdf'));
  await page.getByRole('button', { name: 'Adicionar material' }).click();
  ok('PDF protegido por senha é recusado com orientação', /protegido/.test(await page.getByRole('alert').innerText()));
  await page.locator('input[type=file]').setInputFiles(path.join(FIX, 'digitalizado.pdf'));
  await page.getByRole('button', { name: 'Adicionar material' }).click();
  await page.getByRole('heading', { name: 'digitalizado' }).waitFor({ timeout: 30000 });
  ok('PDF digitalizado: Precisa de atenção, explica que não há OCR', /Precisa de atenção/.test(await page.locator('main').innerText()) && /não faz OCR/.test(await page.locator('main').innerText()));
  await page.screenshot({ path: path.join(SHOTS, 'c-material-atencao.png'), fullPage: true });
  // texto colado
  await page.getByRole('button', { name: /Cálculo II \(minha\)/ }).click();
  await page.getByRole('button', { name: 'Adicionar material' }).click();
  await page.getByRole('button', { name: 'Colar texto' }).click();
  await page.getByLabel('Nome do material').fill('Revisão de integrais duplas');
  await page.getByRole('textbox', { name: /^Texto/ }).fill(fs.readFileSync(path.join(FIX, 'texto-colado.txt'), 'utf8'));
  await page.getByRole('button', { name: 'Adicionar material' }).click();
  await page.getByRole('heading', { name: 'Revisão de integrais duplas' }).waitFor();
  ok('texto colado: Pronto, citado por trechos', /Pronto/.test(await page.locator('main').innerText()) && /Trecho 1/.test(await page.locator('.page-preview').innerText()));
  await page.getByRole('button', { name: /Cálculo II \(minha\)/ }).click();
  await page.locator('.mat-row').nth(2).waitFor();
  const rows = await page.locator('.mat-row').allInnerTexts();
  ok('a disciplina lista os 3 materiais com o estado de cada um', rows.length === 3 && rows.some((r) => /Precisa de atenção/.test(r)), rows);
  ok('sem rolagem horizontal (materiais)', await noHScroll(page));
  // excluir
  await page.locator('.mat-row', { hasText: 'digitalizado' }).click();
  await page.getByRole('button', { name: 'Excluir material' }).click();
  ok('confirmação diz o que será excluído', /texto extraído/.test(await page.getByRole('alertdialog').innerText()));
  await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click();
  await page.getByRole('heading', { name: 'Cálculo II (minha)' }).waitFor();
  ok('material excluído some da lista', (await page.locator('.mat-row').count()) === 2);
  const pagesLeft = await page.evaluate(() => new Promise<number>((resolve) => { const r = indexedDB.open('study-mastery-personal'); r.onsuccess = () => { const g = r.result.transaction('pages').objectStore('pages').getAll(); g.onsuccess = () => resolve(g.result.length); }; }));
  ok('o texto extraído do material excluído sai do aparelho (sobram 4 págs. + trechos)', pagesLeft > 4 && pagesLeft < 10, pagesLeft);
  ok('axe-core: Materiais sem violações', (await axe(page)).length === 0, await axe(page));
});

// ---------------------------------------------------------------- Etapa D: guias e questões no aparelho
section('Guias e questões neste aparelho', async (page) => {
  await openDiscipline(page, 'Cálculo II (minha)');
  await page.getByRole('button', { name: 'Novo guia' }).click();
  await page.getByRole('heading', { name: 'Novo guia de estudo' }).waitFor();
  ok('sem conta, a tela diz que a IA precisa de conta (nada simulado)', /precisa de conta/.test(await page.locator('main').innerText()));
  await page.locator('.pick-list label', { hasText: 'aula-integrais' }).locator('input').check();
  const topicChips = page.locator('fieldset.fs').nth(1).locator('.chip.on');
  ok('assuntos associados ao material vêm marcados para confirmar', (await topicChips.count()) === 2, await topicChips.allInnerTexts());
  await page.getByRole('button', { name: 'Criar guia' }).click();
  ok('sem confirmar os assuntos, o guia não é criado', /Confirme os assuntos/.test(await page.getByRole('alert').innerText()));
  await page.getByLabel(/Confirmo: o guia trata só de/).check();
  await page.getByLabel('Este guia é para uma prova ou avaliação').check();
  await page.getByLabel('Data da avaliação').fill('2026-11-20');
  await page.getByRole('button', { name: 'Criar guia' }).click();
  ok('avaliação exige confirmar o escopo', /Confirme o escopo/.test(await page.getByRole('alert').innerText()));
  await page.getByLabel(/Confirmo que o escopo da avaliação é/).check();
  await page.screenshot({ path: path.join(SHOTS, 'd-guia-novo.png'), fullPage: true });
  await page.getByRole('button', { name: 'Criar guia' }).click();
  await page.getByRole('heading', { name: 'Guia — Cálculo II (minha)' }).waitFor();
  const guide = await page.locator('main').innerText();
  ok('guia mostra a data e diz que não prevê o que vai cair', /Avaliação em 20\/11\/2026/.test(guide) && /não sabe o que vai cair/.test(guide));
  ok('“Trechos do seu material” vem do texto, com material e página', /Trechos do seu material/.test(guide) && /aula-integrais — página \d/.test(guide), guide.slice(0, 400));
  ok('sem botão de gerar por IA no aparelho', (await page.getByRole('button', { name: /^Gerar/ }).count()) === 0);
  ok('sem rolagem horizontal (guia)', await noHScroll(page));
  await page.screenshot({ path: path.join(SHOTS, 'd-guia.png'), fullPage: true });
  ok('axe-core: Guia sem violações', (await axe(page)).length === 0, await axe(page));
  await page.getByRole('button', { name: 'Atualizar trechos' }).first().click();
  await page.locator('.form-ok').waitFor();
  ok('atualizar trechos guarda a versão anterior', (await page.getByRole('button', { name: /Ver versão anterior/ }).count()) >= 1);

  // questões criadas pelo estudante
  await page.getByRole('button', { name: 'Disciplina', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir questões e praticar' }).click();
  await page.getByRole('heading', { name: 'Questões pessoais' }).waitFor();
  await page.getByRole('button', { name: 'Criar questão' }).click();
  await page.getByRole('button', { name: 'Salvar' }).click();
  ok('questão incompleta não é salva (diz o que falta)', /Ajuste antes de salvar/.test(await page.getByRole('alert').innerText()));
  const fillQ = async (stem: string, opts: string[], expl: string) => {
    await page.getByLabel(/^Enunciado/).fill(stem);
    for (let i = 0; i < 4; i++) await page.getByLabel(`Alternativa ${'ABCD'[i]}`, { exact: true }).fill(opts[i]);
    await page.getByLabel('Por que a correta está certa').fill(expl);
    await page.getByRole('button', { name: 'Salvar' }).click();
  };
  await fillQ('Na integração por partes, qual escolha de u simplifica a integral de x·e^x?', ['u = x', 'u = e^x', 'u = x·e^x', 'u = 1'], 'Derivar x reduz o grau do polinômio e e^x é fácil de integrar.');
  await page.locator('.form-ok').waitFor();
  await page.getByRole('button', { name: 'Criar questão' }).click();
  await fillQ('Na integração por partes, qual escolha de u simplifica a integral de x·e^x ?', ['a', 'b', 'c', 'd'], 'Explicação qualquer com tamanho suficiente.');
  ok('questão quase igual a outra do mesmo assunto é recusada', /muito parecida/.test(await page.getByRole('alert').innerText()));
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await page.getByRole('button', { name: 'Criar questão' }).click();
  await fillQ('Qual é uma primitiva de 1/x para x diferente de zero?', ['ln|x| + C', 'x²/2 + C', '−1/x² + C', 'e^x + C'], 'A derivada de ln|x| é 1/x para todo x diferente de zero.');
  await page.locator('.q-item').nth(1).waitFor();
  ok('as duas questões aparecem como “Criada por você”', (await page.locator('.q-badge.st-criada_aluno').count()) === 2);

  // praticar: filtro estrito e sessão menor quando faltam questões
  await page.locator('#h-practice').scrollIntoViewIfNeeded();
  await page.getByLabel(/^Questões/).selectOption('5');
  ok('com 2 questões, avisa que a sessão terá 2 (sem completar com outros assuntos)', /a sessão terá 2/.test(await page.locator('section', { has: page.locator('#h-practice') }).innerText()));
  await page.getByRole('button', { name: 'Começar (2)' }).click();
  await page.getByRole('heading', { name: 'Questão 1 de 2', exact: true }).waitFor();
  ok('quiz marca a questão como pessoal', /questão pessoal/i.test(await page.locator('.tag').innerText()));
  await page.locator('.choices button').first().click();
  await page.locator('.src-details').last().locator('summary').click();
  ok('fonte e verificação: diz que não houve verificação automática nem revisão humana', /criada por você.*sem revisão humana/i.test(await page.locator('.src-details').last().innerText()));
  await page.getByRole('button', { name: 'Relatar erro' }).click();
  await page.getByRole('button', { name: 'Salvar relato' }).click();
  ok('relato de questão pessoal explica que ela sai das sessões', /fica fora das sessões/.test(await page.locator('main').innerText()));
  await page.screenshot({ path: path.join(SHOTS, 'd-quiz-pessoal.png'), fullPage: true });
  await page.locator('.quizactions button.primary').click();
  await page.locator('.choices button').first().click();
  await page.locator('.quizactions button.primary').click();
  await page.getByRole('heading', { name: 'Revisão questão a questão' }).waitFor();
  const review = await page.locator('main').innerText();
  ok('resultado da sessão pessoal mostra as questões respondidas (cópia da versão respondida)', /x·e\^x/.test(review) && /primitiva de 1\/x/.test(review), review.slice(0, 300));
  await page.goto(BASE + '#/disciplinas');
  await openDiscipline(page, 'Cálculo II (minha)');
  await page.getByRole('button', { name: 'Abrir questões e praticar' }).click();
  await page.locator('.q-item').nth(1).waitFor();
  ok('a questão relatada fica “Com erro relatado” e fora da prática', (await page.locator('.q-badge.st-reportada').count()) === 1 && /1 disponíveis/.test(await page.locator('#h-practice').locator('..').innerText()));
  await page.locator('.q-item', { has: page.locator('.q-badge.st-reportada') }).locator('summary').click();
  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Por que a correta está certa').fill('Explicação revisada: derivar u = x deixa só uma integral de e^x.');
  await page.getByRole('button', { name: 'Salvar' }).click();
  ok('editar cria a versão 2 e devolve a questão às sessões', /versão 2/.test(await page.locator('.form-ok').innerText()) && (await page.locator('.q-badge.st-reportada').count()) === 0);
  ok('sem rolagem horizontal (questões)', await noHScroll(page));
  await page.screenshot({ path: path.join(SHOTS, 'd-questoes.png'), fullPage: true });
  ok('axe-core: Questões sem violações', (await axe(page)).length === 0, await axe(page));

  // excluir o material leva o guia gerado dele
  await page.getByRole('button', { name: 'Cálculo II (minha)' }).click();
  await page.locator('.mat-row', { hasText: 'aula-integrais' }).click();
  await page.getByRole('button', { name: 'Excluir material' }).click();
  ok('confirmação conta o guia que sai junto', /1 guia que o usa/.test(await page.getByRole('alertdialog').innerText()));
  await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click();
  await page.getByRole('heading', { name: 'Cálculo II (minha)' }).waitFor();
  ok('guia derivado sai junto; questões criadas por você ficam', /Nenhum guia ainda/.test(await page.locator('main').innerText()) && /2 disponíveis para praticar/.test(await page.locator('main').innerText()));
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
