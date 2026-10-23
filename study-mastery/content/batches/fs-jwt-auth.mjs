// Lote fs-jwt-auth — Autenticação: JWT e bcrypt: 8 fáceis (001–008), 8 médias (009–016), 9 difíceis (017–025).
// Base: Aula 11 (README e starter: bcryptjs, jsonwebtoken, exigirAutenticacao, /auth/registro e /auth/login, 401/409).
// Verificação REAL: bcryptjs e jsonwebtoken (mesmas versões do curso) rodam no sandbox; rotas Express com o middleware
// do enunciado são chamadas por fetch e as respostas reais são comparadas às alternativas.
import { m } from '../../tools/lib/dsl.ts';

const A11 = 'fs-aula-11';
const R = (n, o) => ({ d: 'fullstack', topic: 'jwt-auth', ...o, id: `fs-jwt-auth-${String(n).padStart(3, '0')}` });
const h = (strings, ...v) => m(strings, ...v).replaceAll('§', '`').replaceAll('\\n', '\n');
const code = (src) => '§§§js\n'.replaceAll('§', '`') + src.trim() + '\n§§§'.replaceAll('§', '`');
const lib = (corpo, values) => ({ kind: 'node', params: { code: `import bcrypt from 'bcryptjs';\nimport jwt from 'jsonwebtoken';\n${corpo}` }, values });
const api = (setup, reqs, values) => ({
  kind: 'node',
  params: {
    code: `import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste';
const app = express();
app.use(express.json());
${setup}
const srv = app.listen(0, '127.0.0.1');
await new Promise((r) => srv.once('listening', r));
const url = 'http://127.0.0.1:' + srv.address().port;
const req = async (metodo, caminho, corpo, cabecalhos = {}) => {
  const r = await fetch(url + caminho, { method: metodo, headers: { ...(corpo !== undefined ? { 'content-type': 'application/json' } : {}), ...cabecalhos }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
  return { status: r.status, texto: await r.text() };
};
${reqs}
srv.close();
process.exit(0);`,
  },
  values,
});

const MIDDLEWARE = `function exigirAutenticacao(req, res, next) {
  const cabecalho = req.headers.authorization;
  if (!cabecalho || !cabecalho.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Token de autenticação ausente." });
  }
  const token = cabecalho.slice("Bearer ".length);
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (erro) {
    res.status(401).json({ erro: "Token inválido ou expirado." });
  }
}`;

