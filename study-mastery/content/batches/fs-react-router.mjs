// Lote fs-react-router — React Router: 6 fáceis (001–006), 6 médias (007–012), 6 difíceis (013–018).
// Base: Aula 08 (README e starter: BrowserRouter, Routes, Route, useParams, Link, rota coringa *).
// Verificação REAL: react-router-dom (v7) no sandbox — StaticRouter/MemoryRouter renderizam as rotas e eventos
// de clique são disparados no jsdom; o HTML/URL resultante é comparado às alternativas.
import { m } from '../../tools/lib/dsl.ts';

const A8 = 'fs-aula-08';
const R = (n, o) => ({ d: 'fullstack', topic: 'react-router', ...o, id: `fs-react-router-${String(n).padStart(3, '0')}` });
const h = (strings, ...v) => m(strings, ...v).replaceAll('§', '`').replaceAll('\\n', '\n');
const code = (src) => '§§§jsx\n'.replaceAll('§', '`') + src.trim() + '\n§§§'.replaceAll('§', '`');
const stem = (intro, c) => `${intro}\n\n${code(c)}`;

const HARNESS = `import { JSDOM, VirtualConsole } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { MemoryRouter, Routes, Route, Link, useParams, useLocation, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', virtualConsole: new VirtualConsole() });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = (await import('react')).default;
const { useState } = React;
const { createRoot } = await import('react-dom/client');
const $ = (id) => document.getElementById(id);
const estatico = (url, el) => renderToStaticMarkup(<StaticRouter location={url}>{el}</StaticRouter>);
const montar = async (url, el) => { const root = createRoot($('root')); await React.act(async () => root.render(<MemoryRouter initialEntries={[url]}>{el}</MemoryRouter>)); return root; };
const clicar = async (el) => { const evt = new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }); await React.act(async () => { el.dispatchEvent(evt); }); return evt; };
`;
const ui = (componente, interacao, values) => ({ kind: 'node', params: { jsx: true, code: `${HARNESS}${componente}\n${interacao}` }, values });

const APP = `function Home() { return <h1>Home</h1>; }
function Detalhe() {
  const { id } = useParams();
  return <h1>Detalhe {id}</h1>;
}
function NaoEncontrada() { return <h1>404</h1>; }

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/lugares/:id" element={<Detalhe />} />
      <Route path="*" element={<NaoEncontrada />} />
    </Routes>
  );
}`;

