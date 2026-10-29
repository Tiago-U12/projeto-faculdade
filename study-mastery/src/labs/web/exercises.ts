// Exercícios originais do Web Lab (HTML/CSS/JavaScript) e do React Lab. Os testes são declarativos (dados): o harness
// dentro do sandbox os executa sobre a página do estudante. A solução de referência é usada só nos testes do app.
import type { WebLabExercise } from './types';

const base = { disciplineId: 'fullstack', version: 1 };

const page = (title: string, body: string) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
${body}
  <script src="script.js"></script>
</body>
</html>
`;

const REACT_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>App React</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="root"></div>
</body>
</html>
`;

const BASE_CSS = `body {
  font-family: system-ui, sans-serif;
  margin: 0;
  padding: 16px;
  line-height: 1.5;
}
`;

// ——— 1. HTML semântico ———
const SEM_STARTER = page(
  'Clube de Leitura',
  `  <div class="topo">
    <div class="marca">Clube de Leitura</div>
    <div class="menu">
      <a href="#inicio">Início</a>
      <a href="#encontros">Encontros</a>
      <a href="#contato">Contato</a>
    </div>
  </div>
  <div class="conteudo">
    <div class="titulo">Próximo encontro: 12 de novembro</div>
    <p>Vamos conversar sobre contos brasileiros.</p>
  </div>
  <div class="rodape">Feito pela turma de Web</div>`,
);
const SEM_SOLUTION = page(
  'Clube de Leitura',
  `  <header class="topo">
    <p class="marca">Clube de Leitura</p>
    <nav aria-label="Principal">
      <ul class="menu">
        <li><a href="#inicio">Início</a></li>
        <li><a href="#encontros">Encontros</a></li>
        <li><a href="#contato">Contato</a></li>
      </ul>
    </nav>
  </header>
  <main class="conteudo">
    <h1>Próximo encontro: 12 de novembro</h1>
    <p>Vamos conversar sobre contos brasileiros.</p>
  </main>
  <footer class="rodape">Feito pela turma de Web</footer>`,
);

// ——— 2. Formulário acessível ———
const FORM_STARTER = page(
  'Inscrição',
  `  <h1>Inscrição na oficina</h1>
  <form id="inscricao">
    <input name="nome" placeholder="Nome">
    <input name="email" placeholder="E-mail">
    <input name="idade" placeholder="Idade">
    <p>Turno:</p>
    <input type="radio" name="turno" value="manha"> Manhã
    <input type="radio" name="turno" value="noite"> Noite
    <div class="botao">Enviar</div>
  </form>`,
);
const FORM_SOLUTION = page(
  'Inscrição',
  `  <h1>Inscrição na oficina</h1>
  <form id="inscricao">
    <label for="nome">Nome</label>
    <input id="nome" name="nome" required>
    <label for="email">E-mail</label>
    <input id="email" name="email" type="email" required>
    <label for="idade">Idade</label>
    <input id="idade" name="idade" type="number" min="16" max="99">
    <fieldset>
      <legend>Turno</legend>
      <label><input type="radio" name="turno" value="manha"> Manhã</label>
      <label><input type="radio" name="turno" value="noite"> Noite</label>
    </fieldset>
    <button type="submit">Enviar</button>
  </form>`,
);

// ——— 3. Flexbox ———
const BARRA_HTML = page(
  'Barra',
  `  <header class="barra">
    <strong class="logo">Study</strong>
    <nav class="links" aria-label="Principal">
      <a href="#a">Cursos</a>
      <a href="#b">Agenda</a>
      <a href="#c">Perfil</a>
    </nav>
  </header>`,
);
const BARRA_CSS = `${BASE_CSS}
.barra {
  padding: 12px 16px;
  background: #1d2440;
  color: #fff;
}
.links a {
  color: #fff;
}
`;

// ——— 4. Grid mobile-first ———
const GALERIA_HTML = page(
  'Galeria',
  `  <h1>Galeria</h1>
  <section class="galeria" aria-label="Fotos da turma">
    <figure class="foto">Foto 1</figure>
    <figure class="foto">Foto 2</figure>
    <figure class="foto">Foto 3</figure>
    <figure class="foto">Foto 4</figure>
    <figure class="foto">Foto 5</figure>
    <figure class="foto">Foto 6</figure>
  </section>`,
);
const GALERIA_CSS = `${BASE_CSS}
.foto {
  margin: 0;
  min-height: 120px;
  display: grid;
  place-items: center;
  background: #e3e6f5;
  border-radius: 8px;
}
`;

// ——— 5 e 6. Funções puras ———
const CARRINHO_HTML = page('Carrinho', `  <h1>Seu carrinho</h1>\n  <p id="total">Total: —</p>`);
const CARRINHO_JS = `const carrinho = [
  { nome: 'Caderno', preco: 18.9, quantidade: 3 },
  { nome: 'Caneta', preco: 6.5, quantidade: 4 },
  { nome: 'Mochila', preco: 89.9, quantidade: 1 },
];

function subtotal(itens) {
  // some preço × quantidade de cada item
}

function comDesconto(valor, percentual) {
  // devolva o valor com desconto, arredondado para 2 casas
}

// mostre em #total: "Total: R$ 155,34" (subtotal do carrinho com 10% de desconto)
`;
const CARRINHO_SOLUTION = `const carrinho = [
  { nome: 'Caderno', preco: 18.9, quantidade: 3 },
  { nome: 'Caneta', preco: 6.5, quantidade: 4 },
  { nome: 'Mochila', preco: 89.9, quantidade: 1 },
];

function subtotal(itens) {
  return itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
}

function comDesconto(valor, percentual) {
  return Math.round(valor * (1 - percentual / 100) * 100) / 100;
}

const total = comDesconto(subtotal(carrinho), 10);
document.querySelector('#total').textContent = 'Total: R$ ' + total.toFixed(2).replace('.', ',');
`;

