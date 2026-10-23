// Lote fs-fetch-async — Fetch, Promises e CORS: 9 fáceis (001–009), 8 médias (010–017), 9 difíceis (018–026).
// Base: Aula 04 (README: fetch de JSON, resposta.ok/status, três estados da tela, servidor estático por causa do CORS).
// Verificação REAL: Promises/async em Node isolado; fetch contra servidor HTTP local (kind 'node');
// CORS no Chromium com duas origens locais distintas (kind 'web' com servers).
import { m } from '../../tools/lib/dsl.ts';

const A4 = 'fs-aula-04';
const R = (n, o) => ({ d: 'fullstack', topic: 'fetch-async', ...o, id: `fs-fetch-async-${String(n).padStart(3, '0')}` });
const h = (strings, ...v) => m(strings, ...v).replaceAll('§', '`').replaceAll('\\n', '\n');
const code = (src) => '§§§js\n'.replaceAll('§', '`') + src.trim() + '\n§§§'.replaceAll('§', '`');
const saida = (src) => `O que o código abaixo imprime no console?\n\n${code(src)}`;
const js = (src, values, extra = {}) => ({ kind: 'js', params: { code: src, ...extra }, values });
// servidor HTTP local para testar fetch em Node (porta efêmera); o corpo do teste usa `base`
const comServidor = (status, corpoTeste, headers = '{}') => `import http from 'node:http';
const srv = http.createServer((req, res) => { res.writeHead(${status}, ${headers}); res.end('{"x":1}'); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + srv.address().port;
${corpoTeste}
srv.close();`;
const nodeFetch = (status, corpoTeste, values) => ({ kind: 'node', params: { code: comServidor(status, corpoTeste) }, values });
// CORS no Chromium: página em origem "app", API em origem "api" (portas diferentes)
const cors = (apiHeaders, preflight, fetchExpr, values, extra = {}) => ({
  kind: 'web',
  params: {
    page: 'app',
    servers: [
      { name: 'app', routes: { '/': { type: 'text/html; charset=utf-8', body: '<!doctype html><p>app</p>' }, '/local': { type: 'application/json', body: '{"ok":true}' } } },
      { name: 'api', headers: apiHeaders, routes: { 'GET /dados': { type: 'application/json', body: '{"ok":true}' }, 'PUT /dados': { type: 'application/json', body: '{"ok":true}' }, 'OPTIONS /dados': { status: 204, headers: preflight } } },
    ],
    probe: `try { const r = await ${fetchExpr}; return 'resolveu ' + r.status + (r.type === 'opaque' ? ' opaca' : ''); } catch (e) { return 'rejeitou ' + e.name; }`,
    ...extra,
  },
  values,
});

