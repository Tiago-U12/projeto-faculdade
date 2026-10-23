// Lote fs-express-rest — API REST com Express: 9 fáceis (001–009), 9 médias (010–018), 9 difíceis (019–027).
// Base: Aula 09 (README e starter: app.js, rotas/lugares.js, /lugares, /lugares/:id, POST /lugares/:id/avaliacoes, 404/400/201, CORS, express.json).
// Verificação REAL: o app Express 5 do enunciado sobe em porta efêmera no sandbox, recebe requisições com fetch e a resposta real
// (status, corpo e cabeçalhos) é comparada às alternativas.
import { m } from '../../tools/lib/dsl.ts';

const A9 = 'fs-aula-09';
const R = (n, o) => ({ d: 'fullstack', topic: 'express-rest', ...o, id: `fs-express-rest-${String(n).padStart(3, '0')}` });
const h = (strings, ...v) => m(strings, ...v).replaceAll('§', '`').replaceAll('\\n', '\n');
const code = (src) => '§§§js\n'.replaceAll('§', '`') + src.trim() + '\n§§§'.replaceAll('§', '`');

// Executa o app (setup) e as requisições (reqs). `req(metodo, caminho, corpo?, tipo?)` devolve { status, texto, headers }.
const api = (setup, reqs, values, extra = {}) => ({
  kind: 'node',
  params: {
    code: `import express from 'express';
import cors from 'cors';
process.env.NODE_ENV = 'test';
const app = express();
${setup}
const srv = app.listen(0, '127.0.0.1');
await new Promise((r) => srv.once('listening', r));
const url = 'http://127.0.0.1:' + srv.address().port;
const req = async (metodo, caminho, corpo, tipo = 'application/json') => {
  const r = await fetch(url + caminho, { method: metodo, headers: corpo !== undefined ? { 'content-type': tipo } : {}, body: corpo === undefined ? undefined : typeof corpo === 'string' ? corpo : JSON.stringify(corpo) });
  const texto = await r.text();
  return { status: r.status, texto, headers: r.headers };
};
${reqs}
srv.close();
process.exit(0);`,
    ...extra,
  },
  values,
});
const com = (intro, setup, fim = '') => `${intro}\n\n${code(setup)}${fim ? '\n' + fim : ''}`;

const LUGARES = `const lugares = [{ id: 1, nome: "Café Aroma" }, { id: 2, nome: "Parque das Águas" }];
app.get("/lugares/:id", (req, res) => {
  const id = Number(req.params.id);
  const lugar = lugares.find((l) => l.id === id);
  if (!lugar) {
    return res.status(404).json({ erro: "Lugar não encontrado." });
  }
  res.json(lugar);
});`;