const PRODUTOS_JS = `const produtos = [
  { nome: 'Caderno', categoria: 'Papelaria', preco: 18.9 },
  { nome: 'Fone', categoria: 'Eletrônicos', preco: 49.9 },
  { nome: 'Marca-texto', categoria: 'Papelaria', preco: 6.5 },
  { nome: 'Caneta', categoria: 'Papelaria', preco: 6.5 },
  { nome: 'Mouse', categoria: 'Eletrônicos', preco: 79 },
];
`;
const FILTRO_STARTER = `${PRODUTOS_JS}
function filtrarPorCategoria(lista, categoria) {
  // devolva um NOVO array só com os produtos da categoria (sem mudar "lista")
}

function nomesPorPreco(lista) {
  // devolva os nomes, do mais barato ao mais caro; empate pelo nome (sem mudar "lista")
}

// mostre em #lista um <li> por nome dos produtos de Papelaria, do mais barato ao mais caro
`;
const FILTRO_SOLUTION = `${PRODUTOS_JS}
function filtrarPorCategoria(lista, categoria) {
  return lista.filter((p) => p.categoria === categoria);
}

function nomesPorPreco(lista) {
  return [...lista]
    .sort((a, b) => a.preco - b.preco || a.nome.localeCompare(b.nome))
    .map((p) => p.nome);
}

const ul = document.querySelector('#lista');
for (const nome of nomesPorPreco(filtrarPorCategoria(produtos, 'Papelaria'))) {
  const li = document.createElement('li');
  li.textContent = nome;
  ul.append(li);
}
`;

// ——— 7. Validação com erro customizado ———
const CADASTRO_HTML = page(
  'Cadastro',
  `  <h1>Cadastro</h1>
  <form id="cadastro" novalidate>
    <label for="nome">Nome</label>
    <input id="nome" name="nome">
    <label for="email">E-mail</label>
    <input id="email" name="email">
    <label for="idade">Idade</label>
    <input id="idade" name="idade" inputmode="numeric">
    <button type="submit">Cadastrar</button>
  </form>
  <p id="erro" role="alert"></p>
  <p id="status" role="status"></p>`,
);
const CADASTRO_STARTER = `class ErroValidacao extends Error {
  // guarde o campo com problema (this.campo) e dê um nome ao erro (this.name)
}

function validarCadastro(dados) {
  // lance ErroValidacao para: nome vazio, e-mail sem "@" ou idade menor que 16
  // devolva true se estiver tudo certo
}

// no envio do formulário: impeça o envio padrão, valide e mostre a mensagem em #erro
// ou "Cadastro enviado!" em #status
`;
const CADASTRO_SOLUTION = `class ErroValidacao extends Error {
  constructor(campo, mensagem) {
    super(mensagem);
    this.name = 'ErroValidacao';
    this.campo = campo;
  }
}

function validarCadastro(dados) {
  if (!dados.nome || !dados.nome.trim()) throw new ErroValidacao('nome', 'Informe o nome.');
  if (!String(dados.email).includes('@')) throw new ErroValidacao('email', 'E-mail precisa ter @.');
  if (!(Number(dados.idade) >= 16)) throw new ErroValidacao('idade', 'A idade mínima é 16 anos.');
  return true;
}

const form = document.querySelector('#cadastro');
const erro = document.querySelector('#erro');
const status = document.querySelector('#status');
form.addEventListener('submit', (evento) => {
  evento.preventDefault();
  erro.textContent = '';
  status.textContent = '';
  try {
    validarCadastro({ nome: form.nome.value, email: form.email.value, idade: Number(form.idade.value) });
    status.textContent = 'Cadastro enviado!';
  } catch (e) {
    if (e instanceof ErroValidacao) erro.textContent = e.message;
    else throw e;
  }
});
`;

// ——— 8. Lista de tarefas ———
const TAREFAS_HTML = page(
  'Tarefas',
  `  <h1>Tarefas</h1>
  <label for="nova-tarefa">Nova tarefa</label>
  <input id="nova-tarefa">
  <button id="adicionar" type="button">Adicionar</button>
  <p id="pendentes">Pendentes: 0</p>
  <ul id="tarefas"></ul>`,
);
const TAREFAS_STARTER = `const tarefas = []; // { texto, feita }

function render() {
  // desenhe #tarefas a partir do array e atualize #pendentes
}

// "Adicionar": ignore texto vazio; limpe o campo depois de adicionar
// cada <li> tem um botão "Concluir" que marca a tarefa (classe "feita" no <li>)
`;
const TAREFAS_SOLUTION = `const tarefas = [];
const campo = document.querySelector('#nova-tarefa');
const lista = document.querySelector('#tarefas');

function render() {
  lista.replaceChildren(
    ...tarefas.map((t, i) => {
      const li = document.createElement('li');
      li.textContent = t.texto + ' ';
      if (t.feita) li.classList.add('feita');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Concluir';
      b.disabled = t.feita;
      b.addEventListener('click', () => {
        tarefas[i].feita = true;
        render();
      });
      li.append(b);
      return li;
    }),
  );
  document.querySelector('#pendentes').textContent = 'Pendentes: ' + tarefas.filter((t) => !t.feita).length;
}

document.querySelector('#adicionar').addEventListener('click', () => {
  const texto = campo.value.trim();
  if (!texto) return;
  tarefas.push({ texto, feita: false });
  campo.value = '';
  render();
});
render();
`;

// ——— React ———
const CURSOS = `const cursos = [
  { id: 1, titulo: 'HTML semântico', descricao: 'Estrutura que leitores de tela entendem.' },
  { id: 2, titulo: 'CSS Grid', descricao: 'Layouts em duas dimensões.' },
  { id: 3, titulo: 'React', descricao: 'Interfaces feitas de componentes.' },
];
`;
const LIVROS = `const livros = [
  'Banco de Dados na Prática',
  'Estruturas de Dados',
  'Redes sem Mistério',
  'Lógica para Computação',
  'Introdução ao React',
];
`;

