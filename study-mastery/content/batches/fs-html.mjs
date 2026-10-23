// Lote fs-html — HTML semântico e Emmet: 7 fáceis (001–007), 7 médias (008–014), 6 difíceis (015–020).
// Base: Aula 01 (README, slides e apostila Aulas 01–02). Verificação REAL:
//  - kind 'web': o Chromium calcula roles/landmarks (árvore de acessibilidade), estilos e layout;
//  - kind 'node': a biblioteca oficial `emmet` expande as abreviações do enunciado.
import { m } from '../../tools/lib/dsl.ts';

const A1 = 'fs-aula-01';
const SL = 'fs-slides-aula01';
const AP = 'fs-apostila-01-02';
const R = (n, o) => ({ d: 'fullstack', topic: 'html', ...o, id: `fs-html-${String(n).padStart(3, '0')}` });
// § = crase (evita escapar ` dentro de String.raw)
const h = (strings, ...v) => m(strings, ...v).replaceAll('§', '`');
const web = (html, probe, values, extra = {}) => ({ kind: 'web', params: { html, probe, ...extra }, values });
const emmet = (abbr, values) => ({ kind: 'node', params: { code: `import expand from 'emmet';\nconsole.log(expand(${JSON.stringify(abbr)}).replace(/\\n\\s*/g, ''));` }, values });
// função de probe: devolve o texto que aparece depois do ROLE na árvore de acessibilidade (ex.: "- main: palavra")
const landmark = (role) => `const s = window.__aria; const r = s.match(/- ${role}[^\\n]*?[:\\s"]+([A-Za-z0-9_À-ÿ-]+)/); return r ? r[1] : 'nenhum';`;

