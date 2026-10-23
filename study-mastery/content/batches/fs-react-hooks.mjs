// Lote fs-react-hooks — React: useState, useEffect e formulários controlados: 9 fáceis (001–009), 9 médias (010–018), 9 difíceis (019–027).
// Base: Aula 07 (README e starter: useEffect com Promise.all, lidarComNovaAvaliacao, FormularioAvaliacao controlado).
// Verificação REAL: React 19 (react-dom/client) é montado no jsdom, os eventos são disparados dentro de act() e o resultado
// (DOM, contagem de execuções, avisos do React) é comparado às alternativas. Comportamentos de StrictMode valem para desenvolvimento.
import { m } from '../../tools/lib/dsl.ts';

const A7 = 'fs-aula-07';
const R = (n, o) => ({ d: 'fullstack', topic: 'react-hooks-forms', ...o, id: `fs-react-hooks-forms-${String(n).padStart(3, '0')}` });
const h = (strings, ...v) => m(strings, ...v).replaceAll('§', '`').replaceAll('\\n', '\n');
const code = (src) => '§§§jsx\n'.replaceAll('§', '`') + src.trim() + '\n§§§'.replaceAll('§', '`');

// Preparação do ambiente (não aparece no enunciado): jsdom + React cliente + auxiliares de interação
const HARNESS = `import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
const dom = new JSDOM('<!doctype html><div id="root"></div>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = (await import('react')).default;
const { useState, useEffect, useRef } = React;
const { createRoot } = await import('react-dom/client');
const avisos = [];
const erroOriginal = console.error;
console.error = (...a) => avisos.push(a.join(' '));
const $ = (id) => document.getElementById(id);
const montar = async (el) => { const root = createRoot($('root')); await React.act(async () => root.render(el)); return root; };
const clicar = (el) => React.act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
const digitar = (el, v) => React.act(async () => { Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, v); el.dispatchEvent(new window.Event('input', { bubbles: true })); });
const trocar = (el, v) => React.act(async () => { el.value = v; el.dispatchEvent(new window.Event('change', { bubbles: true })); });
const enviar = async (form) => { const evt = new window.Event('submit', { bubbles: true, cancelable: true }); await React.act(async () => { form.dispatchEvent(evt); }); return evt; };
`;
const ui = (componente, interacao, values) => ({ kind: 'node', params: { jsx: true, code: `${HARNESS}${componente}\n${interacao}` }, values });
const stem = (intro, componente) => `${intro}\n\n${code(componente)}`;
// contagens de renderizações/efeitos dependem do StrictMode (o main.jsx dos starters usa <StrictMode>, que em desenvolvimento
// executa componentes e efeitos duas vezes de propósito): estas questões declaram a condição no enunciado
const SEM_STRICT = 'Sem §<StrictMode>§: ';
const NOTA_STRICT = 'Esquecer o §<StrictMode>§: o §main.jsx§ dos starters o usa e, em desenvolvimento, ele executa componentes e efeitos duas vezes de propósito (para revelar efeitos sem limpeza). Com ele as contagens dobram; em produção, não.';
// acrescenta a observação do StrictMode aos erros frequentes das questões cuja contagem depende dele
const comNotaStrict = (spec) => (spec.stem.includes('Sem `<StrictMode>`') ? { ...spec, mistakes: [...(spec.mistakes ?? []), h`${NOTA_STRICT}`] } : spec);