export const WEB_EXERCISES: WebLabExercise[] = [
  {
    ...base,
    kind: 'web',
    id: 'web-pagina-semantica',
    topicIds: ['html'],
    skills: ['html.semantic'],
    difficulty: 'facil',
    scope: 'aula',
    estimatedMinutes: 8,
    title: 'Página com estrutura semântica',
    prompt:
      'A página do Clube de Leitura foi feita só com `div`. Reescreva o **index.html** com estrutura semântica: **header** com o nome do site e um **nav** com os links numa **lista**, **main** com um único **h1** (o título do encontro) e **footer**.',
    objectives: ['Usar header, nav, main e footer', 'Organizar o menu como lista de links', 'Ter um único h1 por página'],
    hints: ['Troque as divs pelos elementos que dizem o que cada parte é.', 'O menu fica assim: `<nav><ul><li><a …>…</a></li>…</ul></nav>`.', 'O título do encontro vira o `h1`, dentro do `main`.'],
    explanation:
      'Elementos semânticos dizem ao navegador e aos leitores de tela o papel de cada parte: atalhos para o conteúdo principal (main), para a navegação (nav) e um h1 que resume a página. O visual pode ser o mesmo — quem muda é o significado.',
    relations: { keywords: ['html semântico', 'nav', 'main'] },
    files: { 'index.html': SEM_STARTER, 'style.css': BASE_CSS, 'script.js': '' },
    editable: ['index.html', 'style.css', 'script.js'],
    tests: [
      { id: 'estrutura', label: 'header, nav, main e footer presentes (um só main)', checks: [{ kind: 'exists', sel: 'header', what: 'o header' }, { kind: 'exists', sel: 'nav', what: 'o nav' }, { kind: 'count', sel: 'main', what: 'main', min: 1, max: 1 }, { kind: 'exists', sel: 'footer', what: 'o footer' }] },
      { id: 'menu', label: 'o menu é uma lista de pelo menos 3 links dentro do nav', checks: [{ kind: 'count', sel: 'nav li a[href]', what: 'links em itens de lista dentro do nav', min: 3 }] },
      { id: 'titulo', label: 'um único h1, dentro do main, com texto', checks: [{ kind: 'count', sel: 'h1', what: 'h1', min: 1, max: 1 }, { kind: 'exists', sel: 'main h1', what: 'o h1 dentro do main' }, { kind: 'text', sel: 'h1', what: 'O h1', nonEmpty: true }] },
    ],
    solution: { 'index.html': SEM_SOLUTION, 'style.css': BASE_CSS, 'script.js': '' },
  },
  {
    ...base,
    kind: 'web',
    id: 'web-formulario-acessivel',
    topicIds: ['html'],
    skills: ['html.forms'],
    difficulty: 'medio',
    scope: 'aula',
    estimatedMinutes: 12,
    title: 'Formulário de inscrição acessível',
    prompt:
      'Melhore o formulário: cada campo com **rótulo** (`label`); **nome** obrigatório; **e-mail** do tipo e-mail e obrigatório; **idade** numérica de **16 a 99**; o **turno** num grupo com legenda (`fieldset` + `legend`); e um **botão** de envio de verdade. Mantenha os atributos `name` dos campos.',
    objectives: ['Associar label e campo', 'Usar type, required, min e max', 'Agrupar opções com fieldset e legend', 'Usar button type="submit"'],
    hints: ['`<label for="email">` aponta para o `id="email"` do campo.', 'O navegador valida sozinho `type="email"`, `required`, `min` e `max`.', 'Opções de rádio relacionadas ficam num `fieldset` com uma `legend` que diz o que se escolhe.'],
    explanation:
      'Rótulos associados fazem o leitor de tela anunciar o campo e aumentam a área de toque (tocar no rótulo foca o campo). Tipos e restrições mostram o teclado certo no celular e validam antes do envio; um `button type="submit"` funciona com Enter e com teclado, ao contrário de uma div.',
    relations: { keywords: ['formulário', 'label', 'acessibilidade'] },
    files: { 'index.html': FORM_STARTER, 'style.css': BASE_CSS, 'script.js': '' },
    editable: ['index.html', 'style.css', 'script.js'],
    tests: [
      { id: 'rotulos', label: 'todos os campos têm rótulo acessível', checks: [{ kind: 'labelled', sel: 'form input:not([type=submit]):not([type=button]):not([type=hidden]), form select, form textarea', what: 'campos' }] },
      { id: 'email', label: 'nome obrigatório; e-mail do tipo email e obrigatório', checks: [{ kind: 'attr', sel: 'input[name=nome]', what: 'O campo nome', name: 'required', present: true }, { kind: 'attr', sel: 'input[name=email]', what: 'O campo e-mail', name: 'type', equals: 'email' }, { kind: 'attr', sel: 'input[name=email]', what: 'O campo e-mail', name: 'required', present: true }] },
      { id: 'idade', label: 'idade numérica entre 16 e 99', checks: [{ kind: 'attr', sel: 'input[name=idade]', what: 'O campo idade', name: 'type', equals: 'number' }, { kind: 'attr', sel: 'input[name=idade]', what: 'O campo idade', name: 'min', equals: '16' }, { kind: 'attr', sel: 'input[name=idade]', what: 'O campo idade', name: 'max', equals: '99' }] },
      { id: 'turno', label: 'turno em fieldset com legend e botão de envio', checks: [{ kind: 'text', sel: 'fieldset legend', what: 'A legend do grupo', nonEmpty: true }, { kind: 'count', sel: 'fieldset input[type=radio][name=turno]', what: 'opções de turno dentro do fieldset', min: 2 }, { kind: 'exists', sel: 'form button[type=submit], form button:not([type]), form input[type=submit]', what: 'um botão de envio no formulário' }] },
    ],
    solution: { 'index.html': FORM_SOLUTION, 'style.css': BASE_CSS, 'script.js': '' },
  },
  {
    ...base,
    kind: 'web',
    id: 'web-barra-flex',
    topicIds: ['css'],
    skills: ['css.layout'],
    difficulty: 'facil',
    scope: 'aula',
    estimatedMinutes: 6,
    title: 'Barra de navegação com Flexbox',
    prompt:
      'No **style.css**, faça a `.barra` usar **Flexbox**: logo à esquerda e links à direita (espaço entre eles), tudo **centralizado na vertical**. Os `.links` também em flex, com **16px** de espaço entre os links.',
    objectives: ['Criar um contêiner flex', 'Distribuir itens com justify-content', 'Alinhar no eixo cruzado com align-items', 'Espaçar com gap'],
    hints: ['Comece com `display: flex` na `.barra`.', '`justify-content: space-between` empurra o primeiro e o último item para as pontas.', 'Para o espaço entre os links: `.links { display: flex; gap: 16px; }`.'],
    explanation:
      '`display: flex` transforma os filhos em itens flexíveis; `justify-content` distribui no eixo principal (horizontal) e `align-items` alinha no eixo cruzado (vertical). `gap` cria espaço só ENTRE os itens, sem margem sobrando nas pontas.',
    relations: { keywords: ['flexbox', 'justify-content', 'gap'] },
    files: { 'index.html': BARRA_HTML, 'style.css': BARRA_CSS, 'script.js': '' },
    editable: ['style.css', 'index.html', 'script.js'],
    tests: [
      { id: 'barra', label: '.barra em flex, com espaço entre e centralizada na vertical', checks: [{ kind: 'style', sel: '.barra', what: 'A .barra', prop: 'display', oneOf: ['flex'] }, { kind: 'style', sel: '.barra', what: 'A .barra', prop: 'justify-content', oneOf: ['space-between'] }, { kind: 'style', sel: '.barra', what: 'A .barra', prop: 'align-items', oneOf: ['center'] }] },
      { id: 'links', label: '.links em flex com 16px entre os links', checks: [{ kind: 'style', sel: '.links', what: 'Os .links', prop: 'display', oneOf: ['flex'] }, { kind: 'style', sel: '.links', what: 'Os .links', prop: 'column-gap', oneOf: ['16px'] }] },
    ],
    solution: { 'index.html': BARRA_HTML, 'style.css': `${BARRA_CSS}\n.barra {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n.links {\n  display: flex;\n  gap: 16px;\n}\n`, 'script.js': '' },
  },
  {
    ...base,
    kind: 'web',
    id: 'web-galeria-mobile-first',
    topicIds: ['css'],
    skills: ['css.responsive', 'css.layout'],
    difficulty: 'medio',
    scope: 'aprofundamento',
    estimatedMinutes: 12,
    title: 'Galeria responsiva mobile-first',
    prompt:
      'Faça a `.galeria` virar um **grid** com **1 coluna no celular**, **2 colunas a partir de 600px** e **3 colunas a partir de 900px**, com 12px de espaço. Escreva **mobile-first**: o estilo base é o do celular e as media queries usam `min-width`. Nada pode causar rolagem lateral.',
    objectives: ['Montar um grid com grid-template-columns', 'Escrever media queries mobile-first (min-width)', 'Evitar rolagem horizontal'],
    hints: ['Base: `.galeria { display: grid; gap: 12px; }` — sem colunas definidas, o grid tem uma coluna.', '`@media (min-width: 600px) { .galeria { grid-template-columns: repeat(2, 1fr); } }`.', 'Use a seleção de largura da prévia (celular/tablet/total) para conferir.'],
    explanation:
      'Mobile-first começa pelo layout mais simples (uma coluna) e acrescenta colunas quando há espaço, com `min-width`. `repeat(3, 1fr)` divide a largura em frações iguais. Os testes conferem a quantidade de colunas em três larguras.',
    relations: { keywords: ['css grid', 'media query', 'mobile-first'] },
    files: { 'index.html': GALERIA_HTML, 'style.css': GALERIA_CSS, 'script.js': '' },
    editable: ['style.css', 'index.html', 'script.js'],
    tests: [
      { id: 'celular', label: '360px: grid de 1 coluna, sem rolagem lateral', width: 360, checks: [{ kind: 'style', sel: '.galeria', what: 'A .galeria', prop: 'display', oneOf: ['grid'] }, { kind: 'columns', sel: '.galeria', what: 'A .galeria', equals: 1 }, { kind: 'fits' }] },
      { id: 'tablet', label: '700px: 2 colunas', width: 700, checks: [{ kind: 'columns', sel: '.galeria', what: 'A .galeria', equals: 2 }, { kind: 'fits' }] },
      { id: 'desktop', label: '1000px: 3 colunas com 12px de espaço', width: 1000, checks: [{ kind: 'columns', sel: '.galeria', what: 'A .galeria', equals: 3 }, { kind: 'style', sel: '.galeria', what: 'A .galeria', prop: 'column-gap', oneOf: ['12px'] }] },
    ],
    solution: {
      'index.html': GALERIA_HTML,
      'style.css': `${GALERIA_CSS}\n.galeria {\n  display: grid;\n  gap: 12px;\n}\n@media (min-width: 600px) {\n  .galeria { grid-template-columns: repeat(2, 1fr); }\n}\n@media (min-width: 900px) {\n  .galeria { grid-template-columns: repeat(3, 1fr); }\n}\n`,
      'script.js': '',
    },
  },
  {
    ...base,
    kind: 'web',
    id: 'web-funcoes-carrinho',
    topicIds: ['js-funcoes'],
    skills: ['js.arrays'],
    difficulty: 'facil',
    scope: 'aula',
    estimatedMinutes: 10,
    title: 'Total do carrinho com funções puras',
    prompt:
      'No **script.js**, escreva as funções puras `subtotal(itens)` (soma de preço × quantidade) e `comDesconto(valor, percentual)` (valor com desconto, **arredondado para 2 casas**). Depois mostre em `#total` o texto **Total: R$ 155,34** — o subtotal do `carrinho` com 10% de desconto, calculado pelas funções.',
    objectives: ['Somar com reduce', 'Escrever funções puras (mesma entrada, mesma saída)', 'Arredondar valores monetários', 'Mostrar o resultado no DOM'],
    hints: ['`itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0)`.', 'Para 2 casas: `Math.round(x * 100) / 100`.', 'Para a vírgula: `total.toFixed(2).replace(".", ",")`.'],
    explanation:
      'Funções puras só dependem dos argumentos e não mexem em nada fora delas: ficam fáceis de testar (os testes chamam suas funções com outros carrinhos). O `reduce` com valor inicial 0 também funciona para o carrinho vazio.',
    relations: { keywords: ['reduce', 'funções puras', 'arredondamento'] },
    files: { 'index.html': CARRINHO_HTML, 'style.css': BASE_CSS, 'script.js': CARRINHO_JS },
    editable: ['script.js', 'index.html', 'style.css'],
    exports: ['subtotal', 'comDesconto'],
    tests: [
      { id: 'subtotal', label: 'subtotal soma preço × quantidade (e vale 0 para carrinho vazio)', checks: [{ kind: 'call', fn: 'subtotal', args: [[{ preco: 10, quantidade: 2 }, { preco: 5.5, quantidade: 1 }]], equals: 25.5, pure: true }, { kind: 'call', fn: 'subtotal', args: [[]], equals: 0 }] },
      { id: 'desconto', label: 'comDesconto aplica o percentual e arredonda para 2 casas', checks: [{ kind: 'call', fn: 'comDesconto', args: [99.99, 15], equals: 84.99 }, { kind: 'call', fn: 'comDesconto', args: [200, 0], equals: 200 }] },
      { id: 'pagina', label: 'a página mostra o total com desconto', checks: [{ kind: 'text', sel: '#total', what: 'O #total', equals: 'Total: R$ 155,34' }, { kind: 'no-errors' }] },
    ],
    solution: { 'index.html': CARRINHO_HTML, 'style.css': BASE_CSS, 'script.js': CARRINHO_SOLUTION },
  },
  {
    ...base,
    kind: 'web',
    id: 'web-filtrar-ordenar',
    topicIds: ['js-funcoes'],
    skills: ['js.arrays', 'js.dom'],
    difficulty: 'medio',
    scope: 'aprofundamento',
    estimatedMinutes: 12,
    title: 'Filtrar e ordenar sem mudar o original',
    prompt:
      'Escreva `filtrarPorCategoria(lista, categoria)` e `nomesPorPreco(lista)` (nomes do mais barato ao mais caro; empate pelo nome) **sem modificar o array recebido**. Depois mostre em `#lista` um `<li>` por nome dos produtos de **Papelaria**, na ordem de preço.',
    objectives: ['Usar filter e map', 'Ordenar com sort e critério de desempate', 'Não mutar o array original (cópia antes do sort)', 'Criar elementos no DOM'],
    hints: ['`filter` já devolve um array novo.', '`sort` MUDA o array: ordene uma cópia, `[...lista].sort(...)`.', 'Desempate: `a.preco - b.preco || a.nome.localeCompare(b.nome)`.'],
    explanation:
      '`filter` e `map` devolvem arrays novos; `sort` ordena no próprio array — por isso a cópia com `[...lista]`. O teste chama suas funções e confere que o array passado continua igual depois.',
    relations: { keywords: ['filter', 'sort', 'imutabilidade'] },
    files: { 'index.html': page('Produtos', '  <h1>Papelaria</h1>\n  <ul id="lista"></ul>'), 'style.css': BASE_CSS, 'script.js': FILTRO_STARTER },
    editable: ['script.js', 'index.html', 'style.css'],
    exports: ['filtrarPorCategoria', 'nomesPorPreco'],
    tests: [
      { id: 'filtrar', label: 'filtrarPorCategoria devolve só a categoria pedida, sem mudar a lista', checks: [{ kind: 'call', fn: 'filtrarPorCategoria', args: [[{ nome: 'A', categoria: 'X', preco: 1 }, { nome: 'B', categoria: 'Y', preco: 2 }], 'Y'], equals: [{ nome: 'B', categoria: 'Y', preco: 2 }], pure: true }] },
      { id: 'ordenar', label: 'nomesPorPreco ordena por preço e nome, sem mudar a lista', checks: [{ kind: 'call', fn: 'nomesPorPreco', args: [[{ nome: 'B', preco: 2 }, { nome: 'C', preco: 1 }, { nome: 'A', preco: 2 }]], equals: ['C', 'A', 'B'], pure: true }, { kind: 'call', fn: 'nomesPorPreco', args: [[]], equals: [] }] },
      { id: 'pagina', label: 'a página lista os 3 produtos de Papelaria em ordem', checks: [{ kind: 'count', sel: '#lista li', what: 'itens em #lista', min: 3, max: 3 }, { kind: 'text', sel: '#lista li:first-child', what: 'O primeiro item', equals: 'Caneta' }, { kind: 'text', sel: '#lista li:last-child', what: 'O último item', equals: 'Caderno' }] },
    ],
    solution: { 'index.html': page('Produtos', '  <h1>Papelaria</h1>\n  <ul id="lista"></ul>'), 'style.css': BASE_CSS, 'script.js': FILTRO_SOLUTION },
  },
  {
    ...base,
    kind: 'web',
    id: 'web-validacao-cadastro',
    topicIds: ['classes-erros'],
    skills: ['js.validation'],
    difficulty: 'medio',
    scope: 'aprofundamento',
    estimatedMinutes: 15,
    title: 'Validação com erro customizado',
    prompt:
      'Crie a classe `ErroValidacao` (estende `Error`, com `name` "ErroValidacao" e a propriedade `campo`) e a função `validarCadastro(dados)`, que **lança** `ErroValidacao` para nome vazio (`campo` "nome"), e-mail sem "@" ("email") ou idade menor que 16 ("idade"), e devolve `true` se estiver tudo certo. No envio do formulário, **impeça o envio padrão** e mostre a mensagem do erro em `#erro` — ou "Cadastro enviado!" em `#status`.',
    objectives: ['Estender Error com uma classe', 'Lançar e capturar erros (throw / try…catch)', 'Tratar o evento submit com preventDefault', 'Mostrar mensagens acessíveis (role="alert")'],
    hints: ['No construtor: `super(mensagem); this.name = "ErroValidacao"; this.campo = campo;`.', 'Em `validarCadastro`, um `if` por regra com `throw new ErroValidacao(...)`.', 'No submit: `evento.preventDefault()`, depois `try { … } catch (e) { erro.textContent = e.message }`. O valor do campo idade é texto: use `Number(...)`.'],
    explanation:
      'Uma classe de erro própria permite distinguir “dado inválido” de um bug (`e instanceof ErroValidacao`) e carregar informação extra, como o campo. O `preventDefault` impede que o formulário recarregue a página; a mensagem em `role="alert"` é anunciada por leitores de tela.',
    relations: { keywords: ['erros customizados', 'validação', 'submit'] },
    files: { 'index.html': CADASTRO_HTML, 'style.css': BASE_CSS, 'script.js': CADASTRO_STARTER },
    editable: ['script.js', 'index.html', 'style.css'],
    exports: ['validarCadastro', 'ErroValidacao'],
    tests: [
      { id: 'erros', label: 'validarCadastro lança ErroValidacao com o campo certo', checks: [{ kind: 'throws', fn: 'validarCadastro', args: [{ nome: '', email: 'a@b.c', idade: 20 }], errorName: 'ErroValidacao', props: { campo: 'nome' } }, { kind: 'throws', fn: 'validarCadastro', args: [{ nome: 'Ana', email: 'ana.exemplo.com', idade: 20 }], errorName: 'ErroValidacao', props: { campo: 'email' } }, { kind: 'throws', fn: 'validarCadastro', args: [{ nome: 'Ana', email: 'ana@exemplo.com', idade: 15 }], errorName: 'ErroValidacao', props: { campo: 'idade' } }] },
      { id: 'valido', label: 'dados válidos devolvem true', checks: [{ kind: 'call', fn: 'validarCadastro', args: [{ nome: 'Ana', email: 'ana@exemplo.com', idade: 16 }], equals: true }] },
      { id: 'form-erro', label: 'envio com e-mail inválido mostra a mensagem em #erro', steps: [{ do: 'fill', sel: '#nome', what: 'o campo nome', value: 'Ana' }, { do: 'fill', sel: '#email', what: 'o campo e-mail', value: 'ana-sem-arroba' }, { do: 'fill', sel: '#idade', what: 'o campo idade', value: '20' }, { do: 'submit', sel: '#cadastro', what: 'o formulário' }], checks: [{ kind: 'text', sel: '#erro', what: 'O #erro', nonEmpty: true }, { kind: 'text', sel: '#status', what: 'O #status', equals: '' }] },
      { id: 'form-ok', label: 'envio válido mostra "Cadastro enviado!"', steps: [{ do: 'fill', sel: '#nome', what: 'o campo nome', value: 'Ana' }, { do: 'fill', sel: '#email', what: 'o campo e-mail', value: 'ana@exemplo.com' }, { do: 'fill', sel: '#idade', what: 'o campo idade', value: '20' }, { do: 'submit', sel: '#cadastro', what: 'o formulário' }], checks: [{ kind: 'text', sel: '#status', what: 'O #status', equals: 'Cadastro enviado!' }, { kind: 'text', sel: '#erro', what: 'O #erro', equals: '' }, { kind: 'no-errors' }] },
    ],
    solution: { 'index.html': CADASTRO_HTML, 'style.css': BASE_CSS, 'script.js': CADASTRO_SOLUTION },
  },
  {
    ...base,
    kind: 'web',
    id: 'web-lista-tarefas',
    topicIds: ['js-funcoes'],
    skills: ['js.dom', 'js.arrays'],
    difficulty: 'dificil',
    scope: 'desafio',
    estimatedMinutes: 20,
    title: 'Lista de tarefas com estado',
    prompt:
      'Monte a lista de tarefas: **Adicionar** põe o texto de `#nova-tarefa` em `#tarefas` (ignore texto vazio ou só com espaços e **limpe o campo**); cada `<li>` tem um botão **Concluir** que marca a tarefa com a classe `feita`; `#pendentes` mostra **Pendentes: N**. Guarde as tarefas num array e desenhe a lista a partir dele.',
    objectives: ['Manter o estado num array', 'Redesenhar a lista a partir do estado', 'Tratar cliques em elementos criados dinamicamente', 'Validar entrada com trim'],
    hints: ['Estado: `const tarefas = [{ texto, feita }]`; uma função `render()` refaz a lista inteira.', '`campo.value.trim()` vazio → não adiciona.', 'Pendentes: `tarefas.filter(t => !t.feita).length`.'],
    explanation:
      'Separar estado (o array) de apresentação (`render`) evita que a tela e os dados discordem: toda ação muda o array e chama `render()`. É a mesma ideia que o React automatiza.',
    relations: { keywords: ['dom', 'estado', 'eventos'] },
    files: { 'index.html': TAREFAS_HTML, 'style.css': `${BASE_CSS}\n.feita {\n  text-decoration: line-through;\n}\n`, 'script.js': TAREFAS_STARTER },
    editable: ['script.js', 'index.html', 'style.css'],
    tests: [
      { id: 'adicionar', label: 'adiciona tarefas, limpa o campo e conta as pendentes', steps: [{ do: 'fill', sel: '#nova-tarefa', what: 'o campo', value: 'Ler capítulo 3' }, { do: 'click', sel: '#adicionar', what: 'o botão Adicionar' }, { do: 'fill', sel: '#nova-tarefa', what: 'o campo', value: 'Fazer a lista 2' }, { do: 'click', sel: '#adicionar', what: 'o botão Adicionar' }], checks: [{ kind: 'count', sel: '#tarefas li', what: 'tarefas', min: 2, max: 2 }, { kind: 'value', sel: '#nova-tarefa', what: 'O campo', equals: '' }, { kind: 'text', sel: '#pendentes', what: 'O #pendentes', equals: 'Pendentes: 2' }] },
      { id: 'vazio', label: 'texto em branco não vira tarefa', steps: [{ do: 'fill', sel: '#nova-tarefa', what: 'o campo', value: '   ' }, { do: 'click', sel: '#adicionar', what: 'o botão Adicionar' }], checks: [{ kind: 'count', sel: '#tarefas li', what: 'tarefas', max: 0 }, { kind: 'text', sel: '#pendentes', what: 'O #pendentes', equals: 'Pendentes: 0' }] },
      { id: 'concluir', label: 'Concluir marca só aquela tarefa e atualiza as pendentes', steps: [{ do: 'fill', sel: '#nova-tarefa', what: 'o campo', value: 'A' }, { do: 'click', sel: '#adicionar', what: 'o botão Adicionar' }, { do: 'fill', sel: '#nova-tarefa', what: 'o campo', value: 'B' }, { do: 'click', sel: '#adicionar', what: 'o botão Adicionar' }, { do: 'click', sel: '#tarefas li:first-child button', what: 'o botão Concluir da primeira tarefa' }], checks: [{ kind: 'count', sel: '#tarefas li.feita', what: 'tarefas feitas', min: 1, max: 1 }, { kind: 'exists', sel: '#tarefas li:first-child.feita', what: 'a primeira tarefa marcada como feita' }, { kind: 'text', sel: '#pendentes', what: 'O #pendentes', equals: 'Pendentes: 1' }, { kind: 'no-errors' }] },
    ],
    solution: { 'index.html': TAREFAS_HTML, 'style.css': `${BASE_CSS}\n.feita {\n  text-decoration: line-through;\n}\n`, 'script.js': TAREFAS_SOLUTION },
  },
  // ——————————————— React ———————————————
  {
    ...base,
    kind: 'react',
    id: 'react-cartoes-props',
    topicIds: ['react-componentes'],
    skills: ['react.components'],
    difficulty: 'facil',
    scope: 'aula',
    estimatedMinutes: 10,
    title: 'Cartões com props e map',
    prompt:
      'Crie o componente `Cartao`, que recebe as props `titulo` e `descricao` e mostra `<article className="cartao">` com um `h2` (título) e um `p` (descrição). No `App`, mostre **um Cartao para cada curso** do array `cursos`, com `map` e `key`.',
    objectives: ['Criar um componente que recebe props', 'Renderizar listas com map', 'Usar key em listas', 'Usar className no JSX'],
    hints: ['`function Cartao({ titulo, descricao }) { return (<article className="cartao">…</article>); }`.', 'No App: `{cursos.map((c) => <Cartao key={c.id} titulo={c.titulo} descricao={c.descricao} />)}`.', 'Em JSX a classe é `className`, não `class`.'],
    explanation:
      'Componentes são funções que recebem props e devolvem JSX; o mesmo `Cartao` serve para qualquer curso. `map` transforma dados em elementos e a `key` (um id estável) ajuda o React a saber qual item é qual quando a lista muda.',
    relations: { keywords: ['props', 'map', 'key', 'componentes'] },
    files: {
      'App.jsx': `${CURSOS}\n// crie aqui o componente Cartao\n\nexport default function App() {\n  return (\n    <main>\n      <h1>Cursos</h1>\n      {/* um Cartao para cada curso */}\n    </main>\n  );\n}\n`,
      'style.css': `${BASE_CSS}\n.cartao {\n  border: 1px solid #ccd;\n  border-radius: 8px;\n  padding: 8px 12px;\n  margin-bottom: 8px;\n}\n`,
      'index.html': REACT_HTML,
    },
    editable: ['App.jsx', 'style.css'],
    tests: [
      { id: 'tres', label: 'um cartão por curso (3)', checks: [{ kind: 'count', sel: 'article.cartao', what: 'cartões (article.cartao)', min: 3, max: 3 }, { kind: 'no-errors' }] },
      { id: 'conteudo', label: 'cada cartão mostra título no h2 e descrição no p', checks: [{ kind: 'text', sel: 'article.cartao:nth-of-type(2) h2', what: 'O h2 do 2º cartão', equals: 'CSS Grid' }, { kind: 'text', sel: 'article.cartao:nth-of-type(3) p', what: 'O p do 3º cartão', includes: 'componentes' }] },
    ],
    solution: {
      'App.jsx': `${CURSOS}\nfunction Cartao({ titulo, descricao }) {\n  return (\n    <article className="cartao">\n      <h2>{titulo}</h2>\n      <p>{descricao}</p>\n    </article>\n  );\n}\n\nexport default function App() {\n  return (\n    <main>\n      <h1>Cursos</h1>\n      {cursos.map((c) => (\n        <Cartao key={c.id} titulo={c.titulo} descricao={c.descricao} />\n      ))}\n    </main>\n  );\n}\n`,
    },
  },
  {
    ...base,
    kind: 'react',
    id: 'react-contador',
    topicIds: ['react-hooks-forms'],
    skills: ['react.state'],
    difficulty: 'facil',
    scope: 'aula',
    estimatedMinutes: 10,
    title: 'Contador com useState',
    prompt:
      'Faça um contador com `useState`: `<p id="valor">` mostra **Cliques: N**; o botão `#mais` soma 1; o `#menos` subtrai 1 mas **nunca abaixo de 0** (fica **desabilitado** em 0); o `#zerar` volta a 0.',
    objectives: ['Guardar estado com useState', 'Atualizar o estado em eventos', 'Desabilitar um botão a partir do estado'],
    hints: ['`const [cliques, setCliques] = useState(0);` (importe `useState` de "react").', '`onClick={() => setCliques((c) => c + 1)}`.', '`disabled={cliques === 0}` no botão de menos.'],
    explanation:
      'O estado guardado com `useState` faz o React redesenhar o componente quando muda. O botão desabilitado em 0 impede o valor negativo e comunica isso ao usuário — melhor do que só ignorar o clique.',
    relations: { keywords: ['useState', 'eventos', 'estado'] },
    files: {
      'App.jsx': `import { useState } from 'react';\n\nexport default function App() {\n  // guarde a quantidade de cliques no estado\n  return (\n    <main>\n      <p id="valor">Cliques: 0</p>\n      <button id="menos">−1</button>\n      <button id="mais">+1</button>\n      <button id="zerar">Zerar</button>\n    </main>\n  );\n}\n`,
      'style.css': `${BASE_CSS}\nbutton {\n  margin-right: 8px;\n  min-height: 44px;\n  min-width: 44px;\n}\n`,
      'index.html': REACT_HTML,
    },
    editable: ['App.jsx', 'style.css'],
    tests: [
      { id: 'inicio', label: 'começa em 0 com o "−1" desabilitado', checks: [{ kind: 'text', sel: '#valor', what: 'O #valor', equals: 'Cliques: 0' }, { kind: 'disabled', sel: '#menos', what: 'O botão #menos', equals: true }, { kind: 'no-errors' }] },
      { id: 'mais-menos', label: '+1 três vezes e −1 uma vez dá 2', steps: [{ do: 'click', sel: '#mais', what: 'o botão +1' }, { do: 'click', sel: '#mais', what: 'o botão +1' }, { do: 'click', sel: '#mais', what: 'o botão +1' }, { do: 'click', sel: '#menos', what: 'o botão −1' }], checks: [{ kind: 'text', sel: '#valor', what: 'O #valor', equals: 'Cliques: 2' }, { kind: 'disabled', sel: '#menos', what: 'O botão #menos', equals: false }] },
      { id: 'zerar', label: 'Zerar volta a 0 e desabilita o "−1"', steps: [{ do: 'click', sel: '#mais', what: 'o botão +1' }, { do: 'click', sel: '#zerar', what: 'o botão Zerar' }], checks: [{ kind: 'text', sel: '#valor', what: 'O #valor', equals: 'Cliques: 0' }, { kind: 'disabled', sel: '#menos', what: 'O botão #menos', equals: true }] },
    ],
    solution: {
      'App.jsx': `import { useState } from 'react';\n\nexport default function App() {\n  const [cliques, setCliques] = useState(0);\n  return (\n    <main>\n      <p id="valor">Cliques: {cliques}</p>\n      <button id="menos" disabled={cliques === 0} onClick={() => setCliques((c) => Math.max(0, c - 1))}>−1</button>\n      <button id="mais" onClick={() => setCliques((c) => c + 1)}>+1</button>\n      <button id="zerar" onClick={() => setCliques(0)}>Zerar</button>\n    </main>\n  );\n}\n`,
    },
  },
  {
    ...base,
    kind: 'react',
    id: 'react-formulario-controlado',
    topicIds: ['react-hooks-forms'],
    skills: ['react.forms', 'react.state'],
    difficulty: 'medio',
    scope: 'aprofundamento',
    estimatedMinutes: 15,
    title: 'Formulário controlado',
    prompt:
      'Com um **input controlado** `#nome`: mostre `<p id="previa">Olá, NOME!</p>` **só quando** houver texto; o botão **Adicionar** (envio do formulário) fica **desabilitado** com o campo vazio ou só com espaços; ao enviar, adicione o nome (sem espaços nas pontas) em `<ul id="nomes">` e **limpe o campo**.',
    objectives: ['Ligar value e onChange (input controlado)', 'Derivar valores do estado (prévia, botão desabilitado)', 'Tratar onSubmit com preventDefault', 'Atualizar arrays no estado sem mutação'],
    hints: ['`const [nome, setNome] = useState("")` e `<input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />`.', '`const limpo = nome.trim();` → `disabled={!limpo}` e `{limpo && <p id="previa">…</p>}`.', 'No submit: `e.preventDefault(); setNomes([...nomes, limpo]); setNome("");`.'],
    explanation:
      'Num input controlado, o estado é a fonte da verdade: a prévia e o botão são calculados a partir dele a cada renderização. Para listas, cria-se um array novo (`[...nomes, novo]`) em vez de dar push — o React compara referências para saber o que mudou.',
    relations: { keywords: ['input controlado', 'onSubmit', 'useState'] },
    files: {
      'App.jsx': `import { useState } from 'react';\n\nexport default function App() {\n  return (\n    <main>\n      <form>\n        <label htmlFor="nome">Nome</label>\n        <input id="nome" />\n        <button type="submit">Adicionar</button>\n      </form>\n      <ul id="nomes"></ul>\n    </main>\n  );\n}\n`,
      'style.css': BASE_CSS,
      'index.html': REACT_HTML,
    },
    editable: ['App.jsx', 'style.css'],
    tests: [
      { id: 'vazio', label: 'sem texto: botão desabilitado e sem prévia', checks: [{ kind: 'disabled', sel: 'form button[type=submit]', what: 'O botão Adicionar', equals: true }, { kind: 'count', sel: '#previa', what: 'prévias', max: 0 }, { kind: 'no-errors' }] },
      { id: 'previa', label: 'digitar mostra "Olá, Bia!" e habilita o botão', steps: [{ do: 'fill', sel: '#nome', what: 'o campo nome', value: 'Bia' }], checks: [{ kind: 'text', sel: '#previa', what: 'A #previa', equals: 'Olá, Bia!' }, { kind: 'disabled', sel: 'form button[type=submit]', what: 'O botão Adicionar', equals: false }] },
      { id: 'adicionar', label: 'enviar adiciona o nome sem espaços e limpa o campo', steps: [{ do: 'fill', sel: '#nome', what: 'o campo nome', value: '  Caio  ' }, { do: 'submit', sel: 'form', what: 'o formulário' }], checks: [{ kind: 'count', sel: '#nomes li', what: 'nomes na lista', min: 1, max: 1 }, { kind: 'text', sel: '#nomes li', what: 'O item', equals: 'Caio', caseSensitive: true }, { kind: 'value', sel: '#nome', what: 'O campo', equals: '' }] },
      { id: 'espacos', label: 'só espaços mantém o botão desabilitado', steps: [{ do: 'fill', sel: '#nome', what: 'o campo nome', value: '   ' }], checks: [{ kind: 'disabled', sel: 'form button[type=submit]', what: 'O botão Adicionar', equals: true }] },
    ],
    solution: {
      'App.jsx': `import { useState } from 'react';\n\nexport default function App() {\n  const [nome, setNome] = useState('');\n  const [nomes, setNomes] = useState([]);\n  const limpo = nome.trim();\n  return (\n    <main>\n      <form\n        onSubmit={(e) => {\n          e.preventDefault();\n          if (!limpo) return;\n          setNomes([...nomes, limpo]);\n          setNome('');\n        }}\n      >\n        <label htmlFor="nome">Nome</label>\n        <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />\n        <button type="submit" disabled={!limpo}>Adicionar</button>\n      </form>\n      {limpo && <p id="previa">Olá, {limpo}!</p>}\n      <ul id="nomes">\n        {nomes.map((n, i) => (\n          <li key={i}>{n}</li>\n        ))}\n      </ul>\n    </main>\n  );\n}\n`,
    },
  },
  {
    ...base,
    kind: 'react',
    id: 'react-busca-lista',
    topicIds: ['react-hooks-forms'],
    skills: ['react.state', 'react.forms'],
    difficulty: 'medio',
    scope: 'aprofundamento',
    estimatedMinutes: 12,
    title: 'Busca que filtra a lista',
    prompt:
      'Filtre os `livros` conforme o texto de `#busca` (o título **contém** o texto, **sem diferenciar maiúsculas**). Mostre os resultados em `<ul id="livros">`, a contagem em `<p id="total">Resultados: N</p>` e, quando não houver nenhum, `<p id="vazio">Nenhum livro encontrado.</p>`.',
    objectives: ['Guardar o texto da busca no estado', 'Derivar a lista filtrada (sem outro estado)', 'Renderização condicional'],
    hints: ['Só a busca vai para o estado; a lista filtrada é calculada: `livros.filter(...)`.', 'Sem diferenciar maiúsculas: compare `titulo.toLowerCase().includes(busca.toLowerCase())`.', '`{filtrados.length === 0 && <p id="vazio">…</p>}`.'],
    explanation:
      'A lista filtrada é derivada do estado da busca a cada renderização — guardar uma cópia filtrada em outro estado criaria duas fontes da verdade que podem divergir. Renderização condicional (`&&`) mostra a mensagem só quando faz sentido.',
    relations: { keywords: ['filtro', 'estado derivado', 'renderização condicional'] },
    files: {
      'App.jsx': `import { useState } from 'react';\n\n${LIVROS}\nexport default function App() {\n  return (\n    <main>\n      <label htmlFor="busca">Buscar</label>\n      <input id="busca" />\n      <p id="total">Resultados: {livros.length}</p>\n      <ul id="livros">\n        {livros.map((l) => (\n          <li key={l}>{l}</li>\n        ))}\n      </ul>\n    </main>\n  );\n}\n`,
      'style.css': BASE_CSS,
      'index.html': REACT_HTML,
    },
    editable: ['App.jsx', 'style.css'],
    tests: [
      { id: 'todos', label: 'sem busca, mostra os 5 livros', checks: [{ kind: 'count', sel: '#livros li', what: 'livros', min: 5, max: 5 }, { kind: 'text', sel: '#total', what: 'O #total', equals: 'Resultados: 5' }, { kind: 'no-errors' }] },
      { id: 'filtra', label: '"DADOS" encontra 2 livros (sem diferenciar maiúsculas)', steps: [{ do: 'fill', sel: '#busca', what: 'o campo de busca', value: 'DADOS' }], checks: [{ kind: 'count', sel: '#livros li', what: 'livros', min: 2, max: 2 }, { kind: 'text', sel: '#total', what: 'O #total', equals: 'Resultados: 2' }, { kind: 'count', sel: '#vazio', what: 'mensagens de vazio', max: 0 }] },
      { id: 'nenhum', label: 'sem resultado, mostra a mensagem', steps: [{ do: 'fill', sel: '#busca', what: 'o campo de busca', value: 'xyz' }], checks: [{ kind: 'count', sel: '#livros li', what: 'livros', max: 0 }, { kind: 'text', sel: '#vazio', what: 'O #vazio', equals: 'Nenhum livro encontrado.' }, { kind: 'text', sel: '#total', what: 'O #total', equals: 'Resultados: 0' }] },
    ],
    solution: {
      'App.jsx': `import { useState } from 'react';\n\n${LIVROS}\nexport default function App() {\n  const [busca, setBusca] = useState('');\n  const filtrados = livros.filter((l) => l.toLowerCase().includes(busca.toLowerCase()));\n  return (\n    <main>\n      <label htmlFor="busca">Buscar</label>\n      <input id="busca" value={busca} onChange={(e) => setBusca(e.target.value)} />\n      <p id="total">Resultados: {filtrados.length}</p>\n      <ul id="livros">\n        {filtrados.map((l) => (\n          <li key={l}>{l}</li>\n        ))}\n      </ul>\n      {filtrados.length === 0 && <p id="vazio">Nenhum livro encontrado.</p>}\n    </main>\n  );\n}\n`,
    },
  },
];