export default [
  // ---------------- FÁCEIS ----------------
  R(1, {
    diff: 'facil', scope: 'aula', sub: 'Landmark main',
    stem: h`Qual tag HTML5 deve envolver o conteúdo principal e exclusivo de cada página (aquele que não se repete entre as páginas, como menu e rodapé)?`,
    opts: [h`§<main>§`, [h`§<section>§`, h`§<section>§ agrupa um trecho temático; não cria o marco “conteúdo principal” para leitores de tela.`], [h`§<article>§`, h`§<article>§ é para conteúdo independente e reutilizável (como um card), não para a área principal da página.`], [h`§<div>§`, h`§<div>§ é só um contêiner de layout, sem significado semântico.`]],
    exp: h`§<main>§ delimita o conteúdo principal da página; o navegador o expõe como o marco (landmark) “main”, o que permite aos leitores de tela pularem direto para ele. No projeto da aula, o título e a grade de cards ficam dentro de §<main>§, e o cabeçalho e o rodapé ficam fora.`,
    src: [[SL, 'passo 3: main envolve o conteúdo específico da página'], [A1, 'tags semânticas vs. “sopa de div”']],
    verify: web('<div>div</div><section>section</section><article>article</article><main>main</main>', landmark('main'), ['main', 'section', 'article', 'div'], { aria: 'body' }),
  }),
  R(2, {
    diff: 'facil', scope: 'aula', sub: 'Landmark navigation',
    stem: h`Qual tag marca o bloco de links de navegação principal dentro do cabeçalho do site?`,
    opts: [h`§<nav>§`, [h`§<menu>§`, h`§<menu>§ representa uma lista de comandos/ações; não é o marco de navegação do site.`], [h`§<links>§`, h`Não existe a tag §<links>§ no HTML; o navegador a trata como elemento desconhecido.`], [h`§<ul>§`, h`§<ul>§ é só uma lista; sozinha não identifica o bloco como navegação.`]],
    exp: h`§<nav>§ identifica um conjunto de links de navegação e é exposta como o marco “navigation”. No cabeçalho da aula usamos §<header>§ com a logo e um §<nav>§ com os links (“Lugares”).`,
    src: [[SL, 'passo 2: header com logo + nav'], [A1, 'tags semânticas']],
    verify: web('<nav>nav</nav><menu><li>menu</li></menu><ul><li>ul</li></ul><links>links</links>', landmark('navigation'), ['nav', 'menu', 'links', 'ul'], { aria: 'body' }),
  }),
  R(3, {
    diff: 'facil', scope: 'aula', sub: 'Emmet: filho e multiplicação',
    stem: h`No VS Code, o que o Emmet gera ao expandir a abreviação §ul>li*3§?`,
    opts: [h`§<ul><li></li><li></li><li></li></ul>§`, [h`§<ul></ul><li></li><li></li><li></li>§`, h`Isso seria o resultado de §ul+li*3§: com §+§ os itens ficam como irmãos da lista, fora dela.`], [h`§<ul><li></li></ul><ul><li></li></ul><ul><li></li></ul>§`, h`Isso seria §ul*3>li§. Aqui o §*3§ se aplica ao §li§, não ao §ul§.`], [h`§<ul><li>3</li></ul>§`, h`O §*3§ multiplica o elemento; não escreve o número no texto (para texto usa-se §{...}§).`]],
    exp: h`§>§ coloca o elemento dentro do anterior e §*3§ repete o elemento imediatamente anterior (§li§) três vezes. Resultado: um §<ul>§ com três §<li>§ vazios.`,
    src: [[SL, 'cheat sheet: > filho, *n multiplicação'], [AP, 'tabela de sintaxe Emmet']],
    verify: emmet('ul>li*3', ['<ul><li></li><li></li><li></li></ul>', '<ul></ul><li></li><li></li><li></li>', '<ul><li></li></ul><ul><li></li></ul><ul><li></li></ul>', '<ul><li>3</li></ul>']),
  }),
  R(4, {
    diff: 'facil', scope: 'aula', sub: 'História do HTML',
    stem: h`Segundo a linha do tempo vista na Aula 01, qual afirmação sobre a evolução do HTML está correta?`,
    opts: [h`Em 2014 o W3C publicou o HTML5 como Recomendação oficial, trazendo tags semânticas como §<header>§, §<nav>§ e §<main>§.`, [h`O HTML5 foi o primeiro padrão formal do HTML, publicado pelo IETF em 1995.`, h`O padrão publicado pelo IETF em 1995 foi o HTML 2.0; o HTML5 só virou Recomendação em 2014.`], [h`O WHATWG foi criado em 2004 pelo próprio W3C para escrever o XHTML 2.`, h`O WHATWG foi fundado por Mozilla, Apple e Opera, insatisfeitas com os rumos do W3C (que apostava no XHTML2).`], [h`Desde 2019 o HTML deixou de ter especificação e é definido apenas pelos navegadores.`, h`Desde 2019 o WHATWG mantém o “HTML Living Standard”, uma especificação viva e contínua.`]],
    exp: h`A linha do tempo da aula: 1989–1991 primeira versão (Tim Berners-Lee, CERN); 1995 HTML 2.0 (IETF); 1997–1999 HTML 3.2 e 4.01 (W3C); 2000 XHTML; 2004 fundação do WHATWG; 2014 HTML5 como Recomendação do W3C; 2019 em diante, HTML Living Standard mantido pelo WHATWG.`,
    src: [[SL, 'parte 1: linha do tempo do HTML'], [AP, '1.1 Uma história rápida do HTML']],
    verify: { kind: 'source', claims: [h`Slide 3: “2014 — O W3C publica o HTML5 como Recomendação oficial.” e “O HTML5 introduziu as tags semânticas (header, nav, main, article, footer)”.`, h`Slide 3: “1995 — HTML 2.0 vira o primeiro padrão formal, publicado pelo IETF”; “2004 — Mozilla, Apple e Opera fundam o WHATWG”.`, h`Slide 5: “Desde 2019 ... o WHATWG mantém o HTML Living Standard”.`] },
  }),
  R(5, {
    diff: 'facil', scope: 'aula', sub: 'Atributo lang',
    stem: h`Depois de digitar §!§ + Tab no VS Code, o Emmet gera §<html lang="en">§. Por que o projeto da aula troca esse valor por §lang="pt-BR"§?`,
    opts: [h`Para declarar o idioma do conteúdo, o que ajuda leitores de tela, tradutores e corretores ortográficos`, [h`Para o navegador converter o texto automaticamente para o português`, h`O atributo §lang§ apenas informa o idioma; não traduz nada sozinho.`], [h`Para definir a codificação de caracteres da página`, h`A codificação é definida por §<meta charset="UTF-8">§, não por §lang§.`], [h`Para tornar a página responsiva em telas pequenas`, h`A responsividade depende da meta §viewport§ e do CSS; §lang§ não interfere no layout.`]],
    exp: h`O Emmet não sabe em que idioma a página está escrita, então a aula ajusta “na mão” duas coisas: o §lang§ (de §en§ para §pt-BR§) e o §<title>§. O §lang§ declara o idioma do documento, usado por tecnologias assistivas (pronúncia correta), tradutores automáticos e pelo seletor CSS §:lang()§.`,
    src: [[SL, 'passo 1: ajustar lang e title na mão'], [AP, 'Passo 1 — Esqueleto HTML5']],
    verify: { kind: 'source', claims: [h`Slide 19 (passo 1): “Depois do ! ajustamos duas coisas que o Emmet não adivinha: idioma e título” — de lang="en" para lang="pt-BR" e <title>Avaliações | Lugares</title>.`, h`Apostila Passo 1: “o lang="en" vira lang="pt-BR", e o <title> recebe o nome real da página”.`] },
  }),
  R(6, {
    diff: 'facil', scope: 'aula', sub: 'Entidades HTML',
    stem: h`No link “Voltar para lugares” do exercício, o texto começa com §&larr;§. Que caractere o navegador exibe?`,
    opts: [h`←`, [h`→`, h`§&rarr;§ é a seta para a direita; §&larr;§ (“left arrow”) é a seta para a esquerda.`], [h`↑`, h`A seta para cima é §&uarr;§.`], [h`↓`, h`A seta para baixo é §&darr;§.`]],
    exp: h`§&larr;§ é a entidade HTML da seta para a esquerda (←). Entidades começam com §&§ e terminam com §;§, permitindo escrever caracteres especiais sem depender do teclado.`,
    src: [[AP, '1.5: &larr; é a entidade HTML para a seta ←']],
    verify: web('<p id="x">&larr;</p>', "return document.getElementById('x').textContent;", ['←', '→', '↑', '↓']),
  }),
  R(7, {
    diff: 'facil', scope: 'aula', sub: 'Atributos data-*',
    stem: h`Cada card tem §data-categoria="cafeteria"§. Qual seletor CSS estiliza apenas os cards dessa categoria?`,
    opts: [h`§.card[data-categoria="cafeteria"]§`, [h`§.card.data-categoria-cafeteria§`, h`Isso procuraria uma classe chamada §data-categoria-cafeteria§, que não existe; atributos são selecionados com colchetes.`], [h`§.card#cafeteria§`, h`§#§ seleciona por §id§; o card não tem §id="cafeteria"§.`], [h`§.card:data(cafeteria)§`, h`Não existe a pseudoclasse §:data()§ no CSS; a regra inteira é inválida e ignorada.`]],
    exp: h`Atributos §data-*§ são lidos no CSS por seletores de atributo: §[data-categoria="cafeteria"]§. A apostila explica que esse atributo permite colorir o banner de cada card por categoria sem alterar o HTML de novo.`,
    src: [[AP, 'Passo 5: os dois papéis do data-categoria']],
    verify: web('<style>.card[data-categoria="cafeteria"]{background:rgb(1,1,1)}.card.data-categoria-cafeteria{background:rgb(2,2,2)}.card#cafeteria{background:rgb(3,3,3)}.card:data(cafeteria){background:rgb(4,4,4)}</style><article class="card" data-categoria="cafeteria" id="c">x</article>', "return getComputedStyle(document.getElementById('c')).backgroundColor;", ['rgb(1, 1, 1)', 'rgb(2, 2, 2)', 'rgb(3, 3, 3)', 'rgb(4, 4, 4)']),
  }),

  // ---------------- MÉDIAS ----------------
  R(8, {
    diff: 'medio', scope: 'aprofundamento', sub: 'header como landmark banner',
    stem: h`No trecho abaixo, qual dos §<header>§ é exposto aos leitores de tela como o marco “banner” (cabeçalho do site)?

§§§html
<header>TOPO</header>
<main>
  <article>
    <header>INTERNO</header>
    <h2>Café Aroma</h2>
  </article>
</main>
§§§`,
    opts: [h`Apenas o §<header>§ de TOPO, filho direto do §<body>§`, [h`Apenas o §<header>§ de INTERNO, dentro do §<article>§`, h`Dentro de §<article>§, §<section>§ ou §<main>§ o §<header>§ é apenas o cabeçalho daquele bloco, não o banner do site.`], [h`Os dois, pois toda tag §<header>§ vira banner`, h`Só o §<header>§ que não está dentro de um bloco sectioning/main é o banner; o interno não é.`], [h`Nenhum, pois o banner exige §role="banner"§ explícito`, h`Não é preciso §role§: o §<header>§ do topo já recebe o papel “banner” automaticamente.`]],
    exp: h`O §<header>§ só é o marco “banner” quando pertence ao site/página inteira (filho do §<body>§). Dentro de um §<article>§ ele funciona apenas como cabeçalho daquele conteúdo e não vira marco — por isso o §<header>§ da logo/menu fica no topo, e cada card pode ter sua própria introdução sem poluir a navegação por marcos.`,
    src: [[SL, 'passo 2: header do site'], [A1, 'tags semânticas']],
    verify: web('<header>TOPO</header><main><article><header>INTERNO</header><h2>Café Aroma</h2></article></main>', "const s = window.__aria; const a = /- banner[^\\n]*TOPO/.test(s); const b = /- banner[^\\n]*INTERNO/.test(s); return a && b ? 'ambos' : a ? 'TOPO' : b ? 'INTERNO' : 'nenhum';", ['TOPO', 'INTERNO', 'ambos', 'nenhum'], { aria: 'body' }),
  }),
  R(9, {
    diff: 'medio', scope: 'aprofundamento', sub: 'section e região nomeada',
    stem: h`Na página de detalhe há duas §<section>§: uma sem nome (§<section>§) e outra com §aria-label="Avaliações"§. Como o navegador as expõe aos leitores de tela?`,
    opts: [h`Só a §<section>§ com nome acessível vira “region”`, [h`As duas viram o marco “region”, sempre`, h`Sem nome acessível a §<section>§ não é exposta como região (marcos sem nome seriam ruído).`], [h`Nenhuma delas: §<section>§ nunca vira marco`, h`Com §aria-label§ (ou §aria-labelledby§) a §<section>§ passa a ser um marco “region”.`], [h`Só a primeira §<section>§ dentro do §<main>§`, h`A posição no documento não decide; o que importa é ter nome acessível.`]],
    exp: h`Uma §<section>§ só é exposta como marco “region” quando tem nome acessível (por §aria-label§ ou §aria-labelledby§). Sem nome, ela é apenas um agrupamento. Por isso, ao usar §<section>§ no projeto, vale dar um título (§<h2>§) e ligá-lo à seção quando ela for relevante para navegação por marcos.`,
    src: [[AP, '1.5: section.detalhe-avaliacoes com título'], [A1, 'diferenciar section e div']],
    verify: web('<main><section>SEMNOME<p>texto</p></section><section aria-label="Avaliações">COMNOME<p>texto</p></section></main>', "const s = window.__aria; const n = (s.match(/- region/g) || []).length; const nomeada = /- region \"Avaliações\"/.test(s); return n === 1 && nomeada ? 'so-nomeada' : n === 2 ? 'duas' : n === 0 ? 'nenhuma' : 'outra';", ['so-nomeada', 'duas', 'nenhuma', 'outra'], { aria: 'body' }),
  }),
  R(10, {
    diff: 'medio', scope: 'aula', sub: 'Emmet: navegação',
    stem: h`Qual HTML resulta da abreviação §nav.menu>ul>li*2>a§?`,
    opts: [h`§<nav class="menu"><ul><li><a href=""></a></li><li><a href=""></a></li></ul></nav>§`, [h`§<nav class="menu"><ul><li></li><li></li></ul><a href=""></a></nav>§`, h`O §>§ final aninha o §a§ dentro de cada §li§; aqui o §a§ ficou solto fora da lista.`], [h`§<nav class="menu"><ul><li><a href=""></a></li></ul></nav>§`, h`O §*2§ se aplica ao §li§ (e ao §a§ dentro dele): devem existir dois itens, não um.`], [h`§<nav id="menu"><ul><li><a href=""></a></li><li><a href=""></a></li></ul></nav>§`, h`§.menu§ gera §class="menu"§; para §id§ seria §#menu§.`]],
    exp: h`Lendo da esquerda para a direita: §nav.menu§ cria o §<nav class="menu">§; §>ul§ aninha a lista; §>li*2§ cria dois itens dentro dela; §>a§ coloca um link dentro de cada item (o Emmet inclui §href=""§ nas âncoras).`,
    src: [[SL, 'sintaxe: tag.classe, >, *n'], [AP, 'tabela de sintaxe Emmet']],
    verify: emmet('nav.menu>ul>li*2>a', ['<nav class="menu"><ul><li><a href=""></a></li><li><a href=""></a></li></ul></nav>', '<nav class="menu"><ul><li></li><li></li></ul><a href=""></a></nav>', '<nav class="menu"><ul><li><a href=""></a></li></ul></nav>', '<nav id="menu"><ul><li><a href=""></a></li><li><a href=""></a></li></ul></nav>']),
  }),
  R(11, {
    diff: 'medio', scope: 'aula', sub: 'Emmet: irmão e subir de nível',
    stem: h`A abreviação §div>h2+p^footer§ gera:`,
    opts: [h`§<div><h2></h2><p></p></div><footer></footer>§`, [h`§<div><h2></h2><p></p><footer></footer></div>§`, h`Sem o §^§, o §footer§ seria irmão do §p§ (dentro da div); o §^§ sobe um nível, tornando-o irmão da §div§.`], [h`§<div><h2></h2></div><p></p><footer></footer>§`, h`O §+§ entre §h2§ e §p§ os mantém irmãos dentro da §div§; só o §^§ sai dela.`], [h`§<div><h2><p></p></h2></div><footer></footer>§`, h`§+§ cria irmãos; para colocar o §p§ dentro do §h2§ seria §>§ (e não faria sentido semântico).`]],
    exp: h`§div>h2+p§ gera uma §div§ contendo §h2§ e §p§ lado a lado (§+§ = irmão). O operador §^§ sobe um nível na hierarquia, então §footer§ é criado depois da §div§, no mesmo nível dela.`,
    src: [[SL, 'sintaxe: > filho, + irmão'], [AP, 'tabela de sintaxe Emmet']],
    verify: emmet('div>h2+p^footer', ['<div><h2></h2><p></p></div><footer></footer>', '<div><h2></h2><p></p><footer></footer></div>', '<div><h2></h2></div><p></p><footer></footer>', '<div><h2><p></p></h2></div><footer></footer>']),
  }),
  R(12, {
    diff: 'medio', scope: 'aula', sub: 'Emmet: numeração com $',
    stem: h`Qual é o resultado de §li.item$*3{Item $}§ no Emmet?`,
    opts: [h`§<li class="item1">Item 1</li><li class="item2">Item 2</li><li class="item3">Item 3</li>§`, [h`§<li class="item$">Item $</li><li class="item$">Item $</li><li class="item$">Item $</li>§`, h`O §$§ é um contador automático dentro de uma multiplicação; o Emmet o substitui por 1, 2, 3.`], [h`§<li class="item3">Item 3</li>§`, h`§*3§ repete o elemento três vezes; não gera só o último número.`], [h`§<li class="item0">Item 0</li><li class="item1">Item 1</li><li class="item2">Item 2</li>§`, h`A numeração com §$§ começa em 1 por padrão (para outra base seria §@§).`]],
    exp: h`Dentro de uma multiplicação (§*n§), cada §$§ é trocado pelo número do clone (1, 2, 3...). Vale tanto na classe (§item$§) quanto no texto (§{Item $}§), gerando §item1/Item 1§, §item2/Item 2§ e §item3/Item 3§.`,
    src: [[AP, 'tabela de sintaxe Emmet: $ numeração automática']],
    verify: emmet('li.item$*3{Item $}', ['<li class="item1">Item 1</li><li class="item2">Item 2</li><li class="item3">Item 3</li>', '<li class="item$">Item $</li><li class="item$">Item $</li><li class="item$">Item $</li>', '<li class="item3">Item 3</li>', '<li class="item0">Item 0</li><li class="item1">Item 1</li><li class="item2">Item 2</li>']),
  }),
  R(13, {
    diff: 'medio', scope: 'aula', sub: 'article e aside',
    stem: h`Na plataforma de avaliações, qual par de tags representa melhor, respectivamente, (1) cada card de lugar na página inicial e (2) o resumo da nota média na página de detalhe?`,
    opts: [h`(1) §<article>§ e (2) §<aside>§`, [h`(1) §<div>§ e (2) §<section>§`, h`Um card é conteúdo independente (§article§), e o resumo da nota é complementar ao conteúdo principal (§aside§).`], [h`(1) §<section>§ e (2) §<article>§`, h`O resumo da nota não é um conteúdo autônomo/publicável; ele complementa a informação principal.`], [h`(1) §<aside>§ e (2) §<main>§`, h`O card é o conteúdo da página, não complementar; e o §main§ é a área principal inteira, não o resumo.`]],
    exp: h`§<article>§ é para conteúdo que faz sentido por si só (cada card de lugar); §<aside>§ marca conteúdo complementar ao principal — a nota média resume, mas não é o conteúdo central da página de detalhe. O navegador expõe §article§ e §aside§ (marco “complementary”) com esses papéis.`,
    src: [[A1, 'critérios de aceite: resumo de nota usa aside'], [AP, 'tabela de semântica da página de detalhe']],
    verify: web('<main><article>CARD<p>x</p></article><aside>RESUMO<p>y</p></aside></main>', "const s = window.__aria; const lines = s.split('\\n'); const ind = (l) => l.match(/^ */)[0].length; const role = (w) => { const i = lines.findIndex((l) => l.includes(w)); if (i < 0) return 'nenhum'; for (let j = i; j >= 0; j--) { if (j === i || ind(lines[j]) < ind(lines[i])) { const r = lines[j].match(/- ([a-z]+)/); if (r && r[1] !== 'text' && r[1] !== 'paragraph') return r[1]; } } return 'text'; }; return role('CARD') + ',' + role('RESUMO');", ['article,complementary', 'text,text', 'article,article', 'complementary,main'], { aria: 'body' }),
  }),
  R(14, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Meta viewport',
    stem: h`O Emmet inclui §<meta name="viewport" content="width=device-width, initial-scale=1.0">§ no esqueleto. Em um celular, sem essa meta, com qual largura de layout (em px CSS) o navegador costuma desenhar a página antes de reduzi-la para caber na tela?`,
    opts: [h`Cerca de 980 px`, [h`Cerca de 390 px (a largura real da tela)`, h`Essa é a largura que se obtém *com* §width=device-width§; sem a meta, o navegador mobile assume um layout “desktop” mais largo.`], [h`Cerca de 320 px`, h`320 px é uma largura de telas muito pequenas, mas não é o padrão assumido sem a meta.`], [h`Cerca de 1280 px`, h`O padrão histórico dos navegadores móveis é por volta de 980 px, não 1280 px.`]],
    exp: h`Sem a meta §viewport§, navegadores móveis simulam uma janela larga (≈980 px) e encolhem o resultado, deixando o texto minúsculo e anulando as media queries pensadas para telas pequenas. Com §width=device-width, initial-scale=1.0§ o layout usa a largura real do aparelho.`,
    src: [[AP, 'Passo 1 — Esqueleto HTML5 (meta viewport)']],
    verify: web('<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><p>x</p></body></html>', 'return String(window.innerWidth);', ['980', '390', '320', '1280'], { mobile: true }),
  }),

  // ---------------- DIFÍCEIS ----------------
  R(15, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Âncora sem href',
    stem: h`O Emmet gera §<a class="card-link">Ver detalhes</a>§ (sem §href§) e a aula pede para “completar o href na mão”. Se o §href§ for esquecido, como o navegador trata essa âncora?`,
    opts: [h`Não a expõe como link e ela não recebe foco pelo teclado (Tab)`, [h`Como link normal, só que apontando para a própria página`, h`Sem §href§ o §<a>§ é apenas um “marcador”: não é link nem é focável.`], [h`Como link, mas sem possibilidade de clique do mouse`, h`Sem §href§ ela não é link para ninguém (mouse, teclado ou leitor de tela).`], [h`Como botão, ativando-se com Enter`, h`Âncora sem §href§ não vira botão; para uma ação usa-se §<button>§.`]],
    exp: h`O §<a>§ só é um hiperlink quando tem o atributo §href§. Sem ele, não entra na ordem de foco do teclado nem aparece como “link” para os leitores de tela (o texto é lido como texto comum). Por isso o Emmet deixa §href=""§ vazio e a aula reforça: “os hrefs completamos na mão”.`,
    src: [[SL, 'passo 2: “os hrefs completamos na mão depois”'], [AP, 'Passo 2: Preenchemos os href manualmente']],
    verify: web('<a id="s">SEMHREF</a><a id="c" href="detalhe.html">COMHREF</a>', "const s = window.__aria; const link = /- link[^\\n]*SEMHREF/.test(s); const a = document.getElementById('s'); a.focus(); return link + ',' + (document.activeElement === a);", ['false,false', 'true,true', 'true,false', 'false,true'], { aria: 'body' }),
  }),
  R(16, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'aria-hidden em ícones decorativos',
    stem: h`O banner de cada card tem um emoji decorativo: §<div class="card-banner" aria-hidden="true">☕</div>§. Qual é o efeito de §aria-hidden="true"§ nesse elemento?`,
    opts: [h`Ele sai da árvore de acessibilidade (leitores de tela o ignoram), mas continua visível na tela`, [h`Ele fica invisível na tela e também para os leitores de tela`, h`§aria-hidden§ não altera a aparência; esconder da tela exige CSS (§display:none§ ou §hidden§).`], [h`Ele continua sendo lido pelos leitores de tela e continua visível`, h`Esse é o comportamento *sem* o atributo; com ele o conteúdo é removido da árvore de acessibilidade.`], [h`Ele passa a ser lido pelos leitores de tela, mas some da tela`, h`É o contrário: some da leitura assistiva, não da tela.`]],
    exp: h`§aria-hidden="true"§ remove o elemento da árvore de acessibilidade sem mudar nada visualmente. É apropriado para emojis/ícones decorativos, evitando que o leitor de tela diga “xícara de café” antes do nome do lugar.`,
    src: [[AP, 'Passo 5: div.card-banner com aria-hidden="true"']],
    verify: web('<div id="b" aria-hidden="true">☕</div><p>Café Aroma</p>', "const s = window.__aria; return s.includes('☕') + ',' + (document.getElementById('b').offsetParent !== null);", ['false,true', 'false,false', 'true,true', 'true,false'], { aria: 'body' }),
  }),
  R(17, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Marcos da página inicial',
    stem: h`A página inicial tem §<header>§ (com §<nav>§), §<main>§ (com os cards em §<article>§) e §<footer>§, todos filhos diretos do §<body>§. Quais marcos (landmarks) um leitor de tela lista, em ordem?`,
    opts: [h`banner, navigation, main, contentinfo`, [h`header, nav, main, footer`, h`Esses são nomes de *tags*; os leitores de tela anunciam os *papéis*: banner, navigation, main, contentinfo.`], [h`banner, navigation, main`, h`O §<footer>§ filho do §<body>§ também é um marco: “contentinfo”.`], [h`banner, main, contentinfo`, h`O §<nav>§ também é um marco (“navigation”), mesmo dentro do §<header>§.`]],
    exp: h`Mapeamento padrão: §<header>§ (do site) → banner; §<nav>§ → navigation; §<main>§ → main; §<footer>§ (do site) → contentinfo. Os §<article>§ dos cards são “article”, que não é um marco. Por isso usar as tags semânticas já entrega a estrutura de navegação por marcos “de graça”.`,
    src: [[SL, 'do wireframe para os blocos de HTML'], [A1, 'objetivos: estruturar uma página com HTML semântico']],
    verify: web('<header class="cabecalho"><a href="index.html">Avaliações</a><nav><a href="index.html">Lugares</a></nav></header><main><h1>Lugares avaliados</h1><article><h2>Café Aroma</h2></article></main><footer>Projeto de referência</footer>', "const s = window.__aria; return [...s.matchAll(/^\\s*- (banner|navigation|main|contentinfo|complementary|region)/gm)].map((x) => x[1]).join(',');", ['banner,navigation,main,contentinfo', 'header,nav,main,footer', 'banner,navigation,main', 'banner,main,contentinfo'], { aria: 'body' }),
  }),
  R(18, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Emmet: card completo',
    stem: h`Qual HTML o Emmet gera para §article.card[data-categoria=cafeteria]>div.card-banner+div.card-body>span.badge+h2.card-title§?`,
    opts: [h`§<article class="card" data-categoria="cafeteria"><div class="card-banner"></div><div class="card-body"><span class="badge"></span><h2 class="card-title"></h2></div></article>§`, [h`§<article class="card" data-categoria="cafeteria"><div class="card-banner"></div></article><div class="card-body"><span class="badge"></span><h2 class="card-title"></h2></div>§`, h`Sem §^§, os dois §div§ são filhos do §article§; aqui o §card-body§ ficou fora do card.`], [h`§<article class="card" data-categoria="cafeteria"><div class="card-banner"><div class="card-body"><span class="badge"></span><h2 class="card-title"></h2></div></div></article>§`, h`O §+§ entre §div.card-banner§ e §div.card-body§ os faz irmãos; o corpo não fica dentro do banner.`], [h`§<article class="card" data-categoria="cafeteria"><div class="card-banner"></div><div class="card-body"><span class="badge"><h2 class="card-title"></h2></span></div></article>§`, h`O §+§ entre §span.badge§ e §h2.card-title§ os deixa irmãos dentro do corpo, e não aninhados.`]],
    exp: h`§article.card[data-categoria=cafeteria]§ cria o card com classe e atributo; §>§ desce um nível; §div.card-banner+div.card-body§ cria dois irmãos dentro do card; o §>§ depois do corpo desce para ele; e §span.badge+h2.card-title§ cria mais dois irmãos dentro de §.card-body§. É a estrutura do primeiro card da aula (sem os textos).`,
    src: [[SL, 'passo 5: o primeiro card, completo'], [AP, 'Passo 5 — O primeiro card, completo']],
    verify: emmet('article.card[data-categoria=cafeteria]>div.card-banner+div.card-body>span.badge+h2.card-title', ['<article class="card" data-categoria="cafeteria"><div class="card-banner"></div><div class="card-body"><span class="badge"></span><h2 class="card-title"></h2></div></article>', '<article class="card" data-categoria="cafeteria"><div class="card-banner"></div></article><div class="card-body"><span class="badge"></span><h2 class="card-title"></h2></div>', '<article class="card" data-categoria="cafeteria"><div class="card-banner"><div class="card-body"><span class="badge"></span><h2 class="card-title"></h2></div></div></article>', '<article class="card" data-categoria="cafeteria"><div class="card-banner"></div><div class="card-body"><span class="badge"><h2 class="card-title"></h2></span></div></article>']),
  }),
  R(19, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Emmet: atributo com contador',
    stem: h`Qual HTML resulta de §article.card*2>h2.card-title{Card $}+a.card-link[href="detalhe.html?id=$"]{Ver}§?`,
    opts: [h`§<article class="card"><h2 class="card-title">Card 1</h2><a href="detalhe.html?id=1" class="card-link">Ver</a></article><article class="card"><h2 class="card-title">Card 2</h2><a href="detalhe.html?id=2" class="card-link">Ver</a></article>§`, [h`§<article class="card"><h2 class="card-title">Card 1</h2><a href="detalhe.html?id=1" class="card-link">Ver</a></article><article class="card"><h2 class="card-title">Card 1</h2><a href="detalhe.html?id=1" class="card-link">Ver</a></article>§`, h`Dentro de uma multiplicação o §$§ avança a cada clone (1, 2); não repete o mesmo número.`], [h`§<article class="card"><h2 class="card-title">Card $</h2><a href="detalhe.html?id=$" class="card-link">Ver</a></article><article class="card"><h2 class="card-title">Card $</h2><a href="detalhe.html?id=$" class="card-link">Ver</a></article>§`, h`O §$§ é substituído tanto no texto §{...}§ quanto dentro do valor do atributo.`], [h`§<article class="card"><h2 class="card-title">Card 1</h2></article><article class="card"><h2 class="card-title">Card 2</h2></article><a href="detalhe.html?id=1" class="card-link">Ver</a>§`, h`O §+§ mantém o §a§ como irmão do §h2§ *dentro* de cada §article§; ele não sai do card.`]],
    exp: h`A multiplicação §*2§ clona o §article§ inteiro (com tudo que está dentro dele). O §$§ vira 1 no primeiro clone e 2 no segundo, tanto no texto §Card $§ quanto no atributo §href="detalhe.html?id=$"§. Esse padrão gera os links “Ver detalhes” de cada lugar.`,
    src: [[AP, 'tabela de sintaxe Emmet: *n e $'], [SL, 'passo 6: article.card*5']],
    verify: emmet('article.card*2>h2.card-title{Card $}+a.card-link[href="detalhe.html?id=$"]{Ver}', ['<article class="card"><h2 class="card-title">Card 1</h2><a href="detalhe.html?id=1" class="card-link">Ver</a></article><article class="card"><h2 class="card-title">Card 2</h2><a href="detalhe.html?id=2" class="card-link">Ver</a></article>', '<article class="card"><h2 class="card-title">Card 1</h2><a href="detalhe.html?id=1" class="card-link">Ver</a></article><article class="card"><h2 class="card-title">Card 1</h2><a href="detalhe.html?id=1" class="card-link">Ver</a></article>', '<article class="card"><h2 class="card-title">Card $</h2><a href="detalhe.html?id=$" class="card-link">Ver</a></article><article class="card"><h2 class="card-title">Card $</h2><a href="detalhe.html?id=$" class="card-link">Ver</a></article>', '<article class="card"><h2 class="card-title">Card 1</h2></article><article class="card"><h2 class="card-title">Card 2</h2></article><a href="detalhe.html?id=1" class="card-link">Ver</a>']),
  }),
  R(20, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'O que o Emmet não adivinha',
    stem: h`Após expandir §!§ no VS Code, o esqueleto gerado pelo Emmet ainda precisa de ajuste manual para a Plataforma de Avaliações. Qual item **não** vem pronto de forma adequada ao projeto?`,
    opts: [h`O idioma (§lang§) e o título (§<title>§), que vêm como §en§ e §Document§`, [h`A declaração §<!DOCTYPE html>§`, h`O Emmet já inclui o doctype HTML5 corretamente.`], [h`A codificação §<meta charset="UTF-8">§`, h`A codificação UTF-8 já vem no esqueleto e é a que o projeto usa.`], [h`A meta §viewport§ para telas pequenas`, h`A meta §viewport§ com §width=device-width, initial-scale=1.0§ também já vem pronta.`]],
    exp: h`O esqueleto de §!§ traz doctype, §charset§ UTF-8 e meta §viewport§, mas sempre com §lang="en"§ e §<title>Document</title>§. A aula ajusta esses dois à mão (§lang="pt-BR"§ e §<title>Avaliações | Lugares</title>§) porque o Emmet não conhece o idioma nem o nome da página.`,
    src: [[SL, 'passo 1: ajustes manuais depois do !'], [AP, 'Passo 1 — Esqueleto HTML5']],
    verify: { kind: 'node', params: { code: "import expand from 'emmet';\nconst out = expand('!');\nconst pronto = { 'lang-e-title': out.includes('lang=\"pt-BR\"') && out.includes('Avaliações'), doctype: out.includes('<!DOCTYPE html>'), charset: out.includes('charset=\"UTF-8\"'), viewport: out.includes('name=\"viewport\"') };\nconsole.log(Object.entries(pronto).filter(([, ok]) => !ok).map(([k]) => k).join(','));" }, values: ['lang-e-title', 'doctype', 'charset', 'viewport'] },
  }),
];
