// Lote fs-css — CSS: Flexbox, Grid e mobile-first: 8 fáceis (001–008), 8 médias (009–016), 8 difíceis (017–024).
// Base: Aula 02 (README, slides e apostila Aulas 01–02). Verificação REAL: o Chromium monta o layout descrito no
// enunciado (sem rede) e as larguras, posições e estilos computados são medidos e comparados às alternativas.
import { m } from '../../tools/lib/dsl.ts';

const A2 = 'fs-aula-02';
const SL = 'fs-slides-aula02';
const AP = 'fs-apostila-01-02';
const R = (n, o) => ({ d: 'fullstack', topic: 'css', ...o, id: `fs-css-${String(n).padStart(3, '0')}` });
// § = crase (evita escapar ` dentro de String.raw)
const h = (strings, ...v) => m(strings, ...v).replaceAll('§', '`').replaceAll('\\n', '\n');
const web = (html, probe, values, extra = {}) => ({ kind: 'web', params: { html, probe, ...extra }, values });
const page = (css, body) => `<style>body{margin:0}${css}</style>${body}`;
const cards = (n, cls = 'c') => Array.from({ length: n }, (_, i) => `<div class="${cls}" id="${cls}${i + 1}">${i + 1}</div>`).join('');
const el = (id) => `document.getElementById('${id}')`;
const rect = (id) => `${el(id)}.getBoundingClientRect()`;