export default [
  // ---------------- FÁCEIS ----------------
  R(1, {
    diff: 'facil', scope: 'aula', sub: 'res.json',
    stem: h`${com('O servidor abaixo recebe um §GET /§. Qual é a resposta (status e corpo)?', 'app.get("/", (req, res) => {\n  res.json({ mensagem: "API no ar." });\n});')}`,
    opts: [h`§200§ com o corpo §{"mensagem":"API no ar."}§`, [h`§201§ com o corpo vazio`, h`201 é para recursos criados (POST); aqui o padrão do §res.json§ é 200 e há um corpo JSON.`], [h`§404§, porque a rota não tem id`, h`A rota §GET /§ existe e responde normalmente.`], [h`§200§ com o texto §[object Object]§`, h`§res.json§ serializa o objeto como JSON (não usa §toString§).`]],
    exp: h`Se não houver §res.status(...)§, a resposta tem status 200. O §res.json(obj)§ converte o objeto em JSON, define o cabeçalho §Content-Type: application/json§ e envia o corpo. É exatamente o que a rota §/§ do starter faz: “API da Plataforma de Avaliações no ar.”.`,
    src: [[A9, 'src/app.js: app.get("/") responde res.json({ mensagem: ... })']],
    verify: api('app.get("/", (req, res) => {\n  res.json({ mensagem: "API no ar." });\n});', "const r = await req('GET', '/');\nconsole.log(r.status, r.texto);", ['200 {"mensagem":"API no ar."}', '201 ', '404 ', '200 [object Object]']),
  }),
  R(2, {
    diff: 'facil', scope: 'aula', sub: '404 com JSON',
    stem: h`${com('Chega um §GET /lugares/999§ ao servidor. Qual é a resposta?', LUGARES)}`,
    opts: [h`§404§ com o corpo §{"erro":"Lugar não encontrado."}§`, [h`§200§ com o corpo §null§`, h`Com o §return§ após §res.status(404).json(...)§, a função termina e a resposta é 404.`], [h`§500§ (erro interno)`, h`Não há exceção: o código trata o caso e responde 404 de forma controlada.`], [h`§400§ (requisição inválida)`, h`400 indica dados inválidos enviados pelo cliente; aqui o id é válido, mas o recurso não existe (404).`]],
    exp: h`O id 999 não existe em §lugares§, então §find§ devolve §undefined§ e a rota responde §res.status(404).json({ erro: ... })§. Critério de aceite da aula: “§GET /lugares/999§ responde 404 com um corpo JSON §{ erro: ... }§”.`,
    src: [[A9, 'GET /lugares/999 responde 404 com um corpo JSON { erro: ... }']],
    verify: api(LUGARES, "const r = await req('GET', '/lugares/999');\nconsole.log(r.status, r.texto);", ['404 {"erro":"Lugar não encontrado."}', '200 null', '500 ', '400 ']),
  }),
  R(3, {
    diff: 'facil', scope: 'aula', sub: '201 Created',
    stem: h`${com('Qual é o status HTTP da resposta de um §POST§ que cria a avaliação com sucesso?', 'const avaliacoes = [];\napp.use(express.json());\napp.post("/avaliacoes", (req, res) => {\n  const nova = { id: avaliacoes.length + 1, ...req.body };\n  avaliacoes.push(nova);\n  res.status(201).json(nova);\n});')}`,
    opts: [h`§201§`, [h`§200§`, h`O código define §201§ explicitamente; 200 seria o padrão se não houvesse §res.status§.`], [h`§204§`, h`204 significa “sem conteúdo”; aqui a avaliação criada é devolvida no corpo.`], [h`§302§`, h`302 é um redirecionamento.`]],
    exp: h`§201 Created§ é o código para “recurso criado com sucesso”. A Aula 09 pede: “adicione ao array §avaliacoes§ e responda §res.status(201).json(novaAvaliacao)§ — 201 é o código HTTP para ‘criado com sucesso’”.`,
    src: [[A9, 'POST /lugares/:id/avaliacoes responde 201 com a avaliação criada']],
    verify: api('const avaliacoes = [];\napp.use(express.json());\napp.post("/avaliacoes", (req, res) => {\n  const nova = { id: avaliacoes.length + 1, ...req.body };\n  avaliacoes.push(nova);\n  res.status(201).json(nova);\n});', "const r = await req('POST', '/avaliacoes', { nota: 5 });\nconsole.log(r.status);", ['201', '200', '204', '302']),
  }),
  R(4, {
    diff: 'facil', scope: 'aula', sub: 'req.params',
    stem: h`${com('Para §GET /lugares/3§, o que a rota imprime no servidor?', 'app.get("/lugares/:id", (req, res) => {\n  console.log(typeof req.params.id, Number(req.params.id));\n  res.end();\n});')}`,
    opts: [h`§string 3§`, [h`§number 3§`, h`Os parâmetros de rota chegam sempre como texto; por isso a aula usa §Number(req.params.id)§.`], [h`§undefined NaN§`, h`O segmento §:id§ da rota populou §req.params.id§ com §"3"§.`], [h`§string :id§`, h`§req.params.id§ contém o valor presente na URL, não o nome do parâmetro.`]],
    exp: h`Valores de §req.params§ são sempre strings: §"3"§. A aula manda converter: “Pegue o id da URL com §Number(req.params.id)§”, já que os ids dos dados são números (comparar §"3" === 3§ daria falso).`,
    src: [[A9, 'GET /lugares/:id: pegue o id da URL com Number(req.params.id)']],
    verify: api('app.get("/lugares/:id", (req, res) => {\n  console.log(typeof req.params.id, Number(req.params.id));\n  res.end();\n});', "await req('GET', '/lugares/3');", ['string 3', 'number 3', 'undefined NaN', 'string :id']),
  }),
  R(5, {
    diff: 'facil', scope: 'aula', sub: 'express.json',
    stem: h`${com('Um cliente envia §POST /x§ com o corpo JSON §{"nota":5}§ e o cabeçalho §Content-Type: application/json§, **mas o servidor não usa** §express.json()§. O que a rota imprime?', 'app.post("/x", (req, res) => {\n  console.log(req.body);\n  res.end();\n});')}`,
    opts: [h`§undefined§`, [h`§{ nota: 5 }§`, h`O Express não lê o corpo sozinho; é o middleware §express.json()§ que preenche §req.body§.`], [h`§"{\\"nota\\":5}"§`, h`Sem o middleware, §req.body§ nem é preenchido com o texto bruto.`], [h`§null§`, h`No Express 5 o valor é §undefined§ quando nenhum middleware leu o corpo.`]],
    exp: h`Para o Express transformar o corpo JSON em objeto é preciso registrar §app.use(express.json())§ (antes das rotas). Sem ele, no Express 5 §req.body§ fica §undefined§. A aula avisa: “o §express.json()§ já está configurado em §app.js§, então §req.body§ já vem pronto”.`,
    src: [[A9, 'src/app.js configura CORS e express.json(); req.body já vem pronto']],
    verify: api('app.post("/x", (req, res) => {\n  console.log(req.body);\n  res.end();\n});', "await req('POST', '/x', { nota: 5 });", ['undefined', '{"nota":5}', '"{\\"nota\\":5}"', 'null']),
  }),
  R(6, {
    diff: 'facil', scope: 'aula', sub: 'Rota desconhecida',
    stem: h`${com('Chega um §GET /nao-existe§ ao servidor abaixo. Qual é a resposta?', 'app.get("/", (req, res) => res.json({ ok: true }));\napp.use((req, res) => {\n  res.status(404).json({ erro: "Rota não encontrada." });\n});')}`,
    opts: [h`§404§ com §{"erro":"Rota não encontrada."}§`, [h`§200§ com §{"ok":true}§`, h`A rota §/§ só responde a §GET /§; a URL pedida é outra.`], [h`§500§`, h`Não há exceção; o middleware final responde 404.`], [h`A conexão fica pendurada sem resposta`, h`O middleware sem caminho captura qualquer requisição que as rotas anteriores não trataram.`]],
    exp: h`O §app.use((req, res) => ...)§ no final, sem caminho, atua como “pega-tudo”: se nenhuma rota anterior respondeu, ele devolve 404 com JSON. É o que o starter faz em §app.js§: “devolve 404 para qualquer rota desconhecida”.`,
    src: [[A9, 'app.js devolve 404 para qualquer rota desconhecida']],
    verify: api('app.get("/", (req, res) => res.json({ ok: true }));\napp.use((req, res) => {\n  res.status(404).json({ erro: "Rota não encontrada." });\n});', "const r = await req('GET', '/nao-existe');\nconsole.log(r.status, r.texto);", ['404 {"erro":"Rota não encontrada."}', '200 {"ok":true}', '500 ', '']),
  }),
  R(7, {
    diff: 'facil', scope: 'aula', sub: 'Método HTTP errado',
    stem: h`${com('Existe apenas a rota abaixo. Que status o Express devolve para um §GET /avaliacoes§?', 'app.post("/avaliacoes", (req, res) => {\n  res.status(201).json({ ok: true });\n});')}`,
    opts: [h`§404§`, [h`§201§`, h`O §POST§ responde 201, mas a requisição usa §GET§; o método também faz parte da rota.`], [h`§200§ com lista vazia`, h`O Express não cria rotas §GET§ sozinho.`], [h`§500§`, h`Não há exceção; simplesmente nenhuma rota casa com §GET /avaliacoes§.`]],
    exp: h`Uma rota no Express é a combinação *método + caminho*. Só existe §POST /avaliacoes§; para §GET /avaliacoes§ nada casa, então o Express responde 404 (“Cannot GET /avaliacoes”). Por isso a aula usa §GET§ para consultar e §POST§ para criar.`,
    src: [[A9, 'rotas GET /lugares, GET /lugares/:id e POST /lugares/:id/avaliacoes']],
    verify: api('app.post("/avaliacoes", (req, res) => {\n  res.status(201).json({ ok: true });\n});', "const r = await req('GET', '/avaliacoes');\nconsole.log(r.status);", ['404', '201', '200', '500']),
  }),
  R(8, {
    diff: 'facil', scope: 'aula', sub: 'Content-Type do res.json',
    stem: h`${com('Qual é o cabeçalho §Content-Type§ da resposta?', 'app.get("/lugares", (req, res) => {\n  res.json([{ id: 1 }]);\n});')}`,
    opts: [h`§application/json; charset=utf-8§`, [h`§text/html; charset=utf-8§`, h`§res.send§ com texto/HTML usa esse tipo; o §res.json§ define §application/json§.`], [h`§text/plain; charset=utf-8§`, h`§res.json§ não envia texto simples.`], [h`Nenhum: o cabeçalho não é definido`, h`O §res.json§ define o §Content-Type§ automaticamente.`]],
    exp: h`§res.json(dados)§ serializa com §JSON.stringify§ e define §Content-Type: application/json; charset=utf-8§, informando ao cliente (como o §fetch§ e seu §resposta.json()§) como interpretar o corpo.`,
    src: [[A9, 'GET /lugares: res.json(...) com o array']],
    verify: api('app.get("/lugares", (req, res) => {\n  res.json([{ id: 1 }]);\n});', "const r = await req('GET', '/lugares');\nconsole.log(r.headers.get('content-type'));", ['application/json; charset=utf-8', 'text/html; charset=utf-8', 'text/plain; charset=utf-8', 'null']),
  }),
  R(9, {
    diff: 'facil', scope: 'aula', sub: 'Porta por variável de ambiente',
    stem: h`${com('Em §index.js§ a porta é escolhida assim. Quais valores o código imprime se a variável §PORTA§ **não** estiver definida e depois se for §"4000"§?', 'const PORTA = process.env.PORTA || 3333;\nconsole.log(PORTA);')}`,
    opts: [h`§3333§ e depois §4000§ (texto)`, [h`§undefined§ e depois §4000§`, h`Com §PORTA§ indefinida, o operador §||§ usa o valor padrão §3333§.`], [h`§3333§ nas duas situações`, h`Quando §PORTA§ existe (“4000”), ela prevalece sobre o padrão.`], [h`§4000§ e depois §3333§`, h`O padrão §3333§ só vale quando a variável não está definida.`]],
    exp: h`§process.env.PORTA || 3333§ usa a variável de ambiente se existir e, caso contrário, o padrão 3333. Variáveis de ambiente são sempre texto, então “4000” chega como string. A aula: “o servidor sobe em §http://localhost:3333§ (a variável de ambiente §PORTA§ pode mudar isso)”.`,
    src: [[A9, 'O servidor sobe em http://localhost:3333 (a variável PORTA pode mudar isso)']],
    verify: { kind: 'node', params: { code: 'delete process.env.PORTA;\nconst a = process.env.PORTA || 3333;\nprocess.env.PORTA = "4000";\nconst b = process.env.PORTA || 3333;\nconsole.log(a, b);' }, values: ['3333 4000', 'undefined 4000', '3333 3333', '4000 3333'] },
  }),

  // ---------------- MÉDIAS ----------------
  R(10, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Ordem dos middlewares',
    stem: h`${com('Chega um §GET /x§. Em que ordem as mensagens são impressas?', 'app.use((req, res, next) => {\n  console.log("A");\n  next();\n});\napp.get("/x", (req, res) => {\n  console.log("B");\n  res.end();\n});\napp.use((req, res) => {\n  console.log("C");\n  res.end();\n});')}`,
    opts: [h`§A§ e depois §B§`, [h`§A§, §B§ e §C§`, h`Depois que a rota responde com §res.end()§ (sem chamar §next§), a cadeia termina; o middleware final não é executado.`], [h`§B§ e depois §A§`, h`Middlewares e rotas são executados na ordem em que foram registrados: o §app.use§ vem primeiro.`], [h`Só §B§`, h`O primeiro middleware também executa (chama §next()§ para continuar).`]],
    exp: h`O Express percorre os handlers na ordem de registro. O primeiro (§A§) chama §next()§ e passa adiante; a rota §GET /x§ (§B§) responde e não chama §next§, encerrando a cadeia. O último middleware (§C§) nunca roda para essa requisição.`,
    src: [[A9, 'app.js: ordem de app.use(cors()), express.json(), rotas e 404 final']],
    verify: api('app.use((req, res, next) => {\n  console.log("A");\n  next();\n});\napp.get("/x", (req, res) => {\n  console.log("B");\n  res.end();\n});\napp.use((req, res) => {\n  console.log("C");\n  res.end();\n});', "await req('GET', '/x');", ['A\nB', 'A\nB\nC', 'B\nA', 'B']),
  }),
  R(11, {
    diff: 'medio', scope: 'aula', sub: 'return após responder',
    stem: h`${com('O handler esquece o §return§ depois de responder 404. O que o **cliente** recebe para §GET /lugares/999§?', 'app.get("/lugares/:id", (req, res) => {\n  const lugar = undefined; // não encontrado\n  if (!lugar) {\n    res.status(404).json({ erro: "Lugar não encontrado." });\n  }\n  res.json(lugar.nome);\n});')}`,
    opts: [h`§404§ com o JSON de erro`, [h`§200§`, h`A primeira resposta (404) já foi enviada; a linha seguinte lança exceção ao acessar §lugar.nome§.`], [h`Duas respostas, uma após a outra`, h`Uma requisição HTTP só tem uma resposta; a segunda tentativa não chega ao cliente.`], [h`Nenhuma resposta`, h`O 404 já foi enviado antes do erro.`]],
    exp: h`Sem §return§, depois de §res.status(404).json(...)§ o código continua e tenta usar §lugar.nome§ (de §undefined§), lançando um erro no servidor. O cliente já recebeu o 404, mas o servidor registra a exceção. Por isso a aula avisa: “e pare (§return§) — sem isso, o código continuaria e quebraria”.`,
    src: [[A9, 'GET /lugares/:id: se não encontrar, responda 404 e pare (return)']],
    verify: api('app.get("/lugares/:id", (req, res) => {\n  const lugar = undefined;\n  if (!lugar) {\n    res.status(404).json({ erro: "Lugar não encontrado." });\n  }\n  res.json(lugar.nome);\n});\napp.use((err, req, res, next) => {\n  console.log("servidor:", err.name);\n  if (!res.headersSent) res.status(500).json({ erro: "x" });\n});', "const r = await req('GET', '/lugares/999');\nconsole.log('cliente:', r.status, r.texto);", ['servidor: TypeError\ncliente: 404 {"erro":"Lugar não encontrado."}', 'cliente: 200', 'cliente: 500 {"erro":"x"}', 'cliente: sem resposta']),
  }),
  R(12, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Erros em handlers async (Express 5)',
    stem: h`${com('No Express 5, o que acontece quando um handler **async** lança uma exceção e há um middleware de erro?', 'app.get("/x", async (req, res) => {\n  throw new Error("falhou");\n});\napp.use((err, req, res, next) => {\n  res.status(500).json({ erro: err.message });\n});')}`,
    opts: [h`§500§ com §{"erro":"falhou"}§`, [h`A requisição fica pendurada até dar timeout`, h`Isso acontecia no Express 4; no Express 5 Promises rejeitadas são encaminhadas ao tratamento de erros.`], [h`O processo Node.js encerra`, h`O erro é capturado pelo Express e tratado como qualquer exceção do handler.`], [h`O cliente recebe §200§ com corpo vazio`, h`O middleware de erro responde com 500.`]],
    exp: h`A partir do Express 5, handlers que retornam uma Promise rejeitada (ou funções §async§ que lançam) enviam o erro automaticamente ao próximo middleware de erro. Não é mais preciso envolver tudo em §try/catch§ + §next(erro)§ — base do tratamento central de erros da Aula 12.`,
    src: [[A9, 'API Express 5 (express ^5.2.1 no package.json)']],
    verify: api('app.get("/x", async (req, res) => {\n  throw new Error("falhou");\n});\napp.use((err, req, res, next) => {\n  res.status(500).json({ erro: err.message });\n});', "const r = await req('GET', '/x');\nconsole.log(r.status, r.texto);", ['500 {"erro":"falhou"}', 'timeout', 'processo encerrou', '200 ']),
  }),
  R(13, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Assinatura do middleware de erro',
    stem: h`O middleware abaixo foi escrito com **três** parâmetros. O que o cliente recebe quando a rota lança um erro?\n\n${code('app.get("/x", () => {\n  throw new Error("falhou");\n});\napp.use((req, res, next) => {\n  res.status(500).json({ erro: "tratado" });\n});')}`,
    opts: [h`§500§ em HTML (tratador padrão)`, [h`§500§ com §{"erro":"tratado"}§`, h`Só funções com *quatro* parâmetros (§err, req, res, next§) são tratadas como middleware de erro.`], [h`§200§ com corpo vazio`, h`O tratador padrão responde com 500, não 200.`], [h`§404§`, h`A rota existe; o problema é o erro lançado nela.`]],
    exp: h`O Express identifica um middleware de erro pelo número de parâmetros: precisa ter exatamente quatro (§err, req, res, next§). Com três ele é um middleware comum e é *pulado* quando há erro; o tratador padrão responde §500§ com uma página HTML de erro.`,
    src: [[A9, 'middlewares no Express (app.use) — ver aula 12 para o handler central']],
    verify: api('app.get("/x", () => {\n  throw new Error("falhou");\n});\napp.use((req, res, next) => {\n  res.status(500).json({ erro: "tratado" });\n});', "const r = await req('GET', '/x');\nconsole.log(r.status, (r.headers.get('content-type') || '').split(';')[0]);", ['500 text/html', '500 application/json', '200 ', '404 text/html']),
  }),
  R(14, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Query string',
    stem: h`${com('Qual é a resposta para §GET /lugares?categoria=parque§?', 'app.get("/lugares", (req, res) => {\n  res.json({ categoria: req.query.categoria });\n});')}`,
    opts: [h`§{"categoria":"parque"}§`, [h`§{}§`, h`O parâmetro de consulta (depois do §?§) é lido em §req.query§ e está presente.`], [h`§{"categoria":"categoria=parque"}§`, h`§req.query§ já separa nome e valor.`], [h`Um erro §404§`, h`A query string não faz parte do caminho da rota: §/lugares§ casa normalmente.`]],
    exp: h`Parâmetros após o §?§ (query string) ficam em §req.query§; parâmetros do caminho (§:id§) ficam em §req.params§; o corpo JSON, em §req.body§. Aqui §req.query.categoria§ é §"parque"§.`,
    src: [[A9, 'GET /lugares: lista todos os lugares (variações de filtro via query string)']],
    verify: api('app.get("/lugares", (req, res) => {\n  res.json({ categoria: req.query.categoria });\n});', "const r = await req('GET', '/lugares?categoria=parque');\nconsole.log(r.texto);", ['{"categoria":"parque"}', '{}', '{"categoria":"categoria=parque"}', '']),
  }),
  R(15, {
    diff: 'medio', scope: 'aprofundamento', sub: 'JSON inválido',
    stem: h`${com('Um cliente envia o corpo §{"nota": 5§ (JSON malformado, falta fechar a chave) com §Content-Type: application/json§. Qual é o status devolvido pelo Express?', 'app.use(express.json());\napp.post("/x", (req, res) => res.status(201).json(req.body));')}`,
    opts: [h`§400§`, [h`§201§ com o corpo parcial`, h`O parser falha antes de a rota executar; ela nem é chamada.`], [h`§500§`, h`Erros de parse do corpo do cliente resultam em 400 (requisição inválida).`], [h`§200§ com §{}§`, h`Não há resposta de sucesso: a requisição é recusada.`]],
    exp: h`O §express.json()§ tenta interpretar o corpo; JSON malformado gera um erro de parse com status §400 Bad Request§, devolvido pelo tratador padrão antes de chegar à rota. A culpa é do cliente (dado inválido), por isso 4xx e não 5xx.`,
    src: [[A9, 'POST com dados inválidos responde 400, sem derrubar o servidor']],
    verify: api('app.use(express.json());\napp.post("/x", (req, res) => res.status(201).json(req.body));', "const r = await req('POST', '/x', '{\"nota\": 5');\nconsole.log(r.status);", ['400', '201', '500', '200']),
  }),
  R(16, {
    diff: 'medio', scope: 'aula', sub: 'Router montado em prefixo',
    stem: h`${com('O router está montado em §/lugares§. Quais status voltam para §GET /lugares/3§ e §GET /3§, respectivamente?', 'const router = express.Router();\nrouter.get("/:id", (req, res) => res.json({ id: req.params.id }));\napp.use("/lugares", router);')}`,
    opts: [h`§200§ e depois §404§`, [h`§200§ nas duas`, h`O prefixo §/lugares§ faz parte do caminho completo; §GET /3§ não casa com nenhuma rota.`], [h`§404§ e depois §200§`, h`É o contrário: o router só responde sob o prefixo §/lugares§.`], [h`§404§ nas duas`, h`§GET /lugares/3§ casa com §/lugares§ + §/:id§.`]],
    exp: h`§app.use("/lugares", rotasLugares)§ monta o router sob o prefixo §/lugares§: a rota §"/:id"§ do router vira §/lugares/:id§. Por isso o arquivo §rotas/lugares.js§ declara §router.get("/")§ e §router.get("/:id")§ e o app define o prefixo uma vez só.`,
    src: [[A9, 'app.js: app.use("/lugares", rotasLugares)']],
    verify: api('const router = express.Router();\nrouter.get("/:id", (req, res) => res.json({ id: req.params.id }));\napp.use("/lugares", router);', "const a = await req('GET', '/lugares/3');\nconst b = await req('GET', '/3');\nconsole.log(a.status, b.status);", ['200 404', '200 200', '404 200', '404 404']),
  }),
  R(17, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Ordem das rotas no Express',
    stem: h`${com('Diferente do React Router, o Express usa a **ordem de declaração**. O que responde §GET /lugares/novo§ aqui?', 'app.get("/lugares/:id", (req, res) => res.send("id=" + req.params.id));\napp.get("/lugares/novo", (req, res) => res.send("formulário"));')}`,
    opts: [h`§id=novo§ (a primeira rota que casa)`, [h`§formulário§`, h`No Express vence a *primeira* rota que casa, mesmo sendo mais genérica; a rota estática teria que vir antes.`], [h`As duas respostas`, h`Uma requisição recebe uma única resposta.`], [h`§404§`, h`Há uma rota que casa (a dinâmica).`]],
    exp: h`O Express testa os handlers na ordem de registro e responde com o primeiro que casa. Como §/lugares/:id§ aceita §novo§ como id, ela responde primeiro. Para o formulário funcionar, declare as rotas específicas (§/lugares/novo§) *antes* das dinâmicas.`,
    src: [[A9, 'rotas em src/rotas/lugares.js: /, /:id e /:id/avaliacoes']],
    verify: api('app.get("/lugares/:id", (req, res) => res.send("id=" + req.params.id));\napp.get("/lugares/novo", (req, res) => res.send("formulário"));', "const r = await req('GET', '/lugares/novo');\nconsole.log(r.texto);", ['id=novo', 'formulário', 'id=novoformulário', '']),
  }),
  R(18, {
    diff: 'medio', scope: 'aula', sub: 'Validação da avaliação',
    stem: h`${com('Para cada requisição abaixo (nota/comentário), quais status o servidor devolve, na ordem?\n\n1. nota 8, comentário “Muito bom” · 2. nota 4.5, comentário “Muito bom” · 3. nota 5, comentário “ab ” · 4. nota 5, comentário “ótimo”', 'app.use(express.json());\napp.post("/avaliacoes", (req, res) => {\n  const { nota, comentario } = req.body;\n  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {\n    return res.status(400).json({ erro: "nota inválida" });\n  }\n  if (typeof comentario !== "string" || comentario.trim().length < 3) {\n    return res.status(400).json({ erro: "comentário curto" });\n  }\n  res.status(201).json({ nota, comentario: comentario.trim() });\n});')}`,
    opts: [h`§400 400 400 201§`, [h`§400 201 400 201§`, h`§4.5§ não é inteiro (§Number.isInteger(4.5)§ é falso), logo é rejeitado.`], [h`§400 400 201 201§`, h`“ab ” tem 2 caracteres depois do §trim()§ (< 3), então é rejeitado.`], [h`§201 400 400 201§`, h`Nota 8 está fora do intervalo 1–5.`]],
    exp: h`1) 8 > 5 → 400. 2) 4.5 não é inteiro → 400. 3) “ab ” depois de §trim()§ tem 2 caracteres → 400. 4) nota 5 e comentário válido → 201. São as regras do enunciado da Aula 09: nota inteira de 1 a 5 e comentário com pelo menos 3 caracteres.`,
    src: [[A9, 'POST: nota (inteiro 1-5) e comentario (mín. 3 caracteres após trim)']],
    verify: api('app.use(express.json());\napp.post("/avaliacoes", (req, res) => {\n  const { nota, comentario } = req.body;\n  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {\n    return res.status(400).json({ erro: "nota inválida" });\n  }\n  if (typeof comentario !== "string" || comentario.trim().length < 3) {\n    return res.status(400).json({ erro: "comentário curto" });\n  }\n  res.status(201).json({ nota, comentario: comentario.trim() });\n});', "const r1 = await req('POST', '/avaliacoes', { nota: 8, comentario: 'Muito bom' });\nconst r2 = await req('POST', '/avaliacoes', { nota: 4.5, comentario: 'Muito bom' });\nconst r3 = await req('POST', '/avaliacoes', { nota: 5, comentario: 'ab ' });\nconst r4 = await req('POST', '/avaliacoes', { nota: 5, comentario: 'ótimo' });\nconsole.log([r1, r2, r3, r4].map((r) => r.status).join(' '));", ['400 400 400 201', '400 201 400 201', '400 400 201 201', '201 400 400 201']),
  }),

  // ---------------- DIFÍCEIS ----------------
  R(19, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'res.send e Content-Type',
    stem: h`${com('Quais §Content-Type§ (somente o tipo) as duas rotas devolvem?', 'app.get("/a", (req, res) => res.send("<p>oi</p>"));\napp.get("/b", (req, res) => res.send({ oi: 1 }));')}`,
    opts: [h`§text/html§ e §application/json§`, [h`§text/html§ nas duas`, h`Quando o argumento de §res.send§ é um objeto, o Express o envia como JSON, com o tipo adequado.`], [h`§text/plain§ e §application/json§`, h`Uma string passada a §res.send§ é enviada como §text/html§.`], [h`§application/json§ nas duas`, h`Uma string é enviada como HTML, não como JSON.`]],
    exp: h`§res.send§ escolhe o tipo pelo argumento: string → §text/html§; objeto/array → JSON (§application/json§); Buffer → §application/octet-stream§. Em APIs, prefira §res.json§ para deixar a intenção explícita.`,
    src: [[A9, 'GET /: res.json(...) — API que responde JSON']],
    verify: api('app.get("/a", (req, res) => res.send("<p>oi</p>"));\napp.get("/b", (req, res) => res.send({ oi: 1 }));', "const a = await req('GET', '/a');\nconst b = await req('GET', '/b');\nconsole.log(a.headers.get('content-type').split(';')[0], b.headers.get('content-type').split(';')[0]);", ['text/html application/json', 'text/html text/html', 'text/plain application/json', 'application/json application/json']),
  }),
  R(20, {
    diff: 'dificil', scope: 'aprofundamento', sub: '204 sem corpo',
    stem: h`${com('O handler responde 204 e tenta enviar um JSON. O que o cliente recebe?', 'app.delete("/x", (req, res) => {\n  res.status(204).json({ removido: true });\n});')}`,
    opts: [h`Status §204§ com o corpo vazio`, [h`Status §204§ com §{"removido":true}§`, h`Respostas 204 não têm corpo: o servidor descarta o conteúdo.`], [h`Status §200§ com §{"removido":true}§`, h`O status definido foi 204 e é mantido.`], [h`Erro §500§`, h`Não há erro; o Express apenas omite o corpo em respostas 204.`]],
    exp: h`O código §204 No Content§ significa “deu certo, sem corpo” — comum em §DELETE§. Mesmo usando §res.json§, o Node omite o corpo nas respostas 204 (e 304). Se quiser devolver dados, use 200.`,
    src: [[A9, 'códigos HTTP: 200, 201, 400, 404 nas rotas da API']],
    verify: api('app.delete("/x", (req, res) => {\n  res.status(204).json({ removido: true });\n});', "const r = await req('DELETE', '/x');\nconsole.log(r.status, '[' + r.texto + ']');", ['204 []', '204 [{"removido":true}]', '200 [{"removido":true}]', '500 []']),
  }),
  R(21, {
    diff: 'dificil', scope: 'desafio', sub: 'HEAD usa a rota GET',
    stem: h`${com('Um cliente envia §HEAD /lugares§. O que o servidor responde?', 'app.get("/lugares", (req, res) => {\n  res.json([{ id: 1 }, { id: 2 }]);\n});')}`,
    opts: [h`§200§ sem corpo`, [h`Status §404§`, h`O Express atende automaticamente §HEAD§ com as rotas §GET§ correspondentes.`], [h`Status §200§ com o JSON no corpo`, h`Em respostas a §HEAD§ o corpo nunca é enviado.`], [h`Status §405§`, h`O Express não responde 405 aqui; ele reaproveita o handler do §GET§.`]],
    exp: h`Por padrão, o Express trata requisições §HEAD§ usando o handler §GET§ da mesma rota, mas descarta o corpo (HEAD só pede os cabeçalhos). Útil para verificar se um recurso existe sem baixá-lo.`,
    src: [[A9, 'rotas GET da API']],
    verify: api('app.get("/lugares", (req, res) => {\n  res.json([{ id: 1 }, { id: 2 }]);\n});', "const r = await req('HEAD', '/lugares');\nconsole.log(r.status, r.texto.length, r.headers.get('content-type').split(';')[0]);", ['200 0 application/json', '404 0 null', '200 22 application/json', '405 0 null'].map((v, i) => (i === 1 ? '404 0 text/html' : i === 3 ? '405 0 text/html' : v))),
  }),
  R(22, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'CORS no Express',
    stem: h`${com('Um navegador envia a pré-checagem §OPTIONS /lugares§ (com os cabeçalhos §Origin§ e §Access-Control-Request-Method: GET§). Que status e §Access-Control-Allow-Origin§ o servidor devolve?', 'app.use(cors());\napp.get("/lugares", (req, res) => res.json([]));')}`,
    opts: [h`§204§ e §*§`, [h`§404§ e nenhum cabeçalho`, h`O middleware §cors()§ responde automaticamente às pré-checagens §OPTIONS§.`], [h`§200§ e §null§`, h`O §cors()§ padrão responde 204 e inclui o cabeçalho com §*§.`], [h`§204§ e nenhum cabeçalho`, h`A resposta traz §Access-Control-Allow-Origin: *§.`]],
    exp: h`O pacote §cors§, usado em §app.js§ do starter, responde às requisições de pré-checagem (§OPTIONS§) com §204§ e inclui §Access-Control-Allow-Origin: *§ (padrão: qualquer origem). Sem ele, o front (porta 5173) não conseguiria chamar a API (porta 3333) pelo navegador.`,
    src: [[A9, 'app.js configura CORS e express.json()'], [A9, 'package.json: cors ^2.8.6']],
    verify: api('app.use(cors());\napp.get("/lugares", (req, res) => res.json([]));', "const r = await fetch(url + '/lugares', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'GET' } });\nconsole.log(r.status, r.headers.get('access-control-allow-origin'));", ['204 *', '404 null', '200 null', '204 null']),
  }),
  R(23, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'next(err) pula middlewares comuns',
    stem: h`${com('Em um §GET /x§, que mensagens são impressas e qual status o cliente recebe?', 'app.use((req, res, next) => {\n  console.log("1");\n  next(new Error("falhou"));\n});\napp.use((req, res, next) => {\n  console.log("2");\n  next();\n});\napp.use((err, req, res, next) => {\n  console.log("3", err.message);\n  res.status(500).json({ erro: err.message });\n});')}`,
    opts: [h`§1§ e §3 falhou§, com status §500§`, [h`§1§, §2§ e §3 falhou§`, h`Quando se chama §next(erro)§, o Express pula os middlewares comuns e vai direto ao próximo de *erro*.`], [h`Só §1§, com status §200§`, h`O erro é encaminhado ao middleware de erro, que responde 500.`], [h`§1§ e §2§, com status §500§ padrão`, h`O middleware 2 é ignorado e o de erro (com 4 parâmetros) é quem responde.`]],
    exp: h`Chamar §next(erro)§ com um argumento muda o fluxo: os middlewares e rotas comuns restantes são ignorados, e o Express procura o próximo middleware de erro (quatro parâmetros). Daí o tratador central de erros da Aula 12 ficar sempre *depois* das rotas.`,
    src: [[A9, 'middlewares: app.use e o fluxo de next()']],
    verify: api('app.use((req, res, next) => {\n  console.log("1");\n  next(new Error("falhou"));\n});\napp.use((req, res, next) => {\n  console.log("2");\n  next();\n});\napp.use((err, req, res, next) => {\n  console.log("3", err.message);\n  res.status(500).json({ erro: err.message });\n});', "const r = await req('GET', '/x');\nconsole.log('status', r.status);", ['1\n3 falhou\nstatus 500', '1\n2\n3 falhou\nstatus 500', '1\nstatus 200', '1\n2\nstatus 500']),
  }),
  R(24, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'express.json depois das rotas',
    stem: h`${com('O §express.json()§ foi registrado **depois** da rota. O que a rota imprime para um §POST /x§ com JSON §{"nota":5}§?', 'app.post("/x", (req, res) => {\n  console.log(req.body);\n  res.end();\n});\napp.use(express.json());')}`,
    opts: [h`§undefined§`, [h`§{ nota: 5 }§`, h`Os middlewares executam na ordem de registro; o parser vem depois da rota e não chega a ser usado.`], [h`§{}§`, h`No Express 5, sem parse o valor é §undefined§ (no Express 4 era um objeto vazio).`], [h`Erro de sintaxe`, h`O código é válido; a falha está na ordem.`]],
    exp: h`A rota é encontrada primeiro e responde sem passar pelo §express.json()§ registrado depois. Regra: registre §app.use(cors())§ e §app.use(express.json())§ *antes* das rotas — como o §app.js§ do starter faz.`,
    src: [[A9, 'src/app.js: cors() e express.json() antes das rotas']],
    verify: api('app.post("/x", (req, res) => {\n  console.log(req.body);\n  res.end();\n});\napp.use(express.json());', "await req('POST', '/x', { nota: 5 });", ['undefined', '{"nota":5}', '{}', 'SyntaxError']),
  }),
  R(25, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Pega-tudo registrado cedo demais',
    stem: h`${com('O middleware de 404 foi registrado **antes** das rotas. Qual é a resposta para §GET /lugares§?', 'app.use((req, res) => {\n  res.status(404).json({ erro: "Rota não encontrada." });\n});\napp.get("/lugares", (req, res) => res.json([]));')}`,
    opts: [h`§404§ com o JSON de erro`, [h`§200§ com §[]§`, h`O middleware sem caminho captura tudo e responde sem chamar §next()§, impedindo que a rota seja alcançada.`], [h`§500§`, h`Não há erro; a requisição é simplesmente atendida pelo primeiro handler.`], [h`A resposta das duas, concatenadas`, h`Só um handler responde.`]],
    exp: h`Um §app.use(handler)§ sem caminho corresponde a *todas* as requisições. Registrado no início, ele responde 404 antes de as rotas serem consultadas. Por isso o 404 “pega-tudo” fica sempre por último em §criarApp()§.`,
    src: [[A9, 'app.js devolve 404 para qualquer rota desconhecida (por último)']],
    verify: api('app.use((req, res) => {\n  res.status(404).json({ erro: "Rota não encontrada." });\n});\napp.get("/lugares", (req, res) => res.json([]));', "const r = await req('GET', '/lugares');\nconsole.log(r.status, r.texto);", ['404 {"erro":"Rota não encontrada."}', '200 []', '500 ', '200 [][]']),
  }),
  R(26, {
    diff: 'dificil', scope: 'desafio', sub: 'Cabeçalho Location em 201',
    stem: h`${com('Qual valor tem o cabeçalho §Location§ na resposta deste §POST§?', 'app.post("/lugares/:id/avaliacoes", (req, res) => {\n  res.status(201).location("/avaliacoes/9").json({ id: 9 });\n});')}`,
    opts: [h`§/avaliacoes/9§`, [h`Não há cabeçalho §Location§`, h`O método §.location()§ define o cabeçalho §Location§ da resposta.`], [h`§/lugares/:id/avaliacoes§`, h`O valor é exatamente o passado a §.location()§.`], [h`§/§`, h`O §Location§ foi definido explicitamente como §/avaliacoes/9§.`]],
    exp: h`Boa prática REST: ao responder §201 Created§, indicar no cabeçalho §Location§ a URL do novo recurso. No Express: §res.status(201).location("/avaliacoes/9").json(...)§. O cliente pode usar esse caminho para consultar o item criado.`,
    src: [[A9, 'POST responde 201 com a avaliação criada']],
    verify: api('app.post("/lugares/:id/avaliacoes", (req, res) => {\n  res.status(201).location("/avaliacoes/9").json({ id: 9 });\n});', "const r = await req('POST', '/lugares/2/avaliacoes', {});\nconsole.log(r.headers.get('location'));", ['/avaliacoes/9', 'null', '/lugares/:id/avaliacoes', '/']),
  }),
  R(27, {
    diff: 'dificil', scope: 'desafio', sub: 'Formulário versus JSON',
    stem: h`${com('Um cliente envia §nota=5§ como formulário (§application/x-www-form-urlencoded§). Nas duas rotas o que é impresso?', 'app.post("/a", express.json(), (req, res) => {\n  console.log("a", req.body);\n  res.end();\n});\napp.post("/b", express.urlencoded({ extended: true }), (req, res) => {\n  console.log("b", req.body);\n  res.end();\n});')}`,
    opts: [h`§a undefined§ e §b {"nota":"5"}§`, [h`§a {"nota":5}§ e §b {"nota":5}§`, h`O §express.json()§ só interpreta corpos JSON; e os campos de formulário chegam sempre como *texto* (“5”).`], [h`§a {"nota":"5"}§ e §b undefined§`, h`Está invertido: o formulário é lido por §urlencoded§, não por §json§.`], [h`§a undefined§ e §b undefined§`, h`O §express.urlencoded()§ interpreta corpos de formulário.`]],
    exp: h`Cada parser lida com um §Content-Type§: §express.json()§ → JSON; §express.urlencoded()§ → formulários clássicos (§nota=5§). No JSON os tipos são preservados (número 5); em formulários tudo vira texto (§"5"§), por isso a validação deve converter com §Number(...)§. Com o parser errado, §req.body§ fica §undefined§.`,
    src: [[A9, 'req.body já vem pronto graças ao express.json()']],
    verify: api('app.post("/a", express.json(), (req, res) => {\n  console.log("a", req.body);\n  res.end();\n});\napp.post("/b", express.urlencoded({ extended: true }), (req, res) => {\n  console.log("b", req.body);\n  res.end();\n});', "await req('POST', '/a', 'nota=5', 'application/x-www-form-urlencoded');\nawait req('POST', '/b', 'nota=5', 'application/x-www-form-urlencoded');", ['a undefined\nb {"nota":"5"}', 'a {"nota":5}\nb {"nota":5}', 'a {"nota":"5"}\nb undefined', 'a undefined\nb undefined']),
  }),
];