export default [
  // ---------------- FÁCEIS ----------------
  R(1, {
    diff: 'facil', scope: 'aula', sub: 'Rota raiz',
    stem: h`${stem('Com as rotas configuradas como na Aula 08, qual título aparece quando a URL é §/§?', APP)}`,
    opts: [h`§Home§`, [h`§Detalhe§`, h`A rota §/lugares/:id§ só casa com URLs que começam com §/lugares/§ seguido de um id.`], [h`§404§`, h`A rota coringa §*§ só é usada quando nenhuma outra rota casa; aqui §/§ casa com a Home.`], [h`Nada é renderizado`, h`Há uma rota que casa com §/§ e renderiza a Home.`]],
    exp: h`O React Router compara a URL com as rotas: §path="/"§ casa exatamente com §/§ e renderiza §<Home />§. Este é o item “§/§ mostra a lista de lugares” dos critérios de aceite.`,
    src: [[A8, 'Configure o <BrowserRouter> com 3 rotas (/, /lugares/:id, *)']],
    verify: ui(APP, "console.log(estatico('/', <App />));", ['<h1>Home</h1>', '<h1>Detalhe </h1>', '<h1>404</h1>', '']),
  }),
  R(2, {
    diff: 'facil', scope: 'aula', sub: 'Parâmetro de rota',
    stem: h`${stem('Qual título aparece para a URL §/lugares/3§ (o §useParams§ lê o §id§ da rota §/lugares/:id§)?', APP)}`,
    opts: [h`§Detalhe 3§`, [h`§Detalhe :id§`, h`§useParams()§ devolve o *valor* presente na URL (§"3"§), não o nome do parâmetro.`], [h`§Home§`, h`A URL tem o prefixo §/lugares/§; a rota §/§ só casa com a raiz.`], [h`§404§`, h`A URL casa com §/lugares/:id§; a coringa só vale para URLs sem rota correspondente.`]],
    exp: h`O trecho §:id§ no §path§ é um parâmetro dinâmico: qualquer valor ali (§3§, §42§...) cai na mesma rota e fica disponível em §useParams()§ — aqui §id = "3"§, então o título é “Detalhe 3”.`,
    src: [[A8, 'Ler o parâmetro :id da URL com useParams']],
    verify: ui(APP, "console.log(estatico('/lugares/3', <App />));", ['<h1>Detalhe 3</h1>', '<h1>Detalhe :id</h1>', '<h1>Home</h1>', '<h1>404</h1>']),
  }),
  R(3, {
    diff: 'facil', scope: 'aula', sub: 'Rota coringa',
    stem: h`${stem('Qual título aparece para a URL §/qualquer-coisa§?', APP)}`,
    opts: [h`§404§`, [h`§Home§`, h`A Home só aparece em §/§.`], [h`§Detalhe§`, h`§Detalhe§ exige o prefixo §/lugares/§.`], [h`Um erro do navegador (página não encontrada)`, h`Em um SPA, a rota coringa §*§ captura qualquer URL sem rota própria e mostra a página 404 do próprio app.`]],
    exp: h`§path="*"§ é a rota “coringa”: casa com qualquer URL que nenhuma outra rota atendeu. Assim o app mostra a própria página “não encontrado” em vez de uma tela vazia — critério de aceite: “§/rota-invalida§ mostra a página 404”.`,
    src: [[A8, 'rota coringa * para qualquer outra URL']],
    verify: ui(APP, "console.log(estatico('/qualquer-coisa', <App />));", ['<h1>404</h1>', '<h1>Home</h1>', '<h1>Detalhe </h1>', '']),
  }),
  R(4, {
    diff: 'facil', scope: 'aula', sub: 'Link',
    stem: h`${stem('Que elemento HTML o componente §Link§ gera, e com qual destino?', 'const html = renderToStaticMarkup(\n  <StaticRouter location="/">\n    <Link to="/lugares/2">Ver detalhes</Link>\n  </StaticRouter>\n);')}`,
    opts: [h`Uma âncora §<a>§ com §href="/lugares/2"§`, [h`Um elemento §<Link>§ com o atributo §to§`, h`§Link§ é um componente do React; no HTML final ele vira uma âncora comum.`], [h`Um §<button>§ com §data-to="/lugares/2"§`, h`§Link§ gera uma âncora (§<a>§) com §href§, o que mantém acessibilidade e permite abrir em nova aba.`], [h`Uma âncora §<a>§ com o atributo §to="/lugares/2"§`, h`O atributo da âncora é §href§; §to§ é o nome da prop do componente.`]],
    exp: h`O §<Link to="...">§ renderiza uma âncora §<a href="...">§ — acessível e funcional — mas intercepta o clique para navegar sem recarregar a página. Por isso a Aula 08 troca os §<a href>§ por §<Link to>§.`,
    src: [[A8, '3. Cabecalho e LugarCard: troque as tags <a href="..."> por <Link to="...">']],
    verify: ui('', "const html = estatico('/', <Link to=\"/lugares/2\">Ver detalhes</Link>);\nconst r = html.match(/^<(\\w+)\\s([^>]*)>/);\nconst href = r[2].match(/href=\"([^\"]*)\"/);\nconsole.log(r[1] + ' ' + (href ? 'href=' + href[1] : 'sem href'));", ['a href=/lugares/2', 'Link to=/lugares/2', 'button data-to=/lugares/2', 'a to=/lugares/2']),
  }),
  R(5, {
    diff: 'facil', scope: 'aula', sub: 'id é texto',
    stem: h`${stem('Na URL §/lugares/abc§, o que o código imprime?', 'function Detalhe() {\n  const { id } = useParams();\n  const lugarId = Number(id);\n  return <p>{typeof id} {String(lugarId)}</p>;\n}\n// <Route path="/lugares/:id" element={<Detalhe />} />')}`,
    opts: [h`§string NaN§`, [h`§number 0§`, h`§useParams§ sempre devolve texto; e §Number("abc")§ não dá 0, dá §NaN§.`], [h`§string abc§`, h`A segunda parte imprime o resultado de §Number(id)§, que é §NaN§ para “abc”.`], [h`§number NaN§`, h`O tipo de §id§ é §string§ (os valores da URL são sempre texto).`]],
    exp: h`Os parâmetros de rota são sempre *strings*. A aula converte com §Number(id)§ para comparar com os ids numéricos de §lugares.json§; se o texto não for numérico (ex.: “abc”), a conversão dá §NaN§ e o lugar não é encontrado — por isso §/lugares/999§ e ids inválidos mostram a página 404.`,
    src: [[A8, '2. Detalhe: useParams() devolve string; converta com Number(id)']],
    verify: ui('function Detalhe() {\n  const { id } = useParams();\n  const lugarId = Number(id);\n  return <p>{typeof id} {String(lugarId)}</p>;\n}', "console.log(estatico('/lugares/abc', <Routes><Route path=\"/lugares/:id\" element={<Detalhe />} /></Routes>));", ['<p>string NaN</p>', '<p>number 0</p>', '<p>string abc</p>', '<p>number NaN</p>']),
  }),
  R(6, {
    diff: 'facil', scope: 'aula', sub: 'Organização de pastas',
    stem: h`Pela regra da Aula 08, onde deve ficar um arquivo que representa **uma tela inteira** (rota), como §Detalhe.jsx§?`,
    opts: [h`Em §src/paginas/§`, [h`Em §src/componentes/§`, h`§componentes/§ guarda peças reutilizáveis usadas dentro de várias telas.`], [h`Em §src/servicos/§`, h`§servicos/§ guarda o acesso a dados (fetch), não telas.`], [h`Em §src/utilitarios/§`, h`§utilitarios/§ guarda funções puras (cálculos, filtros).`]],
    exp: h`A regra prática do README: “se o arquivo é uma **rota inteira**, ele mora em §paginas/§. Se é uma **peça** usada dentro de várias telas, mora em §componentes/§”. Os demais diretórios: §servicos/§ (fetch), §utilitarios/§ (funções puras) e §data/§ (constantes).`,
    src: [[A8, 'Nova organização de pastas: paginas/ para rotas inteiras']],
    verify: { kind: 'source', claims: [h`README Aula 08: “A regra prática: se o arquivo é uma rota inteira, ele mora em paginas/. Se é uma peça usada dentro de várias telas, mora em componentes/.”`] },
  }),

  // ---------------- MÉDIAS ----------------
  R(7, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Ranking de rotas',
    stem: h`Na versão atual do React Router, a rota coringa foi declarada **primeiro**. Qual título aparece para §/lugares/3§?\n\n${code('<Routes>\n  <Route path="*" element={<NaoEncontrada />} />\n  <Route path="/" element={<Home />} />\n  <Route path="/lugares/:id" element={<Detalhe />} />\n</Routes>')}`,
    opts: [h`§Detalhe 3§ (vence a mais específica)`, [h`§404§ — vence a primeira rota que casa`, h`Desde a v6 o React Router *ranqueia* as rotas por especificidade; o §*§ é a menos específica e só vence se nada mais casar.`], [h`§Home§`, h`§/§ só casa com a URL raiz.`], [h`Um erro de configuração`, h`A ordem das rotas não causa erro.`]],
    exp: h`Nas versões atuais, o React Router escolhe a rota *mais específica* que casa, independentemente da ordem. Mesmo assim a aula recomenda declarar a coringa por último: deixa a leitura clara e evita surpresas em versões/roteadores antigos.`,
    src: [[A8, 'path="*": rota coringa; DEVE ser a última <Route> da lista (convenção da aula)']],
    verify: ui(APP, "console.log(estatico('/lugares/3', <Routes><Route path=\"*\" element={<NaoEncontrada />} /><Route path=\"/\" element={<Home />} /><Route path=\"/lugares/:id\" element={<Detalhe />} /></Routes>));", ['<h1>Detalhe 3</h1>', '<h1>404</h1>', '<h1>Home</h1>', 'erro']),
  }),
  R(8, {
    diff: 'medio', scope: 'aula', sub: 'Link não recarrega a página',
    stem: h`${stem('O usuário clica no §Link§. Qual é o valor de §evento.defaultPrevented§ e qual pathname passa a ser exibido?', 'function Pagina() {\n  const { pathname } = useLocation();\n  return <div><Link id="l" to="/lugares/2">Ver</Link><p id="p">{pathname}</p></div>;\n}\n// MemoryRouter começando em "/"')}`,
    opts: [h`§true§ e §/lugares/2§`, [h`§false§ e §/lugares/2§`, h`O §Link§ cancela o comportamento padrão da âncora (que recarregaria a página) e navega pelo roteador.`], [h`§true§ e §/§`, h`A navegação acontece: o pathname muda para §/lugares/2§.`], [h`§false§ e §/§`, h`O clique é tratado pelo roteador (defaultPrevented verdadeiro) e a URL muda.`]],
    exp: h`Ao clicar, o §Link§ chama §preventDefault()§ no evento (impedindo a navegação do navegador, que recarregaria tudo) e atualiza a URL pelo roteador: o React troca só o conteúdo das rotas. É o “sem flash branco” dos critérios da aula.`,
    src: [[A8, 'Navegar entre páginas não recarrega o navegador (sem flash branco)']],
    verify: ui('function Pagina() {\n  const { pathname } = useLocation();\n  return <div><Link id="l" to="/lugares/2">Ver</Link><p id="p">{pathname}</p></div>;\n}', "await montar('/', <Pagina />);\nconst evt = await clicar($('l'));\nconsole.log(evt.defaultPrevented, $('p').textContent);", ['true /lugares/2', 'false /lugares/2', 'true /', 'false /']),
  }),
  R(9, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Vários parâmetros',
    stem: h`${stem('Para a URL §/lugares/3/avaliacoes/7§, o que o componente imprime?', 'function Pagina() {\n  const { id, avaliacaoId } = useParams();\n  return <p>{id}-{avaliacaoId}</p>;\n}\n// <Route path="/lugares/:id/avaliacoes/:avaliacaoId" element={<Pagina />} />')}`,
    opts: [h`§3-7§`, [h`§7-3§`, h`Os nomes na rota definem o mapeamento: §:id§ é o primeiro segmento dinâmico (3) e §:avaliacaoId§ o segundo (7).`], [h`§id-avaliacaoId§`, h`§useParams§ devolve os valores presentes na URL, não os nomes.`], [h`§-§`, h`Os dois parâmetros foram encontrados na URL.`]],
    exp: h`Cada §:nome§ no §path§ vira uma chave de §useParams()§. Em §/lugares/:id/avaliacoes/:avaliacaoId§, a URL §/lugares/3/avaliacoes/7§ produz §{ id: "3", avaliacaoId: "7" }§ — resultado §3-7§.`,
    src: [[A8, 'rota /lugares/:id: parâmetro dinâmico lido com useParams']],
    verify: ui('function Pagina() {\n  const { id, avaliacaoId } = useParams();\n  return <p>{id}-{avaliacaoId}</p>;\n}', "console.log(estatico('/lugares/3/avaliacoes/7', <Routes><Route path=\"/lugares/:id/avaliacoes/:avaliacaoId\" element={<Pagina />} /></Routes>));", ['<p>3-7</p>', '<p>7-3</p>', '<p>id-avaliacaoId</p>', '<p>-</p>']),
  }),
  R(10, {
    diff: 'medio', scope: 'aula', sub: 'Layout fora de Routes',
    stem: h`${stem('Na URL inválida §/rota-invalida§, o que aparece na tela?', 'function App() {\n  return (\n    <BrowserRouter>\n      <Cabecalho />\n      <Routes>\n        <Route path="/" element={<Home />} />\n        <Route path="*" element={<NaoEncontrada />} />\n      </Routes>\n      <Rodape />\n    </BrowserRouter>\n  );\n}')}`,
    opts: [h`Cabeçalho, a página 404 e rodapé`, [h`Somente a página 404`, h`§Cabecalho§ e §Rodape§ estão fora de §<Routes>§, então aparecem em todas as páginas.`], [h`Somente cabeçalho e rodapé`, h`A rota coringa renderiza a página 404 entre os dois.`], [h`Uma tela em branco`, h`Há uma rota coringa que cobre qualquer URL sem rota própria.`]],
    exp: h`Tudo que está fora de §<Routes>§ é renderizado sempre. Por isso a aula pede “manter §<Cabecalho />§ e §<Rodape />§ visíveis em todas as páginas” — inclusive na 404 — e só o miolo muda conforme a URL.`,
    src: [[A8, 'Cabecalho e Rodape aparecem em todas as páginas, inclusive na 404']],
    verify: ui('const Cabecalho = () => <header>H</header>;\nconst Rodape = () => <footer>F</footer>;\nconst Home = () => <h1>Home</h1>;\nconst NaoEncontrada = () => <h1>404</h1>;', "console.log(estatico('/rota-invalida', <><Cabecalho /><Routes><Route path=\"/\" element={<Home />} /><Route path=\"*\" element={<NaoEncontrada />} /></Routes><Rodape /></>));", ['<header>H</header><h1>404</h1><footer>F</footer>', '<h1>404</h1>', '<header>H</header><footer>F</footer>', '']),
  }),
  R(11, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Query string',
    stem: h`${stem('Para a URL §/lugares?cat=parque§, o que o componente imprime?', 'function Lista() {\n  const [params] = useSearchParams();\n  return <p>{params.get("cat")}</p>;\n}')}`,
    opts: [h`§parque§`, [h`§cat=parque§`, h`§get("cat")§ devolve só o *valor* do parâmetro.`], [h`Nada (§null§ não é exibido)`, h`O parâmetro §cat§ existe na URL, então o valor é §"parque"§.`], [h`§undefined§`, h`Parâmetros ausentes devolvem §null§; aqui ele está presente.`]],
    exp: h`Parâmetros de *query string* (depois do §?§) são lidos com §useSearchParams()§, diferente dos parâmetros de caminho (§:id§) lidos com §useParams()§. Aqui §params.get("cat")§ é §"parque"§.`,
    src: [[A8, 'ler parâmetros da URL (useParams) — query string é um recurso relacionado']],
    verify: ui('function Lista() {\n  const [params] = useSearchParams();\n  return <p>{params.get("cat")}</p>;\n}', "console.log(estatico('/lugares?cat=parque', <Lista />));", ['<p>parque</p>', '<p>cat=parque</p>', '<p></p>', '<p>undefined</p>']),
  }),
  R(12, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Barra final na URL',
    stem: h`Com a rota §/lugares/:id§, qual título aparece para a URL §/lugares/3/§ (com barra no final)?\n\n${code(APP)}`,
    opts: [h`§Detalhe 3§`, [h`§404§`, h`O React Router ignora a barra final ao comparar os caminhos: §/lugares/3/§ casa com §/lugares/:id§.`], [h`§Detalhe §, com id vazio`, h`O valor do parâmetro continua sendo §"3"§.`], [h`§Home§`, h`A raiz só casa com §/§.`]],
    exp: h`Por padrão, a barra final é ignorada na correspondência de rotas (§/lugares/3§ e §/lugares/3/§ casam com a mesma rota) e o parâmetro §id§ vale §"3"§. Isso evita 404 desnecessário para URLs digitadas com barra.`,
    src: [[A8, '/lugares/1 (ou qualquer id válido) mostra o detalhe certo']],
    verify: ui(APP, "console.log(estatico('/lugares/3/', <App />));", ['<h1>Detalhe 3</h1>', '<h1>404</h1>', '<h1>Detalhe </h1>', '<h1>Home</h1>']),
  }),

  // ---------------- DIFÍCEIS ----------------
  R(13, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Rota estática versus dinâmica',
    stem: h`${stem('Com as duas rotas abaixo (a dinâmica declarada primeiro), qual página aparece para §/lugares/novo§?', '<Routes>\n  <Route path="/lugares/:id" element={<Detalhe />} />\n  <Route path="/lugares/novo" element={<NovoLugar />} />\n</Routes>')}`,
    opts: [h`§NovoLugar§ (a estática vence)`, [h`§Detalhe§ com §id = "novo"§`, h`O roteador prioriza segmentos estáticos sobre dinâmicos, independentemente da ordem.`], [h`As duas ao mesmo tempo`, h`Só uma rota é escolhida em um mesmo nível de §<Routes>§.`], [h`A página 404`, h`Existe uma rota que casa (a estática).`]],
    exp: h`O React Router calcula uma “pontuação” para cada rota: segmentos estáticos (§novo§) valem mais que dinâmicos (§:id§). Assim §/lugares/novo§ vai para §NovoLugar§, e qualquer outro valor (§/lugares/3§) para §Detalhe§ — sem depender da ordem de declaração.`,
    src: [[A8, 'rotas com parâmetro dinâmico (:id) convivendo com outras rotas']],
    verify: ui('const Detalhe = () => { const { id } = useParams(); return <h1>Detalhe {id}</h1>; };\nconst NovoLugar = () => <h1>Novo</h1>;', "console.log(estatico('/lugares/novo', <Routes><Route path=\"/lugares/:id\" element={<Detalhe />} /><Route path=\"/lugares/novo\" element={<NovoLugar />} /></Routes>));", ['<h1>Novo</h1>', '<h1>Detalhe novo</h1>', '<h1>Novo</h1><h1>Detalhe novo</h1>', '<h1>404</h1>']),
  }),
  R(14, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'useNavigate',
    stem: h`${stem('Depois que o botão é clicado, qual é o pathname exibido?', 'function Pagina() {\n  const navegar = useNavigate();\n  const { pathname } = useLocation();\n  return (\n    <div>\n      <button id="b" onClick={() => navegar("/")}>Voltar</button>\n      <p id="p">{pathname}</p>\n    </div>\n  );\n}\n// MemoryRouter começando em "/lugares/5"')}`,
    opts: [h`§/§`, [h`§/lugares/5§`, h`§navegar("/")§ navega programaticamente para a raiz, mudando o pathname.`], [h`§/Voltar§`, h`O destino é o caminho passado para §navegar§, não o texto do botão.`], [h`Nada: o botão exige um §Link§`, h`§useNavigate§ permite navegar a partir de qualquer evento, sem um §Link§.`]],
    exp: h`§useNavigate()§ devolve uma função para navegar por código (depois de salvar um formulário, por exemplo). Ao chamar §navegar("/")§ a URL muda para a raiz sem recarregar a página.`,
    src: [[A8, 'navegação entre páginas sem recarregar']],
    verify: ui('function Pagina() {\n  const navegar = useNavigate();\n  const { pathname } = useLocation();\n  return (\n    <div>\n      <button id="b" onClick={() => navegar("/")}>Voltar</button>\n      <p id="p">{pathname}</p>\n    </div>\n  );\n}', "await montar('/lugares/5', <Pagina />);\nawait clicar($('b'));\nconsole.log($('p').textContent);", ['/', '/lugares/5', '/Voltar', '']),
  }),
  R(15, {
    diff: 'dificil', scope: 'desafio', sub: 'Links relativos',
    stem: h`${stem('Qual é o §href§ gerado pelo link relativo (sem barra inicial) quando a URL atual é §/lugares/3§?', '// <Route path="/lugares/:id" element={<Detalhe />} />\nfunction Detalhe() {\n  return <Link to="avaliacoes">Avaliações</Link>;\n}')}`,
    opts: [h`§/lugares/3/avaliacoes§`, [h`§/avaliacoes§`, h`Sem barra inicial o destino é *relativo* à rota atual (§/lugares/3§), e não à raiz.`], [h`§/lugares/avaliacoes§`, h`O relativo parte da rota inteira (com o valor do §:id§), e não do segmento anterior.`], [h`§avaliacoes§`, h`O §Link§ resolve o caminho completo: §href="/lugares/3/avaliacoes"§.`]],
    exp: h`Em §<Link to="avaliacoes">§ (sem §/§ no início) o caminho é resolvido a partir da rota atual: §/lugares/3§ + §avaliacoes§ = §/lugares/3/avaliacoes§. Com §to="/avaliacoes"§ o destino seria a raiz.`,
    src: [[A8, 'Link to="...": navegação entre rotas']],
    verify: ui('function Detalhe() {\n  return <Link to="avaliacoes">Avaliações</Link>;\n}', "const html = estatico('/lugares/3', <Routes><Route path=\"/lugares/:id\" element={<Detalhe />} /></Routes>);\nconsole.log(html.match(/href=\"([^\"]*)\"/)[1]);", ['/lugares/3/avaliacoes', '/avaliacoes', '/lugares/avaliacoes', 'avaliacoes']),
  }),
  R(16, {
    diff: 'dificil', scope: 'desafio', sub: 'Parâmetro curinga (splat)',
    stem: h`${stem('Para a URL §/arquivos/fotos/2026/praia.png§, o que o componente imprime?', 'function Arquivo() {\n  const params = useParams();\n  return <p>{params["*"]}</p>;\n}\n// <Route path="/arquivos/*" element={<Arquivo />} />')}`,
    opts: [h`§fotos/2026/praia.png§`, [h`§*§`, h`O asterisco no path é o padrão da rota; §params["*"]§ contém o texto que ele capturou.`], [h`§fotos§`, h`O curinga captura *todo* o restante do caminho, não só o próximo segmento.`], [h`§/arquivos/fotos/2026/praia.png§`, h`O valor capturado não inclui a parte já casada (§/arquivos/§).`]],
    exp: h`O §*§ no final de um path (“splat”) captura todo o restante da URL. Ele fica em §params["*"]§ — aqui §fotos/2026/praia.png§. A rota coringa da aula (§path="*"§) usa o mesmo mecanismo para aceitar qualquer URL.`,
    src: [[A8, 'path="*": rota coringa que pega qualquer URL']],
    verify: ui('function Arquivo() {\n  const params = useParams();\n  return <p>{params["*"]}</p>;\n}', "console.log(estatico('/arquivos/fotos/2026/praia.png', <Routes><Route path=\"/arquivos/*\" element={<Arquivo />} /></Routes>));", ['<p>fotos/2026/praia.png</p>', '<p>*</p>', '<p>fotos</p>', '<p>/arquivos/fotos/2026/praia.png</p>']),
  }),
  R(17, {
    diff: 'dificil', scope: 'desafio', sub: 'Redirecionamento com Navigate',
    stem: h`${stem('O usuário acessa §/inicio§. Qual título aparece e qual é o pathname final?', 'function App() {\n  const { pathname } = useLocation();\n  return (\n    <>\n      <p id="p">{pathname}</p>\n      <Routes>\n        <Route path="/" element={<h1>Home</h1>} />\n        <Route path="/inicio" element={<Navigate to="/" replace />} />\n      </Routes>\n    </>\n  );\n}')}`,
    opts: [h`§Home§ em §/§`, [h`Nada, em §/inicio§`, h`O §<Navigate>§ redireciona imediatamente para a rota indicada em §to§.`], [h`§Home§, mas o pathname continua §/inicio§`, h`O redirecionamento altera a URL para §/§ (com §replace§, substituindo a entrada do histórico).`], [h`§404§ em §/§`, h`O destino §/§ existe e renderiza a Home.`]],
    exp: h`§<Navigate to="/" replace />§ dispara uma navegação ao ser renderizado: o pathname vira §/§ e a rota raiz mostra “Home”. O §replace§ troca a entrada atual do histórico em vez de empilhar outra, evitando que o botão “voltar” caia de novo em §/inicio§.`,
    src: [[A8, 'rotas e navegação do React Router']],
    verify: ui('function App() {\n  const { pathname } = useLocation();\n  return (\n    <>\n      <p id="p">{pathname}</p>\n      <Routes>\n        <Route path="/" element={<h1>Home</h1>} />\n        <Route path="/inicio" element={<Navigate to="/" replace />} />\n      </Routes>\n    </>\n  );\n}', "await montar('/inicio', <App />);\nconsole.log(document.querySelector('h1') ? document.querySelector('h1').textContent + ' em ' + $('p').textContent : 'nada em ' + $('p').textContent);", ['Home em /', 'nada em /inicio', 'Home em /inicio', '404 em /']),
  }),
  R(18, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Link versus âncora comum',
    stem: h`Dois cliques são feitos: um em um §Link§ e outro em um §<a href>§ comum. Quais são os valores de §defaultPrevented§ em cada evento?\n\n${code('<MemoryRouter>\n  <Link id="l" to="/x">Link</Link>\n  <a id="a" href="/x">Âncora</a>\n</MemoryRouter>')}`,
    opts: [h`Link: §true§ e âncora: §false§`, [h`Os dois: §true§`, h`A âncora comum não é interceptada: o navegador faz a navegação padrão (recarregando a página).`], [h`Os dois: §false§`, h`O §Link§ cancela o comportamento padrão para navegar pelo roteador.`], [h`Link: §false§ e âncora: §true§`, h`É o contrário: o roteador intercepta o §Link§, não a âncora.`]],
    exp: h`O §Link§ trata o clique: chama §preventDefault()§ e navega internamente (SPA). A âncora comum mantém o comportamento padrão: o navegador carrega a nova URL, recarregando o app e perdendo o estado. Essa é a diferença que a aula pede para aplicar em §Cabecalho§ e §LugarCard§.`,
    src: [[A8, '3. Link navega SEM recarregar a página inteira']],
    verify: ui('', "await montar('/', <><Link id=\"l\" to=\"/x\">Link</Link><a id=\"a\" href=\"/x\" onClick={(e) => e.stopPropagation()}>Âncora</a></>);\nconst e1 = await clicar($('l'));\nconst e2 = await clicar($('a'));\nconsole.log('Link: ' + e1.defaultPrevented + ' e âncora: ' + e2.defaultPrevented);", ['Link: true e âncora: false', 'Link: true e âncora: true', 'Link: false e âncora: false', 'Link: false e âncora: true']),
  }),
];
