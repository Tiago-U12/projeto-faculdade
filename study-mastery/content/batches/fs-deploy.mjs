// Lote fs-deploy — Deploy: Render, MySQL gerenciado e Netlify: 5 fáceis (001–005), 6 médias (006–011), 5 difíceis (012–016).
// Base: Aula 13 (README e starter: VITE_API_URL, .env.development/.env.production, netlify.toml, _redirects, render.yaml, process.env.PORT, CORS_ORIGIN).
// Verificação REAL (o que dá para executar localmente): Vite (loadEnv) com arquivos .env de exemplo, Express 5 servindo o front com e sem
// fallback de SPA, o pacote cors, o motor de .gitignore e CORS real no Chromium. Detalhes das plataformas (Render/Netlify) vêm do material da aula.
import { m } from '../../tools/lib/dsl.ts';

const A13 = 'fs-aula-13';
const R = (n, o) => ({ d: 'fullstack', topic: 'deploy', ...o, id: `fs-deploy-${String(n).padStart(3, '0')}` });
const h = (strings, ...v) => m(strings, ...v).replaceAll('§', '`').replaceAll('\\n', '\n');
const code = (src, lang = 'js') => ('§§§' + lang + '\n').replaceAll('§', '`') + src.trim() + '\n§§§'.replaceAll('§', '`');
const nodeCode = (codigo, extra = {}) => ({ kind: 'node', params: { code: codigo, ...extra } });

const ENV_PROD = 'VITE_API_URL=https://avaliacoes-api.onrender.com\nJWT_SECRET=nao-deveria-estar-aqui\n';
const ENV_DEV = 'VITE_API_URL=http://localhost:3333\n';
const vite = (corpo, files, values) => ({ ...nodeCode(`import { loadEnv } from 'vite';\n${corpo}`, { addons: true, files }), values });
// Servidor Express (porta efêmera) com a pasta dist/ criada a partir de `files`; `rotas` registra middlewares/rotas; `testes` usa pegar(caminho, opcoes)
const spa = (rotas, testes, values) => ({
  kind: 'node',
  params: {
    code: `import express from 'express';
import path from 'node:path';
process.env.NODE_ENV = 'test';
const dist = path.join(DIR, 'dist');
const app = express();
${rotas}
const srv = app.listen(0, '127.0.0.1');
await new Promise((r) => srv.once('listening', r));
const url = 'http://127.0.0.1:' + srv.address().port;
const pegar = async (caminho, opcoes) => { const r = await fetch(url + caminho, opcoes); return { status: r.status, texto: await r.text(), loc: r.headers.get('location') }; };
${testes}
srv.close();
process.exit(0);`,
    files: { 'dist/index.html': '<!doctype html><div id="root">APP</div>' },
  },
  values,
});

