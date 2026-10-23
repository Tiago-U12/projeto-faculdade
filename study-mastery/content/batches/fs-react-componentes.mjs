// Lote fs-react-componentes — React: componentes, JSX e props: 8 fáceis (001–008), 8 médias (009–016), 8 difíceis (017–024).
// Base: Aula 06 (README e starter: Estrelas, LugarCard, ListaLugares; props, map com key, renderização condicional).
// Verificação REAL: os componentes do enunciado são renderizados com react-dom/server (React no sandbox; JSX compilado
// pelo esbuild) e o HTML gerado — ou o aviso do React — é comparado às alternativas.
import { m } from '../../tools/lib/dsl.ts';

const A6 = 'fs-aula-06';
const R = (n, o) => ({ d: 'fullstack', topic: 'react-componentes', ...o, id: `fs-react-componentes-${String(n).padStart(3, '0')}` });
const h = (strings, ...v) => m(strings, ...v).replaceAll('§', '`').replaceAll('\\n', '\n');
const code = (src) => '§§§jsx\n'.replaceAll('§', '`') + src.trim() + '\n§§§'.replaceAll('§', '`');
const saida = (src, pergunta = 'Qual HTML é gerado em `html`?') => `${pergunta}\n\n${code(src)}`;
const IMP = "import { renderToStaticMarkup } from 'react-dom/server';\nimport { Children } from 'react';\n";
// executa o trecho (JSX) com react-dom/server e imprime o que o enunciado pede (última linha do trecho: console.log)
const rx = (body, values, pre = '') => ({ kind: 'node', params: { jsx: true, code: `${IMP}${pre}${body}` }, values });

const ESTRELAS = `function Estrelas({ nota, max = 5 }) {
  const cheias = Math.round(nota);
  return (
    <span className="estrelas" aria-label={cheias + " de " + max + " estrelas"}>
      {Array.from({ length: max }, (_, i) => (i < cheias ? "★" : "☆"))}
    </span>
  );
}`;
const comEstrelas = (corpo) => `${ESTRELAS}\n${corpo}`;

