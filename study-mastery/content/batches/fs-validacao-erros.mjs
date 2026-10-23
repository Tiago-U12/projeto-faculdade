// Lote fs-validacao-erros — Validação e tratamento de erros na API: 6 fáceis (001–006), 6 médias (007–012), 6 difíceis (013–018).
// Base: Aula 12 (README: ErroApi, ErroValidacao, ErroNaoEncontrado, ErroNaoAutorizado, ErroConflito; error handler central; Express 5).
// Verificação REAL: o app Express 5 do enunciado (classes + rotas + error handler) é executado no sandbox e chamado por fetch.
import { m } from '../../tools/lib/dsl.ts';

const A12 = 'fs-aula-12';
const R = (n, o) => ({ d: 'fullstack', topic: 'validacao-erros', ...o, id: `fs-validacao-erros-${String(n).padStart(3, '0')}` });
const h = (strings, ...v) => m(strings, ...v).replaceAll('§', '`').replaceAll('\\n', '\n');
const code = (src) => '§§§js\n'.replaceAll('§', '`') + src.trim() + '\n§§§'.replaceAll('§', '`');

const ERROS = `class ErroApi extends Error {
  constructor(mensagem, statusCode) {
    super(mensagem);
    this.statusCode = statusCode;
  }
}
class ErroValidacao extends ErroApi {
  constructor(mensagem, campo) {
    super(mensagem, 400);
    this.campo = campo;
  }
}
class ErroNaoEncontrado extends ErroApi {
  constructor(mensagem = "Não encontrado.") { super(mensagem, 404); }
}
class ErroNaoAutorizado extends ErroApi {
  constructor(mensagem = "Não autenticado.") { super(mensagem, 401); }
}
class ErroConflito extends ErroApi {
  constructor(mensagem = "Conflito.") { super(mensagem, 409); }
}`;
const HANDLER = `app.use((erro, req, res, next) => {
  if (erro instanceof ErroApi) {
    const corpo = { erro: erro.message };
    if (erro.campo) corpo.campo = erro.campo;
    return res.status(erro.statusCode).json(corpo);
  }
  console.error(erro);
  res.status(500).json({ erro: "Erro interno do servidor." });
});`;
const api = (setup, reqs, values, semHandler = false) => ({
  kind: 'node',
  params: {
    code: `import express from 'express';
process.env.NODE_ENV = 'test';
console.error = () => {}; // o registro do servidor não faz parte da saída verificada
const app = express();
app.use(express.json());
${ERROS}
${setup}
${semHandler ? '' : HANDLER}
const srv = app.listen(0, '127.0.0.1');
await new Promise((r) => srv.once('listening', r));
const url = 'http://127.0.0.1:' + srv.address().port;
const req = async (metodo, caminho, corpo, tipo = 'application/json') => {
  const r = await fetch(url + caminho, { method: metodo, headers: corpo !== undefined ? { 'content-type': tipo } : {}, body: corpo === undefined ? undefined : typeof corpo === 'string' ? corpo : JSON.stringify(corpo) });
  return { status: r.status, texto: await r.text(), tipo: r.headers.get('content-type') || '' };
};
${reqs}
srv.close();
process.exit(0);`,
  },
  values,
});