export default [
  // ---------------- FÁCEIS ----------------
  (() => {
    const C = `function Contador() {
  const [n, setN] = useState(0);
  return (
    <div>
      <p id="v">{n}</p>
      <button id="b" onClick={() => setN(n + 1)}>+1</button>
    </div>
  );
}`;
    return R(1, {
      diff: 'facil', scope: 'aula', sub: 'useState e re-renderização',
      stem: h`${stem('O componente é montado e o usuário clica **duas vezes** no botão. Que texto aparece no parágrafo §#v§?', C)}`,
      opts: [h`§2§`, [h`§0§`, h`Cada clique chama §setN§, que atualiza o estado e faz o React renderizar de novo com o novo valor.`], [h`§1§`, h`Foram dois cliques; entre eles o componente renderizou novamente e o §n§ já valia 1.`], [h`§n§`, h`As chaves §{n}§ exibem o valor do estado, não o nome da variável.`]],
      exp: h`§useState(0)§ cria o estado com valor inicial 0. Cada clique executa §setN(n + 1)§: o estado muda e o React re-renderiza o componente. Após dois cliques o parágrafo mostra §2§. É o mecanismo que faz a nota média mudar “na hora” quando uma avaliação é enviada.`,
      src: [[A7, 'Enviar uma avaliação atualiza a nota média do lugar na hora (estado controlado)']],
      verify: ui(C, "await montar(<Contador />);\nawait clicar($('b'));\nawait clicar($('b'));\nconsole.log($('v').textContent);", ['2', '0', '1', 'n']),
    });
  })(),
  (() => {
    const C = `function Nota() {
  const [nota] = useState(5);
  return <p id="v">Nota: {nota}</p>;
}`;
    return R(2, {
      diff: 'facil', scope: 'aula', sub: 'Valor inicial do estado',
      stem: h`${stem('Qual texto o componente mostra logo após ser montado?', C)}`,
      opts: [h`§Nota: 5§`, [h`§Nota: 0§`, h`O valor inicial é o argumento de §useState§ (aqui §5§), não zero por padrão.`], [h`§Nota: §`, h`O estado já começa com o valor inicial no primeiro render.`], [h`§Nota: undefined§`, h`Só seria §undefined§ se §useState()§ fosse chamado sem argumento.`]],
      exp: h`O argumento de §useState§ é o valor do estado na primeira renderização. Na aula, os estados do formulário começam com §nota: 5§, §comentario: ""§ e §erro: null§.`,
      src: [[A7, '3. FormularioAvaliacao: nota (inicial: 5), comentario (inicial: "")']],
      verify: ui(C, "await montar(<Nota />);\nconsole.log($('v').textContent);", ['Nota: 5', 'Nota: 0', 'Nota: ', 'Nota: undefined']),
    });
  })(),
  (() => {
    const C = `function Lista() {
  const [itens, setItens] = useState(["A", "B"]);
  return (
    <div>
      <ul id="l">{itens.map((i) => <li key={i}>{i}</li>)}</ul>
      <button id="b" onClick={() => setItens([...itens, "C"])}>add</button>
    </div>
  );
}`;
    return R(3, {
      diff: 'facil', scope: 'aula', sub: 'Atualizar lista no estado',
      stem: h`${stem('Depois de um clique em “add”, qual é o texto concatenado dos itens da lista §#l§?', C)}`,
      opts: [h`§ABC§`, [h`§AB§`, h`O clique chama §setItens§ com um *novo* array (§[...itens, "C"]§), o que atualiza a tela.`], [h`§C§`, h`O spread §...itens§ preserva os itens anteriores e acrescenta o novo no fim.`], [h`§ABCABC§`, h`Houve um único clique; o array novo tem 3 itens.`]],
      exp: h`Para adicionar a um array de estado, cria-se *um novo array* com o spread: §[...itens, "C"]§. É o padrão pedido em §lidarComNovaAvaliacao§: “nunca modifique o array anterior diretamente — crie um novo com o spread”.`,
      src: [[A7, '2. lidarComNovaAvaliacao: crie um novo array com o spread [...atual, novoItem]']],
      verify: ui(C, "await montar(<Lista />);\nawait clicar($('b'));\nconsole.log($('l').textContent);", ['ABC', 'AB', 'C', 'ABCABC']),
    });
  })(),
  (() => {
    const C = `let execucoes = 0;

function Tela() {
  const [n, setN] = useState(0);
  useEffect(() => {
    execucoes++;
  }, []);
  return <button id="b" onClick={() => setN(n + 1)}>{n}</button>;
}`;
    return R(4, {
      diff: 'facil', scope: 'aula', sub: 'useEffect com array vazio',
      stem: h`${stem(SEM_STRICT + 'O componente é montado e o botão é clicado duas vezes (o estado muda duas vezes). Qual é o valor de §execucoes§ no final?', C)}`,
      opts: [h`§1§`, [h`§3§`, h`Com o array de dependências vazio (§[]§) o efeito roda só na montagem, não a cada renderização.`], [h`§2§`, h`Os cliques provocam re-renderizações, mas não reexecutam um efeito com §[]§.`], [h`§0§`, h`O efeito roda uma vez, logo após a primeira renderização.`]],
      exp: h`§useEffect(fn, [])§ executa §fn§ apenas depois da primeira renderização (montagem). É por isso que a Aula 07 busca os dados dentro de um §useEffect§ com §[]§: “roda uma vez, na montagem do componente”.`,
      src: [[A7, '1. useEffect: roda uma vez, na montagem, por causa do array de dependências vazio []']],
      verify: ui(C, "await montar(<Tela />);\nawait clicar($('b'));\nawait clicar($('b'));\nconsole.log(execucoes);", ['1', '3', '2', '0']),
    });
  })(),
  (() => {
    const C = `function Campo() {
  const [texto, setTexto] = useState("");
  return (
    <div>
      <input id="i" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <p id="v">Você digitou: {texto}</p>
    </div>
  );
}`;
    return R(5, {
      diff: 'facil', scope: 'aula', sub: 'Campo controlado',
      stem: h`${stem('O usuário digita “Oi” no campo. O que mostra o parágrafo §#v§?', C)}`,
      opts: [h`§Você digitou: Oi§`, [h`§Você digitou: §`, h`O §onChange§ atualiza o estado a cada alteração, e o parágrafo reflete o estado.`], [h`§Você digitou: texto§`, h`As chaves §{texto}§ mostram o *valor* do estado, não o nome da variável.`], [h`§Você digitou: undefined§`, h`O estado começou como §""§ e foi atualizado com o texto digitado.`]],
      exp: h`Em um campo controlado, o valor exibido vem do estado (§value={texto}§) e cada digitação chama §onChange§, que atualiza o estado (§setTexto(e.target.value)§). Assim o React é a “fonte da verdade” — padrão da Aula 07: §value={estado} onChange={(e) => setEstado(e.target.value)}§.`,
      src: [[A7, 'Dica: todo campo controlado segue o padrão value={estado} onChange={(e) => setEstado(e.target.value)}']],
      verify: ui(C, "await montar(<Campo />);\nawait digitar($('i'), 'Oi');\nconsole.log($('v').textContent);", ['Você digitou: Oi', 'Você digitou: ', 'Você digitou: texto', 'Você digitou: undefined']),
    });
  })(),
  (() => {
    const C = `function Form() {
  const [enviado, setEnviado] = useState(false);
  function lidarComEnvio(evento) {
    evento.preventDefault();
    setEnviado(true);
  }
  return (
    <form id="f" onSubmit={lidarComEnvio}>
      <button>Enviar</button>
      {enviado && <p>ok</p>}
    </form>
  );
}`;
    return R(6, {
      diff: 'facil', scope: 'aula', sub: 'preventDefault no submit',
      stem: h`${stem('Quando o formulário é enviado, qual é o valor de §evento.defaultPrevented§ (isto é, a página foi impedida de recarregar)?', C)}`,
      opts: [h`§true§`, [h`§false§`, h`§preventDefault()§ cancela o comportamento padrão do envio (recarregar a página); por isso o valor é §true§.`], [h`§undefined§`, h`A propriedade existe em todo evento e vale §true§ ou §false§.`], [h`§null§`, h`§defaultPrevented§ é sempre um booleano.`]],
      exp: h`O envio padrão de um §<form>§ recarrega a página. §evento.preventDefault()§ cancela isso, de modo que o React controla o fluxo (validar, atualizar estado). A aula avisa: “chama §evento.preventDefault()§ (senão a página recarrega)”.`,
      src: [[A7, '2. lidarComEnvio(evento): chama evento.preventDefault() (senão a página recarrega)']],
      verify: ui(C, "await montar(<Form />);\nconst evt = await enviar($('f'));\nconsole.log(evt.defaultPrevented);", ['true', 'false', 'undefined', 'null']),
    });
  })(),
  (() => {
    const C = `function Par() {
  const [a, b] = useState(0);
  return <p id="v">{typeof a}-{typeof b}</p>;
}`;
    return R(7, {
      diff: 'facil', scope: 'aula', sub: 'O que useState devolve',
      stem: h`${stem('O que o parágrafo mostra?', C)}`,
      opts: [h`§number-function§`, [h`§number-number§`, h`O segundo item do par é a função que atualiza o estado, não outro número.`], [h`§function-number§`, h`A ordem é [valor, atualizador]: o valor vem primeiro.`], [h`§object-function§`, h`O primeiro item é o valor atual do estado (aqui, o número inicial §0§).`]],
      exp: h`§useState(valorInicial)§ devolve um array com dois itens: o valor atual do estado e uma função para atualizá-lo. Por convenção usa-se desestruturação: §const [nota, setNota] = useState(5)§.`,
      src: [[A7, '3. FormularioAvaliacao: estados lugarId, nota, comentario e erro com useState']],
      verify: ui(C, "await montar(<Par />);\nconsole.log($('v').textContent);", ['number-function', 'number-number', 'function-number', 'object-function']),
    });
  })(),
  (() => {
    const C = `function App() {
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    setCarregando(false);
  }, []);
  return carregando ? <p>Carregando lugares...</p> : <p>Pronto</p>;
}`;
    return R(8, {
      diff: 'facil', scope: 'aula', sub: 'Primeiro render',
      stem: h`${stem('Qual HTML o React produz no **primeiro** render (antes de qualquer efeito rodar)? Use §renderToStaticMarkup(<App />)§ como referência.', C)}`,
      opts: [h`§<p>Carregando lugares...</p>§`, [h`§<p>Pronto</p>§`, h`O §useEffect§ só roda depois do primeiro render; no primeiro HTML o estado ainda é §true§.`], [h`Nada (string vazia)`, h`O componente retorna um parágrafo mesmo antes de o efeito rodar.`], [h`§<p>true</p>§`, h`O JSX exibe um texto fixo, não o valor booleano.`]],
      exp: h`Efeitos (§useEffect§) rodam *depois* de o React desenhar a tela. No primeiro render §carregando§ ainda é §true§, então aparece “Carregando lugares...”; depois o efeito atualiza o estado e a tela troca para o conteúdo. É a tela “Carregando...” da Aula 07.`,
      src: [[A7, 'A tela sai do estado "Carregando..." sozinha, sem interação do usuário']],
      verify: ui(C, 'console.log(renderToStaticMarkup(<App />));', ['<p>Carregando lugares...</p>', '<p>Pronto</p>', '', '<p>true</p>']),
    });
  })(),
  (() => {
    const C = `function Escolha() {
  const [lugarId, setLugarId] = useState(2);
  return (
    <select id="s" value={lugarId} onChange={(e) => setLugarId(Number(e.target.value))}>
      <option value="1">Café Aroma</option>
      <option value="2">Parque das Águas</option>
    </select>
  );
}`;
    return R(9, {
      diff: 'facil', scope: 'aula', sub: 'select controlado',
      stem: h`${stem('Logo após a montagem, qual opção aparece selecionada?', C)}`,
      opts: [h`Parque das Águas`, [h`Café Aroma`, h`O §value={lugarId}§ do select controlado é §2§, que corresponde à segunda opção.`], [h`Nenhuma`, h`Um select controlado com valor existente já exibe a opção correspondente.`], [h`As duas`, h`Um §<select>§ simples só mostra uma opção selecionada.`]],
      exp: h`Em um §<select>§ controlado, a opção exibida é a cujo §value§ coincide com o valor do estado (§2§ → “Parque das Águas”). O §Number(e.target.value)§ no §onChange§ converte o texto do evento para número, mantendo o tipo do estado.`,
      src: [[A7, '3. FormularioAvaliacao: <select> controlado (value={lugarId} onChange=...)']],
      verify: ui(C, "await montar(<Escolha />);\nconst s = $('s');\nconsole.log(s.options[s.selectedIndex].text);", ['Parque das Águas', 'Café Aroma', 'Nenhuma', 'As duas']),
    });
  })(),

  // ---------------- MÉDIAS ----------------
  (() => {
    const C = `function Duplo() {
  const [n, setN] = useState(0);
  function adicionar() {
    setN(n + 1);
    setN(n + 1);
  }
  return (
    <div>
      <p id="v">{n}</p>
      <button id="b" onClick={adicionar}>+</button>
    </div>
  );
}`;
    return R(10, {
      diff: 'medio', scope: 'aprofundamento', sub: 'Atualizações com o mesmo valor',
      stem: h`${stem('Depois de **um** clique em “+”, que valor aparece em §#v§?', C)}`,
      opts: [h`§1§`, [h`§2§`, h`As duas chamadas usam o mesmo §n§ (0) daquele render, então ambas pedem “0 + 1”; o resultado é 1. Para acumular use §setN((atual) => atual + 1)§.`], [h`§0§`, h`O estado foi atualizado para 1.`], [h`§NaN§`, h`Não há operação inválida: o resultado é o número 1.`]],
      exp: h`Dentro de um mesmo handler, §n§ é uma “foto” do estado daquele render (0). §setN(n + 1)§ duas vezes equivale a §setN(1)§ duas vezes, resultando em 1. Para depender do valor mais recente, use a forma funcional: §setN((atual) => atual + 1)§ (resultaria em 2).`,
      src: [[A7, 'estado e re-renderização no useState (nota média atualiza na hora)']],
      verify: ui(C, "await montar(<Duplo />);\nawait clicar($('b'));\nconsole.log($('v').textContent);", ['1', '2', '0', 'NaN']),
    });
  })(),
  (() => {
    const C = `function Lista() {
  const [itens, setItens] = useState(["A", "B"]);
  function adicionar() {
    itens.push("C");
    setItens(itens);
  }
  return (
    <div>
      <p id="v">{itens.join("")}</p>
      <button id="b" onClick={adicionar}>add</button>
    </div>
  );
}`;
    return R(11, {
      diff: 'medio', scope: 'aula', sub: 'Não mutar o estado',
      stem: h`${stem('Depois de um clique em “add”, o que aparece em §#v§?', C)}`,
      opts: [h`§AB§ — a tela não é atualizada`, [h`§ABC§`, h`O array foi alterado, mas a tela só atualiza quando o React percebe um *novo* valor de estado.`], [h`§C§`, h`O parágrafo mostra o array inteiro, não só o último item.`], [h`§ABCC§`, h`O array só ganhou um “C”, e a tela nem chegou a ser atualizada.`]],
      exp: h`§itens.push("C")§ altera o array existente, e §setItens(itens)§ passa a *mesma referência*. Para o React, o estado não mudou — sem re-renderização, o parágrafo continua “AB” (embora o array na memória já tenha “C”). Daí a regra da aula: nunca modificar o array anterior; crie um novo com spread.`,
      src: [[A7, '2. lidarComNovaAvaliacao: nunca modifique o array anterior diretamente']],
      verify: ui(C, "await montar(<Lista />);\nawait clicar($('b'));\nconsole.log($('v').textContent);", ['AB', 'ABC', 'C', 'ABCC']),
    });
  })(),
  (() => {
    const C = `let execucoes = 0;

function Tela() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  useEffect(() => {
    execucoes++;
  }, [a]);
  return (
    <div>
      <button id="ba" onClick={() => setA(a + 1)}>a</button>
      <button id="bb" onClick={() => setB(b + 1)}>b</button>
    </div>
  );
}`;
    return R(12, {
      diff: 'medio', scope: 'aula', sub: 'Array de dependências',
      stem: h`${stem(SEM_STRICT + 'O componente é montado; depois o botão “b” é clicado duas vezes e o botão “a” é clicado uma vez. Quanto vale §execucoes§?', C)}`,
      opts: [h`§2§`, [h`§4§`, h`O efeito só reexecuta quando algo do array de dependências (§[a]§) muda; o estado §b§ não está lá.`], [h`§1§`, h`Além da montagem, a mudança de §a§ (um clique) reexecuta o efeito: total 2.`], [h`§3§`, h`Os cliques em “b” não reexecutam o efeito.`]],
      exp: h`O efeito roda na montagem (1) e sempre que um valor do array de dependências muda. Mudar §b§ não dispara; mudar §a§ uma vez dispara mais uma. Total: 2. Listar corretamente as dependências é o que mantém os efeitos sincronizados com o estado.`,
      src: [[A7, '1. useEffect: array de dependências']],
      verify: ui(C, "await montar(<Tela />);\nawait clicar($('bb'));\nawait clicar($('bb'));\nawait clicar($('ba'));\nconsole.log(execucoes);", ['2', '4', '1', '3']),
    });
  })(),
  (() => {
    const C = `function Relogio() {
  useEffect(() => {
    console.log("ligou");
    return () => console.log("desligou");
  }, []);
  return <p>oi</p>;
}`;
    return R(13, {
      diff: 'medio', scope: 'aprofundamento', sub: 'Função de limpeza',
      stem: h`${stem(SEM_STRICT + 'O componente é montado e, em seguida, removido da tela (desmontado). O que é impresso no console, em ordem?', C)}`,
      opts: [h`§ligou§ e depois §desligou§`, [h`§desligou§ e depois §ligou§`, h`A função de limpeza só roda quando o componente é desmontado (ou antes de o efeito reexecutar).`], [h`Apenas §ligou§`, h`Ao desmontar, o React executa a função retornada pelo efeito.`], [h`Apenas §desligou§`, h`O efeito também roda na montagem, imprimindo “ligou”.`]],
      exp: h`O efeito imprime “ligou” depois da montagem. A função retornada é a *limpeza*: o React a executa ao desmontar (ou antes de rodar o efeito de novo). Serve para cancelar timers, assinaturas e requisições pendentes.`,
      src: [[A7, 'useEffect para buscar dados quando o componente monta']],
      verify: ui(C, 'const raiz = await montar(<Relogio />);\nawait React.act(async () => raiz.unmount());', ['ligou\ndesligou', 'desligou\nligou', 'ligou', 'desligou']),
    });
  })(),
  (() => {
    const C = `function Dados() {
  useEffect(async () => {
    await Promise.resolve();
  }, []);
  return <p>oi</p>;
}`;
    return R(14, {
      diff: 'medio', scope: 'aula', sub: 'Efeito async',
      stem: h`A Aula 07 diz: “não dá para marcar o próprio callback do useEffect como async”. Em modo de desenvolvimento (§npm run dev§), o que o React faz ao receber o código abaixo?\n\n${code(C)}`,
      opts: [h`Avisa no console: o efeito devolveu uma Promise`, [h`Funciona normalmente, sem nenhum aviso`, h`O React verifica o retorno do efeito e emite um aviso quando ele não é uma função.`], [h`Lança um erro e a tela fica em branco`, h`É um aviso (§console.error§), não uma exceção que derrube a renderização.`], [h`Executa o efeito duas vezes`, h`O aviso não altera a quantidade de execuções.`]],
      exp: h`Uma função §async§ sempre retorna uma Promise, mas o retorno de um efeito deve ser *a função de limpeza* (ou nada). Por isso a aula manda declarar uma função §async§ separada dentro do efeito (§carregarDados§) e chamá-la: “Declare uma função async §carregarDados§ (não dá para marcar o próprio callback do useEffect como async)”.`,
      src: [[A7, '1. useEffect: declare uma função async carregarDados (não dá para marcar o callback como async)']],
      verify: ui(C, "await montar(<Dados />);\nconsole.log(avisos.some((a) => a.includes('must not return anything besides a function')) ? 'aviso' : 'sem aviso');", ['aviso', 'sem aviso', 'erro', 'duas vezes']),
    });
  })(),
  (() => {
    const C = `function Seletor() {
  const [nota, setNota] = useState(5);
  return (
    <div>
      <select id="s" value={nota} onChange={(e) => setNota(e.target.value)}>
        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <p id="v">{typeof nota}</p>
    </div>
  );
}`;
    return R(15, {
      diff: 'medio', scope: 'aula', sub: 'Valor do evento é texto',
      stem: h`${stem('O usuário muda o select para “3”. O que o parágrafo §#v§ mostra?', C)}`,
      opts: [h`§string§`, [h`§number§`, h`§e.target.value§ é sempre texto; sem §Number(...)§ o estado passa a guardar uma string.`], [h`§object§`, h`O valor é um tipo primitivo (texto).`], [h`§undefined§`, h`O estado recebeu o valor do select.`]],
      exp: h`O valor lido de campos de formulário (§e.target.value§) é uma *string*, mesmo que pareça número. Por isso a aula converte: “§aoEnviar(Number(lugarId), { nota: Number(nota), comentario })§”.`,
      src: [[A7, '2. lidarComEnvio: aoEnviar(Number(lugarId), { nota: Number(nota), comentario })']],
      verify: ui(C, "await montar(<Seletor />);\nawait trocar($('s'), '3');\nconsole.log($('v').textContent);", ['string', 'number', 'object', 'undefined']),
    });
  })(),
  (() => {
    const C = `function Form({ aoEnviar }) {
  const [comentario, setComentario] = useState("");
  const [erro, setErro] = useState(null);
  function lidarComEnvio(e) {
    e.preventDefault();
    if (comentario.trim().length < 3) {
      setErro("Comentário muito curto");
      return;
    }
    setErro(null);
    aoEnviar(comentario);
  }
  return (
    <form id="f" onSubmit={lidarComEnvio}>
      <textarea id="t" value={comentario} onChange={(e) => setComentario(e.target.value)} />
      {erro && <p id="e">{erro}</p>}
      <button>Enviar</button>
    </form>
  );
}`;
    return R(16, {
      diff: 'medio', scope: 'aula', sub: 'Validação no envio',
      stem: h`${stem('O usuário digita “  a ” (com espaços) e envia o formulário. Qual é o texto de §#e§ (mensagem de erro) e quantas vezes §aoEnviar§ foi chamado?', C)}`,
      opts: [h`§Comentário muito curto§ e 0 chamadas`, [h`Nenhuma mensagem e 1 chamada`, h`Depois do §trim()§ sobra só “a” (1 caractere), menor que 3: a validação falha e §aoEnviar§ não é chamado.`], [h`§Comentário muito curto§ e 1 chamada`, h`O §return§ logo após §setErro§ impede a chamada de §aoEnviar§.`], [h`Nenhuma mensagem e 0 chamadas`, h`Como a validação falha, o estado §erro§ é definido e a mensagem aparece.`]],
      exp: h`O comentário é validado com §trim().length < 3§: “  a ” vira “a” (1 caractere). Falhou: define a mensagem, mostra o parágrafo de erro e encerra com §return§, sem chamar §aoEnviar§. Cumpre o critério de aceite “comentário vazio (ou muito curto) mostra uma mensagem de erro, sem quebrar a página”.`,
      src: [[A7, 'Tentar enviar com comentário vazio (ou muito curto) mostra uma mensagem de erro']],
      verify: ui(C, "let chamadas = 0;\nawait montar(<Form aoEnviar={() => { chamadas++; }} />);\nawait digitar($('t'), '  a ');\nawait enviar($('f'));\nconsole.log(($('e') ? $('e').textContent : 'nenhuma mensagem') + ' / ' + chamadas);", ['Comentário muito curto / 0', 'nenhuma mensagem / 1', 'Comentário muito curto / 1', 'nenhuma mensagem / 0']),
    });
  })(),
  (() => {
    const C = `function Form({ aoEnviar }) {
  const [comentario, setComentario] = useState("");
  function lidarComEnvio(e) {
    e.preventDefault();
    if (comentario.trim().length < 3) return;
    aoEnviar(comentario);
    setComentario("");
  }
  return (
    <form id="f" onSubmit={lidarComEnvio}>
      <textarea id="t" value={comentario} onChange={(e) => setComentario(e.target.value)} />
      <button>Enviar</button>
    </form>
  );
}`;
    return R(17, {
      diff: 'medio', scope: 'aula', sub: 'Limpar o campo após o envio',
      stem: h`${stem('O usuário digita “ótimo!” e envia. Qual é o valor do §textarea§ entre colchetes e quantas vezes §aoEnviar§ foi chamado?', C)}`,
      opts: [h`§[]§ e 1 chamada`, [h`§[ótimo!]§ e 1 chamada`, h`Depois do envio válido, §setComentario("")§ limpa o campo controlado.`], [h`§[]§ e 0 chamadas`, h`O comentário tem 6 caracteres, então a validação passa e §aoEnviar§ é chamado.`], [h`§[ótimo!]§ e 0 chamadas`, h`Com comentário válido, a função é chamada e o campo é limpo.`]],
      exp: h`“ótimo!” tem mais de 3 caracteres: passa na validação, chama §aoEnviar§ e depois §setComentario("")§ volta o campo ao valor inicial. Isso atende ao critério “o campo de comentário é limpo após o envio bem-sucedido”.`,
      src: [[A7, 'O campo de comentário é limpo após o envio bem-sucedido']],
      verify: ui(C, "let chamadas = 0;\nawait montar(<Form aoEnviar={() => { chamadas++; }} />);\nawait digitar($('t'), 'ótimo!');\nawait enviar($('f'));\nconsole.log('[' + $('t').value + '] ' + chamadas);", ['[] 1', '[ótimo!] 1', '[] 0', '[ótimo!] 0']),
    });
  })(),
  (() => {
    const C = `const media = (lista) =>
  lista.length ? lista.reduce((t, a) => t + a.nota, 0) / lista.length : 0;

function App() {
  const [avaliacoes, setAvaliacoes] = useState([{ nota: 5 }, { nota: 4 }]);
  return (
    <div>
      <p id="v">{media(avaliacoes)}</p>
      <button id="b" onClick={() => setAvaliacoes([...avaliacoes, { nota: 3 }])}>add</button>
    </div>
  );
}`;
    return R(18, {
      diff: 'medio', scope: 'aula', sub: 'Dados derivados do estado',
      stem: h`${stem('Depois de um clique em “add” (nova avaliação com nota 3), o que mostra §#v§?', C)}`,
      opts: [h`§4§`, [h`§4.5§`, h`Esse era o valor antes do clique; a nova avaliação entra no cálculo: (5 + 4 + 3) ÷ 3 = 4.`], [h`§3§`, h`Mostra a média de todas as avaliações, não só a nova.`], [h`§12§`, h`§12§ é a soma; o código divide pela quantidade de avaliações.`]],
      exp: h`A média não é guardada no estado: é *calculada* a cada render a partir de §avaliacoes§ (como §lugaresComNota§ no §App§ da aula). Ao adicionar a nota 3, a média passa a (5 + 4 + 3) ÷ 3 = 4. Guardar só o dado “fonte” evita inconsistências.`,
      src: [[A7, 'Enviar uma avaliação atualiza a nota média do lugar na hora']],
      verify: ui(C, "await montar(<App />);\nawait clicar($('b'));\nconsole.log($('v').textContent);", ['4', '4.5', '3', '12']),
    });
  })(),

  // ---------------- DIFÍCEIS ----------------
  (() => {
    const C = `function Contador() {
  const [n, setN] = useState(0);
  function clicar() {
    setN(n + 1);
    console.log("handler:", n);
  }
  return <button id="b" onClick={clicar}>{n}</button>;
}`;
    return R(19, {
      diff: 'dificil', scope: 'aprofundamento', sub: 'O estado é uma foto do render',
      stem: h`${stem('Depois de um clique, o que é impresso no console e qual é o texto do botão no final?', C)}`,
      opts: [h`§handler: 0§ e o botão mostra §1§`, [h`§handler: 1§ e o botão mostra §1§`, h`§n§ dentro do handler é o valor do render atual (0); o novo valor só existe no próximo render.`], [h`§handler: 0§ e o botão continua §0§`, h`Depois do clique o componente re-renderiza com o novo estado, e o botão mostra 1.`], [h`§handler: 1§ e o botão continua §0§`, h`Nem o log vê o valor novo, nem o botão fica parado.`]],
      exp: h`Cada render tem seus próprios valores de estado. Dentro do handler, §n§ continua valendo 0 mesmo depois de §setN(n + 1)§ — a atualização só aparece no render seguinte, quando o botão passa a mostrar 1. Daí a necessidade do forma funcional e de efeitos para reagir a mudanças.`,
      src: [[A7, 'estado controlado: o React é a fonte da verdade']],
      verify: ui(C, "await montar(<Contador />);\nawait clicar($('b'));\nconsole.log($('b').textContent);", ['handler: 0\n1', 'handler: 1\n1', 'handler: 0\n0', 'handler: 1\n0']),
    });
  })(),
  (() => {
    const C = `let renders = 0;

function Tela() {
  renders++;
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  function clicar() {
    setA(a + 1);
    setB(b + 1);
  }
  return <button id="b" onClick={clicar}>{a}-{b}</button>;
}`;
    return R(20, {
      diff: 'dificil', scope: 'aprofundamento', sub: 'Atualizações em lote',
      stem: h`${stem(SEM_STRICT + 'O componente é montado (1 render) e o botão é clicado uma vez. Quantas vezes a função §Tela§ foi executada no total?', C)}`,
      opts: [h`§2§`, [h`§3§`, h`O React agrupa (faz “batch” de) as duas atualizações do mesmo evento em *uma* nova renderização.`], [h`§1§`, h`Além da montagem, houve a re-renderização causada pelo clique.`], [h`§4§`, h`Não há uma renderização por chamada de §set§; elas são agrupadas.`]],
      exp: h`Desde o React 18 (e na versão do curso, 19), várias chamadas de §set...§ dentro do mesmo evento são agrupadas em uma única renderização. Total: 1 (montagem) + 1 (clique) = 2 execuções de §Tela§.`,
      src: [[A7, 'lidarComEnvio e atualização de estados no mesmo evento']],
      verify: ui(C, "await montar(<Tela />);\nawait clicar($('b'));\nconsole.log(renders);", ['2', '3', '1', '4']),
    });
  })(),
  (() => {
    const C = `function Tela() {
  const [n, setN] = useState(0);
  console.log("render", n);
  useEffect(() => {
    console.log("efeito", n);
    setN(1);
  }, []);
  return <p>{n}</p>;
}`;
    return R(21, {
      diff: 'dificil', scope: 'aprofundamento', sub: 'Ordem render → efeito → render',
      stem: h`${stem(SEM_STRICT + 'Qual é a sequência impressa no console quando o componente é montado?', C)}`,
      opts: [h`§render 0§, §efeito 0§ e §render 1§`, [h`§efeito 0§, §render 0§ e §render 1§`, h`O efeito roda *depois* de o React renderizar e aplicar a tela; o primeiro log é o do render.`], [h`§render 0§ e §efeito 0§ apenas`, h`§setN(1)§ no efeito muda o estado e provoca um novo render (§render 1§).`], [h`§render 1§, §efeito 1§`, h`O primeiro render usa o valor inicial (0) e o efeito do mesmo render enxerga §n§ = 0.`]],
      exp: h`Sequência: 1) render com §n = 0§; 2) o React aplica a tela e executa o efeito (§efeito 0§), que chama §setN(1)§; 3) novo render com §n = 1§. O efeito, com array vazio, não roda de novo. É o fluxo da Aula 07: primeiro “Carregando...”, depois os dados.`,
      src: [[A7, '1. useEffect: roda após a montagem; atualiza estados']],
      verify: ui(C, 'await montar(<Tela />);', ['render 0\nefeito 0\nrender 1', 'efeito 0\nrender 0\nrender 1', 'render 0\nefeito 0', 'render 1\nefeito 1']),
    });
  })(),
  (() => {
    const C = `let execucoes = 0;

function Tela() {
  const [n, setN] = useState(0);
  useEffect(() => {
    execucoes++;
  });
  return <button id="b" onClick={() => setN(n + 1)}>{n}</button>;
}`;
    return R(22, {
      diff: 'dificil', scope: 'aprofundamento', sub: 'Efeito sem array de dependências',
      stem: h`${stem(SEM_STRICT + 'Note que o §useEffect§ está **sem** array de dependências. O componente é montado e o botão é clicado duas vezes. Quanto vale §execucoes§?', C)}`,
      opts: [h`§3§`, [h`§1§`, h`Isso vale para §[]§. Sem array, o efeito roda depois de *toda* renderização.`], [h`§2§`, h`Há três renderizações (montagem + dois cliques), e o efeito roda após cada uma.`], [h`§0§`, h`O efeito roda pelo menos na montagem.`]],
      exp: h`Sem o segundo argumento, o efeito executa após cada renderização: montagem (1) + dois cliques (2) = 3. Se esse efeito alterasse o estado sem condição, criaria um laço infinito de renderizações (cada atualização dispara outra renderização e outro efeito). Por isso a Aula 07 enfatiza o array §[]§ no §useEffect§.`,
      src: [[A7, '1. useEffect: array de dependências vazio [] no final']],
      verify: ui(C, "await montar(<Tela />);\nawait clicar($('b'));\nawait clicar($('b'));\nconsole.log(execucoes);", ['3', '1', '2', '0']),
    });
  })(),
  (() => {
    const C = `function Tela() {
  useEffect(() => {
    console.log("ligou");
    return () => console.log("desligou");
  }, []);
  return <p>oi</p>;
}

// em main.jsx (modo de desenvolvimento):
root.render(
  <React.StrictMode>
    <Tela />
  </React.StrictMode>
);`;
    return R(23, {
      diff: 'dificil', scope: 'desafio', sub: 'StrictMode em desenvolvimento',
      stem: h`${stem('No modo de desenvolvimento, com §<React.StrictMode>§, o que é impresso ao montar o componente?', C)}`,
      opts: [h`§ligou§, §desligou§ e §ligou§`, [h`Apenas §ligou§`, h`Em desenvolvimento o StrictMode monta, desmonta e monta de novo para revelar efeitos sem limpeza correta.`], [h`§ligou§ duas vezes, sem §desligou§`, h`A simulação inclui a limpeza entre as duas execuções.`], [h`Nada, o StrictMode desativa efeitos`, h`O StrictMode não desativa efeitos: ele os executa de forma extra para testá-los.`]],
      exp: h`Em desenvolvimento o §<React.StrictMode>§ simula uma desmontagem/remontagem: o efeito roda (“ligou”), a limpeza roda (“desligou”) e o efeito roda de novo (“ligou”). Em produção isso não acontece. Por isso efeitos precisam ter limpeza correta (e a busca de dados do Aula 07 pode aparecer duas vezes no console em dev).`,
      src: [[A7, 'client/src/main.jsx (Vite) renderiza <App /> dentro de React.StrictMode']],
      verify: ui(C.split('\n\n// em main')[0], "const raiz = createRoot($('root'));\nawait React.act(async () => raiz.render(<React.StrictMode><Tela /></React.StrictMode>));", ['ligou\ndesligou\nligou', 'ligou', 'ligou\nligou', '']),
    });
  })(),
  (() => {
    const C = `function Contador() {
  const [n, setN] = useState(0);
  return <button id="b" onClick={() => setN(n + 1)}>{n}</button>;
}

function Pai({ lugarId }) {
  return <Contador key={lugarId} />;
}`;
    return R(24, {
      diff: 'dificil', scope: 'aprofundamento', sub: 'key reinicia o estado',
      stem: h`${stem('§Pai§ é montado com §lugarId = 1§ e o botão é clicado duas vezes (mostrando 2). Em seguida, §Pai§ é renderizado novamente com §lugarId = 2§. O que o botão mostra?', C)}`,
      opts: [h`§0§`, [h`§2§`, h`Mudar a §key§ faz o React tratar como outro componente: o antigo é desmontado e o novo nasce com o estado inicial.`], [h`§1§`, h`Não há reaproveitamento parcial do estado.`], [h`§3§`, h`Nada incrementa o contador ao trocar a §key§.`]],
      exp: h`A §key§ identifica a “identidade” do componente. Quando muda, o React descarta a instância anterior (com seu estado) e cria uma nova, que começa com §useState(0)§. É uma forma de “resetar” um formulário ao trocar o lugar selecionado.`,
      src: [[A7, 'key={lugar.id} nas listas (aula 06) e identidade de componentes']],
      verify: ui(C, "const raiz = await montar(<Pai lugarId={1} />);\nawait clicar($('b'));\nawait clicar($('b'));\nawait React.act(async () => raiz.render(<Pai lugarId={2} />));\nconsole.log($('b').textContent);", ['0', '2', '1', '3']),
    });
  })(),
  (() => {
    const C = `function Campo() {
  return <input value="Marina" />;
}`;
    return R(25, {
      diff: 'dificil', scope: 'aprofundamento', sub: 'Campo com value sem onChange',
      stem: h`${stem('Em modo de desenvolvimento (§npm run dev§), o que o React faz com este campo?', C)}`,
      opts: [h`Renderiza o campo travado (somente leitura) e avisa no console que falta o §onChange§`, [h`Renderiza um campo editável sem nenhum aviso`, h`Com §value§ fixo e sem §onChange§, o campo fica preso ao valor e o React avisa sobre isso.`], [h`Lança um erro e não renderiza`, h`É um aviso no console, não uma exceção.`], [h`Converte automaticamente em campo não controlado`, h`O React não altera sozinho o tipo do campo; avisa para você corrigir.`]],
      exp: h`Um campo com §value§ é *controlado*: o React espera um §onChange§ que atualize o estado. Sem ele, o usuário não consegue editar o campo e o React emite “You provided a value prop to a form field without an onChange handler”. Soluções: adicionar §onChange§ + estado, usar §readOnly§ ou §defaultValue§.`,
      src: [[A7, 'Dica: campo controlado segue o padrão value={estado} onChange=...']],
      verify: ui(C, "await montar(<Campo />);\nconsole.log(avisos.some((a) => a.includes('without an `onChange`')) ? 'aviso' : 'sem aviso');", ['aviso', 'sem aviso', 'erro', 'convertido']),
    });
  })(),
  (() => {
    const C = `let chamadas = 0;
function caro() {
  chamadas++;
  return 10;
}

function Tela() {
  const [n, setN] = useState(caro()); // (A)
  return <button id="b" onClick={() => setN(n + 1)}>{n}</button>;
}

function TelaLazy() {
  const [n, setN] = useState(() => caro()); // (B)
  return <button id="b" onClick={() => setN(n + 1)}>{n}</button>;
}`;
    return R(26, {
      diff: 'dificil', scope: 'desafio', sub: 'Inicialização preguiçosa',
      stem: h`${stem(SEM_STRICT + 'Cada componente é montado e clicado uma vez (2 renderizações cada). Quantas chamadas a §caro()§ ocorrem em (A) §Tela§ e em (B) §TelaLazy§, respectivamente?', C)}`,
      opts: [h`(A) 2 e (B) 1`, [h`(A) 1 e (B) 1`, h`Em (A) §caro()§ é executada em *todo* render, pois é avaliada antes de chamar §useState§; só em (B) o React ignora a função depois da primeira vez.`], [h`(A) 2 e (B) 2`, h`Em (B) a função inicializadora roda apenas na primeira renderização.`], [h`(A) 1 e (B) 2`, h`Está invertido: (A) chama em todo render; (B) só na montagem.`]],
      exp: h`§useState(caro())§ chama §caro()§ a cada render (o resultado é ignorado depois do primeiro). §useState(() => caro())§ passa uma função inicializadora, que o React executa *só na montagem*. Para valores caros de calcular (ex.: ler algo grande), prefira a forma preguiçosa.`,
      src: [[A7, 'useState: valor inicial dos estados do formulário']],
      verify: ui(C, "chamadas = 0;\nawait montar(<Tela />);\nawait clicar($('b'));\nconst a = chamadas;\nchamadas = 0;\nawait React.act(async () => {});\ndocument.getElementById('root').innerHTML = '';\nconst raizB = await montar(<TelaLazy />);\nawait clicar($('b'));\nconsole.log('(A) ' + a + ' e (B) ' + chamadas);", ['(A) 2 e (B) 1', '(A) 1 e (B) 1', '(A) 2 e (B) 2', '(A) 1 e (B) 2']),
    });
  })(),
  (() => {
    const C = `function Tela() {
  const cliques = useRef(0);
  return (
    <div>
      <p id="v">{cliques.current}</p>
      <button id="b" onClick={() => { cliques.current++; }}>+</button>
    </div>
  );
}`;
    return R(27, {
      diff: 'dificil', scope: 'desafio', sub: 'useRef não re-renderiza',
      stem: h`${stem('O botão é clicado 3 vezes. O que o parágrafo §#v§ mostra?', C)}`,
      opts: [h`§0§, pois o ref não re-renderiza`, [h`§3§`, h`Mudar §ref.current§ não avisa o React; sem re-renderização o DOM não é atualizado.`], [h`§1§`, h`Nada atualiza o parágrafo: ele continua com o valor da primeira renderização.`], [h`§undefined§`, h`O valor inicial do ref é §0§ (o argumento do §useRef§).`]],
      exp: h`§useRef§ guarda um valor mutável que persiste entre renderizações, mas *mudá-lo não dispara re-renderização*. O parágrafo continua exibindo o 0 do primeiro render. Para que a tela reflita o valor, use estado (§useState§).`,
      src: [[A7, 'estado do React é o que dispara a atualização da tela']],
      verify: ui(C, "await montar(<Tela />);\nawait clicar($('b'));\nawait clicar($('b'));\nawait clicar($('b'));\nconsole.log($('v').textContent);", ['0', '3', '1', 'undefined']),
    });
  })(),
].map(comNotaStrict);