export default [
  // ---------------- FÁCEIS ----------------
  R(1, {
    diff: 'facil', scope: 'aula', sub: 'Hash com sal',
    stem: h`O que o código imprime (os dois hashes da mesma senha são iguais? e a comparação com a senha correta)?\n\n${code('const h1 = await bcrypt.hash("senha123", 10);\nconst h2 = await bcrypt.hash("senha123", 10);\nconsole.log(h1 === h2, await bcrypt.compare("senha123", h1));')}`,
    opts: [h`§false true§`, [h`§true true§`, h`O bcrypt inclui um *sal* aleatório em cada hash, então hashes da mesma senha são diferentes.`], [h`§false false§`, h`§bcrypt.compare§ extrai o sal do hash e confere a senha: resultado §true§.`], [h`§true false§`, h`Dois hashes da mesma senha não são iguais, e a senha correta confere.`]],
    exp: h`Cada §bcrypt.hash§ gera um sal aleatório embutido no hash, por isso dois hashes da mesma senha diferem (§h1 === h2§ é §false§). A verificação é feita com §bcrypt.compare(senha, hash)§, que lê o sal do próprio hash — resultado §true§. Por isso nunca se compara hashes com §===§.`,
    src: [[A11, 'Hash de senha (bcrypt): bcrypt.compare compara a senha digitada com o hash salvo']],
    verify: lib('const h1 = await bcrypt.hash("senha123", 10);\nconst h2 = await bcrypt.hash("senha123", 10);\nconsole.log(h1 === h2, await bcrypt.compare("senha123", h1));', ['false true', 'true true', 'false false', 'true false']),
  }),
  R(2, {
    diff: 'facil', scope: 'aula', sub: 'bcrypt.compare',
    stem: h`${'O que o código imprime?\n\n' + code('const hash = await bcrypt.hash("minhaSenha123", 10);\nconsole.log(await bcrypt.compare("minhasenha123", hash));')}`,
    opts: [h`§false§`, [h`§true§`, h`Senhas diferem em maiúsculas/minúsculas (“minhaSenha123” ≠ “minhasenha123”): o hash não confere.`], [h`§"minhaSenha123"§`, h`§compare§ devolve um booleano; nunca devolve a senha original (o hash não é reversível).`], [h`Um erro, pois os textos são diferentes`, h`Senha incorreta não gera erro: o resultado é simplesmente §false§.`]],
    exp: h`§bcrypt.compare§ gera o hash da senha informada com o mesmo sal e custo do hash salvo e compara. Qualquer diferença (aqui o “S” maiúsculo) resulta em §false§. No login, isso leva à resposta 401 “Email ou senha inválidos”.`,
    src: [[A11, '2. login: await bcrypt.compare(senha, usuario.senhaHash)']],
    verify: lib('const hash = await bcrypt.hash("minhaSenha123", 10);\nconsole.log(await bcrypt.compare("minhasenha123", hash));', ['false', 'true', 'minhaSenha123', 'erro']),
  }),
  R(3, {
    diff: 'facil', scope: 'aula', sub: 'Formato do hash',
    stem: h`Com o custo 10, como começa o hash gerado pelo §bcryptjs§ do curso (v3)?\n\n${code('const hash = await bcrypt.hash("senha123", 10);\nconsole.log(hash.slice(0, 7));')}`,
    opts: [h`§$2b$10$§`, [h`§senha12§`, h`O hash nunca contém a senha: é uma sequência derivada de forma irreversível.`], [h`§$2b$12$§`, h`O segundo número é o *custo* passado em §bcrypt.hash(senha, 10)§ (aqui 10).`], [h`§$10$2b§`, h`O formato é §$versão$custo$§ + sal e hash: §$2b$10$§.`]],
    exp: h`O hash bcrypt tem o formato §$2b$<custo>$<sal+hash>§, com 60 caracteres: §2b§ é a versão do algoritmo e §10§ o custo informado (“10 é o custo do hash” na aula). Aumentar o custo deixa o cálculo mais lento, dificultando ataques de força bruta.`,
    src: [[A11, '2. registro: await bcrypt.hash(senha, 10) (10 é o "custo" do hash)']],
    verify: lib('const hash = await bcrypt.hash("senha123", 10);\nconsole.log(hash.slice(0, 7));', ['$2b$10$', 'senha12', '$2b$12$', '$10$2b']),
  }),
  R(4, {
    diff: 'facil', scope: 'aula', sub: 'Estrutura do JWT',
    stem: h`Em quantas partes separadas por ponto (§.§) é dividido um token JWT?\n\n${code('const token = jwt.sign({ id: 1 }, "segredo");\nconsole.log(token.split(".").length);')}`,
    opts: [h`§3§ — cabeçalho, payload e assinatura`, [h`§2§`, h`Além do cabeçalho e do payload, existe a assinatura, que permite verificar a integridade.`], [h`§1§`, h`O JWT tem três partes concatenadas por pontos.`], [h`§4§`, h`São exatamente três partes.`]],
    exp: h`Um JWT é §cabecalho.payload.assinatura§, cada parte em Base64URL. O servidor assina o conjunto com o segredo (§JWT_SECRET§); ao receber o token, recalcula a assinatura com §jwt.verify§ para saber se ele é legítimo.`,
    src: [[A11, 'JWT (JSON Web Token): o servidor assina um token com uma chave secreta (JWT_SECRET)']],
    verify: lib('const token = jwt.sign({ id: 1 }, "segredo");\nconsole.log(token.split(".").length);', ['3', '2', '1', '4']),
  }),
  R(5, {
    diff: 'facil', scope: 'aula', sub: 'O payload é legível',
    stem: h`Alguém captura o token abaixo, **sem conhecer o segredo**. O que o código mostra?\n\n${code('const token = jwt.sign({ id: 1, nome: "Marina" }, "segredo");\nconst payload = token.split(".")[1];\nconsole.log(JSON.parse(Buffer.from(payload, "base64url")).nome);')}`,
    opts: [h`§Marina§`, [h`Nada: o payload é criptografado`, h`O JWT assinado não é criptografado: o payload é só Base64URL. A assinatura garante integridade, não sigilo.`], [h`Um erro por falta do segredo`, h`Ler o payload não exige o segredo (só verificar a assinatura exige).`], [h`§undefined§`, h`A propriedade §nome§ está no payload e é recuperada.`]],
    exp: h`O payload de um JWT assinado (JWS) é apenas codificado em Base64URL: qualquer pessoa pode lê-lo. Por isso **nunca** se coloca segredos (senha, hash) no token; a assinatura só impede alterações. A aula coloca apenas §id§, §nome§ e §email§.`,
    src: [[A11, 'o servidor assina um token contendo os dados do usuário (id, nome, email)']],
    verify: lib('const token = jwt.sign({ id: 1, nome: "Marina" }, "segredo");\nconst payload = token.split(".")[1];\nconsole.log(JSON.parse(Buffer.from(payload, "base64url")).nome);', ['Marina', '', 'erro', 'undefined']),
  }),
  R(6, {
    diff: 'facil', scope: 'aula', sub: 'verify com segredo errado',
    stem: h`Um token é assinado com um segredo e verificado com outro. Qual é o nome do erro?\n\n${code('const token = jwt.sign({ id: 1 }, "segredo-a");\ntry {\n  jwt.verify(token, "segredo-b");\n} catch (e) {\n  console.log(e.name);\n}')}`,
    opts: [h`§JsonWebTokenError§`, [h`§TokenExpiredError§`, h`Esse erro ocorre quando o token expirou, não quando a assinatura é inválida.`], [h`§SyntaxError§`, h`O token está bem formado; o que falha é a assinatura.`], [h`Nenhum: a verificação passa`, h`Com segredo diferente a assinatura recalculada não bate, e o §verify§ lança erro.`]],
    exp: h`§jwt.verify§ recalcula a assinatura com o segredo informado; se não bater, lança §JsonWebTokenError§ (“invalid signature”). Por isso o middleware usa §try/catch§: “se o token for inválido ou expirado, isso LANÇA uma exceção”.`,
    src: [[A11, '3. try/catch: jwt.verify(token, process.env.JWT_SECRET) lança exceção se o token for inválido ou expirado']],
    verify: lib('const token = jwt.sign({ id: 1 }, "segredo-a");\ntry {\n  jwt.verify(token, "segredo-b");\n  console.log("passou");\n} catch (e) {\n  console.log(e.name);\n}', ['JsonWebTokenError', 'TokenExpiredError', 'SyntaxError', 'passou']),
  }),
  R(7, {
    diff: 'facil', scope: 'aula', sub: '401 sem token',
    stem: h`Com o middleware da aula, qual é o status de uma requisição **sem** o cabeçalho §Authorization§?\n\n${code(MIDDLEWARE + '\napp.post("/avaliacoes", exigirAutenticacao, (req, res) => res.status(201).json({ ok: true }));')}`,
    opts: [h`§401§`, [h`§201§`, h`A rota está protegida: sem token o middleware corta a requisição antes do handler.`], [h`§403§`, h`A aula usa 401 (não autenticado) para token ausente ou inválido.`], [h`§400§`, h`400 é para dados inválidos; a falta de autenticação é 401.`]],
    exp: h`Sem o cabeçalho §Authorization: Bearer <token>§ o middleware responde §401§ (“Token de autenticação ausente.”) e não chama §next()§. Critério de aceite: “§POST /lugares/:id/avaliacoes§ sem token (ou com token inválido) responde 401”.`,
    src: [[A11, 'POST /lugares/:id/avaliacoes sem token (ou com token inválido) responde 401']],
    verify: api(MIDDLEWARE + '\napp.post("/avaliacoes", exigirAutenticacao, (req, res) => res.status(201).json({ ok: true }));', "const r = await req('POST', '/avaliacoes', {});\nconsole.log(r.status);", ['401', '201', '403', '400']),
  }),
  R(8, {
    diff: 'facil', scope: 'aula', sub: 'Extrair o token',
    stem: h`${'O que o código imprime?\n\n' + code('const cabecalho = "Bearer abc.def.ghi";\nconsole.log(cabecalho.slice("Bearer ".length));')}`,
    opts: [h`§abc.def.ghi§`, [h`§Bearer abc.def.ghi§`, h`O §slice§ descarta os primeiros caracteres (“Bearer ”, 7 caracteres) e devolve só o token.`], [h`§Bearer §`, h`§slice(7)§ devolve o que vem *depois* dos 7 primeiros caracteres.`], [h`§abc§`, h`Os pontos fazem parte do token; só o prefixo é removido.`]],
    exp: h`O formato é §Authorization: Bearer <token>§. §"Bearer ".length§ vale 7 (incluindo o espaço), então §slice(7)§ devolve o token completo. É o passo 2 do middleware da Aula 11.`,
    src: [[A11, '2. Extraia o token: cabecalho.slice("Bearer ".length)']],
    verify: lib('const cabecalho = "Bearer abc.def.ghi";\nconsole.log(cabecalho.slice("Bearer ".length));', ['abc.def.ghi', 'Bearer abc.def.ghi', 'Bearer ', 'abc']),
  }),

  // ---------------- MÉDIAS ----------------
  R(9, {
    diff: 'medio', scope: 'aula', sub: 'Token expirado',
    stem: h`O token foi assinado com §expiresIn: "1s"§. Depois de ~1,2 segundo, o que acontece na verificação?\n\n${code('const token = jwt.sign({ id: 1 }, "segredo", { expiresIn: "1s" });\nawait new Promise((r) => setTimeout(r, 1200));\ntry {\n  jwt.verify(token, "segredo");\n  console.log("válido");\n} catch (e) {\n  console.log(e.name);\n}')}`,
    opts: [h`§TokenExpiredError§`, [h`§válido§`, h`O claim §exp§ foi ultrapassado; o §verify§ recusa tokens vencidos.`], [h`§JsonWebTokenError§`, h`A assinatura continua correta; o problema é a expiração (erro específico §TokenExpiredError§).`], [h`§NotBeforeError§`, h`Esse erro se refere ao claim §nbf§ (token ainda não ativo).`]],
    exp: h`Com §expiresIn§ o token recebe o claim §exp§. Após esse instante, §jwt.verify§ lança §TokenExpiredError§ — o middleware responde 401 e o cliente precisa logar de novo. A aula usa §expiresIn: "2h"§ para limitar o risco de tokens vazados.`,
    src: [[A11, '3. login: jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "2h" })']],
    verify: lib('const token = jwt.sign({ id: 1 }, "segredo", { expiresIn: "1s" });\nawait new Promise((r) => setTimeout(r, 1200));\ntry {\n  jwt.verify(token, "segredo");\n  console.log("válido");\n} catch (e) {\n  console.log(e.name);\n}', ['TokenExpiredError', 'válido', 'JsonWebTokenError', 'NotBeforeError']),
  }),
  R(10, {
    diff: 'medio', scope: 'aprofundamento', sub: 'decode não verifica',
    stem: h`${'O que o código imprime (primeiro o resultado de §decode§, depois o de §verify§ com segredo errado)?\n\n' + code('const token = jwt.sign({ nome: "Marina" }, "segredo");\nconsole.log(jwt.decode(token).nome);\ntry {\n  jwt.verify(token, "outro");\n} catch (e) {\n  console.log(e.name);\n}')}`,
    opts: [h`§Marina§ e depois §JsonWebTokenError§`, [h`§JsonWebTokenError§ nas duas`, h`§jwt.decode§ só decodifica, sem checar assinatura; por isso devolve o payload mesmo sem o segredo.`], [h`§Marina§ nas duas`, h`O §verify§ com segredo errado lança erro.`], [h`Nada nas duas`, h`O §decode§ devolve o payload.`]],
    exp: h`§jwt.decode§ apenas lê o payload (não valida nada) — nunca use para decidir autenticação. §jwt.verify§ confere a assinatura (e expiração), e por isso falha com segredo errado. O middleware da aula usa §verify§.`,
    src: [[A11, 'jwt.verify confere a assinatura para saber se o token é legítimo']],
    verify: lib('const token = jwt.sign({ nome: "Marina" }, "segredo");\nconsole.log(jwt.decode(token).nome);\ntry {\n  jwt.verify(token, "outro");\n} catch (e) {\n  console.log(e.name);\n}', ['Marina\nJsonWebTokenError', 'JsonWebTokenError\nJsonWebTokenError', 'Marina\nMarina', '']),
  }),
  R(11, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Payload adulterado',
    stem: h`Um usuário troca o §id§ no payload do token (mantendo a assinatura original). O que o §verify§ faz?\n\n${code('const token = jwt.sign({ id: 1 }, "segredo");\nconst [cab, , assinatura] = token.split(".");\nconst falso = Buffer.from(JSON.stringify({ id: 99 })).toString("base64url");\ntry {\n  jwt.verify([cab, falso, assinatura].join("."), "segredo");\n  console.log("aceito");\n} catch (e) {\n  console.log(e.message);\n}')}`,
    opts: [h`§invalid signature§`, [h`§aceito§`, h`A assinatura é calculada sobre cabeçalho + payload; mudar o payload invalida a assinatura.`], [h`§jwt expired§`, h`O token não expirou; o problema é a integridade.`], [h`§jwt malformed§`, h`O token continua bem formado (três partes Base64URL); só a assinatura falha.`]],
    exp: h`A assinatura (HMAC com o segredo) cobre o cabeçalho e o payload. Como o atacante não conhece o segredo, não consegue recalcular a assinatura de um payload alterado: o §verify§ lança “invalid signature”. Esse é o motivo de o servidor poder confiar em §req.usuario.id§ vindo do token.`,
    src: [[A11, 'O servidor confere a assinatura (jwt.verify) para saber se o token é legítimo']],
    verify: lib('const token = jwt.sign({ id: 1 }, "segredo");\nconst [cab, , assinatura] = token.split(".");\nconst falso = Buffer.from(JSON.stringify({ id: 99 })).toString("base64url");\ntry {\n  jwt.verify([cab, falso, assinatura].join("."), "segredo");\n  console.log("aceito");\n} catch (e) {\n  console.log(e.message);\n}', ['invalid signature', 'aceito', 'jwt expired', 'jwt malformed']),
  }),
  R(12, {
    diff: 'medio', scope: 'desafio', sub: 'Algoritmo none',
    stem: h`Um atacante monta um token com o cabeçalho §{"alg":"none"}§ e **sem assinatura**, tentando passar pela verificação. O que o §jwt.verify(token, segredo)§ faz?\n\n${code('const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");\nconst falso = b64({ alg: "none", typ: "JWT" }) + "." + b64({ id: 1 }) + ".";\ntry {\n  jwt.verify(falso, "segredo");\n  console.log("aceito");\n} catch (e) {\n  console.log(e.message);\n}')}`,
    opts: [h`Rejeita: §jwt signature is required§`, [h`Aceita, pois não há assinatura para conferir`, h`Quando um segredo é informado, o §jsonwebtoken§ exige assinatura e recusa tokens “sem algoritmo”.`], [h`Aceita e devolve o payload §{ id: 1 }§`, h`Tokens não assinados não são aceitos quando se passa um segredo ao §verify§.`], [h`Rejeita: §jwt expired§`, h`O motivo da recusa é a ausência de assinatura, não a expiração.`]],
    exp: h`O ataque “alg: none” tenta fazer o servidor aceitar um token sem assinatura. O §jsonwebtoken§ moderno bloqueia: com um segredo fornecido, o token precisa estar assinado (“jwt signature is required”). Ainda assim, é boa prática fixar o algoritmo: §jwt.verify(token, segredo, { algorithms: ["HS256"] })§.`,
    src: [[A11, 'jwt.verify confere a assinatura para saber se o token é legítimo']],
    verify: lib('const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");\nconst falso = b64({ alg: "none", typ: "JWT" }) + "." + b64({ id: 1 }) + ".";\ntry {\n  jwt.verify(falso, "segredo");\n  console.log("aceito");\n} catch (e) {\n  console.log(e.message);\n}', ['jwt signature is required', 'aceito', '{"id":1}', 'jwt expired']),
  }),
  R(13, {
    diff: 'medio', scope: 'aula', sub: 'Mensagem genérica no login',
    stem: h`No login da aula, as duas falhas (e-mail inexistente e senha errada) devolvem a mesma resposta. O código abaixo compara as respostas das duas tentativas. O que imprime?\n\n${code('// usuário cadastrado: marina@example.com / senha123\nconst r1 = await req("POST", "/login", { email: "naoexiste@example.com", senha: "qualquer" });\nconst r2 = await req("POST", "/login", { email: "marina@example.com", senha: "errada" });\nconsole.log(r1.status, r2.status, r1.texto === r2.texto);')}`,
    opts: [h`§401 401 true§`, [h`§404 401 false§`, h`A aula usa a mesma resposta genérica para não revelar se o e-mail existe (evita enumeração de contas).`], [h`§401 401 false§`, h`As mensagens são idênticas (“Email ou senha inválidos.”), por isso a comparação dá §true§.`], [h`§400 401 true§`, h`Ambas as falhas devolvem 401.`]],
    exp: h`Se o servidor dissesse “e-mail não encontrado” ou “senha incorreta”, um atacante poderia descobrir quais e-mails têm conta. A aula manda usar a *mesma* mensagem e o mesmo status 401 nos dois casos: “mensagem genérica, sem dizer se foi o email ou a senha”.`,
    src: [[A11, 'POST /auth/login com senha errada responde 401 (mensagem genérica)']],
    verify: api("const usuarios = [{ id: 1, email: 'marina@example.com', senhaHash: bcrypt.hashSync('senha123', 10) }];\napp.post('/login', async (req, res) => {\n  const { email, senha } = req.body;\n  const invalidas = () => res.status(401).json({ erro: 'Email ou senha inválidos.' });\n  const usuario = usuarios.find((u) => u.email === email);\n  if (!usuario) return invalidas();\n  if (!(await bcrypt.compare(senha, usuario.senhaHash))) return invalidas();\n  res.json({ token: jwt.sign({ id: usuario.id }, process.env.JWT_SECRET) });\n});", "const r1 = await req('POST', '/login', { email: 'naoexiste@example.com', senha: 'qualquer' });\nconst r2 = await req('POST', '/login', { email: 'marina@example.com', senha: 'errada' });\nconsole.log(r1.status, r2.status, r1.texto === r2.texto);", ['401 401 true', '404 401 false', '401 401 false', '400 401 true']),
  }),
  R(14, {
    diff: 'medio', scope: 'aula', sub: 'E-mail duplicado',
    stem: h`O repositório lança um erro com §code = "ER_DUP_ENTRY"§ quando o e-mail já existe. Qual é o status da segunda tentativa de registro?\n\n${code('router.post("/registro", async (req, res) => {\n  const senhaHash = await bcrypt.hash(req.body.senha, 10);\n  try {\n    const usuario = await criarUsuario({ email: req.body.email, senhaHash });\n    res.status(201).json(usuario);\n  } catch (erro) {\n    if (erro.code === "ER_DUP_ENTRY") {\n      return res.status(409).json({ erro: "Email já cadastrado." });\n    }\n    throw erro;\n  }\n});')}`,
    opts: [h`§409§`, [h`§201§`, h`O banco recusa o e-mail repetido (restrição UNIQUE); o §catch§ converte o erro em 409.`], [h`§400§`, h`A aula usa 409 (conflito) para recurso já existente.`], [h`§500§`, h`O erro conhecido é tratado; só erros inesperados são relançados (500).`]],
    exp: h`409 Conflict indica que a requisição conflita com o estado atual (e-mail já cadastrado). O §catch§ trata só o erro esperado (§ER_DUP_ENTRY§) e relança os demais, para não esconder falhas inesperadas — como o enunciado da aula pede.`,
    src: [[A11, 'Registrar o mesmo email duas vezes responde 409']],
    verify: api("const emails = new Set();\nasync function criarUsuario({ email, senhaHash }) {\n  if (emails.has(email)) { const e = new Error('dup'); e.code = 'ER_DUP_ENTRY'; throw e; }\n  emails.add(email);\n  return { id: emails.size, email };\n}\napp.post('/registro', async (req, res) => {\n  const senhaHash = await bcrypt.hash(req.body.senha, 4);\n  try {\n    const usuario = await criarUsuario({ email: req.body.email, senhaHash });\n    res.status(201).json(usuario);\n  } catch (erro) {\n    if (erro.code === 'ER_DUP_ENTRY') {\n      return res.status(409).json({ erro: 'Email já cadastrado.' });\n    }\n    throw erro;\n  }\n});", "await req('POST', '/registro', { email: 'a@b.com', senha: 'senha123' });\nconst r = await req('POST', '/registro', { email: 'a@b.com', senha: 'senha123' });\nconsole.log(r.status);", ['409', '201', '400', '500']),
  }),
  R(15, {
    diff: 'medio', scope: 'aula', sub: 'Rota protegida',
    stem: h`Quais status voltam, na ordem, para: (1) sem token, (2) token assinado com **outro** segredo, (3) token válido?\n\n${code(MIDDLEWARE + '\napp.post("/avaliacoes", exigirAutenticacao, (req, res) => res.status(201).json({ usuarioId: req.usuario.id }));')}`,
    opts: [h`§401 401 201§`, [h`§401 403 201§`, h`O middleware da aula responde 401 também para token inválido (assinatura errada).`], [h`§201 401 201§`, h`Sem token a rota nem é executada: 401.`], [h`§401 401 401§`, h`Com um token válido a requisição passa e a rota responde 201.`]],
    exp: h`O middleware libera apenas tokens válidos: sem cabeçalho → 401; token com assinatura inválida → cai no §catch§ → 401; token válido → §next()§ e a rota usa §req.usuario.id§. Assim a avaliação é gravada com o §usuarioId§ de quem está logado.`,
    src: [[A11, 'Com um token válido, a avaliação é criada com o usuarioId de quem está logado']],
    verify: api(MIDDLEWARE + '\napp.post("/avaliacoes", exigirAutenticacao, (req, res) => res.status(201).json({ usuarioId: req.usuario.id }));', "const r1 = await req('POST', '/avaliacoes', {});\nconst falso = jwt.sign({ id: 7 }, 'outro-segredo');\nconst r2 = await req('POST', '/avaliacoes', {}, { Authorization: 'Bearer ' + falso });\nconst bom = jwt.sign({ id: 7 }, process.env.JWT_SECRET);\nconst r3 = await req('POST', '/avaliacoes', {}, { Authorization: 'Bearer ' + bom });\nconsole.log(r1.status, r2.status, r3.status);", ['401 401 201', '401 403 201', '201 401 201', '401 401 401']),
  }),
  R(16, {
    diff: 'medio', scope: 'aula', sub: 'Resposta do registro',
    stem: h`O registro deve criar a conta e **nunca** devolver a senha nem o hash. Quais chaves tem o JSON devolvido por esta rota?\n\n${code('router.post("/registro", async (req, res) => {\n  const senhaHash = await bcrypt.hash(req.body.senha, 10);\n  const usuario = { id: 1, nome: req.body.nome, email: req.body.email, senhaHash };\n  const { senhaHash: _, ...publico } = usuario;\n  res.status(201).json(publico);\n});')}`,
    opts: [h`§["id","nome","email"]§`, [h`§["id","nome","email","senhaHash"]§`, h`A desestruturação com o resto (§...publico§) remove o campo §senhaHash§ antes de responder.`], [h`§["senhaHash"]§`, h`O §publico§ contém tudo, menos o hash.`], [h`§[]§`, h`O objeto público mantém id, nome e e-mail.`]],
    exp: h`Na desestruturação §{ senhaHash: _, ...publico } = usuario§, o hash é extraído e descartado; §publico§ guarda os demais campos. Responder apenas dados públicos cumpre o critério: “§POST /auth/registro§ cria a conta e nunca retorna a senha (nem o hash)”.`,
    src: [[A11, 'POST /auth/registro nunca retorna a senha (nem o hash) na resposta']],
    verify: api("app.post('/registro', async (req, res) => {\n  const senhaHash = await bcrypt.hash(req.body.senha, 4);\n  const usuario = { id: 1, nome: req.body.nome, email: req.body.email, senhaHash };\n  const { senhaHash: _, ...publico } = usuario;\n  res.status(201).json(publico);\n});", "const r = await req('POST', '/registro', { nome: 'M', email: 'a@b.com', senha: 'senha123' });\nconsole.log(JSON.stringify(Object.keys(JSON.parse(r.texto))));", ['["id","nome","email"]', '["id","nome","email","senhaHash"]', '["senhaHash"]', '[]']),
  }),

  // ---------------- DIFÍCEIS ----------------
  R(17, {
    diff: 'dificil', scope: 'desafio', sub: 'Limite de 72 bytes do bcrypt',
    stem: h`O bcrypt considera apenas os primeiros 72 bytes da senha. O que o código imprime?\n\n${code('const base = "a".repeat(72);\nconst hash = await bcrypt.hash(base + "X", 10);\nconsole.log(await bcrypt.compare(base + "Y", hash));')}`,
    opts: [h`§true§ — o 73º caractere é ignorado`, [h`§false§ — as senhas são diferentes`, h`As senhas diferem apenas após o 72º byte, e o bcrypt ignora o excedente: a comparação dá §true§.`], [h`Um erro por senha muito longa`, h`O §bcryptjs§ não lança erro: apenas trunca a senha.`], [h`§undefined§`, h`§compare§ devolve um booleano.`]],
    exp: h`O algoritmo bcrypt usa só os 72 primeiros bytes da senha; o resto é descartado. Duas senhas que coincidem nesses 72 bytes geram o mesmo resultado. Em sistemas reais, limita-se o tamanho da senha (ou aplica-se um pré-hash) para evitar surpresas.`,
    src: [[A11, 'Hash de senha (bcrypt): comparar o hash da senha digitada com o hash salvo']],
    verify: lib('const base = "a".repeat(72);\nconst hash = await bcrypt.hash(base + "X", 10);\nconsole.log(await bcrypt.compare(base + "Y", hash));', ['true', 'false', 'erro', 'undefined']),
  }),
  R(18, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Cabeçalho do JWT',
    stem: h`Qual é o cabeçalho (primeira parte) de um token criado com §jwt.sign(payload, segredo)§ sem opções de algoritmo?\n\n${code('const token = jwt.sign({ id: 1 }, "segredo");\nconsole.log(Buffer.from(token.split(".")[0], "base64url").toString());')}`,
    opts: [h`§{"alg":"HS256","typ":"JWT"}§`, [h`§{"alg":"none","typ":"JWT"}§`, h`O §jsonwebtoken§ assina por padrão com HMAC-SHA256 (HS256); “none” significaria sem assinatura.`], [h`§{"alg":"RS256","typ":"JWT"}§`, h`RS256 usa par de chaves RSA; com um segredo simples o padrão é HS256.`], [h`§{"typ":"JWT"}§`, h`O cabeçalho informa também o algoritmo (§alg§).`]],
    exp: h`Com um segredo (string), o padrão do §jsonwebtoken§ é §HS256§ (HMAC com SHA-256), registrado no cabeçalho junto com §typ: "JWT"§. Por isso o §JWT_SECRET§ precisa ser longo e aleatório: é a chave simétrica que assina e verifica.`,
    src: [[A11, 'jwt.sign(payload, process.env.JWT_SECRET) com chave secreta']],
    verify: lib('const token = jwt.sign({ id: 1 }, "segredo");\nconsole.log(Buffer.from(token.split(".")[0], "base64url").toString());', ['{"alg":"HS256","typ":"JWT"}', '{"alg":"none","typ":"JWT"}', '{"alg":"RS256","typ":"JWT"}', '{"typ":"JWT"}']),
  }),
  R(19, {
    diff: 'dificil', scope: 'desafio', sub: 'Unidade do expiresIn',
    stem: h`Qual é a duração (§exp − iat§, em segundos) dos dois tokens?\n\n${code('const a = jwt.decode(jwt.sign({ id: 1 }, "s", { expiresIn: 120 }));\nconst b = jwt.decode(jwt.sign({ id: 1 }, "s", { expiresIn: "120" }));\nconsole.log(a.exp - a.iat, b.exp - b.iat);')}`,
    opts: [h`§120 0§`, [h`§120 120§`, h`Números são segundos, mas uma *string* sem unidade (“120”) é lida em milissegundos — ou seja, 120 ms, que arredonda para 0 s.`], [h`§7200 7200§`, h`Sem unidade explícita não há conversão para horas; “2h” seria 7200 s.`], [h`§0 120§`, h`Está invertido: o número é segundos; a string sem unidade é milissegundos.`]],
    exp: h`Em §expiresIn§: número → segundos (§120§ = 2 minutos); string → usa a biblioteca §ms§, e sem unidade o valor é em milissegundos (§"120"§ = 120 ms ≈ 0 s). Para evitar ambiguidade, escreva a unidade: §"2h"§, §"15m"§, §"7d"§ — como no login da aula (§"2h"§).`,
    src: [[A11, 'jwt.sign(..., { expiresIn: "2h" })']],
    verify: lib('const a = jwt.decode(jwt.sign({ id: 1 }, "s", { expiresIn: 120 }));\nconst b = jwt.decode(jwt.sign({ id: 1 }, "s", { expiresIn: "120" }));\nconsole.log(a.exp - a.iat, b.exp - b.iat);', ['120 0', '120 120', '7200 7200', '0 120']),
  }),
  R(20, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Duração de "2h"',
    stem: h`Quantos segundos separam §iat§ (emitido em) e §exp§ (expira em) para um token com §expiresIn: "2h"§?\n\n${code('const d = jwt.decode(jwt.sign({ id: 1 }, "s", { expiresIn: "2h" }));\nconsole.log(d.exp - d.iat);')}`,
    opts: [h`§7200§`, [h`§120§`, h`Duas *horas* equivalem a 2 × 60 × 60 = 7200 segundos, não 120.`], [h`§2§`, h`Os claims §iat§ e §exp§ são timestamps em segundos; a diferença é 7200.`], [h`§7200000§`, h`7 200 000 seria a duração em milissegundos; no JWT esses campos são em segundos.`]],
    exp: h`Os claims §iat§ e §exp§ são “NumericDate”: segundos desde 1970-01-01. “2h” = 2 × 3600 = 7200 segundos. O cliente pode ler §exp§ (payload é público) para saber quando renovar o login.`,
    src: [[A11, '3. jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "2h" })']],
    verify: lib('const d = jwt.decode(jwt.sign({ id: 1 }, "s", { expiresIn: "2h" }));\nconsole.log(d.exp - d.iat);', ['7200', '120', '2', '7200000']),
  }),
  R(21, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Conteúdo do req.usuario',
    stem: h`Quais chaves tem o objeto devolvido por §jwt.verify§ (e guardado em §req.usuario§) para um token assinado com o payload §{ id, nome, email }§ e §expiresIn§?\n\n${code('const token = jwt.sign({ id: 1, nome: "Marina", email: "m@x.com" }, "s", { expiresIn: "2h" });\nconsole.log(Object.keys(jwt.verify(token, "s")));')}`,
    opts: [h`§["id","nome","email","iat","exp"]§`, [h`§["id","nome","email"]§`, h`Além do payload assinado, a biblioteca acrescenta §iat§ (emitido em) e §exp§ (expiração, por causa do §expiresIn§).`], [h`§["token"]§`, h`O §verify§ devolve o payload decodificado, não o token.`], [h`§["id","nome","email","senhaHash"]§`, h`O hash não está no payload (e não deve estar).`]],
    exp: h`O retorno de §jwt.verify§ é o payload assinado mais os claims registrados: §iat§ sempre, e §exp§ quando há §expiresIn§. Por isso em rotas protegidas §req.usuario§ pode trazer também esses campos.`,
    src: [[A11, '4. jwt.verify devolve o payload assinado no login (id, nome, email); guarde em req.usuario']],
    verify: lib('const token = jwt.sign({ id: 1, nome: "Marina", email: "m@x.com" }, "s", { expiresIn: "2h" });\nconsole.log(JSON.stringify(Object.keys(jwt.verify(token, "s"))));', ['["id","nome","email","iat","exp"]', '["id","nome","email"]', '["token"]', '["id","nome","email","senhaHash"]']),
  }),
  R(22, {
    diff: 'dificil', scope: 'aula', sub: 'JWT_SECRET ausente',
    stem: h`Se a variável §JWT_SECRET§ não foi definida no §.env§, o que acontece ao fazer login (assinar o token)?\n\n${code('try {\n  jwt.sign({ id: 1 }, process.env.JWT_SECRET);\n} catch (e) {\n  console.log(e.message);\n}')}`,
    opts: [h`Erro: §secretOrPrivateKey must have a value§`, [h`O token é assinado com uma chave vazia`, h`O §jsonwebtoken§ recusa assinar sem segredo.`], [h`O token é assinado com a string “undefined”`, h`Não há conversão silenciosa: a biblioteca lança erro.`], [h`Nenhum erro e nenhum token`, h`O erro é lançado e, na API, vira uma resposta 500.`]],
    exp: h`Sem segredo, §jwt.sign§ lança “secretOrPrivateKey must have a value”. Por isso o segredo vem de variável de ambiente (§JWT_SECRET§ no §.env§, nunca no código) e a aplicação deve falhar cedo, na inicialização, se ele não existir.`,
    src: [[A11, '.env.example: JWT_SECRET (nunca reaproveite este exemplo)']],
    verify: lib('try {\n  jwt.sign({ id: 1 }, process.env.JWT_SECRET);\n  console.log("assinou");\n} catch (e) {\n  console.log(e.message);\n}', ['secretOrPrivateKey must have a value', 'assinou', 'assinou com undefined', '']),
  }),
  R(23, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Hash inválido no banco',
    stem: h`No seed da Aula 10, a coluna §senha_hash§ contém o texto §defina-na-aula-11§ (não é um hash bcrypt). O que o §bcrypt.compare§ devolve ao testar uma senha contra esse valor?\n\n${code('console.log(await bcrypt.compare("senha123", "defina-na-aula-11"));')}`,
    opts: [h`§false§`, [h`§true§`, h`O texto não é um hash gerado pelo bcrypt, então nenhuma senha confere.`], [h`Um erro que derruba a API`, h`O §bcryptjs§ devolve §false§ para um hash malformado, sem lançar erro.`], [h`§undefined§`, h`O resultado é um booleano.`]],
    exp: h`Usuários criados antes da Aula 11 (seed de exemplo) não têm hash bcrypt válido; o §compare§ simplesmente retorna §false§, e o login responde 401. Para testar, crie contas novas pelo §/auth/registro§, que grava hashes reais.`,
    src: [[A11, 'senha_hash do seed da aula 10 ("defina-na-aula-11") ainda não é um hash real']],
    verify: lib('console.log(await bcrypt.compare("senha123", "defina-na-aula-11"));', ['false', 'true', 'erro', 'undefined']),
  }),
  R(24, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Nome do cabeçalho no Node',
    stem: h`O cliente envia §Authorization: Bearer abc§. Em um handler do Express, o que o código imprime?\n\n${code('app.get("/x", (req, res) => {\n  console.log(typeof req.headers.authorization, typeof req.headers.Authorization);\n  res.end();\n});')}`,
    opts: [h`§string undefined§`, [h`§string string§`, h`O Node coloca os nomes dos cabeçalhos em minúsculas em §req.headers§; a chave com “A” maiúsculo não existe.`], [h`§undefined string§`, h`Está invertido: a chave em minúsculas (§authorization§) é a que existe.`], [h`§undefined undefined§`, h`O cabeçalho foi enviado e está em §req.headers.authorization§.`]],
    exp: h`Nomes de cabeçalhos HTTP não diferenciam maiúsculas de minúsculas, e o Node os expõe em minúsculas: use §req.headers.authorization§ (ou §req.get("Authorization")§). Já o *valor* diferencia: §"bearer abc"§ não passa em §startsWith("Bearer ")§.`,
    src: [[A11, '1. exigirAutenticacao: pegue req.headers.authorization']],
    verify: api('app.get("/x", (req, res) => {\n  console.log(typeof req.headers.authorization, typeof req.headers.Authorization);\n  res.end();\n});', "await req('GET', '/x', undefined, { Authorization: 'Bearer abc' });", ['string undefined', 'string string', 'undefined string', 'undefined undefined']),
  }),
  R(25, {
    diff: 'dificil', scope: 'desafio', sub: 'Valor do esquema é sensível a maiúsculas',
    stem: h`O cliente envia §Authorization: bearer <token válido>§ (com “b” minúsculo). Com o middleware da aula, qual é o status?\n\n${code(MIDDLEWARE + '\napp.get("/privado", exigirAutenticacao, (req, res) => res.json({ ok: true }));')}`,
    opts: [h`§401§`, [h`§200§`, h`O middleware usa §startsWith("Bearer ")§, que diferencia maiúsculas de minúsculas.`], [h`§403§`, h`A aula usa 401 para falhas de autenticação.`], [h`§500§`, h`Não há exceção: o §if§ responde 401 antes do §verify§.`]],
    exp: h`A comparação §cabecalho.startsWith("Bearer ")§ é sensível a maiúsculas: “bearer ...” é rejeitado. (A especificação HTTP trata o esquema como insensível, então um middleware mais tolerante poderia usar uma regex com a flag §i§; o da aula é propositalmente simples.)`,
    src: [[A11, '1. exigirAutenticacao: se não começar com "Bearer ", responda 401']],
    verify: api(MIDDLEWARE + '\napp.get("/privado", exigirAutenticacao, (req, res) => res.json({ ok: true }));', "const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET);\nconst r = await req('GET', '/privado', undefined, { Authorization: 'bearer ' + token });\nconsole.log(r.status);", ['401', '200', '403', '500']),
  }),
];