export default [
  // ---------------- FÁCEIS ----------------
  R(1, {
    diff: 'facil', scope: 'aula', sub: 'ErroNaoEncontrado',
    stem: h`Com o error handler central da aula, qual é a resposta de §GET /lugares/999§?\n\n${code('app.get("/lugares/:id", (req, res) => {\n  throw new ErroNaoEncontrado("Lugar não encontrado.");\n});\n\n' + HANDLER)}`,
    opts: [h`§404§ com §{"erro":"Lugar não encontrado."}§`, [h`§500§ com uma página HTML de erro`, h`O handler reconhece o erro como §ErroApi§ e usa o §statusCode§ (404) em JSON.`], [h`§200§ com corpo vazio`, h`A rota lança uma exceção; o handler responde com o status do erro.`], [h`§400§ com §{"erro":"Lugar não encontrado."}§`, h`§ErroNaoEncontrado§ carrega o status 404, não 400.`]],
    exp: h`A rota apenas *lança* §new ErroNaoEncontrado(...)§. O Express encaminha a exceção ao middleware de erro, que (por ser §instanceof ErroApi§) responde com o §statusCode§ do próprio erro (404) e o JSON §{ erro: mensagem }§ — critério da aula: “§GET /lugares/999§ responde 404 com JSON, não uma página HTML”.`,
    src: [[A12, 'GET /lugares/999 responde 404 com JSON { erro: "..." } (não uma página HTML)']],
    verify: api('app.get("/lugares/:id", (req, res) => {\n  throw new ErroNaoEncontrado("Lugar não encontrado.");\n});', "const r = await req('GET', '/lugares/999');\nconsole.log(r.status, r.texto);", ['404 {"erro":"Lugar não encontrado."}', '500 <html>', '200 ', '400 {"erro":"Lugar não encontrado."}']),
  }),
  R(2, {
    diff: 'facil', scope: 'aula', sub: 'ErroValidacao com campo',
    stem: h`Qual é a resposta quando uma rota lança §new ErroValidacao("Nota deve ser inteira de 1 a 5.", "nota")§?\n\n${code(ERROS.split('class ErroNaoEncontrado')[0].trim() + '\n\n' + HANDLER)}`,
    opts: [h`§400§, com §erro§ e §campo§`, [h`§400§, só com §erro§`, h`Quando o erro tem §campo§, o handler o inclui no JSON (permite destacar o campo no formulário).`], [h`§500§ genérico`, h`§ErroValidacao§ é um §ErroApi§ com status 400.`], [h`§422§, com §erro§ e §campo§`, h`A aula usa 400 para erros de validação.`]],
    exp: h`§ErroValidacao§ estende §ErroApi§ com status 400 e guarda o §campo§. O handler monta §{ erro: mensagem }§ e acrescenta §campo§ quando existe — por isso o front consegue marcar o campo errado, como no critério “avaliação com nota fora de 1–5 responde 400 com §campo: "nota"§”.`,
    src: [[A12, 'Avaliação com nota fora de 1-5 responde 400 com campo: "nota"']],
    verify: api('app.post("/avaliacoes", (req, res) => {\n  throw new ErroValidacao("Nota deve ser inteira de 1 a 5.", "nota");\n});', "const r = await req('POST', '/avaliacoes', {});\nconsole.log(r.status, r.texto);", ['400 {"erro":"Nota deve ser inteira de 1 a 5.","campo":"nota"}', '400 {"erro":"Nota deve ser inteira de 1 a 5."}', '500 ', '422 {"erro":"Nota deve ser inteira de 1 a 5.","campo":"nota"}']),
  }),
  R(3, {
    diff: 'facil', scope: 'aula', sub: 'Erro inesperado vira 500 genérico',
    stem: h`A rota tem um bug (acessa propriedade de §undefined§). O que o cliente recebe, usando o handler central da aula?\n\n${code('app.get("/x", (req, res) => {\n  const lugar = undefined;\n  res.json(lugar.nome);\n});')}`,
    opts: [h`§500§ com mensagem genérica`, [h`§500§ com a mensagem do §TypeError§`, h`O handler só expõe a mensagem de erros *conhecidos* (§ErroApi§); erros inesperados recebem texto genérico.`], [h`§400§`, h`Um bug do servidor não é erro do cliente: o status é 500.`], [h`§404§`, h`A rota existe; o problema é uma exceção inesperada.`]],
    exp: h`Erros que não são §ErroApi§ são inesperados: o handler os registra no servidor (§console.error§) e responde 500 genérico, “sem vazar detalhes internos para quem chamou a API” (nomes de arquivos, queries, stack...). Isso reduz a superfície de ataque.`,
    src: [[A12, 'Nenhuma resposta de erro expõe stack trace ou detalhes internos do servidor']],
    verify: api('app.get("/x", (req, res) => {\n  const lugar = undefined;\n  res.json(lugar.nome);\n});', "const r = await req('GET', '/x');\nconsole.log(r.status, r.texto);", ['500 {"erro":"Erro interno do servidor."}', "500 {\"erro\":\"Cannot read properties of undefined (reading 'nome')\"}", '400 ', '404 ']),
  }),
  R(4, {
    diff: 'facil', scope: 'aula', sub: 'Hierarquia de erros',
    stem: h`${'O que o código imprime?\n\n' + code(ERROS + '\nconst e = new ErroConflito("E-mail já cadastrado.");\nconsole.log(e instanceof ErroApi, e instanceof ErroValidacao, e instanceof Error);')}`,
    opts: [h`§true false true§`, [h`§true true true§`, h`§ErroConflito§ e §ErroValidacao§ são classes irmãs (ambas estendem §ErroApi§); uma não é instância da outra.`], [h`§false false true§`, h`§ErroConflito§ estende §ErroApi§, então é uma instância dela.`], [h`§true false false§`, h`Toda subclasse de §Error§ também é instância de §Error§.`]],
    exp: h`A hierarquia é §Error§ → §ErroApi§ → (§ErroValidacao§, §ErroNaoEncontrado§, §ErroNaoAutorizado§, §ErroConflito§). Por isso o handler pode testar só §erro instanceof ErroApi§ para reconhecer todos os erros “conhecidos”.`,
    src: [[A12, 'ErroApi (base, com statusCode) e subclasses ErroValidacao, ErroNaoEncontrado, ErroNaoAutorizado, ErroConflito']],
    verify: { kind: 'js', params: { code: `${ERROS}\nconst e = new ErroConflito("E-mail já cadastrado.");\nconsole.log(e instanceof ErroApi, e instanceof ErroValidacao, e instanceof Error);` }, values: ['true false true', 'true true true', 'false false true', 'true false false'] },
  }),
  R(5, {
    diff: 'facil', scope: 'aula', sub: 'Status de cada erro',
    stem: h`${'Quais são os §statusCode§ de §ErroValidacao§, §ErroNaoEncontrado§, §ErroNaoAutorizado§ e §ErroConflito§, nesta ordem?\n\n' + code('console.log(\n  new ErroValidacao("x", "campo").statusCode,\n  new ErroNaoEncontrado().statusCode,\n  new ErroNaoAutorizado().statusCode,\n  new ErroConflito().statusCode\n);')}`,
    opts: [h`§400 404 401 409§`, [h`§400 404 403 409§`, h`§ErroNaoAutorizado§ usa 401 (não autenticado); 403 seria “autenticado mas sem permissão”.`], [h`§422 404 401 400§`, h`Validação usa 400 e conflito usa 409.`], [h`§400 400 401 409§`, h`Recurso inexistente é 404, não 400.`]],
    exp: h`400 Bad Request (validação), 404 Not Found (inexistente), 401 Unauthorized (não autenticado: token ausente/ inválido) e 409 Conflict (e-mail duplicado). Cada classe “sabe” o seu status, então a rota só precisa lançar o erro certo.`,
    src: [[A12, 'ErroApi base com statusCode: ErroValidacao (400), ErroNaoEncontrado (404), ErroNaoAutorizado (401), ErroConflito (409)']],
    verify: { kind: 'js', params: { code: `${ERROS}\nconsole.log(new ErroValidacao("x", "campo").statusCode, new ErroNaoEncontrado().statusCode, new ErroNaoAutorizado().statusCode, new ErroConflito().statusCode);` }, values: ['400 404 401 409', '400 404 403 409', '422 404 401 400', '400 400 401 409'] },
  }),
  R(6, {
    diff: 'facil', scope: 'aula', sub: 'Posição do error handler',
    stem: h`O error handler foi registrado **antes** das rotas. Qual é o tipo de conteúdo da resposta de erro da rota abaixo?\n\n${code('app.use((erro, req, res, next) => {\n  res.status(500).json({ erro: "tratado" });\n});\napp.get("/x", () => {\n  throw new Error("falhou");\n});')}`,
    opts: [h`§text/html§`, [h`§application/json§`, h`Erros só chegam a middlewares de erro registrados *depois* do ponto em que ocorreram; este foi registrado antes da rota.`], [h`Resposta vazia`, h`O Express sempre responde: se ninguém trata, usa o tratador padrão.`], [h`§text/plain§`, h`O tratador padrão do Express responde com uma página HTML.`]],
    exp: h`O Express percorre a cadeia na ordem: um erro lançado numa rota só é entregue a middlewares de erro que vêm *depois* dela. Registrado antes, o handler é ignorado e vale o tratador padrão (HTML). Por isso a aula diz: “precisa ser registrado depois de todas as rotas”.`,
    src: [[A12, 'Middleware de erro: precisa ser registrada depois de todas as rotas']],
    verify: api('app.use((erro, req, res, next) => {\n  res.status(500).json({ erro: "tratado" });\n});\napp.get("/x", () => {\n  throw new Error("falhou");\n});', "const r = await req('GET', '/x');\nconsole.log(r.tipo.split(';')[0]);", ['text/html', 'application/json', 'sem resposta', 'text/plain'], true),
  }),

  // ---------------- MÉDIAS ----------------
  R(7, {
    diff: 'medio', scope: 'aula', sub: 'throw versus next(erro)',
    stem: h`As duas rotas sinalizam o mesmo erro, de formas diferentes. Quais status voltam para §GET /a§ e §GET /b§?\n\n${code('app.get("/a", () => {\n  throw new ErroNaoEncontrado();\n});\napp.get("/b", (req, res, next) => {\n  next(new ErroNaoEncontrado());\n});')}`,
    opts: [h`§404 404§`, [h`§404 500§`, h`Chamar §next(erro)§ também encaminha o erro ao middleware de erro, com o mesmo resultado do §throw§.`], [h`§500 404§`, h`No Express, exceções lançadas em rotas síncronas são capturadas e viram erro para o handler.`], [h`§500 500§`, h`Ambos chegam ao handler central, que usa o §statusCode§ do erro.`]],
    exp: h`Em rotas síncronas (e, no Express 5, também nas assíncronas) §throw§ e §next(erro)§ levam ao mesmo caminho: o middleware de erro. A aula padroniza o §throw new ErroX(...)§, que deixa o código mais limpo.`,
    src: [[A12, 'Rotas agora fazem throw new ErroX(...) em vez de res.status(...).json(...)']],
    verify: api('app.get("/a", () => {\n  throw new ErroNaoEncontrado();\n});\napp.get("/b", (req, res, next) => {\n  next(new ErroNaoEncontrado());\n});', "const a = await req('GET', '/a');\nconst b = await req('GET', '/b');\nconsole.log(a.status, b.status);", ['404 404', '404 500', '500 404', '500 500']),
  }),
  R(8, {
    diff: 'medio', scope: 'aula', sub: 'Não vazar detalhes',
    stem: h`Uma rota lança um erro cuja mensagem contém um detalhe sensível. O corpo da resposta contém a palavra “senha”?\n\n${code('app.get("/x", () => {\n  throw new Error("falha ao conectar: senha do banco = abc123");\n});')}`,
    opts: [h`Não — o handler devolve apenas a mensagem genérica`, [h`Sim — a mensagem do erro é repassada ao cliente`, h`Só mensagens de §ErroApi§ vão ao cliente; um §Error§ comum recebe “Erro interno do servidor.”.`], [h`Sim, mas apenas no cabeçalho`, h`Nenhum cabeçalho carrega a mensagem do erro.`], [h`Depende do navegador`, h`A resposta é definida no servidor, igual para qualquer cliente.`]],
    exp: h`Mensagens de erros inesperados podem conter credenciais, caminhos, SQL etc. O handler registra o erro completo no servidor e devolve ao cliente apenas “Erro interno do servidor.”. Assim o critério “nenhuma resposta de erro expõe detalhes internos” é atendido.`,
    src: [[A12, 'Erro inesperado: console.error e 500 genérico sem vazar detalhes internos']],
    verify: api('app.get("/x", () => {\n  throw new Error("falha ao conectar: senha do banco = abc123");\n});', "const r = await req('GET', '/x');\nconsole.log(r.texto.includes('senha') ? 'sim' : 'nao');", ['nao', 'sim', 'sim, apenas no cabeçalho', 'depende']),
  }),
  R(9, {
    diff: 'medio', scope: 'aula', sub: 'Ordem das validações',
    stem: h`${'Para o corpo §{ nome: "A", email: "x", senha: "1" }§ (os três campos inválidos), qual §campo§ o erro devolve?\n\n' + code('function validarCredenciaisRegistro({ nome, email, senha }) {\n  if (typeof nome !== "string" || nome.trim().length < 2) throw new ErroValidacao("Nome deve ter pelo menos 2 caracteres.", "nome");\n  if (typeof email !== "string" || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) throw new ErroValidacao("Email inválido.", "email");\n  if (typeof senha !== "string" || senha.length < 6) throw new ErroValidacao("Senha deve ter pelo menos 6 caracteres.", "senha");\n}')}`,
    opts: [h`§nome§`, [h`§senha§`, h`O primeiro §throw§ encerra a função; as demais validações nem são executadas.`], [h`Os três: §nome,email,senha§`, h`Cada validador lança um erro e para; só o primeiro campo inválido é reportado por requisição.`], [h`§email§`, h`O nome é validado antes do e-mail e já está inválido.`]],
    exp: h`Os validadores *lançam* o primeiro erro encontrado, na ordem do código (nome → e-mail → senha). O cliente corrige um campo e, se necessário, recebe o próximo erro. (Para devolver todos de uma vez seria preciso acumular as mensagens antes de lançar.)`,
    src: [[A12, '2. validarCredenciaisRegistro: mesma regra da aula 05/11 (nome, email, senha), lançando ErroValidacao']],
    verify: api('function validarCredenciaisRegistro({ nome, email, senha }) {\n  if (typeof nome !== "string" || nome.trim().length < 2) throw new ErroValidacao("Nome deve ter pelo menos 2 caracteres.", "nome");\n  if (typeof email !== "string" || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) throw new ErroValidacao("Email inválido.", "email");\n  if (typeof senha !== "string" || senha.length < 6) throw new ErroValidacao("Senha deve ter pelo menos 6 caracteres.", "senha");\n}\napp.post("/registro", (req, res) => {\n  validarCredenciaisRegistro(req.body);\n  res.status(201).end();\n});', "const r = await req('POST', '/registro', { nome: 'A', email: 'x', senha: '1' });\nconsole.log(JSON.parse(r.texto).campo);", ['nome', 'senha', 'nome,email,senha', 'email']),
  }),
  R(10, {
    diff: 'medio', scope: 'aula', sub: 'Erro sem campo',
    stem: h`Quais chaves tem o JSON devolvido quando o erro é um §ErroNaoEncontrado§ (que não tem §campo§)?\n\n${code('app.get("/x", () => {\n  throw new ErroNaoEncontrado("Lugar não encontrado.");\n});')}`,
    opts: [h`Somente §["erro"]§`, [h`§["erro","campo"]§, com §campo§ vazio`, h`O handler só inclui §campo§ quando o erro tem esse atributo (§if (erro.campo)§).`], [h`§["mensagem","statusCode"]§`, h`O corpo usa a chave §erro§ (padrão da API desde a Aula 09).`], [h`§[]§`, h`O corpo traz pelo menos a mensagem em §erro§.`]],
    exp: h`O handler monta §{ erro: erro.message }§ e acrescenta §campo§ apenas quando o erro o possui (§ErroValidacao§). Para §ErroNaoEncontrado§ a resposta é só §{ "erro": "Lugar não encontrado." }§.`,
    src: [[A12, 'error handler: responda com o statusCode e a mensagem certos (incluindo campo, se existir)']],
    verify: api('app.get("/x", () => {\n  throw new ErroNaoEncontrado("Lugar não encontrado.");\n});', "const r = await req('GET', '/x');\nconsole.log(JSON.stringify(Object.keys(JSON.parse(r.texto))));", ['["erro"]', '["erro","campo"]', '["mensagem","statusCode"]', '[]']),
  }),
  R(11, {
    diff: 'medio', scope: 'aula', sub: '404 pelo mesmo caminho',
    stem: h`A API usa o mesmo mecanismo para rotas inexistentes. Qual é a resposta de §GET /nao-existe§?\n\n${code('app.get("/", (req, res) => res.json({ ok: true }));\n\napp.use((req, res, next) => {\n  next(new ErroNaoEncontrado("Rota não encontrada."));\n});')}`,
    opts: [h`§404§ com §{"erro":"Rota não encontrada."}§`, [h`§404§ em HTML (“Cannot GET /nao-existe”)`, h`O middleware final converte a requisição não tratada em §ErroNaoEncontrado§, e o handler central devolve JSON.`], [h`§500§ com §{"erro":"Erro interno do servidor."}§`, h`§ErroNaoEncontrado§ é um §ErroApi§ conhecido: usa seu próprio status (404).`], [h`§200§`, h`Nenhuma rota casa; o pega-tudo dispara o erro 404.`]],
    exp: h`Um middleware sem caminho no fim da cadeia só roda se nenhuma rota respondeu. Ele cria um §ErroNaoEncontrado§ e o passa ao handler central, mantendo o *mesmo formato JSON* para todos os erros da API.`,
    src: [[A12, 'tudo passa pelos validadores + erros tipados + error handler central']],
    verify: api('app.get("/", (req, res) => res.json({ ok: true }));\napp.use((req, res, next) => {\n  next(new ErroNaoEncontrado("Rota não encontrada."));\n});', "const r = await req('GET', '/nao-existe');\nconsole.log(r.status, r.texto);", ['404 {"erro":"Rota não encontrada."}', '404 <html>', '500 {"erro":"Erro interno do servidor."}', '200 ']),
  }),
  R(12, {
    diff: 'medio', scope: 'aula', sub: 'Erro assíncrono no Express 5',
    stem: h`A rota é assíncrona e lança um erro **depois** de um §await§, sem §try/catch§. Qual é a resposta?\n\n${code('app.post("/registro", async (req, res) => {\n  await Promise.resolve(); // ex.: consulta ao banco\n  throw new ErroConflito("Email já cadastrado.");\n});')}`,
    opts: [h`§409§ com §{"erro":"Email já cadastrado."}§`, [h`A requisição fica pendurada (Express 4)`, h`No Express 5 as Promises rejeitadas são encaminhadas automaticamente ao middleware de erro.`], [h`§500§ com a mensagem do conflito`, h`O handler identifica o §ErroConflito§ e usa o status 409.`], [h`O servidor encerra o processo`, h`O erro é capturado e tratado; o processo continua.`]],
    exp: h`O README destaca: “no Express 5, se uma Promise rejeitar ou uma exceção for lançada em rota §async§, o Express encaminha automaticamente para o middleware de erro — sem try/catch manual em cada rota”. Resultado: 409 com a mensagem do erro.`,
    src: [[A12, 'Express 5 e erros assíncronos: encaminha automaticamente para o middleware de erro']],
    verify: api('app.post("/registro", async (req, res) => {\n  await Promise.resolve();\n  throw new ErroConflito("Email já cadastrado.");\n});', "const r = await req('POST', '/registro', {});\nconsole.log(r.status, r.texto);", ['409 {"erro":"Email já cadastrado."}', 'pendurada', '500 {"erro":"Email já cadastrado."}', 'processo encerrou']),
  }),

  // ---------------- DIFÍCEIS ----------------
  R(13, {
    diff: 'dificil', scope: 'desafio', sub: 'Erros do body-parser',
    stem: h`O cliente envia JSON malformado ao app abaixo (com §express.json()§ e o handler central da aula). Qual é o status?\n\n${code('app.use(express.json());\napp.post("/x", (req, res) => res.status(201).json(req.body));\n// ... error handler central da aula (só trata ErroApi; o resto vira 500)')}`,
    opts: [h`§500§`, [h`§400§`, h`O parser lança um erro com status 400, mas como ele não é um §ErroApi§, o handler da aula o trata como inesperado (500).`], [h`§201§`, h`A rota nem é executada: o parser rejeita o corpo antes.`], [h`§422§`, h`Nenhum código 422 é produzido por esse caminho.`]],
    exp: h`O §express.json()§ lança um §SyntaxError§ com §status = 400§, mas esse erro não é instância de §ErroApi§. O handler da aula só reconhece os próprios erros e converte o resto em 500 genérico. Para tratar corretamente, adicione um ramo: §if (erro.type === "entity.parse.failed") ...§ ou respeite §erro.status§ de erros HTTP conhecidos.`,
    src: [[A12, 'error handler central: ErroApi → statusCode; qualquer outro erro → 500 genérico']],
    verify: api('app.post("/x", (req, res) => res.status(201).json(req.body));', "const r = await req('POST', '/x', '{\"a\": ');\nconsole.log(r.status);", ['500', '400', '201', '422']),
  }),
  R(14, {
    diff: 'dificil', scope: 'desafio', sub: 'Promise sem await',
    stem: h`Uma chamada assíncrona falha, mas não é aguardada. O que o cliente recebe e quantas rejeições não tratadas ocorrem?\n\n${code('app.get("/x", async (req, res) => {\n  Promise.reject(new Error("falhou")); // sem await nem return\n  res.json({ ok: true });\n});')}`,
    opts: [h`§200§ e 1 rejeição não tratada`, [h`§500§ e 0 rejeições`, h`O Express só encaminha ao handler erros *aguardados* (ou retornados) pelo handler; aqui a Promise ficou solta.`], [h`§200§ e 0 rejeições`, h`A rejeição acontece e, sem tratamento, vira “unhandled rejection” do processo.`], [h`§500§ e 1 rejeição`, h`A resposta já foi enviada com sucesso; o Express nunca viu o erro.`]],
    exp: h`No Express 5 as rejeições são capturadas quando o handler *retorna/aguarda* a Promise. Uma Promise “solta” escapa ao Express: o cliente recebe 200 e o Node registra uma rejeição não tratada (que pode derrubar o processo em versões atuais). Sempre use §await§ nas operações assíncronas.`,
    src: [[A12, 'Express 5 e erros assíncronos (encaminha para o middleware de erro)']],
    verify: { kind: 'node', params: { code: "import express from 'express';\nprocess.env.NODE_ENV = 'test';\nlet rejeicoes = 0;\nprocess.removeAllListeners('unhandledRejection');\nprocess.on('unhandledRejection', () => { rejeicoes++; });\nconst app = express();\napp.get('/x', async (req, res) => {\n  Promise.reject(new Error('falhou'));\n  res.json({ ok: true });\n});\napp.use((erro, req, res, next) => res.status(500).json({ erro: 'tratado' }));\nconst srv = app.listen(0, '127.0.0.1');\nawait new Promise((r) => srv.once('listening', r));\nconst r = await fetch('http://127.0.0.1:' + srv.address().port + '/x');\nawait new Promise((r) => setTimeout(r, 50));\nconsole.log(r.status, rejeicoes);\nsrv.close();\nprocess.exit(0);" }, values: ['200 1', '500 0', '200 0', '500 1'] },
  }),
  R(15, {
    diff: 'dificil', scope: 'desafio', sub: 'Aridade do middleware de erro',
    stem: h`O handler foi escrito com valor padrão no último parâmetro. Qual é o tipo de conteúdo da resposta de erro?\n\n${code('app.get("/x", () => {\n  throw new ErroNaoEncontrado();\n});\napp.use((erro, req, res, next = null) => {\n  res.status(erro.statusCode).json({ erro: erro.message });\n});')}`,
    opts: [h`§text/html§`, [h`§application/json§`, h`O Express identifica handlers de erro pelo §function.length§ (4); parâmetros com valor padrão não entram na contagem, então este handler tem “3” parâmetros.`], [h`Nenhum: o servidor trava`, h`Como o handler não é reconhecido, o tratador padrão responde.`], [h`§text/plain§`, h`O tratador padrão do Express usa HTML.`]],
    exp: h`O Express decide se um middleware é de erro olhando §fn.length§. Com §next = null§ o comprimento é 3 (parâmetros com padrão não contam), então o Express o trata como middleware comum e o *pula* quando há erro, caindo no tratador padrão (HTML). Mantenha exatamente quatro parâmetros simples: §(erro, req, res, next)§.`,
    src: [[A12, 'Middleware de erro: função com 4 parâmetros (erro, req, res, next)']],
    verify: api('app.get("/x", () => {\n  throw new ErroNaoEncontrado();\n});\napp.use((erro, req, res, next = null) => {\n  res.status(erro.statusCode).json({ erro: erro.message });\n});', "const r = await req('GET', '/x');\nconsole.log(r.tipo.split(';')[0]);", ['text/html', 'application/json', 'travou', 'text/plain'], true),
  }),
  R(16, {
    diff: 'dificil', scope: 'aula', sub: '401 versus 403',
    stem: h`Na hierarquia da aula, qual erro e status representam “o token é válido, mas o usuário **não tem permissão** para esta ação” (por exemplo, editar a avaliação de outra pessoa)?`,
    opts: [h`Um novo erro com status §403§`, [h`§ErroNaoAutorizado§ (401)`, h`401 significa “não autenticado” (token ausente/ inválido). Para “autenticado, mas sem permissão” o status adequado é 403.`], [h`§ErroConflito§ (409)`, h`409 indica conflito de estado (como e-mail duplicado), não falta de permissão.`], [h`§ErroNaoEncontrado§ (404)`, h`404 seria usado se o recurso não existisse (ou se quiséssemos esconder sua existência).`]],
    exp: h`401 = “quem é você?” (credenciais ausentes/ inválidas); 403 = “sei quem você é, mas você não pode”. A aula implementa §ErroNaoAutorizado§ (401); um §ErroProibido§ com 403 seria uma extensão natural da hierarquia §ErroApi§.`,
    src: [[A12, 'ErroNaoAutorizado (401) na hierarquia de erros tipados']],
    verify: { kind: 'source', claims: [h`README Aula 12: “ErroApi (base, com statusCode), ErroValidacao (400, com campo), ErroNaoEncontrado (404), ErroNaoAutorizado (401) e ErroConflito (409).”`] },
  }),
  R(17, {
    diff: 'dificil', scope: 'aula', sub: 'Handler que vaza mensagens',
    stem: h`Um handler “preguiçoso” devolve sempre a mensagem do erro. O que o cliente vê para a rota com bug?\n\n${code('app.get("/x", () => {\n  const lugar = undefined;\n  return lugar.nome;\n});\napp.use((erro, req, res, next) => {\n  res.status(erro.statusCode || 500).json({ erro: erro.message });\n});')}`,
    opts: [h`§500§ com a mensagem do §TypeError§`, [h`§500§ com §{"erro":"Erro interno do servidor."}§`, h`Este handler não distingue erros conhecidos de inesperados; repassa qualquer mensagem.`], [h`§404§`, h`Sem §statusCode§ cai no 500 padrão.`], [h`§200§ com corpo vazio`, h`A rota lança uma exceção e o handler responde com erro.`]],
    exp: h`Sem o teste §erro instanceof ErroApi§, qualquer mensagem interna vai para o cliente (aqui, “Cannot read properties of undefined (reading 'nome')”). O handler da aula separa: erros *conhecidos* → mensagem própria; *inesperados* → log no servidor + mensagem genérica.`,
    src: [[A12, 'se não é ErroApi, é inesperado: console.error e 500 genérico, sem vazar detalhes']],
    verify: api('app.get("/x", () => {\n  const lugar = undefined;\n  return lugar.nome;\n});\napp.use((erro, req, res, next) => {\n  res.status(erro.statusCode || 500).json({ erro: erro.message });\n});', "const r = await req('GET', '/x');\nconsole.log(r.status, r.texto);", ["500 {\"erro\":\"Cannot read properties of undefined (reading 'nome')\"}", '500 {"erro":"Erro interno do servidor."}', '404 ', '200 '], true),
  }),
  R(18, {
    diff: 'dificil', scope: 'desafio', sub: 'statusCode indefinido',
    stem: h`O handler usa diretamente §erro.statusCode§ para qualquer erro. Para um §Error§ comum (sem esse atributo), o que acontece?\n\n${code('app.get("/x", () => {\n  throw new Error("falhou");\n});\napp.use((erro, req, res, next) => {\n  res.status(erro.statusCode).json({ erro: erro.message });\n});')}`,
    opts: [h`Falha no handler: §500§ em HTML`, [h`Responde §200§ com a mensagem`, h`Um status indefinido é inválido: o Express lança um erro ao usá-lo.`], [h`Responde §404§`, h`Nada define 404 aqui.`], [h`Responde §500§ em JSON com a mensagem`, h`O handler quebra antes de montar o JSON, e o erro gerado cai no tratador padrão (HTML).`]],
    exp: h`Para erros que não são §ErroApi§, §erro.statusCode§ é §undefined§; chamar §res.status(undefined)§ lança uma exceção dentro do próprio handler, resultando no tratador padrão (500 em HTML). Daí a necessidade do teste §instanceof ErroApi§ e do ramo “inesperado → 500 genérico”.`,
    src: [[A12, 'se o erro é instância de ErroApi, use seu statusCode; senão, 500 genérico']],
    verify: api('app.get("/x", () => {\n  throw new Error("falhou");\n});\napp.use((erro, req, res, next) => {\n  res.status(erro.statusCode).json({ erro: erro.message });\n});', "const r = await req('GET', '/x');\nconsole.log(r.status, r.tipo.split(';')[0]);", ['500 text/html', '200 application/json', '404 application/json', '500 application/json'], true),
  }),
];