export default [
  // ---------------- FÁCEIS ----------------
  R(1, {
    diff: 'facil', scope: 'aula', sub: 'display: flex',
    stem: h`Em uma tela de 390 px, o container §.cards-grid§ recebe somente §display: flex;§ e contém três cards com §width: 200px§. O que acontece com os cards?`,
    opts: [h`Ficam lado a lado, na mesma linha, e são espremidos para caber`, [h`Ficam empilhados, um embaixo do outro`, h`§display: flex§ coloca os itens em linha por padrão; empilhados é o comportamento de elementos de bloco sem flex.`], [h`Quebram automaticamente em duas linhas`, h`A quebra de linha só ocorre com §flex-wrap: wrap§; o padrão é §nowrap§.`], [h`Desaparecem até definir §flex-direction§`, h`§flex-direction§ já tem valor padrão (§row§); os itens continuam visíveis.`]],
    exp: h`Com §display: flex§ o container vira um contexto flexível e os filhos são dispostos em linha (eixo principal = horizontal). Como o padrão é §flex-wrap: nowrap§, eles não quebram: como 3×200 px não cabem em 390 px, são encolhidos (§flex-shrink: 1§) — exatamente o que a aula descreve: “sem quebrar linha, eles vão espremer ou vazar da tela”.`,
    src: [[SL, 'flexbox, fatia 1/4: display: flex'], [A2, 'Flexbox na grade de cards']],
    verify: web(page('.g{display:flex}.c{width:200px;height:40px}', `<div class="g">${cards(3)}</div>`), `const t = [1, 2, 3].map((i) => document.getElementById('c' + i).getBoundingClientRect().top); return new Set(t).size === 1 ? 'mesma-linha' : 'varias-linhas';`, ['mesma-linha', 'empilhados', 'duas-linhas', 'somem']),
  }),
  R(2, {
    diff: 'facil', scope: 'aula', sub: 'flex-wrap: wrap',
    stem: h`Um container de 600 px tem §display: flex; flex-wrap: wrap; gap: 24px;§ e três cards com §flex: 0 0 280px§. Em quantas linhas os cards ficam?`,
    opts: [h`2 linhas (2 + 1)`, [h`1 linha`, h`A primeira linha comporta 280 + 24 + 280 = 584 px, mas um terceiro card (mais 304 px) não cabe nos 600 px; com §wrap§ ele desce.`], [h`3 linhas`, h`Dois cards cabem lado a lado (584 px ≤ 600 px), então não é um por linha.`], [h`4 linhas`, h`Só há três cards; o máximo possível seria 3 linhas.`]],
    exp: h`Dois cards ocupam 280 + 24 (gap) + 280 = 584 px, que cabe nos 600 px. Um terceiro exigiria mais 24 + 280 px, e como o container tem §flex-wrap: wrap§ ele passa para a linha de baixo. Resultado: 2 linhas (2 + 1).`,
    src: [[SL, 'flexbox, fatia 2/4: flex-wrap'], [A2, 'Flexbox na grade de cards']],
    verify: web(page('.g{display:flex;flex-wrap:wrap;gap:24px;width:600px}.c{flex:0 0 280px;height:20px}', `<div class="g">${cards(3)}</div>`), `const t = [1, 2, 3].map((i) => document.getElementById('c' + i).getBoundingClientRect().top); return String(new Set(t).size);`, ['2', '1', '3', '4']),
  }),
  R(3, {
    diff: 'facil', scope: 'aula', sub: 'gap',
    stem: h`Dois cards vizinhos estão em um container com §display: flex; gap: var(--espaco-3);§, sendo §--espaco-3: 24px§. Qual é o espaço horizontal entre eles?`,
    opts: [h`24 px`, [h`48 px`, h`O §gap§ aparece uma só vez entre dois itens vizinhos, não dos dois lados de cada um.`], [h`12 px`, h`O §gap§ não é dividido: o valor declarado é o espaço inteiro entre os itens.`], [h`0 px, pois §gap§ só funciona com §margin§`, h`§gap§ funciona sozinho em Flexbox e Grid; não depende de margens.`]],
    exp: h`§gap§ define o espaçamento entre itens vizinhos sem precisar de margens em cada item. Com §gap: 24px§ a distância entre o fim de um card e o início do próximo é exatamente 24 px.`,
    src: [[SL, 'flexbox, fatia 3/4: gap'], [SL, 'design tokens: var(--nome)']],
    verify: web(page(':root{--espaco-3:24px}.g{display:flex;gap:var(--espaco-3)}.c{width:100px;height:20px}', `<div class="g">${cards(2)}</div>`), `return String(Math.round(document.getElementById('c2').getBoundingClientRect().left - document.getElementById('c1').getBoundingClientRect().right));`, ['24', '48', '12', '0']),
  }),
  R(4, {
    diff: 'facil', scope: 'aula', sub: 'Variáveis CSS (design tokens)',
    stem: h`Considere o CSS abaixo. Qual é a cor de fundo aplicada ao §.cabecalho§?\n\n§§§css\n:root {\n  --cor-primaria: #1f6f78;\n  --cor-fundo: #f7f5f0;\n}\n.cabecalho { background: var(--cor-primaria); }\n§§§`,
    opts: [h`#1f6f78 (verde-azulado)`, [h`#f7f5f0 (bege claro)`, h`Esse é o valor de §--cor-fundo§; o §.cabecalho§ usa §--cor-primaria§.`], [h`Nenhuma: precisa declarar a variável dentro de §.cabecalho§`, h`Variáveis declaradas em §:root§ ficam disponíveis (por herança) em todo o documento.`], [h`Transparente, pois §var()§ só funciona dentro de §@media§`, h`§var()§ funciona em qualquer declaração; não depende de media queries.`]],
    exp: h`Variáveis declaradas em §:root§ valem para a página inteira e são lidas com §var(--nome)§. Assim §background: var(--cor-primaria)§ resolve para §#1f6f78§ — e mudar o valor em um único lugar atualiza o projeto todo (a ideia dos “design tokens”).`,
    src: [[SL, 'design tokens: variáveis CSS em :root'], [AP, '2.2 Design tokens']],
    verify: web(page(':root{--cor-primaria:#1f6f78;--cor-fundo:#f7f5f0}.cabecalho{background:var(--cor-primaria)}', '<header class="cabecalho" id="h">x</header>'), `return getComputedStyle(${el('h')}).backgroundColor;`, ['rgb(31, 111, 120)', 'rgb(247, 245, 240)', 'nenhuma', 'rgba(0, 0, 0, 0)']),
  }),
  R(5, {
    diff: 'facil', scope: 'aula', sub: 'Atalho flex',
    stem: h`O que significa a declaração §flex: 1 1 280px;§ aplicada a um card?`,
    opts: [h`§flex-grow: 1§, §flex-shrink: 1§ e §flex-basis: 280px§`, [h`§flex-grow: 1§, §flex-shrink: 0§ e §flex-basis: 280px§`, h`O segundo número é o §flex-shrink§ e vale 1 (o card pode encolher); 0 o impediria de encolher.`], [h`§flex-grow: 0§, §flex-shrink: 1§ e §flex-basis: 280px§`, h`O primeiro número é o §flex-grow§ e vale 1 (o card pode crescer).`], [h`§flex-grow: 1§, §flex-shrink: 1§ e §flex-basis: auto§ com largura máxima de 280px`, h`O terceiro valor é o §flex-basis§ (tamanho ideal inicial) de 280px; §max-width§ é uma propriedade separada.`]],
    exp: h`O atalho §flex§ segue a ordem grow, shrink, basis. A aula resume: “§flex: 1 1 280px§ = §flex-grow: 1; flex-shrink: 1; flex-basis: 280px§” — o card parte de 280 px, pode crescer e pode encolher.`,
    src: [[SL, 'flexbox, fatia 4/4: flex + max-width no item']],
    verify: web(page('.g{display:flex}.c{flex:1 1 280px}', `<div class="g">${cards(1)}</div>`), `const s = getComputedStyle(${el('c1')}); return s.flexGrow + ' ' + s.flexShrink + ' ' + s.flexBasis;`, ['1 1 280px', '1 0 280px', '0 1 280px', '1 1 auto']),
  }),
  R(6, {
    diff: 'facil', scope: 'aula', sub: 'Media query min-width',
    stem: h`Com a janela do navegador em 600 px de largura, qual é o §display§ de §.d§?\n\n§§§css\n.d { display: block; }\n@media (min-width: 768px) {\n  .d { display: none; }\n}\n§§§`,
    opts: [h`§block§ (a media query não se aplica)`, [h`§none§ (a regra da media query se aplica)`, h`§min-width: 768px§ significa “a partir de 768 px”; em 600 px a regra não vale.`], [h`§flex§`, h`Nenhuma regra define §flex§ para §.d§.`], [h`§inline§`, h`O valor declarado fora da media query é §block§, não §inline§.`]],
    exp: h`§@media (min-width: 768px)§ só se aplica quando a largura é 768 px ou mais. Em 600 px vale apenas a regra base (§display: block§). É a lógica mobile-first: o estilo padrão é o do celular, e as media queries acrescentam ajustes para telas maiores.`,
    src: [[SL, 'mobile-first: media query min-width'], [A2, 'Testando responsividade']],
    verify: web(page('.d{display:block}@media (min-width:768px){.d{display:none}}', '<div class="d" id="d">x</div>'), `return getComputedStyle(${el('d')}).display;`, ['block', 'none', 'flex', 'inline'], { width: 600 }),
  }),
  R(7, {
    diff: 'facil', scope: 'aula', sub: 'Grid com fr',
    stem: h`Em um container de 600 px, sem §gap§, com §display: grid; grid-template-columns: 2fr 1fr;§, qual é a largura da primeira coluna?`,
    opts: [h`400 px`, [h`300 px`, h`300 px seria a metade (colunas §1fr 1fr§); com §2fr§ a primeira coluna recebe o dobro da segunda.`], [h`200 px`, h`200 px é a largura da segunda coluna (§1fr§).`], [h`450 px`, h`450 px corresponderia à razão 3:1 (§3fr 1fr§).`]],
    exp: h`As unidades §fr§ dividem o espaço disponível em partes: §2fr 1fr§ forma 3 partes de 200 px (600 ÷ 3); a primeira coluna ocupa 2 partes (400 px) e a segunda, 1 parte (200 px).`,
    src: [[SL, 'grid-template-columns: 2fr 1fr'], [AP, '2.4 CSS Grid mobile-first']],
    verify: web(page('.d{display:grid;grid-template-columns:2fr 1fr;width:600px}.a,.b{height:20px}', '<div class="d"><div class="a" id="a">a</div><div class="b" id="b">b</div></div>'), `return String(Math.round(${rect('a')}.width));`, ['400', '300', '200', '450']),
  }),
  R(8, {
    diff: 'facil', scope: 'aula', sub: 'Comportamento padrão de bloco',
    stem: h`Sem nenhuma regra de layout, os cards (§<article>§) aparecem empilhados. Qual valor padrão de §display§ explica isso?`,
    opts: [h`§block§`, [h`§inline§`, h`Elementos em linha (como §<span>§) ficam lado a lado dentro do texto; o §<article>§ não é assim.`], [h`§flex§`, h`§flex§ precisa ser declarado; não é o padrão de nenhum elemento comum.`], [h`§grid§`, h`§grid§ também precisa ser declarado explicitamente.`]],
    exp: h`Elementos como §<article>§, §<section>§, §<div>§ e §<p>§ têm §display: block§: ocupam a largura toda e cada um começa em uma nova linha. Por isso, antes do CSS, as três seções da página de detalhe aparecem empilhadas na ordem do HTML.`,
    src: [[SL, 'o modelo de caixa flexível: article é elemento de bloco'], [AP, '2.1 Revisão: sem CSS, as seções aparecem empilhadas']],
    verify: web('<article id="a">x</article>', `return getComputedStyle(${el('a')}).display;`, ['block', 'inline', 'flex', 'grid']),
  }),

  // ---------------- MÉDIAS ----------------
  R(9, {
    diff: 'medio', scope: 'aula', sub: 'flex + max-width',
    stem: h`Três cards com §flex: 1 1 280px; max-width: 320px;§ estão em um container de 1000 px com §display: flex; flex-wrap: wrap; gap: 24px;§. Qual é, aproximadamente, a largura de cada card?`,
    opts: [h`317 px`, [h`320 px`, h`320 px é o limite (§max-width§), mas o espaço dividido entre três cards é (1000 − 48) ÷ 3 ≈ 317 px, menor que o limite.`], [h`333 px`, h`333 px = 1000 ÷ 3 ignora os dois §gap§ de 24 px.`], [h`280 px`, h`280 px é só o tamanho ideal inicial (§flex-basis§); como há espaço sobrando, os cards crescem (§flex-grow: 1§).`]],
    exp: h`Cabem 3 cards por linha (3×280 + 2×24 = 888 ≤ 1000, mas 4×280 + 3×24 = 1192 > 1000). O espaço restante é distribuído (§flex-grow: 1§): cada card fica com (1000 − 48) ÷ 3 ≈ 317 px, abaixo do §max-width§ de 320 px, que então não interfere.`,
    src: [[SL, 'flexbox, fatia 4/4: flex + max-width no item'], [A2, 'Flexbox na grade de cards']],
    verify: web(page('.g{display:flex;flex-wrap:wrap;gap:24px;width:1000px}.c{flex:1 1 280px;max-width:320px;height:20px}', `<div class="g">${cards(3)}</div>`), `return String(Math.round(${rect('c1')}.width));`, ['317', '320', '333', '280'], { width: 1100 }),
  }),
  R(10, {
    diff: 'medio', scope: 'aula', sub: 'Cards por linha',
    stem: h`Seis cards com §flex: 1 1 280px; max-width: 320px;§ estão em um container de 1200 px com §flex-wrap: wrap; gap: 24px;§. Quantos cards aparecem na primeira linha?`,
    opts: [h`4`, [h`3`, h`Três cards ocupam 3×280 + 2×24 = 888 px, sobrando espaço; um quarto card (mais 304 px) ainda cabe: 1192 ≤ 1200.`], [h`5`, h`Cinco cards exigiriam 5×280 + 4×24 = 1496 px, que passa de 1200 px.`], [h`6`, h`Seis cards exigiriam 6×280 + 5×24 = 1800 px.`]],
    exp: h`O navegador usa o §flex-basis§ (280 px) para decidir quantos itens cabem: 4×280 + 3×24 = 1192 px ≤ 1200 px, mas 5 itens precisariam de 1496 px. Portanto 4 cards na primeira linha (e 2 na segunda); depois eles crescem até ≈282 px, ainda abaixo do máximo de 320 px.`,
    src: [[SL, 'flexbox: flex-wrap e flex-basis'], [A2, 'Testando responsividade']],
    verify: web(page('.g{display:flex;flex-wrap:wrap;gap:24px;width:1200px}.c{flex:1 1 280px;max-width:320px;height:20px}', `<div class="g">${cards(6)}</div>`), `const tops = [1, 2, 3, 4, 5, 6].map((i) => document.getElementById('c' + i).getBoundingClientRect().top); return String(tops.filter((t) => t === tops[0]).length);`, ['4', '3', '5', '6'], { width: 1300 }),
  }),
  R(11, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Cascata e especificidade',
    stem: h`Qual é a cor do texto do elemento abaixo?\n\n§§§html\n<style>\n  .card { color: blue; }\n  article { color: red; }\n</style>\n<article class="card">Café Aroma</article>\n§§§`,
    opts: [h`Azul`, [h`Vermelho`, h`A regra de classe (§.card§) tem maior especificidade que a de tag (§article§), mesmo vindo antes no arquivo.`], [h`Preto (a cor padrão)`, h`As duas regras se aplicam ao elemento; a cor padrão só vale quando nenhuma regra define §color§.`], [h`Roxo (mistura das duas)`, h`O CSS não mistura cores; uma declaração vence a outra.`]],
    exp: h`Quando duas regras definem a mesma propriedade, vence a de maior especificidade: seletor de classe (§.card§) > seletor de tag (§article§). A ordem no arquivo só desempata quando a especificidade é igual. Por isso o texto é azul.`,
    src: [[A2, 'contexto: CSS com seletores de classe na grade de cards (a regra de especificidade em si é verificada no Chromium)']],
    verify: web('<style>.card{color:blue}article{color:red}</style><article class="card" id="a">Café Aroma</article>', `return getComputedStyle(${el('a')}).color;`, ['rgb(0, 0, 255)', 'rgb(255, 0, 0)', 'rgb(0, 0, 0)', 'rgb(128, 0, 128)']),
  }),
  R(12, {
    diff: 'medio', scope: 'aula', sub: 'grid-template-areas',
    stem: h`Em 800 px de largura, a página de detalhe usa:\n\n§§§css\n.detalhe { display: grid; grid-template-columns: 2fr 1fr;\n  grid-template-areas: "principal resumo" "avaliacoes avaliacoes"; }\n.detalhe-avaliacoes { grid-area: avaliacoes; }\n§§§\nQual é a largura da seção de avaliações (container sem §gap§ e sem margens)?`,
    opts: [h`800 px (ocupa as duas colunas)`, [h`533 px`, h`533 px é a largura da primeira coluna (2fr de 800 px); a área “avaliacoes” se repete nas duas colunas.`], [h`267 px`, h`267 px é a largura da segunda coluna (1fr).`], [h`400 px`, h`400 px corresponderia a colunas iguais (§1fr 1fr§) e a uma área só de uma coluna.`]],
    exp: h`No mapa de áreas, “avaliacoes” aparece nas duas colunas da segunda linha, então a seção que usa §grid-area: avaliacoes§ se estende por ambas e fica com a largura total do container (800 px). É como a aula deixa “avaliações ocupando tudo embaixo” no desktop.`,
    src: [[SL, 'grid: grid-template-areas e grid-area'], [A2, 'CSS Grid mobile-first']],
    verify: web(page('.detalhe{display:grid;grid-template-columns:2fr 1fr;grid-template-areas:"principal resumo" "avaliacoes avaliacoes";width:800px}.p{grid-area:principal}.r{grid-area:resumo}.v{grid-area:avaliacoes}.p,.r,.v{height:20px}', '<div class="detalhe"><section class="p" id="p">p</section><aside class="r" id="r">r</aside><section class="v" id="v">v</section></div>'), `return String(Math.round(${rect('v')}.width));`, ['800', '533', '267', '400'], { width: 900 }),
  }),
  R(13, {
    diff: 'medio', scope: 'aula', sub: 'Mobile-first em Grid',
    stem: h`Com apenas este CSS, em uma tela de 390 px, onde fica o §aside§ (resumo) em relação à seção principal?\n\n§§§css\n.detalhe { display: grid; gap: 24px; }\n@media (min-width: 768px) {\n  .detalhe { grid-template-columns: 2fr 1fr; }\n}\n§§§`,
    opts: [h`Abaixo da seção principal, na mesma coluna`, [h`Ao lado direito da seção principal`, h`As duas colunas só existem a partir de 768 px, dentro da media query.`], [h`Ao lado esquerdo da seção principal`, h`Sem colunas definidas, o grid tem uma só coluna; nada fica lado a lado.`], [h`Sobreposto à seção principal`, h`Os itens do grid ocupam linhas diferentes; não se sobrepõem.`]],
    exp: h`Abaixo de 768 px a media query não vale e o grid tem uma única coluna implícita: os itens ficam empilhados na ordem do HTML (principal, depois resumo). Esse é o ponto do mobile-first: o estado padrão já é o layout de celular correto.`,
    src: [[SL, 'mobile-first: grid-template-columns só dentro da media query'], [A2, 'Testando responsividade']],
    verify: web(page('.detalhe{display:grid;gap:24px}@media (min-width:768px){.detalhe{grid-template-columns:2fr 1fr}}.p,.r{height:30px}', '<div class="detalhe"><section class="p" id="p">p</section><aside class="r" id="r">r</aside></div>'), `const p = ${rect('p')}; const r = ${rect('r')}; return r.top >= p.bottom ? 'abaixo' : r.left > p.left ? 'direita' : r.left < p.left ? 'esquerda' : 'sobreposto';`, ['abaixo', 'direita', 'esquerda', 'sobreposto'], { width: 390 }),
  }),
  R(14, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Modelo de caixa',
    stem: h`Um bloco tem §width: 300px; padding: 20px; border: 2px solid;§ e o padrão §box-sizing: content-box§. Qual é a largura total que ele ocupa na tela?`,
    opts: [h`344 px`, [h`300 px`, h`300 px seria a largura total apenas com §box-sizing: border-box§; no padrão, §width§ é só a largura do conteúdo.`], [h`340 px`, h`340 px soma só os dois paddings (20×2) e esquece as bordas (2×2).`], [h`324 px`, h`324 px conta o padding de um só lado; os dois lados (40 px) e as bordas (4 px) somam ao conteúdo.`]],
    exp: h`No modelo padrão, §width§ refere-se ao conteúdo; o tamanho final é conteúdo + padding + borda: 300 + (20×2) + (2×2) = 344 px. Por isso é comum usar §box-sizing: border-box§, que inclui padding e borda dentro do §width§.`,
    src: [[SL, 'critérios de aceite: nenhum card ultrapassa a largura máxima (o cálculo do modelo de caixa foi medido no Chromium)']],
    verify: web(page('.b{width:300px;padding:20px;border:2px solid;height:10px}', '<div class="b" id="b"></div>'), `return String(${el('b')}.offsetWidth);`, ['344', '300', '340', '324']),
  }),
  R(15, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Unidade rem',
    stem: h`Com §html { font-size: 16px; }§ e §.titulo { font-size: 1.5rem; }§, qual é o tamanho de fonte aplicado a §.titulo§?`,
    opts: [h`24 px`, [h`16 px`, h`16 px é o valor de §1rem§; §1.5rem§ é uma vez e meia esse valor.`], [h`1,5 px`, h`§rem§ multiplica o tamanho da fonte da raiz; não é um valor absoluto em pixels.`], [h`18 px`, h`18 px seria §1.125rem§ (18 ÷ 16).`]],
    exp: h`§rem§ é relativo ao §font-size§ do elemento raiz (§html§). Com 16 px na raiz, §1.5rem§ = 1,5 × 16 = 24 px. Mudando a fonte-base, todos os tamanhos em §rem§ acompanham.`,
    src: [[AP, '2.2 Design tokens: contexto de unidades e valores do projeto (a unidade rem em si foi medida no Chromium)']],
    verify: web(page('html{font-size:16px}.titulo{font-size:1.5rem}', '<h1 class="titulo" id="t">x</h1>'), `return getComputedStyle(${el('t')}).fontSize;`, ['24px', '16px', '1.5px', '18px']),
  }),
  R(16, {
    diff: 'medio', scope: 'aprofundamento', sub: 'justify-content',
    stem: h`Em um container flex de 600 px de largura, com dois itens de 100 px e §justify-content: space-between;§, a que distância da esquerda do container começa o segundo item?`,
    opts: [h`500 px`, [h`300 px`, h`300 px seria com §justify-content: center§ (os dois itens agrupados no meio).`], [h`100 px`, h`100 px seria com §flex-start§ (itens colados no início).`], [h`400 px`, h`400 px seria com §space-around§, que deixa meio espaço nas pontas.`]],
    exp: h`§space-between§ cola o primeiro item no início e o último no fim, distribuindo o espaço livre entre eles. Os itens ocupam 200 px; sobram 400 px, todos entre os dois. O segundo item termina em 600 px, então começa em 500 px.`,
    src: [[SL, 'flexbox: eixo principal'], [A2, 'O modelo de caixa flexível']],
    verify: web(page('.g{display:flex;justify-content:space-between;width:600px}.c{width:100px;height:20px}', `<div class="g">${cards(2)}</div>`), `return String(Math.round(${rect('c2')}.left));`, ['500', '300', '100', '400']),
  }),

  // ---------------- DIFÍCEIS ----------------
  R(17, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'flex-shrink e itens rígidos',
    stem: h`Em um container flex de 400 px (sem gap), o item A tem §flex: 0 0 200px§ e os itens B e C têm §flex: 1 1 200px§. Quais são as larguras de A, B e C?`,
    opts: [h`200, 100 e 100 px`, [h`133, 133 e 133 px`, h`Os três só encolheriam por igual se todos tivessem §flex-shrink: 1§; A tem §0§ e mantém 200 px.`], [h`200, 200 e 200 px`, h`Isso somaria 600 px, mais que os 400 px do container; B e C precisam encolher.`], [h`200, 150 e 50 px`, h`O encolhimento é proporcional ao §flex-shrink§ e ao tamanho-base; B e C têm os mesmos valores, logo encolhem igual.`]],
    exp: h`A soma das bases é 600 px, mas o container tem 400 px: faltam 200 px. O item A (§flex-shrink: 0§) não encolhe. B e C, com mesmo fator e mesma base, absorvem o déficit igualmente: cada um perde 100 px. Larguras finais: 200, 100 e 100 px.`,
    src: [[SL, 'flexbox, fatia 4/4: flex-grow, flex-shrink e flex-basis']],
    verify: web(page('.g{display:flex;width:400px}.a{flex:0 0 200px}.b,.c{flex:1 1 200px}.a,.b,.c{height:20px}', '<div class="g"><div class="a" id="a">A</div><div class="b" id="b">B</div><div class="c" id="c">C</div></div>'), `return ['a', 'b', 'c'].map((i) => Math.round(document.getElementById(i).getBoundingClientRect().width)).join(',');`, ['200,100,100', '133,133,133', '200,200,200', '200,150,50']),
  }),
  R(18, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'flex-grow proporcional',
    stem: h`Em um container flex de 600 px, três itens têm §flex-basis: 100px§ e §flex-grow§ de 1, 2 e 3, respectivamente. Quais são as larguras finais?`,
    opts: [h`150, 200 e 250 px`, [h`100, 200 e 300 px`, h`Isso distribuiria o espaço total na razão 1:2:3, ignorando a base de 100 px; o §flex-grow§ só reparte o espaço *livre*.`], [h`200, 200 e 200 px`, h`Larguras iguais exigiriam o mesmo §flex-grow§ para todos.`], [h`100, 100 e 100 px`, h`Sem crescer, sobrariam 300 px; mas os itens têm §flex-grow§ maior que 0 e ocupam o espaço livre.`]],
    exp: h`As bases somam 300 px; o espaço livre é 600 − 300 = 300 px, dividido na razão 1:2:3 (6 partes de 50 px): +50, +100 e +150 px. Larguras finais: 100+50 = 150, 100+100 = 200 e 100+150 = 250 px.`,
    src: [[SL, 'flexbox, fatia 4/4: flex-grow']],
    verify: web(page('.g{display:flex;width:600px}.c{flex-basis:100px;height:20px}#c1{flex-grow:1}#c2{flex-grow:2}#c3{flex-grow:3}', `<div class="g">${cards(3)}</div>`), `return [1, 2, 3].map((i) => Math.round(document.getElementById('c' + i).getBoundingClientRect().width)).join(',');`, ['150,200,250', '100,200,300', '200,200,200', '100,100,100']),
  }),
  R(19, {
    diff: 'dificil', scope: 'desafio', sub: 'Ordem das media queries',
    stem: h`Em uma janela de 1100 px, qual é a cor de §.t§?\n\n§§§css\n.t { color: red; }\n@media (min-width: 1024px) { .t { color: green; } }\n@media (min-width: 768px)  { .t { color: blue; } }\n§§§`,
    opts: [h`Azul`, [h`Verde`, h`As duas media queries se aplicam em 1100 px; com a mesma especificidade vence a que vem *depois* no arquivo (azul).`], [h`Vermelho`, h`Em 1100 px as duas media queries são verdadeiras, então a regra base é sobrescrita.`], [h`Preto`, h`§color§ está definida em todas as regras; o preto é só o padrão do navegador.`]],
    exp: h`Media queries não aumentam a especificidade: em 1100 px tanto §min-width: 1024px§ quanto §min-width: 768px§ são verdadeiras e as duas regras têm a mesma especificidade, então vence a última escrita (azul). Em mobile-first as consultas §min-width§ devem ser escritas em ordem crescente (768 px antes de 1024 px) para que a maior ganhe.`,
    src: [[SL, 'mobile-first: media queries com min-width']],
    verify: web(page('.t{color:red}@media (min-width:1024px){.t{color:green}}@media (min-width:768px){.t{color:blue}}', '<p class="t" id="t">x</p>'), `return getComputedStyle(${el('t')}).color;`, ['rgb(0, 0, 255)', 'rgb(0, 128, 0)', 'rgb(255, 0, 0)', 'rgb(0, 0, 0)'], { width: 1100 }),
  }),
  R(20, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Escopo de variáveis CSS',
    stem: h`Qual é a cor do texto do parágrafo dentro do card?\n\n§§§css\n:root { --cor: red; }\n.card { --cor: blue; }\np { color: var(--cor); }\n§§§\n§§§html\n<p>Fora</p>\n<div class="card"><p>Dentro</p></div>\n§§§`,
    opts: [h`Azul (o valor de §--cor§ redefinido em §.card§)`, [h`Vermelho (o valor de §:root§)`, h`Variáveis são herdadas, mas uma redefinição mais próxima (em §.card§) sobrescreve a de §:root§ para os descendentes.`], [h`Preto, porque §var()§ não funciona em §p§`, h`§var()§ funciona em qualquer elemento; o parágrafo herda o valor de §--cor§.`], [h`Inválida: não é permitido declarar a mesma variável duas vezes`, h`Redeclarar uma variável em outro escopo é permitido e é o recurso que permite temas por componente.`]],
    exp: h`Propriedades personalizadas são herdadas e seguem a cascata: o parágrafo “Dentro” herda §--cor§ do ancestral mais próximo que a define (§.card§ = azul), enquanto o “Fora” usa a de §:root§ (vermelho). Declarar a variável em §:root§ cria o valor padrão (design token), e qualquer componente pode sobrescrevê-lo localmente.`,
    src: [[SL, 'design tokens: variáveis em :root'], [AP, '2.2 Design tokens']],
    verify: web('<style>:root{--cor:red}.card{--cor:blue}p{color:var(--cor)}</style><p id="f">Fora</p><div class="card"><p id="d">Dentro</p></div>', `return getComputedStyle(${el('d')}).color;`, ['rgb(0, 0, 255)', 'rgb(255, 0, 0)', 'rgb(0, 0, 0)', 'invalida']),
  }),
  R(21, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'fr com gap',
    stem: h`Um grid com §grid-template-columns: 2fr 1fr;§ e §gap: 30px§ tem 630 px de largura. Qual é a largura da primeira coluna?`,
    opts: [h`400 px`, [h`420 px`, h`420 px = 630 × 2/3 ignora o gap; o §gap§ é descontado antes de dividir o espaço em §fr§.`], [h`380 px`, h`380 px não corresponde a nenhuma divisão correta (seria subtrair 30 px de 410).`], [h`315 px`, h`315 px é metade do container, como em §1fr 1fr§ sem gap.`]],
    exp: h`O espaço para as colunas é 630 − 30 (gap) = 600 px, dividido em 3 partes de 200 px. A primeira coluna ocupa 2fr = 400 px e a segunda, 1fr = 200 px; juntas e com o gap somam 630 px.`,
    src: [[SL, 'grid-template-columns: 2fr 1fr e gap'], [AP, '2.4 CSS Grid mobile-first']],
    verify: web(page('.d{display:grid;grid-template-columns:2fr 1fr;gap:30px;width:630px}.a,.b{height:20px}', '<div class="d"><div class="a" id="a">a</div><div class="b" id="b">b</div></div>'), `return String(Math.round(${rect('a')}.width));`, ['400', '420', '380', '315']),
  }),
  R(22, {
    diff: 'dificil', scope: 'desafio', sub: 'Rolagem horizontal e box-sizing',
    stem: h`Em uma tela de 390 px (corpo sem margem), um bloco tem §width: 100%; padding: 20px;§ e o padrão §box-sizing: content-box§. Qual é a largura total ocupada pelo bloco, e o que isso causa?`,
    opts: [h`430 px — passa da tela e gera rolagem horizontal`, [h`390 px — cabe exatamente na tela`, h`Com §content-box§ os 20 px de padding de cada lado somam ao 100% do conteúdo; só caberia com §border-box§.`], [h`350 px — o padding é descontado da largura`, h`O desconto do padding dentro do §width§ só ocorre com §box-sizing: border-box§.`], [h`410 px — só o padding da direita é somado`, h`Os dois lados contam (20 + 20 = 40 px).`]],
    exp: h`Com §content-box§, §width: 100%§ é a largura do conteúdo (390 px); o padding dos dois lados (40 px) vem em cima: 430 px, que ultrapassa os 390 px da tela e cria rolagem horizontal — justamente o que o critério de aceite “nenhuma rolagem horizontal” procura evitar. A correção usual é §box-sizing: border-box§.`,
    src: [[SL, 'critérios de aceite: nenhuma rolagem horizontal em nenhuma largura de tela']],
    verify: web(page('.x{width:100%;padding:20px;height:20px}', '<div class="x" id="x"></div>'), `return String(${el('x')}.offsetWidth);`, ['430', '390', '350', '410'], { width: 390 }),
  }),
  R(23, {
    diff: 'dificil', scope: 'desafio', sub: 'Propriedade order',
    stem: h`Três itens flex estão no HTML na ordem A, B, C (cada um com 50 px de largura). Se apenas o item C receber §order: -1;§, em que ordem eles aparecem da esquerda para a direita?`,
    opts: [h`C, A, B`, [h`A, B, C`, h`Sem §order§ seria assim; §order: -1§ coloca o item antes dos demais (o padrão é 0).`], [h`A, C, B`, h`Valores negativos vão para o *início*; C não fica entre A e B.`], [h`B, A, C`, h`§order§ de C não afeta a posição relativa de A e B, que continuam A antes de B.`]],
    exp: h`Itens flex são ordenados pelo valor de §order§ (padrão 0) e, em caso de empate, pela ordem do HTML. C tem −1, menor que 0, então vem primeiro: C, A, B. Atenção: isso muda só a ordem visual; a ordem do DOM (e do teclado/leitores de tela) continua A, B, C.`,
    src: [[A2, 'O modelo de caixa flexível: eixo principal e itens']],
    verify: web(page('.g{display:flex}.c{width:50px;height:20px}#c3{order:-1}', '<div class="g"><div class="c" id="c1">A</div><div class="c" id="c2">B</div><div class="c" id="c3">C</div></div>'), `return ['c1', 'c2', 'c3'].sort((x, y) => document.getElementById(x).getBoundingClientRect().left - document.getElementById(y).getBoundingClientRect().left).map((i) => document.getElementById(i).textContent).join(',');`, ['C,A,B', 'A,B,C', 'A,C,B', 'B,A,C']),
  }),
  R(24, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Eixo principal em coluna',
    stem: h`Um container flex de 300 px de altura tem §flex-direction: column; justify-content: center;§ e um único item de 100 px de altura. A que distância do topo do container o item fica?`,
    opts: [h`100 px`, [h`0 px`, h`0 px seria o início do eixo principal (§flex-start§); com §center§ o item fica no meio.`], [h`200 px`, h`200 px seria o item colado ao fundo (§flex-end§).`], [h`150 px`, h`150 px é o centro do container, mas o item de 100 px é centralizado pelo seu meio: (300 − 100) ÷ 2 = 100 px.`]],
    exp: h`Em §flex-direction: column§ o eixo principal é vertical, e §justify-content§ age nele. O espaço livre é 300 − 100 = 200 px, repartido igualmente acima e abaixo: 100 px em cada lado, logo o item começa a 100 px do topo.`,
    src: [[A2, 'O modelo de caixa flexível: eixo principal e cruzado']],
    verify: web(page('.g{display:flex;flex-direction:column;justify-content:center;height:300px}.c{height:100px}', '<div class="g"><div class="c" id="c">x</div></div>'), `return String(Math.round(${rect('c')}.top));`, ['100', '0', '200', '150']),
  }),
];