export default [
  // ---------------- FÁCEIS ----------------
  R(1, {
    diff: 'facil', scope: 'aula', sub: 'fetch e status 404',
    stem: h`Um servidor responde com status 404 a uma requisição. O que acontece com a Promise do §fetch§ no código abaixo?\n\n${code('const resposta = await fetch(url);\nconsole.log(resposta.ok, resposta.status);')}`,
    opts: [h`Ela é resolvida: §resposta.ok§ é §false§ e §resposta.status§ é §404§`, [h`Ela é rejeitada com um erro e o código cai no §catch§`, h`O §fetch§ só rejeita em falhas de rede; respostas HTTP 4xx/5xx resolvem normalmente.`], [h`Ela é resolvida com §null§`, h`A Promise resolve com um objeto §Response§ (com §ok§, §status§...), não com §null§.`], [h`O §await§ lança automaticamente um §Error("Not Found")§`, h`Nenhum erro é lançado automaticamente; por isso a aula manda testar §resposta.ok§ e lançar o erro à mão.`]],
    exp: h`O §fetch§ resolve sempre que o servidor responde, mesmo com 404 ou 500. O objeto §Response§ traz §ok§ (§true§ para 200–299) e §status§. Por isso a Aula 04 pede: “Se §resposta.ok§ for falso, lance um §Error§ com uma mensagem (inclua o §resposta.status§)”.`,
    src: [[A4, 'buscarLugares(): se resposta.ok for false, lance um Error incluindo resposta.status']],
    verify: nodeFetch(404, "try { const resposta = await fetch(base + '/x'); console.log('resolveu', resposta.ok, resposta.status); } catch (e) { console.log('rejeitou', e.name); }", ['resolveu false 404', 'rejeitou TypeError', 'resolveu null', 'rejeitou Error']),
  }),
  R(2, {
    diff: 'facil', scope: 'aula', sub: 'resposta.json()',
    stem: h`Dentro de uma função §async§, o que §resposta.json()§ retorna?`,
    opts: [h`Uma Promise, que resolve com os dados já convertidos de JSON`, [h`Diretamente o objeto/array JavaScript`, h`A leitura do corpo é assíncrona; sem §await§ você recebe a Promise, não os dados.`], [h`Uma string com o texto bruto do JSON`, h`Texto bruto seria §resposta.text()§; §json()§ já faz o parse.`], [h`§undefined§, pois os dados chegam por um callback`, h`§json()§ retorna uma Promise; não usa callback.`]],
    exp: h`§Response.json()§ lê o corpo e faz o parse de JSON de forma assíncrona, devolvendo uma Promise. Por isso o enunciado da aula diz que “essa chamada também retorna uma Promise, então pode usar §return resposta.json()§ sem §await§”.`,
    src: [[A4, 'retorne resposta.json() (essa chamada também retorna uma Promise)']],
    verify: nodeFetch(200, "const r = await fetch(base + '/x'); const p = r.json(); console.log(p instanceof Promise, typeof (await p));", ['true object', 'false object', 'false string', 'false undefined']),
  }),
  R(3, {
    diff: 'facil', scope: 'aula', sub: 'async retorna Promise',
    stem: h`${saida('async function buscar() {\n  return 42;\n}\nconsole.log(buscar() instanceof Promise);')}`,
    opts: [h`§true§`, [h`§false§`, h`Toda função §async§ devolve uma Promise, mesmo quando o §return§ é um valor simples.`], [h`§42§`, h`O §console.log§ imprime o resultado da comparação §instanceof§, não o valor de retorno.`], [h`§undefined§`, h`A expressão §instanceof§ produz um booleano, nunca §undefined§.`]],
    exp: h`Uma função declarada com §async§ sempre retorna uma Promise; o valor do §return§ vira o valor com que ela é resolvida. Por isso as funções de §servico-lugares.js§ da aula “retornam Promises” e podem ser usadas com §await§ ou §.then§.`,
    src: [[A4, 'as funções de servico-lugares.js retornam Promises e usam async/await']],
    verify: js('async function buscar() {\n  return 42;\n}\nconsole.log(buscar() instanceof Promise);', ['true', 'false', '42', 'undefined']),
  }),
  R(4, {
    diff: 'facil', scope: 'aula', sub: 'Ordem síncrona e timers',
    stem: h`${saida('console.log("1");\nsetTimeout(() => console.log("2"), 0);\nconsole.log("3");')}`,
    opts: [h`§1 3 2§`, [h`§1 2 3§`, h`Mesmo com 0 ms, o callback do §setTimeout§ só roda depois que o código síncrono termina.`], [h`§2 1 3§`, h`O §setTimeout§ não adianta o callback; ele entra na fila de tarefas.`], [h`§3 2 1§`, h`O código síncrono roda de cima para baixo: §1§ vem antes de §3§.`]],
    exp: h`JavaScript executa primeiro todo o código síncrono (§"1"§ e §"3"§). O callback agendado com §setTimeout§ vai para a fila de tarefas e roda depois, mesmo com atraso 0. Saída: §1 3 2§ (uma linha por §console.log§).`,
    src: [[A4, 'carregando / sucesso / erro: a interface precisa continuar responsiva enquanto espera']],
    verify: js('console.log("1");\nsetTimeout(() => console.log("2"), 0);\nconsole.log("3");', ['1\n3\n2', '1\n2\n3', '2\n1\n3', '3\n2\n1']),
  }),
  R(5, {
    diff: 'facil', scope: 'aula', sub: 'Três estados de uma requisição',
    stem: h`A Aula 04 trata três estados da tela de carregamento de dados. Quais são?`,
    opts: [h`Carregando, sucesso e erro`, [h`Iniciado, pausado e finalizado`, h`Não são estados de uma requisição de rede; a aula usa carregando / sucesso / erro.`], [h`GET, POST e DELETE`, h`Esses são métodos HTTP, não estados da interface.`], [h`Online, offline e em cache`, h`Esses são estados de conectividade/cache; a aula trata o ciclo da requisição.`]],
    exp: h`A página mostra “Carregando dados...” enquanto a requisição está em andamento, a lista de lugares quando dá certo e uma mensagem de erro visível quando falha (por exemplo, no botão “Simular erro (404)”). Tratar os três evita tela vazia ou travada.`,
    src: [[A4, 'tratando os três estados de uma requisição: carregando, sucesso e erro']],
    verify: { kind: 'source', claims: [h`README Aula 04: “Vamos buscar esses dados com fetch, tratando os três estados de uma requisição: carregando, sucesso e erro.”`] },
  }),
  R(6, {
    diff: 'facil', scope: 'aula', sub: 'Por que um servidor local',
    stem: h`Na Aula 04, abrir §carregar-dados.html§ com duplo clique (URL §file://...§) faz o §fetch§ falhar. Qual é o motivo?`,
    opts: [h`A política de CORS do navegador`, [h`O JavaScript não funciona em arquivos locais`, h`O JavaScript roda normalmente em §file://§; o que falha é o §fetch§ dos JSONs.`], [h`O arquivo JSON está corrompido`, h`Os JSONs estão corretos; servidos por HTTP (§localhost:5500§) funcionam.`], [h`O navegador exige HTTPS para qualquer §fetch§`, h`O §fetch§ funciona em §http://localhost§; a causa é a política de origem/CORS, não a falta de HTTPS.`]],
    exp: h`Para o navegador, uma página aberta via §file://§ tem origem “opaca” e não pode ler outros arquivos por §fetch§ — é a mesma política de CORS que mais adiante exigirá configurar o servidor. Por isso a aula fornece o §servidor-estatico.js§: §node servidor-estatico.js . 5500§ e acesso por §http://localhost:5500/§.`,
    src: [[A4, 'Antes de começar: por que preciso de um servidor? (política de CORS)']],
    verify: { kind: 'source', claims: [h`README Aula 04: “Abrir carregar-dados.html direto no navegador (file://) faz o fetch falhar por política de CORS do navegador. Isso é esperado”.`] },
  }),
  R(7, {
    diff: 'facil', scope: 'aula', sub: 'try/catch com await',
    stem: h`${saida('async function carregar() {\n  try {\n    await Promise.reject(new Error("falhou"));\n    console.log("sucesso");\n  } catch (erro) {\n    console.log("erro:", erro.message);\n  }\n}\ncarregar();')}`,
    opts: [h`§erro: falhou§`, [h`§sucesso§`, h`O §await§ de uma Promise rejeitada lança o erro; a linha §console.log("sucesso")§ não é executada.`], [h`§sucesso§ e depois §erro: falhou§`, h`Quando o erro é lançado, o fluxo pula direto para o §catch§; o “sucesso” não aparece.`], [h`Nada: o erro não é capturado`, h`O §try/catch§ captura rejeições aguardadas com §await§.`]],
    exp: h`Dentro de uma função §async§, §await§ transforma a rejeição da Promise em uma exceção. O §try/catch§ a captura e imprime §erro: falhou§. É o padrão usado em §carregarDados()§ da aula para mostrar uma mensagem de erro amigável em vez de travar a página.`,
    src: [[A4, 'carregar-dados.js: try { await buscarLugares() } catch (erro) { mostrarErro(erro.message) }']],
    verify: js('async function carregar() {\n  try {\n    await Promise.reject(new Error("falhou"));\n    console.log("sucesso");\n  } catch (erro) {\n    console.log("erro:", erro.message);\n  }\n}\ncarregar();', ['erro: falhou', 'sucesso', 'sucesso\nerro: falhou', '']),
  }),
  R(8, {
    diff: 'facil', scope: 'aula', sub: 'JSON.parse',
    stem: h`${saida('const texto = \'{"nota":5,"comentario":"ótimo"}\';\nconst obj = JSON.parse(texto);\nconsole.log(obj.nota + 1, typeof obj);')}`,
    opts: [h`§6 object§`, [h`§"5"1 string§`, h`§JSON.parse§ converte o texto em objeto; §obj.nota§ já é o número §5§.`], [h`§51 object§`, h`§nota§ é número no JSON (sem aspas), então §+ 1§ soma: §6§.`], [h`§NaN object§`, h`A soma de dois números dá número; §NaN§ só apareceria com valores não numéricos.`]],
    exp: h`§JSON.parse§ transforma o texto JSON em um objeto JavaScript: §nota§ vira o número §5§ e §5 + 1 = 6§; §typeof obj§ é §"object"§. É o que §resposta.json()§ faz com o corpo da resposta.`,
    src: [[A4, 'dados/lugares.json e dados/avaliacoes.json: respostas em JSON']],
    verify: js('const texto = \'{"nota":5,"comentario":"ótimo"}\';\nconst obj = JSON.parse(texto);\nconsole.log(obj.nota + 1, typeof obj);', ['6 object', '"5"1 string', '51 object', 'NaN object']),
  }),
  R(9, {
    diff: 'facil', scope: 'aula', sub: 'URL e query string',
    stem: h`${saida('const url = new URL("detalhe.html?id=3", "http://localhost:5500/");\nconsole.log(url.searchParams.get("id"), typeof url.searchParams.get("id"));')}`,
    opts: [h`§3 string§`, [h`§3 number§`, h`Valores de query string são sempre texto; para número é preciso converter com §Number(...)§.`], [h`§null undefined§`, h`O parâmetro §id§ existe na URL (§?id=3§), então o valor é §"3"§.`], [h`§id=3 string§`, h`§searchParams.get("id")§ devolve só o valor (§3§), sem o nome do parâmetro.`]],
    exp: h`§URL.searchParams.get("id")§ devolve o valor do parâmetro como *string* (§"3"§). Em páginas como §detalhe.html?id=3§ lembre de converter com §Number(id)§ antes de comparar com ids numéricos dos dados (comparar §"3" === 3§ é §false§).`,
    src: [[A4, 'detalhe.html e dados por id (lugares.json)']],
    verify: js('const url = new URL("detalhe.html?id=3", "http://localhost:5500/");\nconsole.log(url.searchParams.get("id"), typeof url.searchParams.get("id"));', ['3 string', '3 number', 'null undefined', 'id=3 string']),
  }),

  // ---------------- MÉDIAS ----------------
  R(10, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Event loop: microtasks',
    stem: h`${saida('console.log("A");\nsetTimeout(() => console.log("B"), 0);\nPromise.resolve().then(() => console.log("C"));\nconsole.log("D");')}`,
    opts: [h`§A D C B§`, [h`§A B C D§`, h`As Promises (microtarefas) rodam antes dos timers (macrotarefas), e o código síncrono vem antes de ambos.`], [h`§A D B C§`, h`O §.then§ de uma Promise já resolvida roda antes do callback do §setTimeout§, mesmo com atraso 0.`], [h`§A C D B§`, h`O §.then§ nunca roda antes do código síncrono (§"D"§) terminar.`]],
    exp: h`Ordem de execução: 1) todo o código síncrono (§A§, §D§); 2) a fila de microtarefas (callbacks de Promise: §C§); 3) a fila de tarefas/timers (§B§). Saída: §A D C B§. Entender isso explica por que o “Carregando...” aparece antes dos dados chegarem.`,
    src: [[A4, 'fetch assíncrono: estados da tela enquanto aguarda']],
    verify: js('console.log("A");\nsetTimeout(() => console.log("B"), 0);\nPromise.resolve().then(() => console.log("C"));\nconsole.log("D");', ['A\nD\nC\nB', 'A\nB\nC\nD', 'A\nD\nB\nC', 'A\nC\nD\nB']),
  }),
  R(11, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Promise.all',
    stem: h`${saida('const esperar = (ms, valor) =>\n  new Promise((resolve) => setTimeout(() => resolve(valor), ms));\n\nconst resultados = await Promise.all([esperar(30, "A"), esperar(10, "B")]);\nconsole.log(resultados);')}`,
    opts: [h`§["A","B"]§`, [h`§["B","A"]§`, h`§Promise.all§ preserva a ordem do array de entrada, não a ordem em que as Promises terminam.`], [h`§"B"§`, h`Isso seria o comportamento de §Promise.race§ (a primeira a terminar); §all§ espera todas.`], [h`§[]§`, h`Após o §await§ o array já contém os resultados de todas as Promises.`]],
    exp: h`§Promise.all§ espera todas as Promises e devolve um array de resultados *na mesma ordem* da entrada, mesmo que a segunda termine antes: §["A","B"]§. Se qualquer uma rejeitar, o §all§ rejeita imediatamente.`,
    src: [[A4, 'buscarLugares() e buscarAvaliacoes() podem ser combinadas']],
    verify: js('const esperar = (ms, valor) =>\n  new Promise((resolve) => setTimeout(() => resolve(valor), ms));\n\nconst resultados = await Promise.all([esperar(30, "A"), esperar(10, "B")]);\nconsole.log(resultados);', ['["A","B"]', '["B","A"]', 'B', '[]']),
  }),
  R(12, {
    diff: 'medio', scope: 'aprofundamento', sub: 'await em sequência',
    stem: h`Cada chamada abaixo demora cerca de 100 ms. Aproximadamente quanto tempo (em ms) o trecho inteiro leva?\n\n${code('const tarefa = () => new Promise((r) => setTimeout(r, 100));\n\nawait tarefa(); // ex.: buscarLugares()\nawait tarefa(); // ex.: buscarAvaliacoes()')}`,
    opts: [h`Cerca de 200 ms`, [h`Cerca de 100 ms`, h`Isso ocorreria se as duas fossem iniciadas juntas (por exemplo, com §Promise.all§); aqui a segunda só começa quando a primeira termina.`], [h`Cerca de 300 ms`, h`Há só duas esperas de 100 ms; não existe uma terceira etapa.`], [h`Cerca de 0 ms`, h`O §await§ realmente espera cada Promise terminar.`]],
    exp: h`Dois §await§ em sequência esperam um pelo outro: 100 + 100 ≈ 200 ms. Quando as requisições são independentes (como lugares e avaliações), iniciá-las juntas com §Promise.all§ reduziria o total para o tempo da mais lenta (≈100 ms).`,
    src: [[A4, 'carregarDados(): await buscarLugares(); await buscarAvaliacoes()']],
    verify: js('const tarefa = () => new Promise((r) => setTimeout(r, 100));\nconst t0 = Date.now();\nawait tarefa();\nawait tarefa();\nconsole.log(Math.round((Date.now() - t0) / 100) * 100);', ['200', '100', '300', '0']),
  }),
  R(13, {
    diff: 'medio', scope: 'aula', sub: 'Quando o fetch rejeita',
    stem: h`Em qual situação a Promise do §fetch§ é **rejeitada** (cai no §catch§)?`,
    opts: [h`Quando a rede cai ou o servidor está off-line`, [h`Quando o servidor responde 404`, h`404 é uma resposta HTTP válida: a Promise resolve com §ok === false§.`], [h`Quando o servidor responde 500`, h`Erros 5xx também são respostas recebidas; o §fetch§ resolve e você testa §resposta.ok§.`], [h`Quando o JSON é grande demais`, h`O tamanho do corpo não rejeita o §fetch§; só o §json()§ falharia se o conteúdo não fosse JSON válido.`]],
    exp: h`O §fetch§ rejeita (com §TypeError§) apenas quando não há resposta HTTP: falha de DNS, conexão recusada, rede fora do ar ou bloqueio de CORS. Respostas 4xx/5xx *chegam* e são tratadas verificando §resposta.ok§, como na Aula 04.`,
    src: [[A4, 'fetch resolve com resposta.ok === false (HTTP 404)']],
    verify: { kind: 'node', params: { code: "try { await fetch('http://127.0.0.1:1/nada'); console.log('resolveu'); } catch (e) { console.log('rejeitou', e.name); }" }, values: ['rejeitou TypeError', 'resolveu 404', 'resolveu 500', 'rejeitou RangeError'] },
  }),
  R(14, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Encadeamento de then',
    stem: h`${saida('Promise.resolve(1)\n  .then((x) => x + 1)\n  .then((x) => {\n    console.log(x);\n    return x * 2;\n  })\n  .then((x) => console.log(x));')}`,
    opts: [h`§2§ e depois §4§`, [h`§1§ e depois §2§`, h`O primeiro §.then§ soma 1 ao valor inicial: o segundo recebe §2§.`], [h`§2§ e depois §undefined§`, h`O segundo §.then§ retorna §x * 2§, e esse valor é o argumento do terceiro.`], [h`§4§ e depois §2§`, h`A ordem de impressão segue o encadeamento: primeiro o que o 2º §.then§ imprime (§2§).`]],
    exp: h`Cada §.then§ devolve uma nova Promise cujo valor é o retorno do callback: 1 → (+1) → 2, impresso; retorna 4 (2 × 2) e o último §.then§ imprime 4. Saída: §2§ e depois §4§.`,
    src: [[A4, 'buscar com .then/.catch, se preferir']],
    verify: js('Promise.resolve(1)\n  .then((x) => x + 1)\n  .then((x) => {\n    console.log(x);\n    return x * 2;\n  })\n  .then((x) => console.log(x));', ['2\n4', '1\n2', '2\nundefined', '4\n2']),
  }),
  R(15, {
    diff: 'medio', scope: 'aprofundamento', sub: 'catch no meio da cadeia',
    stem: h`${saida('Promise.resolve()\n  .then(() => { throw new Error("x"); })\n  .then(() => console.log("A"))\n  .catch((e) => console.log("B", e.message))\n  .then(() => console.log("C"));')}`,
    opts: [h`§B x§ e depois §C§`, [h`§A§, §B x§ e §C§`, h`Depois do erro, o §.then§ que imprime “A” é pulado até o §.catch§.`], [h`§B x§ apenas`, h`Depois de tratado pelo §.catch§, a cadeia volta ao normal e o último §.then§ executa (§C§).`], [h`§A§ e depois §C§`, h`O erro lançado no primeiro §.then§ desvia a cadeia para o §.catch§.`]],
    exp: h`O §throw§ rejeita a Promise do primeiro §.then§; o §.then§ seguinte (“A”) é ignorado e o §.catch§ imprime §B x§. Como o §.catch§ trata o erro e retorna normalmente, a Promise resultante é resolvida e o último §.then§ imprime §C§.`,
    src: [[A4, 'async/await (ou .then/.catch, se preferir) com tratamento de erro']],
    verify: js('Promise.resolve()\n  .then(() => { throw new Error("x"); })\n  .then(() => console.log("A"))\n  .catch((e) => console.log("B", e.message))\n  .then(() => console.log("C"));', ['B x\nC', 'A\nB x\nC', 'B x', 'A\nC']),
  }),
  R(16, {
    diff: 'medio', scope: 'aprofundamento', sub: 'finally',
    stem: h`${saida('async function f() {\n  try {\n    return "try";\n  } finally {\n    console.log("finally");\n  }\n}\nf().then(console.log);')}`,
    opts: [h`§finally§ e depois §try§`, [h`§try§ e depois §finally§`, h`O bloco §finally§ sempre executa *antes* de a função realmente sair, mesmo com §return§ no §try§.`], [h`Apenas §try§`, h`O §finally§ sempre roda, com ou sem erro.`], [h`Apenas §finally§`, h`O valor retornado (§"try"§) é entregue ao §.then§ e também é impresso.`]],
    exp: h`Ao encontrar §return "try"§, o JavaScript guarda o valor, executa o §finally§ (imprime §finally§) e só então resolve a Promise com §"try"§, que o §.then(console.log)§ imprime. Ordem: §finally§, §try§. Útil para esconder o “Carregando...” tanto em sucesso quanto em erro.`,
    src: [[A4, 'três estados: carregando / sucesso / erro']],
    verify: js('async function f() {\n  try {\n    return "try";\n  } finally {\n    console.log("finally");\n  }\n}\nf().then(console.log);', ['finally\ntry', 'try\nfinally', 'try', 'finally']),
  }),
  R(17, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Corpo da resposta lido uma vez',
    stem: h`O que acontece ao chamar §resposta.json()§ duas vezes na mesma resposta?\n\n${code('const resposta = await fetch(url);\nawait resposta.json();\nawait resposta.json(); // segunda leitura')}`,
    opts: [h`Lança §TypeError§: o corpo já foi consumido`, [h`Retorna novamente os mesmos dados`, h`O corpo de uma §Response§ é um fluxo que só pode ser lido uma vez.`], [h`Retorna §null§`, h`Não retorna §null§: a Promise é rejeitada com erro.`], [h`Retorna um array vazio`, h`Não há valor padrão; ler de novo gera erro.`]],
    exp: h`O corpo (§body§) é lido uma única vez; depois fica “usado” (§bodyUsed = true§) e a segunda leitura rejeita com §TypeError§. Para ler duas vezes, clone antes com §resposta.clone()§ — ou, melhor, guarde o resultado da primeira leitura em uma variável.`,
    src: [[A4, 'buscarLugares(): return resposta.json()']],
    verify: nodeFetch(200, "const r = await fetch(base + '/x'); await r.json(); try { await r.json(); console.log('leu de novo'); } catch (e) { console.log(e.name); }", ['TypeError', 'leu de novo', 'null', '[]']),
  }),

  // ---------------- DIFÍCEIS (CORS) ----------------
  R(18, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'CORS sem cabeçalho',
    stem: h`Uma página servida em uma origem (porta A) faz §fetch§ para uma API em outra porta (porta B). O servidor da API responde §200§, mas **sem** o cabeçalho §Access-Control-Allow-Origin§. O que o navegador faz?\n\n${code('try {\n  const r = await fetch(urlDaApi);\n  console.log("resolveu", r.status);\n} catch (e) {\n  console.log("rejeitou", e.name);\n}')}`,
    opts: [h`A Promise é rejeitada com §TypeError§: o navegador bloqueia a leitura da resposta`, [h`A Promise resolve com status §200§`, h`Sem permissão de CORS o navegador não entrega a resposta ao JavaScript de outra origem.`], [h`A Promise resolve com status §403§`, h`O bloqueio é feito pelo navegador; o servidor respondeu 200, e o código nem recebe um §Response§.`], [h`A Promise resolve com status §0§ e corpo vazio`, h`Isso só ocorre em modo §no-cors§ (resposta opaca); por padrão o §fetch§ rejeita.`]],
    exp: h`Portas diferentes são origens diferentes. Para ler a resposta, o servidor precisa autorizar a origem com §Access-Control-Allow-Origin§. Sem esse cabeçalho, o navegador bloqueia o acesso e o §fetch§ rejeita com §TypeError§ (“Failed to fetch”). Por isso, mais adiante no curso, a API em Express precisará habilitar o CORS.`,
    src: [[A4, 'file:// e CORS: o navegador bloqueia o fetch por política de origem']],
    verify: cors({}, {}, "fetch(__bases.api + '/dados')", ['rejeitou TypeError', 'resolveu 200', 'resolveu 403', 'resolveu 0 opaca']),
  }),
  R(19, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'CORS com origem permitida',
    stem: h`A mesma situação, mas agora a API responde com o cabeçalho §Access-Control-Allow-Origin: *§. O que ocorre com o §fetch§ simples (§GET§ sem cabeçalhos extras) vindo de outra origem?`,
    opts: [h`Resolve normalmente com status §200§ e permite ler o JSON`, [h`Continua rejeitando, pois falta autenticação`, h`§Allow-Origin: *§ autoriza qualquer origem a ler respostas de requisições simples (sem credenciais).`], [h`Resolve, mas o corpo vem vazio`, h`O corpo é entregue normalmente quando o CORS está liberado.`], [h`Rejeita porque §*§ não é aceito`, h`O valor §*§ é válido para requisições sem credenciais.`]],
    exp: h`Com §Access-Control-Allow-Origin: *§ o navegador libera a leitura da resposta de qualquer origem para requisições “simples” (§GET§ sem cabeçalhos especiais e sem credenciais). Assim o §fetch§ resolve com §200§ e o JSON pode ser lido.`,
    src: [[A4, 'política de CORS do navegador']],
    verify: cors({ 'Access-Control-Allow-Origin': '*' }, {}, "fetch(__bases.api + '/dados')", ['resolveu 200', 'rejeitou TypeError', 'resolveu 403', 'resolveu 0 opaca']),
  }),
  R(20, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Preflight com Authorization',
    stem: h`A API responde §Access-Control-Allow-Origin: *§ a todas as requisições, mas **não** autoriza cabeçalhos extras na resposta à pré-checagem (§OPTIONS§). O front envia §Authorization§:\n\n${code('fetch(urlDaApi, {\n  headers: { Authorization: "Bearer abc" },\n});')}\nO que acontece?`,
    opts: [h`O navegador rejeita: a pré-checagem (preflight) não libera o cabeçalho §Authorization§`, [h`Resolve com §200§, pois a origem já está liberada`, h`Cabeçalhos como §Authorization§ tornam a requisição “não simples”: exigem que o servidor liste o cabeçalho em §Access-Control-Allow-Headers§.`], [h`Resolve, mas o servidor ignora o §Authorization§`, h`Se o preflight falha, a requisição principal nem é enviada.`], [h`Resolve com status §0§`, h`Não é uma resposta opaca; o §fetch§ é rejeitado.`]],
    exp: h`Um cabeçalho personalizado como §Authorization§ dispara um *preflight* (§OPTIONS§). O servidor precisa responder com §Access-Control-Allow-Headers: Authorization§. Sem isso o navegador cancela a requisição e o §fetch§ rejeita com §TypeError§. Em APIs com JWT (Aula 11) isso será configurado no Express.`,
    src: [[A4, 'política de CORS do navegador (ver também aulas 09 e 11 sobre configuração no servidor)']],
    verify: cors({ 'Access-Control-Allow-Origin': '*' }, {}, "fetch(__bases.api + '/dados', { headers: { Authorization: 'Bearer abc' } })", ['rejeitou TypeError', 'resolveu 200', 'resolveu 204', 'resolveu 0 opaca']),
  }),
  R(21, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Preflight liberado',
    stem: h`Agora a API responde ao §OPTIONS§ com §Access-Control-Allow-Origin: *§ e §Access-Control-Allow-Headers: Authorization§ (e a resposta ao §GET§ também inclui o §Allow-Origin§). O mesmo §fetch§ com o cabeçalho §Authorization§ é feito. Qual é o resultado?`,
    opts: [h`Resolve com status §200§`, [h`Rejeita com §TypeError§`, h`O preflight agora autoriza o cabeçalho; a requisição principal é enviada e a resposta liberada.`], [h`Resolve com status §204§ (o do preflight)`, h`O §204§ é a resposta ao §OPTIONS§, que o JavaScript não vê; a página recebe a resposta do §GET§ (§200§).`], [h`Resolve com resposta opaca`, h`Respostas opacas só existem em §mode: "no-cors"§.`]],
    exp: h`O navegador primeiro envia o preflight §OPTIONS§; como o servidor lista §Authorization§ em §Access-Control-Allow-Headers§, ele envia a requisição real (§GET§ com o cabeçalho). A resposta §200§, que traz §Allow-Origin§, é entregue ao código.`,
    src: [[A4, 'política de CORS do navegador']],
    verify: cors({ 'Access-Control-Allow-Origin': '*' }, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization' }, "fetch(__bases.api + '/dados', { headers: { Authorization: 'Bearer abc' } })", ['resolveu 200', 'rejeitou TypeError', 'resolveu 204', 'resolveu 0 opaca']),
  }),
  R(22, {
    diff: 'dificil', scope: 'desafio', sub: 'Método PUT e preflight',
    stem: h`A API libera apenas §Access-Control-Allow-Origin: *§ (sem §Allow-Methods§) na pré-checagem. O front envia uma atualização:\n\n${code('fetch(urlDaApi, { method: "PUT" });')}\nO que acontece no navegador?`,
    opts: [h`Rejeita com §TypeError§: o preflight não autoriza o método §PUT§`, [h`Resolve com §200§: a origem já foi liberada`, h`Métodos diferentes de GET/HEAD/POST exigem preflight, e o servidor precisa listar o método em §Access-Control-Allow-Methods§.`], [h`Resolve com §204§`, h`O §204§ seria a resposta ao §OPTIONS§; a página nunca chega a fazer o §PUT§.`], [h`O §PUT§ é convertido em §GET§ automaticamente`, h`O navegador não troca o método da requisição.`]],
    exp: h`Métodos “não simples” como §PUT§ e §DELETE§ disparam preflight; o servidor deve responder com §Access-Control-Allow-Methods§ incluindo o método (além do §Allow-Origin§). Sem isso o §fetch§ é rejeitado. Em Express, o middleware §cors()§ cuida de tudo isso.`,
    src: [[A4, 'política de CORS do navegador (configuração no servidor nas aulas 09+)']],
    verify: cors({ 'Access-Control-Allow-Origin': '*' }, { 'Access-Control-Allow-Origin': '*' }, "fetch(__bases.api + '/dados', { method: 'PUT' })", ['rejeitou TypeError', 'resolveu 200', 'resolveu 204', 'resolveu 405']),
  }),
  R(23, {
    diff: 'dificil', scope: 'desafio', sub: 'Credenciais e curinga',
    stem: h`O front faz §fetch(urlDaApi, { credentials: "include" })§ e a API responde com §Access-Control-Allow-Origin: *§. O que o navegador faz?`,
    opts: [h`Rejeita com §TypeError§: com credenciais o curinga §*§ não é permitido`, [h`Resolve com §200§: §*§ vale para qualquer requisição`, h`Quando se enviam cookies/credenciais, o servidor precisa indicar a origem exata e §Access-Control-Allow-Credentials: true§.`], [h`Resolve e ignora os cookies`, h`Não há resolução parcial: o navegador rejeita a resposta.`], [h`Resolve com resposta opaca`, h`Opaca só em §no-cors§.`]],
    exp: h`Em requisições com credenciais (§credentials: "include"§), §Access-Control-Allow-Origin: *§ é recusado; o servidor deve devolver a origem específica e §Access-Control-Allow-Credentials: true§. Esse cuidado vale ao usar cookies de sessão entre front e API em domínios diferentes.`,
    src: [[A4, 'política de CORS do navegador']],
    verify: cors({ 'Access-Control-Allow-Origin': '*' }, {}, "fetch(__bases.api + '/dados', { credentials: 'include' })", ['rejeitou TypeError', 'resolveu 200', 'resolveu 204', 'resolveu 0 opaca']),
  }),
  R(24, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Mesma origem não precisa de CORS',
    stem: h`Se a página e a API estão na **mesma origem** (mesmo protocolo, host e porta) e o front chama §fetch("/local")§, a API precisa enviar cabeçalhos de CORS?`,
    opts: [h`Não: o §fetch§ resolve normalmente, sem nenhum cabeçalho de CORS`, [h`Sim, sempre que usar §fetch§`, h`CORS só se aplica a requisições entre origens diferentes.`], [h`Sim, mas apenas §Access-Control-Allow-Methods§`, h`Em mesma origem nenhum cabeçalho de CORS é necessário.`], [h`Não, mas o §fetch§ retorna resposta opaca`, h`Em mesma origem a resposta é “básica” e totalmente legível.`]],
    exp: h`A política de mesma origem só restringe leituras *entre* origens diferentes. Quando a página chama um caminho relativo como §/local§, a origem é a mesma e o §fetch§ resolve normalmente (§200§). Por isso o §servidor-estatico.js§ da aula, que serve a página e os JSONs na mesma origem, funciona sem CORS.`,
    src: [[A4, 'servidor-estatico.js serve página e dados em http://localhost:5500']],
    verify: cors({}, {}, "fetch('/local')", ['resolveu 200', 'rejeitou TypeError', 'resolveu 0 opaca', 'resolveu 403']),
  }),
  R(25, {
    diff: 'dificil', scope: 'desafio', sub: 'no-cors e resposta opaca',
    stem: h`Para “contornar” o erro de CORS, alguém usa §fetch(urlDaApi, { mode: "no-cors" })§ contra uma API sem cabeçalhos de CORS. O que a Promise devolve?`,
    opts: [h`Resolve com resposta *opaca* (status §0§)`, [h`Resolve com §200§ e o JSON legível`, h`No modo §no-cors§ a resposta é opaca: status §0§, corpo ilegível.`], [h`Rejeita com §TypeError§`, h`Com §no-cors§ a requisição é feita e a Promise resolve (com resposta opaca).`], [h`Resolve com §403§`, h`O status visível ao JavaScript é §0§, não um código do servidor.`]],
    exp: h`§mode: "no-cors"§ não “resolve” o CORS: a requisição é enviada, mas a resposta é *opaca* (§type: "opaque"§, status §0§, corpo inacessível). Serve só para enviar requisições sem ler o resultado. A solução correta é o servidor liberar o CORS.`,
    src: [[A4, 'política de CORS do navegador']],
    verify: cors({}, {}, "fetch(__bases.api + '/dados', { mode: 'no-cors' })", ['resolveu 0 opaca', 'resolveu 200', 'rejeitou TypeError', 'resolveu 403']),
  }),
  R(26, {
    diff: 'dificil', scope: 'desafio', sub: 'A requisição chega ao servidor',
    stem: h`Um §fetch§ simples (§GET§) entre origens falha por falta de §Access-Control-Allow-Origin§ e o §catch§ é executado. Quantas requisições o servidor da API efetivamente recebeu?`,
    opts: [h`Uma: a requisição foi enviada e processada; só a *leitura* da resposta foi bloqueada`, [h`Nenhuma: o navegador cancela antes de enviar`, h`Em requisições simples o navegador envia a requisição e depois decide se entrega a resposta ao código.`], [h`Duas: um preflight e a requisição real`, h`Um §GET§ simples sem cabeçalhos especiais não dispara preflight.`], [h`Depende do status devolvido pelo servidor`, h`O bloqueio por CORS ocorre independentemente do status da resposta.`]],
    exp: h`CORS protege o *leitor*, não o servidor: num §GET§ simples o navegador envia a requisição normalmente; o servidor a processa (com possíveis efeitos colaterais) e só então o navegador impede o JavaScript de ver a resposta. Por isso CORS não substitui autenticação/autorização no servidor.`,
    src: [[A4, 'política de CORS do navegador']],
    verify: { ...cors({}, {}, "fetch(__bases.api + '/dados')", ['rejeitou TypeError hits=1', 'rejeitou TypeError hits=0', 'rejeitou TypeError hits=2', 'resolveu 200 hits=1'], { hits: 'api' }) },
  }),
];