export default [
  // ---------------- FÁCEIS ----------------
  R(1, {
    diff: 'facil', scope: 'aula', sub: 'VITE_API_URL em produção',
    stem: h`O front tem estes dois arquivos de ambiente. Qual valor o Vite usa para §import.meta.env.VITE_API_URL§ no **build de produção** (§npm run build§)?\n\n${code('# .env.development\nVITE_API_URL=http://localhost:3333\n\n# .env.production\nVITE_API_URL=https://avaliacoes-api.onrender.com', 'ini')}`,
    opts: [h`§https://avaliacoes-api.onrender.com§`, [h`§http://localhost:3333§`, h`Esse é o valor de §.env.development§, usado por §npm run dev§; o build usa o modo *production*.`], [h`Nenhum: a variável fica indefinida`, h`O Vite carrega §.env.production§ automaticamente no build.`], [h`Os dois valores, em uma lista`, h`Em cada modo vale apenas o valor do arquivo daquele modo.`]],
    exp: h`O Vite escolhe os arquivos §.env§ pelo *modo*: §npm run dev§ → §development§ (§.env.development§) e §npm run build§ → §production§ (§.env.production§). Por isso a aula mantém dois arquivos e o mesmo código funciona em dev e em produção.`,
    src: [[A13, 'client/.env.development e .env.production (VITE_API_URL)']],
    verify: vite("console.log(loadEnv('production', DIR, 'VITE_').VITE_API_URL);", { '.env.development': ENV_DEV, '.env.production': ENV_PROD }, ['https://avaliacoes-api.onrender.com', 'http://localhost:3333', 'undefined', 'http://localhost:3333 e https://avaliacoes-api.onrender.com']),
  }),
  R(2, {
    diff: 'facil', scope: 'aula', sub: 'Prefixo VITE_',
    stem: h`O arquivo §.env.production§ do front contém as duas linhas abaixo. Quais variáveis o Vite expõe ao código do navegador?\n\n${code('VITE_API_URL=https://avaliacoes-api.onrender.com\nJWT_SECRET=nao-deveria-estar-aqui', 'ini')}`,
    opts: [h`Apenas §VITE_API_URL§`, [h`As duas`, h`Só variáveis com o prefixo §VITE_§ são expostas ao código do cliente; as demais ficam de fora.`], [h`Apenas §JWT_SECRET§`, h`O prefixo §VITE_§ é o que libera a exposição, não o contrário.`], [h`Nenhuma`, h`§VITE_API_URL§ é exposta.`]],
    exp: h`Para evitar vazamentos acidentais, o Vite só expõe ao front as variáveis que começam com §VITE_§. Mesmo assim, **tudo o que for exposto vai para o bundle público**: nunca coloque segredos em variáveis §VITE_*§. O §JWT_SECRET§ pertence ao servidor (Render).`,
    src: [[A13, 'VITE_API_URL: URL configurável por variável de ambiente; JWT_SECRET fica no servidor']],
    verify: vite("console.log(JSON.stringify(Object.keys(loadEnv('production', DIR, 'VITE_'))));", { '.env.production': ENV_PROD }, ['["VITE_API_URL"]', '["VITE_API_URL","JWT_SECRET"]', '["JWT_SECRET"]', '[]']),
  }),
  R(3, {
    diff: 'facil', scope: 'aula', sub: 'Porta do servidor',
    stem: h`Em §index.js§ do servidor: §const PORTA = process.env.PORT || process.env.PORTA || 3333;§. Que porta é usada em cada cenário? (1) o Render define §PORT=10000§; (2) localmente só existe §PORTA=4000§; (3) nenhuma das duas existe.`,
    opts: [h`§10000§, §4000§ e §3333§`, [h`§3333§ nos três`, h`O operador §||§ usa o primeiro valor definido: a variável do ambiente tem prioridade sobre o padrão.`], [h`§4000§, §10000§ e §3333§`, h`No cenário (1) vale §PORT§ (10000), que vem primeiro na expressão.`], [h`§10000§, §3333§ e §4000§`, h`No cenário (2) §PORT§ não existe, e então vale §PORTA§ (4000); o padrão §3333§ só no cenário (3).`]],
    exp: h`A expressão tenta §PORT§ (definida pelo Render), depois §PORTA§ (do §.env§ local) e por fim 3333. Assim o mesmo código funciona na nuvem, no ambiente do aluno e sem configuração nenhuma.`,
    src: [[A13, 'server/index.js: process.env.PORT (Render) com fallback para PORTA/3333']],
    verify: { kind: 'node', params: { code: "const porta = () => process.env.PORT || process.env.PORTA || 3333;\ndelete process.env.PORT; delete process.env.PORTA;\nprocess.env.PORT = '10000';\nconst a = porta();\ndelete process.env.PORT; process.env.PORTA = '4000';\nconst b = porta();\ndelete process.env.PORTA;\nconst c = porta();\nconsole.log(a + ', ' + b + ' e ' + c);" }, values: ['10000, 4000 e 3333', '3333, 3333 e 3333', '4000, 10000 e 3333', '10000, 3333 e 4000'] },
  }),
  R(4, {
    diff: 'facil', scope: 'aula', sub: 'F5 em uma rota do SPA',
    stem: h`O front (React com React Router) foi publicado em um servidor estático **sem** configuração especial: só existe o arquivo §index.html§. Que status o servidor devolve para §GET /lugares/1§ (o que acontece ao dar F5 nessa página)?\n\n${code('const app = express();\napp.use(express.static(dist)); // só serve arquivos que existem\n// GET /lugares/1 → não existe o arquivo lugares/1')}`,
    opts: [h`§404§ (não há arquivo nesse caminho)`, [h`§200§ com o §index.html§`, h`Isso só acontece com a configuração de fallback (_redirects / netlify.toml); o servidor estático sozinho procura um arquivo real.`], [h`§301§ para a página inicial`, h`Sem regra de redirecionamento, o servidor apenas informa que o arquivo não existe.`], [h`§500§`, h`Não há erro interno: o arquivo apenas não existe (404).`]],
    exp: h`Em um SPA, as rotas (§/lugares/1§) existem só no JavaScript do navegador. Ao recarregar, o navegador pede essa URL ao *servidor*, que procura um arquivo e não encontra: 404. Por isso a aula inclui §public/_redirects§ e §netlify.toml§, que mandam servir o §index.html§ em qualquer rota.`,
    src: [[A13, 'client/public/_redirects e netlify.toml: servir index.html em qualquer rota (F5 em /lugares/1)']],
    verify: spa('app.use(express.static(dist));', "const r = await pegar('/lugares/1');\nconsole.log(r.status);", ['404', '200', '301', '500']),
  }),
  R(5, {
    diff: 'facil', scope: 'aula', sub: 'Comandos de build e start no Render',
    stem: h`No Blueprint §render.yaml§ da API, quais são o comando de build e o de inicialização?\n\n${code('services:\n  - type: web\n    name: avaliacoes-api\n    env: node\n    buildCommand: ???\n    startCommand: ???', 'yaml')}`,
    opts: [h`Build: §npm install§ · Start: §npm start§`, [h`Build: §npm run build§ · Start: §npm run dev§`, h`A API Express não tem etapa de build; e §npm run dev§ (com §--watch§) é para desenvolvimento.`], [h`Build: §npm test§ · Start: §node index.js --dev§`, h`O Render instala as dependências no build e inicia com o script §start§.`], [h`Build: §vite build§ · Start: §vite preview§`, h`Isso é o front-end (Netlify), não a API do Render.`]],
    exp: h`O README orienta: “Build command: §npm install§ — Start command: §npm start§”. O §package.json§ do servidor define §"start": "node index.js"§ (sem §--watch§, que é só do §dev§).`,
    src: [[A13, '3. Deploy da API no Render: Build command npm install; Start command npm start']],
    verify: { kind: 'source', claims: [h`README Aula 13, seção 3: “Build command: npm install — Start command: npm start.”`, h`server/render.yaml: buildCommand: npm install; startCommand: npm start.`] },
  }),

  // ---------------- MÉDIAS ----------------
  R(6, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Rota coringa no Express 5',
    stem: h`Para servir o §index.html§ em qualquer rota no Express 5, qual padrão de rota é válido?\n\n${code('app.get(PADRAO, (req, res) => res.sendFile(path.join(dist, "index.html")));')}`,
    opts: [h`§"/{*splat}"§`, [h`§"*"§`, h`No Express 5 (path-to-regexp v8) o curinga precisa ser nomeado; §"*"§ sozinho lança erro ao registrar a rota.`], [h`§"/*"§`, h`Também inválido no Express 5: o asterisco exige um nome (como §*splat§).`], [h`§"(.*)"§`, h`Grupos de regex sem nome não são aceitos na sintaxe nova do Express 5.`]],
    exp: h`Na versão 5, os curingas precisam de nome: §"/*splat"§ ou, para casar também a raiz, §"/{*splat}"§. As formas do Express 4 (§"*"§, §"/*"§, §"(.*)"§) lançam erro. Atenção ao copiar exemplos antigos de tutoriais.`,
    src: [[A13, 'servir index.html para qualquer rota (SPA) — equivalente ao _redirects /* → /index.html']],
    verify: { kind: 'node', params: { code: "import express from 'express';\nconst valido = (p) => { try { express().get(p, () => {}); return true; } catch { return false; } };\nconsole.log(['/{*splat}', '*', '/*', '(.*)'].filter(valido).join(' '));" }, values: ['/{*splat}', '*', '/*', '(.*)'] },
  }),
  R(7, {
    diff: 'medio', scope: 'aula', sub: 'Fallback de SPA',
    stem: h`O servidor tem o fallback abaixo. Quais status voltam para §GET /lugares/1§ (rota do app) e para §GET /arquivo-inexistente.js§?\n\n${code('app.use(express.static(dist));\napp.get("/{*splat}", (req, res) => res.sendFile(path.join(dist, "index.html")));')}`,
    opts: [h`§200§ e §200§`, [h`§200§ e §404§`, h`O fallback responde a *qualquer* GET que não casou com um arquivo estático, inclusive a um arquivo inexistente.`], [h`§404§ e §404§`, h`O fallback faz justamente com que rotas do app sejam atendidas com o §index.html§.`], [h`§404§ e §200§`, h`Ambos os caminhos caem no fallback e recebem 200.`]],
    exp: h`O fallback devolve §index.html§ (200) para tudo que não é um arquivo estático existente — ótimo para rotas do React Router, mas arquivos ausentes (§.js§, imagens) também viram 200 com HTML, o que pode confundir. O 404 “de verdade” da aplicação é desenhado pelo React (rota coringa).`,
    src: [[A13, '7. Uma URL inventada (/qualquer-coisa) mostra a página 404 da aplicação (não uma página de erro do Netlify)']],
    verify: spa("app.use(express.static(dist));\napp.get('/{*splat}', (req, res) => res.sendFile(path.join(dist, 'index.html')));", "const a = await pegar('/lugares/1');\nconst b = await pegar('/arquivo-inexistente.js');\nconsole.log(a.status, b.status);", ['200 200', '200 404', '404 404', '404 200']),
  }),
  R(8, {
    diff: 'medio', scope: 'aula', sub: 'CORS_ORIGIN',
    stem: h`A API usa §cors({ origin: process.env.CORS_ORIGIN || "*" })§. Qual valor tem o cabeçalho §Access-Control-Allow-Origin§ da resposta (1) com §CORS_ORIGIN§ **não definida** e (2) com §CORS_ORIGIN=https://meu-site.netlify.app§?`,
    opts: [h`(1) §*§ e (2) §https://meu-site.netlify.app§`, [h`(1) ausente e (2) §*§`, h`Sem a variável, o código usa o padrão §"*"§ (qualquer origem); com ela, só a origem informada é anunciada.`], [h`(1) §https://meu-site.netlify.app§ e (2) §*§`, h`Está invertido: o padrão (sem variável) é §*§.`], [h`(1) §*§ e (2) §*§`, h`Com a variável definida, a API passa a anunciar apenas aquela origem.`]],
    exp: h`O pacote §cors§ responde com o valor configurado em §origin§. Sem §CORS_ORIGIN§ vale §"*"§ (útil no 1º deploy, quando a URL do Netlify ainda não existe); depois, restrinja à URL do front. A aula orienta: “atualize §CORS_ORIGIN§ com a URL do Netlify”.`,
    src: [[A13, '4. Depois do deploy, volte no Render e atualize CORS_ORIGIN com a URL do Netlify']],
    verify: { kind: 'node', params: { code: "import express from 'express';\nimport cors from 'cors';\nasync function cab(origem) {\n  if (origem === undefined) delete process.env.CORS_ORIGIN; else process.env.CORS_ORIGIN = origem;\n  const app = express();\n  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));\n  app.get('/x', (req, res) => res.end('ok'));\n  const srv = app.listen(0, '127.0.0.1');\n  await new Promise((r) => srv.once('listening', r));\n  const r = await fetch('http://127.0.0.1:' + srv.address().port + '/x', { headers: { Origin: 'https://meu-site.netlify.app' } });\n  srv.close();\n  return r.headers.get('access-control-allow-origin');\n}\nconst a = await cab(undefined);\nconst b = await cab('https://meu-site.netlify.app');\nconsole.log('(1) ' + a + ' e (2) ' + b);\nprocess.exit(0);" }, values: ['(1) * e (2) https://meu-site.netlify.app', '(1) null e (2) *', '(1) https://meu-site.netlify.app e (2) *', '(1) * e (2) *'] },
  }),
  R(9, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Arquivos .env por modo',
    stem: h`Com os arquivos abaixo, qual é o valor de §VITE_API_URL§ em modo **production**?\n\n${code('# .env.production        → VITE_API_URL=https://avaliacoes-api.onrender.com\n# .env.production.local  → VITE_API_URL=https://minha-api-de-teste.onrender.com', 'ini')}`,
    opts: [h`§https://minha-api-de-teste.onrender.com§`, [h`§https://avaliacoes-api.onrender.com§`, h`Arquivos §.local§ têm prioridade sobre os equivalentes sem §.local§ e servem para ajustes pessoais.`], [h`Os dois valores`, h`Só um valor é aplicado por variável.`], [h`Erro: variável duplicada`, h`Não há erro: o Vite aplica uma ordem de prioridade entre os arquivos.`]],
    exp: h`Vite carrega, em ordem de prioridade crescente: §.env§, §.env.local§, §.env.[modo]§, §.env.[modo].local§. O último que define a variável vence. Os arquivos §*.local§ costumam ficar fora do Git (o §.gitignore§ do front tem §*.local§), ótimos para configurações pessoais.`,
    src: [[A13, 'client/.gitignore ignora *.local; .env.development e .env.production versionados']],
    verify: vite("console.log(loadEnv('production', DIR, 'VITE_').VITE_API_URL);", { '.env.production': 'VITE_API_URL=https://avaliacoes-api.onrender.com\n', '.env.production.local': 'VITE_API_URL=https://minha-api-de-teste.onrender.com\n' }, ['https://minha-api-de-teste.onrender.com', 'https://avaliacoes-api.onrender.com', 'os dois', 'erro']),
  }),
  R(10, {
    diff: 'medio', scope: 'aula', sub: 'Segredo com prefixo VITE_',
    stem: h`Por engano, alguém cria no front a variável §VITE_JWT_SECRET=meu-segredo§ no §.env.production§. O que acontece?\n\n${code('VITE_API_URL=https://avaliacoes-api.onrender.com\nVITE_JWT_SECRET=meu-segredo', 'ini')}`,
    opts: [h`É exposta e vai para o bundle público`, [h`Fica privada, pois só o servidor a vê`, h`Variáveis com prefixo §VITE_§ são embutidas no código enviado ao navegador; privadas são as *sem* esse prefixo — e que só existem no servidor.`], [h`O build falha por segurança`, h`O Vite não avisa nem bloqueia: simplesmente expõe qualquer variável §VITE_*§.`], [h`Ela só funciona em desenvolvimento`, h`A exposição vale também para o build de produção.`]],
    exp: h`O prefixo §VITE_§ diz ao Vite “pode ir para o cliente”. Tudo o que vai para o navegador é público (o usuário pode ver em “Fontes”/Network). O §JWT_SECRET§ deve existir apenas no servidor (variável de ambiente do Render). Se um segredo vazou, troque-o imediatamente.`,
    src: [[A13, 'VITE_API_URL é público; JWT_SECRET e credenciais do banco ficam no Render']],
    verify: vite("console.log(Object.keys(loadEnv('production', DIR, 'VITE_')).includes('VITE_JWT_SECRET') ? 'exposta' : 'privada');", { '.env.production': 'VITE_API_URL=https://avaliacoes-api.onrender.com\nVITE_JWT_SECRET=meu-segredo\n' }, ['exposta', 'privada', 'build falha', 'só em desenvolvimento']),
  }),
  R(11, {
    diff: 'medio', scope: 'aula', sub: 'BASE_URL vazia',
    stem: h`No starter da Aula 13, §const BASE_URL = "";§ ainda está vazio. O front publicado em uma origem (A) executa a chamada abaixo, mas a API está em outra origem (B). Para onde vai a requisição?\n\n${code('const BASE_URL = ""; // TODO: import.meta.env.VITE_API_URL\nfetch(BASE_URL + "/lugares");')}`,
    opts: [h`Para a própria origem do site (A)`, [h`Para a API (B), pois o fetch descobre sozinho a URL`, h`Um caminho começando com §/§ é relativo à origem da página, não à API.`], [h`Dá erro de sintaxe`, h`§fetch("/lugares")§ é válido; o problema é o destino.`], [h`Para §localhost:3333§`, h`Só se a URL fosse montada com o valor de §VITE_API_URL§ do modo de desenvolvimento.`]],
    exp: h`Com §BASE_URL = ""§ o caminho vira §"/lugares"§, relativo à origem do site (Netlify): a requisição vai para o próprio site, que não tem essa rota. Por isso a aula troca por §import.meta.env.VITE_API_URL§ — uma URL absoluta da API.`,
    src: [[A13, '1. servicoLugares.js: BASE_URL lendo import.meta.env.VITE_API_URL']],
    verify: { kind: 'web', params: { page: 'app', servers: [{ name: 'app', routes: { '/': { type: 'text/html', body: '<!doctype html><p>site</p>' } } }, { name: 'api', headers: { 'Access-Control-Allow-Origin': '*' }, routes: { 'GET /lugares': { type: 'application/json', body: '[]' } } }], probe: "const BASE_URL = ''; const r = await fetch(BASE_URL + '/lugares'); return 'status ' + r.status + ' em ' + (r.url.startsWith(__bases.app) ? 'site' : 'api');", hits: 'api' }, values: ['status 404 em site hits=0', 'status 200 em api hits=1', 'erro de sintaxe hits=0', 'status 200 em localhost hits=0'] },
  }),

  // ---------------- DIFÍCEIS ----------------
  R(12, {
    diff: 'dificil', scope: 'desafio', sub: 'CORS com barra no final',
    stem: h`O front está em §https://meu-site.netlify.app§ (a origem do navegador, **sem** barra final). No Render alguém configurou §CORS_ORIGIN=https://meu-site.netlify.app/§ (**com** barra final). O que acontece ao chamar a API?`,
    opts: [h`Bloqueia: a origem anunciada não é igual`, [h`Funciona normalmente, pois a barra é ignorada`, h`A comparação de origens é exata (esquema, host e porta, sem barra); o cabeçalho com “/” não coincide.`], [h`A API responde 401`, h`A API responde, mas o navegador impede o front de ler a resposta (erro de CORS).`], [h`A API ignora o cabeçalho e libera tudo`, h`O cabeçalho é enviado exatamente como configurado; quem decide é o navegador.`]],
    exp: h`Origens não têm barra no final. O navegador compara o §Access-Control-Allow-Origin§ com a origem da página byte a byte: §.../§ ≠ §...§, então o §fetch§ falha com erro de CORS. Um dos erros mais comuns ao configurar §CORS_ORIGIN§: copie a URL *sem* a barra final.`,
    src: [[A13, '4. atualize CORS_ORIGIN com a URL do Netlify (ex: https://seu-site.netlify.app)']],
    verify: { kind: 'web', params: { page: 'app', servers: [{ name: 'app', routes: { '/': { type: 'text/html', body: '<!doctype html><p>site</p>' } } }, { name: 'api', headers: { 'Access-Control-Allow-Origin': '{{app}}/' }, routes: { 'GET /lugares': { type: 'application/json', body: '[]' } } }], probe: "try { const r = await fetch(__bases.api + '/lugares'); return 'resolveu ' + r.status; } catch (e) { return 'bloqueado'; }" }, values: ['bloqueado', 'resolveu 200', 'resolveu 401', 'resolveu 200 sem restrições'] },
  }),
  R(13, {
    diff: 'dificil', scope: 'desafio', sub: 'CORS com origem exata',
    stem: h`Agora o §CORS_ORIGIN§ está correto: igual à origem do front (sem barra final). O que acontece com o §fetch§ do front para a API?`,
    opts: [h`Funciona: o §fetch§ resolve com §200§ e o front lê os dados`, [h`Continua bloqueado, pois a API precisa liberar também a Netlify no cabeçalho §Vary§`, h`Com a origem exata em §Access-Control-Allow-Origin§ a requisição simples é liberada.`], [h`Funciona só se a API também enviar §Allow-Methods§`, h`Para um §GET§ simples não há preflight; o §Allow-Methods§ não é necessário.`], [h`Fica bloqueado até a API ter HTTPS`, h`O problema aqui é de origem; HTTPS é uma exigência separada (conteúdo misto).`]],
    exp: h`Quando o cabeçalho §Access-Control-Allow-Origin§ é exatamente a origem da página, o navegador libera a leitura da resposta de requisições simples (§GET§). Requisições com §Authorization§ ou §JSON§ no corpo exigem também a pré-checagem (preflight) — que o pacote §cors§ responde automaticamente.`,
    src: [[A13, '4. atualize CORS_ORIGIN com a URL do Netlify']],
    verify: { kind: 'web', params: { page: 'app', servers: [{ name: 'app', routes: { '/': { type: 'text/html', body: '<!doctype html><p>site</p>' } } }, { name: 'api', headers: { 'Access-Control-Allow-Origin': '{{app}}' }, routes: { 'GET /lugares': { type: 'application/json', body: '[]' } } }], probe: "try { const r = await fetch(__bases.api + '/lugares'); return 'resolveu ' + r.status; } catch (e) { return 'bloqueado'; }" }, values: ['resolveu 200', 'bloqueado', 'bloqueado (sem Allow-Methods)', 'bloqueado (sem HTTPS)'] },
  }),
  R(14, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Redirecionamento versus reescrita',
    stem: h`O §_redirects§ da aula usa o status §200§ (reescrita). Se o status fosse §301§ (redirecionamento), qual seria o comportamento de um servidor que aplica a regra §/* → /index.html§ a §GET /lugares/1§? (Modelo em Express: de um lado §res.sendFile§, do outro §res.redirect(301, "/index.html")§.)`,
    opts: [h`Com 200 a URL se mantém; com 301 muda para §/index.html§`, [h`Os dois mantêm a URL §/lugares/1§ no navegador`, h`Só a reescrita (200) mantém a URL; o redirecionamento muda o endereço para o destino.`], [h`Os dois levam o navegador para §/index.html§`, h`Com a reescrita o conteúdo de §index.html§ é servido no endereço original, sem mudar a URL.`], [h`Com 200 o servidor responde 404; com 301, 200`, h`Os códigos estão invertidos: 200 entrega o conteúdo; 301 aponta para outro endereço.`]],
    exp: h`Uma *reescrita* (§status 200§) entrega o conteúdo de §index.html§ sob a URL original: o React Router lê §/lugares/1§ e renderiza a página certa. Um *redirecionamento* (§301§) manda o navegador ir para §/index.html§: a URL muda e o app perde a rota. Por isso o README usa §/* /index.html 200§.`,
    src: [[A13, 'client/public/_redirects: /* /index.html 200; netlify.toml: [[redirects]] from "/*" to "/index.html" status = 200']],
    verify: spa("app.get('/reescreve/{*splat}', (req, res) => res.sendFile(path.join(dist, 'index.html')));\napp.get('/redireciona/{*splat}', (req, res) => res.redirect(301, '/index.html'));", "const a = await pegar('/reescreve/lugares/1', { redirect: 'manual' });\nconst b = await pegar('/redireciona/lugares/1', { redirect: 'manual' });\nconst fmt = (r) => (r.status === 200 ? '200 sem redirecionar' : r.status + ' para ' + r.loc);\nconsole.log(fmt(a) + ' / ' + fmt(b));", ['200 sem redirecionar / 301 para /index.html', '200 sem redirecionar / 200 sem redirecionar', '301 para /index.html / 301 para /index.html', '404 / 200']),
  }),
  R(15, {
    diff: 'dificil', scope: 'aula', sub: '.env fora do Git',
    stem: h`O §.gitignore§ do servidor contém §node_modules/§ e §.env§. Quais destes arquivos são ignorados (não vão para o repositório)?\n\n${code('.env\n.env.example\nnode_modules/express/index.js', 'text')}`,
    opts: [h`§.env§ e o conteúdo de §node_modules/§`, [h`Os três`, h`§.env.example§ é diferente de §.env§ e não é ignorado — ele documenta as variáveis necessárias sem valores reais.`], [h`Apenas §.env§`, h`A pasta §node_modules/§ também é ignorada, inclusive os arquivos dentro dela.`], [h`Nenhum`, h`As regras casam com §.env§ e com o conteúdo de §node_modules/§.`]],
    exp: h`§.env§ guarda segredos (senha do banco, §JWT_SECRET§) e nunca deve ser versionado; §node_modules/§ é regenerável (§npm install§). O §.env.example§ é versionado de propósito: serve de modelo para quem for configurar o ambiente (e para você mesmo no Render).`,
    src: [[A13, 'server/.gitignore: node_modules/ e .env; server/.env.example com valores de exemplo']],
    verify: { kind: 'node', params: { code: "import ignore from 'ignore';\nconst ig = ignore().add(['node_modules/', '.env']);\nconsole.log(['.env', '.env.example', 'node_modules/express/index.js'].filter((f) => ig.ignores(f)).join(' e '));" }, values: ['.env e node_modules/express/index.js', '.env e .env.example e node_modules/express/index.js', '.env', ''] },
  }),
  R(16, {
    diff: 'dificil', scope: 'aula', sub: 'Variáveis do Render sem valores no repositório',
    stem: h`O §render.yaml§ lista as variáveis assim: §- key: JWT_SECRET§ + §sync: false§, **sem** nenhum valor. Por que o arquivo é escrito desse jeito?`,
    opts: [h`Para os valores sensíveis não ficarem no repositório: eles são informados no painel do Render`, [h`Porque o Render gera as senhas automaticamente`, h`O README manda *configurar* as variáveis (DB_*, JWT_SECRET, CORS_ORIGIN) no serviço, informando você mesmo os valores.`], [h`Porque o Node ignora variáveis declaradas no YAML`, h`O arquivo descreve o serviço; as variáveis chegam ao processo depois de configuradas.`], [h`Porque o valor padrão é lido do §.env§ local`, h`O §.env§ não é versionado nem enviado ao Render.`]],
    exp: h`O Blueprint descreve a infraestrutura (versionada no Git), mas segredos não devem estar no repositório. Por isso cada variável aparece apenas com a chave e §sync: false§ (o valor é pedido/preenchido no painel do Render). A mesma lógica vale para o §.env§ local, ignorado pelo Git.`,
    src: [[A13, 'server/render.yaml: envVars DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, CORS_ORIGIN com sync: false']],
    verify: { kind: 'source', claims: [h`server/render.yaml: lista as envVars DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET e CORS_ORIGIN apenas com “key” e “sync: false” (nenhum valor).`, h`README Aula 13, seção 3: “Configure as variáveis de ambiente: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET e CORS_ORIGIN.”`] },
  }),
];