export default [
  // ---------------- FÁCEIS ----------------
  R(1, {
    diff: 'facil', scope: 'aula', sub: 'Componente com letra maiúscula',
    stem: h`Existe a função §Estrelas§ (componente). O que é gerado quando o JSX usa a tag em **minúscula**?\n\n${code('const html = renderToStaticMarkup(<estrelas nota={4} />);\nconsole.log(html);')}`,
    opts: [h`§<estrelas nota="4"></estrelas>§`, [h`As estrelas ★★★★☆ do componente`, h`Tags em minúscula são elementos HTML nativos; só nomes com letra maiúscula são tratados como componentes.`], [h`Um erro de sintaxe`, h`O JSX é válido; o React apenas cria um elemento chamado “estrelas”.`], [h`Nada (string vazia)`, h`O elemento desconhecido é renderizado normalmente, com seus atributos.`]],
    exp: h`No JSX, nomes que começam com **maiúscula** (§<Estrelas />§) referem-se a componentes; com minúscula (§<estrelas />§) viram elementos HTML nativos — aqui um elemento desconhecido chamado “estrelas”. Por isso componentes React são nomeados em PascalCase (§Estrelas§, §LugarCard§, §ListaLugares§).`,
    src: [[A6, 'três componentes: Estrelas, LugarCard e ListaLugares (árvore de componentes)']],
    verify: rx('const html = renderToStaticMarkup(<estrelas nota={4} />);\nconsole.log(html);', ['<estrelas nota="4"></estrelas>', '<span class="estrelas">★★★★☆</span>', 'SyntaxError', ''], 'function Estrelas() { return null; }\n'),
  }),
  R(2, {
    diff: 'facil', scope: 'aula', sub: 'Props',
    stem: h`${saida('function Saudacao({ nome }) {\n  return <p>Olá, {nome}!</p>;\n}\nconst html = renderToStaticMarkup(<Saudacao nome="Marina" />);\nconsole.log(html);')}`,
    opts: [h`§<p>Olá, Marina!</p>§`, [h`§<p>Olá, {nome}!</p>§`, h`As chaves §{}§ em JSX avaliam uma expressão JavaScript; o valor da prop §nome§ é inserido.`], [h`§<p>Olá, undefined!</p>§`, h`A prop §nome="Marina"§ foi passada; ela chega ao componente via parâmetro desestruturado.`], [h`§<Saudacao nome="Marina"></Saudacao>§`, h`O React executa o componente e renderiza o que ele retorna (um §<p>§).`]],
    exp: h`As props chegam ao componente como um objeto; a desestruturação §{ nome }§ extrai §nome="Marina"§, e a expressão §{nome}§ no JSX é substituída pelo valor. Resultado: §<p>Olá, Marina!</p>§. É assim que §Estrelas§ recebe §nota§ e §max§.`,
    src: [[A6, 'Estrelas: recebe nota (número) e max (padrão 5)']],
    verify: rx('function Saudacao({ nome }) {\n  return <p>Olá, {nome}!</p>;\n}\nconst html = renderToStaticMarkup(<Saudacao nome="Marina" />);\nconsole.log(html);', ['<p>Olá, Marina!</p>', '<p>Olá, {nome}!</p>', '<p>Olá, undefined!</p>', '<Saudacao nome="Marina"></Saudacao>']),
  }),
  R(3, {
    diff: 'facil', scope: 'aula', sub: 'Componente Estrelas',
    stem: h`Com o componente §Estrelas§ abaixo (como pede o TODO da aula), qual HTML é gerado?\n\n${code(ESTRELAS + '\nconst html = renderToStaticMarkup(<Estrelas nota={3.6} />);\nconsole.log(html);')}`,
    opts: [h`§<span class="estrelas" aria-label="4 de 5 estrelas">★★★★☆</span>§`, [h`§<span class="estrelas" aria-label="3 de 5 estrelas">★★★☆☆</span>§`, h`A nota é arredondada com §Math.round§: 3,6 vira 4 (e não é truncada para 3).`], [h`§<span class="estrelas" aria-label="4 de 5 estrelas">★★★★★</span>§`, h`Só as primeiras 4 posições são cheias (§★§); a quinta é vazia (§☆§).`], [h`§<span class="estrelas" aria-label="3.6 de 5 estrelas">★★★★☆</span>§`, h`O §aria-label§ usa o valor arredondado (§cheias§), não a nota original.`]],
    exp: h`§Math.round(3.6)§ = 4, então as 4 primeiras posições são §★§ e a quinta §☆§ (o padrão §max = 5§ é usado porque a prop não foi passada). O §className§ vira o atributo §class§ no HTML e o §aria-label§ descreve a nota para leitores de tela.`,
    src: [[A6, '1. Estrelas: Math.round(nota) cheias (★), restante vazias (☆), com aria-label']],
    verify: rx(ESTRELAS + '\nconst html = renderToStaticMarkup(<Estrelas nota={3.6} />);\nconsole.log(html);', ['<span class="estrelas" aria-label="4 de 5 estrelas">★★★★☆</span>', '<span class="estrelas" aria-label="3 de 5 estrelas">★★★☆☆</span>', '<span class="estrelas" aria-label="4 de 5 estrelas">★★★★★</span>', '<span class="estrelas" aria-label="3.6 de 5 estrelas">★★★★☆</span>']),
  }),
  R(4, {
    diff: 'facil', scope: 'aula', sub: 'Expressões em JSX',
    stem: h`${saida('const html = renderToStaticMarkup(<p>{2 + 3} avaliações</p>);\nconsole.log(html);')}`,
    opts: [h`§<p>5 avaliações</p>§`, [h`§<p>2 + 3 avaliações</p>§`, h`Dentro de chaves o JSX avalia uma expressão JavaScript; sem chaves seria texto literal.`], [h`§<p>23 avaliações</p>§`, h`Os operandos são números; §+§ soma (não concatena).`], [h`§<p>{5} avaliações</p>§`, h`As chaves não aparecem no HTML; só o valor calculado.`]],
    exp: h`Chaves §{}§ em JSX permitem inserir qualquer *expressão* JavaScript: §{2 + 3}§ é calculada (5) e inserida no texto. É o mesmo mecanismo que insere §{lugar.nome}§ e §{lugar.cidade}§ no §LugarCard§.`,
    src: [[A6, 'LugarCard: <h2 className="card-title">{lugar.nome}</h2>']],
    verify: rx('const html = renderToStaticMarkup(<p>{2 + 3} avaliações</p>);\nconsole.log(html);', ['<p>5 avaliações</p>', '<p>2 + 3 avaliações</p>', '<p>23 avaliações</p>', '<p>{5} avaliações</p>']),
  }),
  R(5, {
    diff: 'facil', scope: 'aula', sub: 'Número versus string nas props',
    stem: h`Um componente imprime o tipo da prop §nota§. O que aparece para as duas formas de passar o valor?\n\n${code('function Tipo({ nota }) {\n  return <i>{typeof nota}</i>;\n}\nconsole.log(renderToStaticMarkup(<Tipo nota={4} />));\nconsole.log(renderToStaticMarkup(<Tipo nota="4" />));')}`,
    opts: [h`§<i>number</i>§ e depois §<i>string</i>§`, [h`§<i>string</i>§ nas duas`, h`Com chaves (§nota={4}§) o valor é uma expressão JavaScript: um número.`], [h`§<i>number</i>§ nas duas`, h`Entre aspas (§nota="4"§) o valor é sempre uma string.`], [h`§<i>string</i>§ e depois §<i>number</i>§`, h`Está invertido: chaves → número; aspas → string.`]],
    exp: h`Em JSX, §prop={4}§ passa o número 4 (expressão JavaScript) e §prop="4"§ passa a string §"4"§. Isso importa em §<Estrelas nota={lugar.notaMedia} />§: passar texto quebraria contas como §Math.round(nota)§ em alguns casos.`,
    src: [[A6, 'Estrelas recebe nota (número); LugarCard recebe um lugar inteiro via props']],
    verify: rx('function Tipo({ nota }) {\n  return <i>{typeof nota}</i>;\n}\nconsole.log(renderToStaticMarkup(<Tipo nota={4} />));\nconsole.log(renderToStaticMarkup(<Tipo nota="4" />));', ['<i>number</i>\n<i>string</i>', '<i>string</i>\n<i>string</i>', '<i>number</i>\n<i>number</i>', '<i>string</i>\n<i>number</i>']),
  }),
  R(6, {
    diff: 'facil', scope: 'aula', sub: 'key em listas',
    stem: h`Em modo de desenvolvimento (§npm run dev§), o componente abaixo renderiza uma lista com §map§ **sem** a prop §key§. O que o React faz?\n\n${code('function Lista({ itens }) {\n  return (\n    <ul>\n      {itens.map((item) => (\n        <li>{item.nome}</li>\n      ))}\n    </ul>\n  );\n}')}`,
    opts: [h`Renderiza a lista, mas avisa no console que cada filho precisa de uma §key§ única`, [h`Lança um erro e não renderiza nada`, h`O React renderiza a lista; o problema é só sinalizado como aviso.`], [h`Adiciona keys automaticamente e não avisa`, h`O React não inventa keys; ele avisa para você informá-las.`], [h`Ignora o §map§ e mostra só o primeiro item`, h`Todos os itens são renderizados; a ausência de §key§ só prejudica a identificação eficiente dos itens.`]],
    exp: h`Em listas geradas com §map§, cada elemento precisa de uma §key§ estável e única (como §key={lugar.id}§) para o React identificar quais itens mudaram. Sem ela, a lista funciona, mas o console mostra o aviso “Each child in a list should have a unique "key" prop” — exatamente o que a aula manda conferir no console.`,
    src: [[A6, 'ListaLugares usa .map() com key={lugar.id} (React avisa se faltar key)']],
    verify: rx("const avisos = [];\nconsole.error = (...a) => avisos.push(a.join(' '));\nfunction Lista({ itens }) {\n  return (\n    <ul>\n      {itens.map((item) => (\n        <li>{item.nome}</li>\n      ))}\n    </ul>\n  );\n}\nconst html = renderToStaticMarkup(<Lista itens={[{ nome: 'A' }, { nome: 'B' }]} />);\nconsole.log(html.includes('<li>A</li><li>B</li>') && avisos.some((a) => a.includes('unique \"key\"')) ? 'renderiza e avisa' : 'outro: ' + html + avisos.length);", ['renderiza e avisa', 'erro', 'renderiza sem avisar', 'so o primeiro']),
  }),
  R(7, {
    diff: 'facil', scope: 'aula', sub: 'Lista vazia',
    stem: h`Com o componente da aula, o que é gerado quando o array §lugares§ está vazio?\n\n${code('function ListaLugares({ lugares }) {\n  if (lugares.length === 0) return <p>Nenhum lugar encontrado.</p>;\n  return (\n    <div className="cards-grid">\n      {lugares.map((l) => <p key={l.id}>{l.nome}</p>)}\n    </div>\n  );\n}\nconst html = renderToStaticMarkup(<ListaLugares lugares={[]} />);\nconsole.log(html);')}`,
    opts: [h`§<p>Nenhum lugar encontrado.</p>§`, [h`§<div class="cards-grid"></div>§`, h`O §if§ com retorno antecipado devolve a mensagem em vez da grade vazia.`], [h`Uma string vazia`, h`O componente retorna o parágrafo com a mensagem; não retorna nada.`], [h`Um erro, porque o array está vazio`, h`Arrays vazios são válidos; §map§ simplesmente não geraria itens (e aqui nem é chamado).`]],
    exp: h`Se §lugares.length === 0§ o componente retorna cedo com a mensagem “Nenhum lugar encontrado.” — o comportamento pedido no TODO da §ListaLugares§: mostrar uma mensagem em vez de uma grade vazia.`,
    src: [[A6, '3. ListaLugares: se o array estiver vazio, mostre uma mensagem em vez de uma grade vazia']],
    verify: rx('function ListaLugares({ lugares }) {\n  if (lugares.length === 0) return <p>Nenhum lugar encontrado.</p>;\n  return (\n    <div className="cards-grid">\n      {lugares.map((l) => <p key={l.id}>{l.nome}</p>)}\n    </div>\n  );\n}\nconst html = renderToStaticMarkup(<ListaLugares lugares={[]} />);\nconsole.log(html);', ['<p>Nenhum lugar encontrado.</p>', '<div class="cards-grid"></div>', '', 'erro']),
  }),
  R(8, {
    diff: 'facil', scope: 'aula', sub: 'Componente que retorna null',
    stem: h`No starter da Aula 06, §Estrelas§ ainda tem §return null;§. Que HTML ele gera?\n\n${code('function Estrelas({ nota }) {\n  return null;\n}\nconst html = renderToStaticMarkup(<Estrelas nota={4} />);\nconsole.log("[" + html + "]");')}`,
    opts: [h`§[]§ — nada é renderizado`, [h`§[<span class="estrelas"></span>]§`, h`O componente não cria nenhum elemento; §null§ significa “não renderize nada”.`], [h`§[null]§`, h`O React não escreve a palavra “null” no HTML.`], [h`Um erro, pois componentes precisam retornar JSX`, h`Retornar §null§ é permitido e comum (por exemplo, para não exibir um componente).`]],
    exp: h`Um componente pode retornar §null§ (ou §false§) para não renderizar nada. É por isso que, antes de implementar os TODOs, a página do starter aparece sem os cards/estrelas — sem erro.`,
    src: [[A6, 'starter: cada componente tem TODO (Aula 06) e retorna null']],
    verify: rx('function Estrelas({ nota }) {\n  return null;\n}\nconst html = renderToStaticMarkup(<Estrelas nota={4} />);\nconsole.log("[" + html + "]");', ['[]', '[<span class="estrelas"></span>]', '[null]', 'erro']),
  }),

  // ---------------- MÉDIAS ----------------
  R(9, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Props são somente leitura',
    stem: h`O que acontece ao tentar alterar uma prop dentro do componente?\n\n${code('"use strict";\nfunction Card(props) {\n  props.nota = 1;\n  return <p>{props.nota}</p>;\n}\ntry {\n  renderToStaticMarkup(<Card nota={5} />);\n} catch (e) {\n  console.log(e.name);\n}')}`,
    opts: [h`§TypeError§ (props somente leitura)`, [h`Nada: a prop passa a valer 1`, h`As props não devem ser alteradas pelo componente; o React as congela (em desenvolvimento) e a escrita falha.`], [h`§ReferenceError§`, h`Não se trata de variável inexistente; é uma escrita proibida em um objeto congelado (§TypeError§).`], [h`§SyntaxError§`, h`O código é válido sintaticamente; o erro surge ao executar.`]],
    exp: h`Props fluem do pai para o filho e são imutáveis: o componente não pode reatribuí-las. Em modo estrito, o objeto congelado lança §TypeError§ ao receber uma atribuição. Para valores que mudam, usa-se estado (§useState§, Aula 07).`,
    src: [[A6, '“Componente burro”: só recebe dados via props e renderiza']],
    verify: rx('"use strict";\nfunction Card(props) {\n  props.nota = 1;\n  return <p>{props.nota}</p>;\n}\ntry {\n  renderToStaticMarkup(<Card nota={5} />);\n} catch (e) {\n  console.log(e.name);\n}', ['TypeError', '', 'ReferenceError', 'SyntaxError']),
  }),
  R(10, {
    diff: 'medio', scope: 'aprofundamento', sub: 'children',
    stem: h`${saida('function Moldura({ children }) {\n  return <section className="moldura">{children}</section>;\n}\nconst html = renderToStaticMarkup(\n  <Moldura>\n    <h2>Café Aroma</h2>\n    <p>Cafeteria</p>\n  </Moldura>\n);\nconsole.log(html);')}`,
    opts: [h`§<section class="moldura"><h2>Café Aroma</h2><p>Cafeteria</p></section>§`, [h`§<section class="moldura"></section>§`, h`O conteúdo entre as tags do componente chega em §props.children§ e é renderizado onde o componente usa §{children}§.`], [h`§<Moldura><h2>Café Aroma</h2><p>Cafeteria</p></Moldura>§`, h`O HTML contém o que o componente retorna (§<section>§), não a tag do componente.`], [h`§<section class="moldura">{children}</section>§`, h`O React substitui §{children}§ pelo conteúdo recebido.`]],
    exp: h`O que você escreve entre §<Moldura>§ e §</Moldura>§ chega ao componente como §children§. Ao usar §{children}§, o componente “embrulha” esse conteúdo — padrão útil para layouts (cabeçalho, rodapé, contêineres).`,
    src: [[A6, 'composição: App → ListaLugares → LugarCard → Estrelas']],
    verify: rx('function Moldura({ children }) {\n  return <section className="moldura">{children}</section>;\n}\nconst html = renderToStaticMarkup(\n  <Moldura>\n    <h2>Café Aroma</h2>\n    <p>Cafeteria</p>\n  </Moldura>\n);\nconsole.log(html);', ['<section class="moldura"><h2>Café Aroma</h2><p>Cafeteria</p></section>', '<section class="moldura"></section>', '<Moldura><h2>Café Aroma</h2><p>Cafeteria</p></Moldura>', '<section class="moldura">{children}</section>']),
  }),
  R(11, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Fragmentos',
    stem: h`${saida('function Cabecalho() {\n  return (\n    <>\n      <h1>Lugares avaliados</h1>\n      <p>Descubra e avalie.</p>\n    </>\n  );\n}\nconst html = renderToStaticMarkup(<Cabecalho />);\nconsole.log(html);')}`,
    opts: [h`§<h1>Lugares avaliados</h1><p>Descubra e avalie.</p>§`, [h`§<div><h1>Lugares avaliados</h1><p>Descubra e avalie.</p></div>§`, h`O fragmento §<>...</>§ agrupa elementos sem criar nenhum nó extra no HTML.`], [h`§<><h1>Lugares avaliados</h1><p>Descubra e avalie.</p></>§`, h`O §<>§ é sintaxe do JSX, não aparece no HTML gerado.`], [h`Um erro: um componente só pode retornar um elemento`, h`Fragmentos existem justamente para retornar vários irmãos sem um contêiner extra.`]],
    exp: h`Um componente deve retornar um único “nó” raiz; o fragmento §<>...</>§ permite devolver vários irmãos sem introduzir um §<div>§ extra no DOM. É o que o §App§ da aula faz ao retornar §<header>§, §<main>§ e §<footer>§ lado a lado.`,
    src: [[A6, 'App.jsx: <> <header/> <main/> <footer/> </>']],
    verify: rx('function Cabecalho() {\n  return (\n    <>\n      <h1>Lugares avaliados</h1>\n      <p>Descubra e avalie.</p>\n    </>\n  );\n}\nconst html = renderToStaticMarkup(<Cabecalho />);\nconsole.log(html);', ['<h1>Lugares avaliados</h1><p>Descubra e avalie.</p>', '<div><h1>Lugares avaliados</h1><p>Descubra e avalie.</p></div>', '<><h1>Lugares avaliados</h1><p>Descubra e avalie.</p></>', 'erro']),
  }),
  R(12, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Armadilha do 0 e &&',
    stem: h`Um card só deve mostrar as estrelas se houver nota. O que o código abaixo gera quando §nota§ é §0§?\n\n${code('function Nota({ nota }) {\n  return <p>{nota && <b>★</b>}</p>;\n}\nconst html = renderToStaticMarkup(<Nota nota={0} />);\nconsole.log(html);')}`,
    opts: [h`§<p>0</p>§`, [h`§<p></p>§`, h`Com §&&§ o resultado é o primeiro valor “falsy” (§0§), e o React renderiza o número 0 (diferente de §false§/§null§).`], [h`§<p><b>★</b></p>§`, h`§0§ é falsy, então a parte direita do §&&§ não é avaliada.`], [h`§<p>false</p>§`, h`O resultado de §0 && algo§ é o próprio §0§, não §false§.`]],
    exp: h`§nota && <b>★</b>§ devolve §0§ quando §nota§ é §0§, e o React *renderiza o número 0* (apenas §false§, §null§, §undefined§ e §true§ não geram saída). Corrija com uma condição booleana: §{nota > 0 && ...}§ ou §{nota ? ... : null}§.`,
    src: [[A6, 'renderização condicional: lista vazia e notaMedia']],
    verify: rx('function Nota({ nota }) {\n  return <p>{nota && <b>★</b>}</p>;\n}\nconst html = renderToStaticMarkup(<Nota nota={0} />);\nconsole.log(html);', ['<p>0</p>', '<p></p>', '<p><b>★</b></p>', '<p>false</p>']),
  }),
  R(13, {
    diff: 'medio', scope: 'aprofundamento', sub: 'map sem retorno',
    stem: h`${saida('function Lista({ itens }) {\n  return (\n    <ul>\n      {itens.map((item) => {\n        <li key={item}>{item}</li>;\n      })}\n    </ul>\n  );\n}\nconst html = renderToStaticMarkup(<Lista itens={["A", "B"]} />);\nconsole.log(html);')}`,
    opts: [h`§<ul></ul>§`, [h`§<ul><li>A</li><li>B</li></ul>§`, h`Com chaves §{ }§ no corpo da arrow function é preciso escrever §return§; sem ele o callback devolve §undefined§.`], [h`Um erro de sintaxe`, h`O código é válido; apenas não retorna nada no callback.`], [h`§<ul>undefinedundefined</ul>§`, h`O React não renderiza §undefined§; os itens simplesmente não aparecem.`]],
    exp: h`Uma arrow function com corpo entre chaves só devolve algo com §return§. Aqui o §map§ gera §[undefined, undefined]§, que o React ignora, e a lista fica vazia (§<ul></ul>§). Use §(item) => <li>...</li>§ (retorno implícito) ou §{ return <li>...</li>; }§.`,
    src: [[A6, 'ListaLugares: .map() com <LugarCard key={lugar.id} lugar={lugar} />']],
    verify: rx('function Lista({ itens }) {\n  return (\n    <ul>\n      {itens.map((item) => {\n        <li key={item}>{item}</li>;\n      })}\n    </ul>\n  );\n}\nconst html = renderToStaticMarkup(<Lista itens={["A", "B"]} />);\nconsole.log(html);', ['<ul></ul>', '<ul><li>A</li><li>B</li></ul>', 'erro', '<ul>undefinedundefined</ul>']),
  }),
  R(14, {
    diff: 'medio', scope: 'aprofundamento', sub: 'style como objeto',
    stem: h`${saida('const html = renderToStaticMarkup(\n  <div style={{ fontSize: 16, marginTop: "4px" }}>x</div>\n);\nconsole.log(html);')}`,
    opts: [h`§<div style="font-size:16px;margin-top:4px">x</div>§`, [h`§<div style="fontSize:16;marginTop:4px">x</div>§`, h`O React converte as chaves camelCase para as propriedades CSS com hífen e acrescenta §px§ a números.`], [h`§<div style="{fontSize: 16, marginTop: &quot;4px&quot;}">x</div>§`, h`O primeiro par de chaves é a expressão JSX; o segundo é o objeto, que vira texto CSS.`], [h`Um erro: §style§ exige string`, h`Em JSX, §style§ recebe um *objeto*, não uma string.`]],
    exp: h`Em JSX, §style§ recebe um objeto com chaves em camelCase (§fontSize§, §marginTop§); o React gera CSS válido (§font-size§, §margin-top§) e acrescenta §px§ aos números. As chaves duplas são: uma para a expressão JSX e outra para o objeto literal.`,
    src: [[A6, 'src/index.css já pronto: use as classes certas no JSX (className em vez de style inline)']],
    verify: rx('const html = renderToStaticMarkup(\n  <div style={{ fontSize: 16, marginTop: "4px" }}>x</div>\n);\nconsole.log(html);', ['<div style="font-size:16px;margin-top:4px">x</div>', '<div style="fontSize:16;marginTop:4px">x</div>', '<div style="{fontSize: 16, marginTop: &quot;4px&quot;}">x</div>', 'erro']),
  }),
  R(15, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Escape automático',
    stem: h`${saida('const comentario = "<b>Ótimo!</b>";\nconst html = renderToStaticMarkup(<p>{comentario}</p>);\nconsole.log(html);')}`,
    opts: [h`§<p>&lt;b&gt;Ótimo!&lt;/b&gt;</p>§`, [h`§<p><b>Ótimo!</b></p>§`, h`O React escapa o texto: as tags aparecem como texto, não são interpretadas como HTML.`], [h`§<p>"<b>Ótimo!</b>"</p>§`, h`O React não acrescenta aspas, e o conteúdo é escapado.`], [h`Um erro de segurança`, h`Não há erro: o escape automático impede a injeção de HTML.`]],
    exp: h`Valores inseridos com §{ }§ são *escapados*: §<§ vira §&lt;§ e §>§ vira §&gt;§. Isso protege contra XSS quando o texto vem do usuário (por exemplo, comentários de avaliações). Só com §dangerouslySetInnerHTML§ o HTML seria interpretado.`,
    src: [[A6, 'avaliações: comentários enviados por usuários são exibidos nos cards']],
    verify: rx('const comentario = "<b>Ótimo!</b>";\nconst html = renderToStaticMarkup(<p>{comentario}</p>);\nconsole.log(html);', ['<p>&lt;b&gt;Ótimo!&lt;/b&gt;</p>', '<p><b>Ótimo!</b></p>', '<p>"<b>Ótimo!</b>"</p>', 'erro']),
  }),
  R(16, {
    diff: 'medio', scope: 'aula', sub: 'Arredondamento da nota',
    stem: h`${saida(comEstrelas('const html = renderToStaticMarkup(<Estrelas nota={2.5} />);\nconsole.log(html);').replace(/^function Estrelas[\s\S]*?\n}\n/, 'function Estrelas({ nota, max = 5 }) {\n  const cheias = Math.round(nota);\n  return <span>{"★".repeat(cheias) + "☆".repeat(max - cheias)}</span>;\n}\n'), 'Qual HTML é gerado?')}`,
    opts: [h`§<span>★★★☆☆</span>§`, [h`§<span>★★☆☆☆</span>§`, h`§Math.round(2.5)§ é 3 (a metade arredonda para cima), não 2.`], [h`§<span>★★★★☆</span>§`, h`Três posições cheias, não quatro.`], [h`§<span>★★½☆☆</span>§`, h`O componente não desenha meias estrelas; usa §Math.round§.`]],
    exp: h`§Math.round(2.5)§ vale 3, então 3 estrelas cheias (§★§) e 2 vazias (§☆§). Notas médias como 4,5 também arredondam para cima (5 estrelas).`,
    src: [[A6, '1. Estrelas: Math.round(nota) estrelas preenchidas, o restante vazias']],
    verify: rx('function Estrelas({ nota, max = 5 }) {\n  const cheias = Math.round(nota);\n  return <span>{"★".repeat(cheias) + "☆".repeat(max - cheias)}</span>;\n}\nconst html = renderToStaticMarkup(<Estrelas nota={2.5} />);\nconsole.log(html);', ['<span>★★★☆☆</span>', '<span>★★☆☆☆</span>', '<span>★★★★☆</span>', '<span>★★½☆☆</span>']),
  }),

  // ---------------- DIFÍCEIS ----------------
  R(17, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Keys duplicadas',
    stem: h`Em modo de desenvolvimento (§npm run dev§), a lista abaixo é montada no navegador. Dois itens usam a mesma §key§:\n\n${code('const itens = [{ id: 1, nome: "A" }, { id: 1, nome: "B" }];\ncreateRoot(document.getElementById("root")).render(\n  <ul>\n    {itens.map((i) => <li key={i.id}>{i.nome}</li>)}\n  </ul>\n);')}\nO que o React faz?`,
    opts: [h`Renderiza os dois e avisa no console sobre a key repetida`, [h`Renderiza só o último item`, h`Os dois itens são renderizados; o aviso alerta que keys repetidas podem causar comportamentos incorretos em atualizações.`], [h`Lança um erro e interrompe a renderização`, h`Keys duplicadas geram aviso (não erro) e a renderização continua.`], [h`Troca as keys automaticamente por índices`, h`O React não altera as keys; apenas avisa.`]],
    exp: h`As keys precisam ser únicas *entre irmãos*. Com duplicatas o React avisa no console (“Encountered two children with the same key”), pois em atualizações ele poderia confundir os itens (duplicar, omitir ou misturar estado). Por isso a aula usa §key={lugar.id}§, um identificador único do dado. Esse aviso é do modo de desenvolvimento e aparece na renderização no navegador (§createRoot§); o build de produção não emite avisos.`,
    src: [[A6, 'ListaLugares usa .map() com key={lugar.id}']],
    verify: { kind: 'node', params: { jsx: true, code: "import { JSDOM } from 'jsdom';\nconst dom = new JSDOM('<!doctype html><div id=\"root\"></div>');\nglobalThis.window = dom.window;\nglobalThis.document = dom.window.document;\nglobalThis.IS_REACT_ACT_ENVIRONMENT = true;\nconst avisos = [];\nconsole.error = (...a) => avisos.push(a.join(' '));\nconst React = (await import('react')).default;\nconst { createRoot } = await import('react-dom/client');\nconst itens = [{ id: 1, nome: 'A' }, { id: 1, nome: 'B' }];\nconst root = createRoot(document.getElementById('root'));\nawait React.act(async () => { root.render(<ul>{itens.map((i) => <li key={i.id}>{i.nome}</li>)}</ul>); });\nconst html = document.getElementById('root').innerHTML;\nconsole.log(html.includes('<li>A</li><li>B</li>') && avisos.some((a) => a.includes('same key')) ? 'renderiza e avisa' : 'outro: ' + html + avisos.length);" }, values: ['renderiza e avisa', 'so o ultimo', 'erro', 'troca'] },
  }),
  R(18, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Chamar a função em vez de passá-la',
    stem: h`Quantas vezes a função §contar§ é executada durante a renderização?\n\n${code('let chamadas = 0;\nconst contar = () => { chamadas++; };\n\nrenderToStaticMarkup(<button onClick={contar()}>Clique</button>);\nconsole.log(chamadas);')}`,
    opts: [h`§1§ — foi chamada durante a renderização, antes de qualquer clique`, [h`§0§ — só roda quando houver um clique`, h`§contar()§ *executa* a função na hora de montar o JSX; quem passa a função para ser chamada depois é §onClick={contar}§.`], [h`§2§ — uma na renderização e outra no clique`, h`Aqui não há clique; e a chamada ocorreu uma única vez durante a renderização.`], [h`Um erro, pois §onClick§ exige função`, h`Não há erro de renderização: o valor passado é §undefined§ (retorno de §contar()§), que é aceito.`]],
    exp: h`Em §onClick={contar()}§ a expressão é avaliada na hora de renderizar: a função roda imediatamente e o que vai para o §onClick§ é o *retorno* (§undefined§). O correto é passar a referência (§onClick={contar}§) ou uma arrow function (§onClick={() => contar()}§).`,
    src: [[A6, 'Componente “burro”: só recebe dados via props e renderiza']],
    verify: rx('let chamadas = 0;\nconst contar = () => { chamadas++; };\n\nrenderToStaticMarkup(<button onClick={contar()}>Clique</button>);\nconsole.log(chamadas);', ['1', '0', '2', 'erro']),
  }),
  R(19, {
    diff: 'dificil', scope: 'desafio', sub: 'Children.count e fragmentos',
    stem: h`${saida('const itens = [<i key="1" />, <i key="2" />];\nconsole.log(Children.count(itens), Children.count(<><i /><i /></>));', 'O que o código imprime?')}`,
    opts: [h`§2 1§`, [h`§2 2§`, h`Um fragmento conta como um único filho (seus elementos internos não são “achatados”).`], [h`§1 1§`, h`Um array com dois elementos conta como dois filhos.`], [h`§1 2§`, h`Está invertido: o array tem dois filhos; o fragmento é um só.`]],
    exp: h`§Children.count§ percorre arrays (contando cada elemento), mas trata um fragmento como *um único* filho. Resultado: §2 1§. Detalhe útil ao manipular §children§ de componentes de layout.`,
    src: [[A6, 'composição de componentes: children e fragmentos']],
    verify: rx('const itens = [<i key="1" />, <i key="2" />];\nconsole.log(Children.count(itens), Children.count(<><i /><i /></>));', ['2 1', '2 2', '1 1', '1 2']),
  }),
  R(20, {
    diff: 'dificil', scope: 'desafio', sub: 'O que o React renderiza',
    stem: h`${saida('const html = renderToStaticMarkup(\n  <p>[{true}{false}{null}{undefined}{0}{""}{NaN}]</p>\n);\nconsole.log(html);')}`,
    opts: [h`§<p>[0NaN]</p>§`, [h`§<p>[truefalsenullundefined0NaN]</p>§`, h`§true§, §false§, §null§ e §undefined§ não geram saída no React; só números e strings aparecem.`], [h`§<p>[]</p>§`, h`O número §0§ e o valor §NaN§ são renderizados como texto.`], [h`§<p>[0]</p>§`, h`O §NaN§ também é um número do ponto de vista do React e aparece como “NaN”.`]],
    exp: h`O React ignora (não renderiza) §true§, §false§, §null§ e §undefined§ — por isso §cond && <X />§ funciona. Já números (incluindo §0§ e §NaN§) e strings são renderizados; a string vazia não produz texto. Saída: §[0NaN]§.`,
    src: [[A6, 'renderização condicional e listas']],
    verify: rx('const html = renderToStaticMarkup(\n  <p>[{true}{false}{null}{undefined}{0}{""}{NaN}]</p>\n);\nconsole.log(html);', ['<p>[0NaN]</p>', '<p>[truefalsenullundefined0NaN]</p>', '<p>[]</p>', '<p>[0]</p>']),
  }),
  R(21, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Componente que esquece o return',
    stem: h`No React 19, o que acontece com um componente cuja função esquece o §return§?\n\n${code('function Titulo() {\n  <h1>Lugares avaliados</h1>;\n}\nconst html = renderToStaticMarkup(<Titulo />);\nconsole.log("[" + html + "]");')}`,
    opts: [h`Nada é renderizado (§[]§), sem lançar erro`, [h`Renderiza o §<h1>§ normalmente`, h`Sem §return§ a função devolve §undefined§; o JSX da linha é avaliado e descartado.`], [h`Lança “Nothing was returned from render”`, h`Esse erro existia em versões antigas (React 17); no React 18+ retornar §undefined§ é aceito.`], [h`Renderiza §<undefined></undefined>§`, h`O React não cria elementos para §undefined§.`]],
    exp: h`Se a função não retorna nada, o resultado é §undefined§. Desde o React 18, um componente pode retornar §undefined§ sem erro (não renderiza nada), o que torna o esquecimento de §return§ um bug silencioso: a página fica sem o título. Uma boa pista é o componente “sumir” da tela.`,
    src: [[A6, 'starter: componentes retornam null até implementar o TODO']],
    verify: rx('function Titulo() {\n  <h1>Lugares avaliados</h1>;\n}\nconst html = renderToStaticMarkup(<Titulo />);\nconsole.log("[" + html + "]");', ['[]', '[<h1>Lugares avaliados</h1>]', 'Nothing was returned from render', '[<undefined></undefined>]']),
  }),
  R(22, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Valor padrão de props e null',
    stem: h`${saida('function Estrelas({ nota, max = 5 }) {\n  return <span>{Array.from({ length: max }, () => "★")}</span>;\n}\nconsole.log(renderToStaticMarkup(<Estrelas nota={3} />));\nconsole.log(renderToStaticMarkup(<Estrelas nota={3} max={undefined} />));\nconsole.log(renderToStaticMarkup(<Estrelas nota={3} max={null} />));', 'O que o código imprime?')}`,
    opts: [h`§<span>★★★★★</span>§, §<span>★★★★★</span>§ e §<span></span>§`, [h`§<span>★★★★★</span>§ nas três linhas`, h`O valor padrão só vale para §undefined§; com §max={null}§ o parâmetro recebe §null§, e §Array.from({ length: null })§ cria um array vazio.`], [h`§<span>★★★★★</span>§, §<span></span>§ e §<span></span>§`, h`Passar §max={undefined}§ equivale a não passar: o padrão §5§ é usado.`], [h`§<span></span>§ nas três linhas`, h`Sem a prop (ou com §undefined§) vale o padrão §max = 5§.`]],
    exp: h`Valores padrão de parâmetros (§max = 5§) são usados apenas quando o argumento é §undefined§ (ausente ou explicitamente §undefined§). §null§ é um valor “presente”: o padrão não se aplica, §length: null§ vira 0 e nada é desenhado.`,
    src: [[A6, '1. Estrelas: recebe nota (número) e max (padrão 5)']],
    verify: rx('function Estrelas({ nota, max = 5 }) {\n  return <span>{Array.from({ length: max }, () => "★")}</span>;\n}\nconsole.log(renderToStaticMarkup(<Estrelas nota={3} />));\nconsole.log(renderToStaticMarkup(<Estrelas nota={3} max={undefined} />));\nconsole.log(renderToStaticMarkup(<Estrelas nota={3} max={null} />));', ['<span>★★★★★</span>\n<span>★★★★★</span>\n<span></span>', '<span>★★★★★</span>\n<span>★★★★★</span>\n<span>★★★★★</span>', '<span>★★★★★</span>\n<span></span>\n<span></span>', '<span></span>\n<span></span>\n<span></span>']),
  }),
  R(23, {
    diff: 'dificil', scope: 'desafio', sub: 'dangerouslySetInnerHTML',
    stem: h`${saida('const comentario = "<b>Ótimo!</b>";\nconst html = renderToStaticMarkup(\n  <p dangerouslySetInnerHTML={{ __html: comentario }} />\n);\nconsole.log(html);')}`,
    opts: [h`§<p><b>Ótimo!</b></p>§ — o HTML é inserido sem escape`, [h`§<p>&lt;b&gt;Ótimo!&lt;/b&gt;</p>§`, h`Essa é a saída normal com §{comentario}§; §dangerouslySetInnerHTML§ desliga o escape.`], [h`§<p dangerouslysetinnerhtml="[object Object]"></p>§`, h`O React reconhece essa prop especial e usa o §__html§ como conteúdo.`], [h`Um erro: a prop não existe`, h`A prop existe (o nome “dangerously” é um aviso de risco).`]],
    exp: h`Com §dangerouslySetInnerHTML={{ __html: texto }}§ o React insere o HTML cru, *sem escape*. Se o texto vier de usuários, abre brecha para XSS (injeção de scripts). Em apps de avaliações, comentários devem ser renderizados como texto comum (§{comentario}§).`,
    src: [[A6, 'avaliações de usuários exibidas nos cards']],
    verify: rx('const comentario = "<b>Ótimo!</b>";\nconst html = renderToStaticMarkup(\n  <p dangerouslySetInnerHTML={{ __html: comentario }} />\n);\nconsole.log(html);', ['<p><b>Ótimo!</b></p>', '<p>&lt;b&gt;Ótimo!&lt;/b&gt;</p>', '<p dangerouslysetinnerhtml="[object Object]"></p>', 'erro']),
  }),
  R(24, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Nomes de atributos em JSX',
    stem: h`${saida('const html = renderToStaticMarkup(\n  <label htmlFor="nome" className="campo" tabIndex={0}>Nome</label>\n);\nconsole.log(html);')}`,
    opts: [h`§<label for="nome" class="campo" tabindex="0">Nome</label>§`, [h`§<label htmlFor="nome" className="campo" tabIndex="0">Nome</label>§`, h`O React converte os nomes de JSX (§htmlFor§, §className§, §tabIndex§) nos atributos HTML (§for§, §class§, §tabindex§).`], [h`§<label for="nome" class="campo" tabindex>Nome</label>§`, h`§tabIndex={0}§ gera §tabindex="0"§ com valor; o atributo não fica sem valor.`], [h`§<label for="nome" class="campo">Nome</label>§`, h`§tabIndex={0}§ é renderizado como §tabindex="0"§; o 0 não é descartado.`]],
    exp: h`Alguns atributos têm nomes diferentes em JSX por conflitarem com palavras reservadas do JavaScript (§for§ → §htmlFor§, §class§ → §className§) e os demais usam camelCase (§tabIndex§). O React os converte para o HTML correspondente. Formulários da Aula 07 usam §htmlFor§ para ligar o rótulo ao campo.`,
    src: [[A6, 'LugarCard: className e data-categoria no JSX']],
    verify: rx('const html = renderToStaticMarkup(\n  <label htmlFor="nome" className="campo" tabIndex={0}>Nome</label>\n);\nconsole.log(html);', ['<label for="nome" class="campo" tabindex="0">Nome</label>', '<label htmlFor="nome" className="campo" tabIndex="0">Nome</label>', '<label for="nome" class="campo" tabindex>Nome</label>', '<label for="nome" class="campo">Nome</label>']),
  }),
];
