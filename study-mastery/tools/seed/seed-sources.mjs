// Gera content/sources.json a partir dos materiais locais em materiais/ (hash SHA-256 real).
// Uso: node tools/seed/seed-sources.mjs   (materiais/ não é versionado: material da faculdade)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const today = new Date().toISOString().slice(0, 10);
const C2 = 'materiais/calculo2';
const FS = 'materiais/fullstack';
const out = [];
const local = (id, file, o) => {
  const exists = fs.existsSync(file);
  out.push({ id, origin: file.replace(/^materiais\//, 'materiais-locais/'), accessed: exists, accessedAt: exists ? today : undefined, sha256: exists ? sha(file) : undefined, usage: 'Material de aula da faculdade: base conceitual; enunciados originais não são copiados.', ...o });
};

const fecap = 'FECAP / Centro Universitário Álvares Penteado';
local('c2-lhopital-slides', `${C2}/Regra_LHopital.pdf`, { title: "Regra de L'Hôpital (slides, 18 pp.)", kind: 'aula-pdf', disciplineId: 'calculo2', author: 'Profa. Paula Astorino', institution: fecap, topicIds: ['lhopital'] });
local('c2-lhopital-lista', `${C2}/ListaLHopital.pdf`, { title: "Lista de Exercícios · Regra de L'Hôpital (8 limites)", kind: 'lista', disciplineId: 'calculo2', author: 'Profa. Paula Astorino', institution: fecap, topicIds: ['lhopital'] });
local('c2-integral-riemann-slides', `${C2}/IntegralDefinida_2809.pdf`, { title: 'Integral de Riemann, propriedades, TFC e mudança de variável (slides, 10 pp.)', kind: 'aula-pdf', disciplineId: 'calculo2', author: 'Profa. Paula Astorino', institution: fecap, topicIds: ['integral-definida', 'substituicao'], notes: 'O nome do arquivo sugere "Integral Definida", mas o conteúdo é Riemann + TFC + mudança de variável.' });
local('c2-lista-def-basica', `${C2}/FECAP_Calculo_II_Riemann-1.pdf`, { title: 'Lista de Exercícios — Integrais Definidas (28 itens), 28/09/2026', kind: 'lista', disciplineId: 'calculo2', institution: fecap, topicIds: ['integral-definida'], notes: 'Conteúdo: 28 integrais definidas básicas (o nome do arquivo menciona Riemann).' });
local('c2-lista-subst', `${C2}/FECAP_Calculo_II_IntegralSubstituicao.pdf`, { title: 'Lista de Exercícios — Integrais por substituição (itens a–k), 28/09/2026', kind: 'lista', disciplineId: 'calculo2', institution: fecap, topicIds: ['substituicao'] });
local('c2-taylor-slides', `${C2}/Aula10082026_PolinomioTaylor.pdf`, { title: 'Polinômio de Taylor (slides, 15 pp.)', kind: 'aula-pdf', disciplineId: 'calculo2', author: 'Profa. Paula Astorino', institution: fecap, topicIds: ['taylor'] });
local('c2-taylor-lista', `${C2}/2a Lista CB - Teorema de Taylor.pdf`, { title: '2ª Lista: Teorema de Taylor — MacLaurin', kind: 'lista', disciplineId: 'calculo2', author: 'Profa. Cristina Leite', institution: fecap, topicIds: ['taylor'] });
local('c2-derivadas-slides', `${C2}/Slides Aula 0-1 - Revisão de Derivadas - Regras de Derivação.pdf`, { title: 'Aula 0-1: Revisão de Derivadas — Regras de Derivação (slides)', kind: 'aula-pdf', disciplineId: 'calculo2', author: 'Profa. Cristina Leite', institution: fecap, topicIds: ['derivadas'] });
local('c2-derivadas-lista', `${C2}/Lista 0-1 CB - Derivadas - Regras de Derivação.pdf`, { title: 'Lista 0-1: Derivadas — Regras de Derivação', kind: 'lista', disciplineId: 'calculo2', author: 'Profa. Dra. Cristina Leite', institution: fecap, topicIds: ['derivadas'] });
local('c2-derivadas-tabela', `${C2}/Aula 0-1 CB - Tabela de Derivadas.pdf`, { title: 'Aula 0-1 — Tabela de Derivadas', kind: 'aula-pdf', disciplineId: 'calculo2', institution: fecap, topicIds: ['derivadas', 'primitivas'] });
local('c2-maxmin-a3', `${C2}/Slides Aula 3 CB - Máximos e Mínimos.pdf`, { title: 'Aula 3: A Derivada e o Comportamento de uma Função — Máximos e Mínimos', kind: 'aula-pdf', disciplineId: 'calculo2', author: 'Profa. Cristina Leite', institution: fecap, topicIds: ['maxmin'] });
local('c2-maxmin-a4', `${C2}/Slides Aula 4 CB - Máximos e Mínimos.pdf`, { title: 'Aula 4: A Derivada e o Comportamento de uma Função — Máximos e Mínimos (parte 2)', kind: 'aula-pdf', disciplineId: 'calculo2', author: 'Profa. Cristina Leite', institution: fecap, topicIds: ['maxmin'] });
local('c2-f2v-intro', `${C2}/Funcao2Var_Introducao.pdf`, { title: 'Aula 12: Funções de Várias Variáveis — introdução', kind: 'aula-pdf', disciplineId: 'calculo2', author: 'Profa. Cristina Leite', institution: fecap, topicIds: ['funcoes-2-var'] });
out.push({ id: 'c2-programa', title: 'TOP Cálculo II CCOMP (ementa, conteúdo programático e bibliografia)', kind: 'programa', disciplineId: 'calculo2', origin: 'drive:1ZlJk9VlxlM3ld0rVr2BBfmRXjs2SEgKj', institution: fecap, usage: 'Define o programa da disciplina e a cobertura de assuntos.', accessed: true, accessedAt: today, topicIds: ['primitivas', 'derivadas-parciais', 'integrais-duplas', 'otimizacao', 'funcoes-2-var'], notes: 'Lido via Google Drive. Aviso da prova de 26/10/2026 (Moodle): L\'Hôpital, integral indefinida, definida e substituição.' });

const lessons = [
  ['01', 'HTML semântico com Emmet', ['html']], ['02', 'CSS: Flexbox, Grid e mobile-first', ['css']], ['03', 'Funções utilitárias sobre avaliações (JavaScript puro)', ['js-funcoes']],
  ['04', 'Fetch de dados mockados (Promises, CORS)', ['fetch-async']], ['05', 'Classes de modelo com validação e erro customizado', ['classes-erros']], ['06', 'Componentes React: LugarCard, ListaLugares, Estrelas', ['react-componentes']],
  ['07', 'Formulário controlado + useEffect', ['react-hooks-forms']], ['08', 'React Router: Home, Detalhe e NotFound', ['react-router']], ['09', 'API Express em memória', ['express-rest']],
  ['10', 'Persistência real em MySQL', ['mysql']], ['11', 'Autenticação com JWT e bcrypt', ['jwt-auth']], ['12', 'Validação centralizada + error handler', ['validacao-erros']], ['13', 'Deploy: Render + MySQL gerenciado + Netlify', ['deploy']],
];
for (const [n, title, topicIds] of lessons) {
  local(`fs-aula-${n}`, `${FS}/Aulas_01_a_13/Aula_${n}/README.md`, { title: `Aula ${n} — ${title} (README + código starter)`, kind: 'aula-readme', disciplineId: 'fullstack', institution: fecap, topicIds });
}
local('fs-apostila-01-02', `${FS}/Apostilas_e_Slides/Apostila_Aulas_01-02_HTML_Emmet_CSS.pdf`, { title: 'Apostila Aulas 01–02: HTML, Emmet e CSS (15 pp.)', kind: 'aula-pdf', disciplineId: 'fullstack', institution: fecap, topicIds: ['html', 'css'] });
local('fs-slides-aula01', `${FS}/Apostilas_e_Slides/Aula01_HTML_Semantico_Emmet.pdf`, { title: 'Slides Aula 01: HTML Semântico e Emmet (31 pp.)', kind: 'aula-pdf', disciplineId: 'fullstack', institution: fecap, topicIds: ['html'] });
local('fs-slides-aula02', `${FS}/Apostilas_e_Slides/Aula02_CSS_Flexbox_Grid.pdf`, { title: 'Slides Aula 02: CSS Flexbox e Grid (25 pp.)', kind: 'aula-pdf', disciplineId: 'fullstack', institution: fecap, topicIds: ['css'] });

const ext = (id, title, kind, disciplineId, origin, license, usage, topicIds, extra = {}) =>
  out.push({ id, title, kind, disciplineId, origin, license, usage, accessed: false, topicIds, ...extra });
// Fontes externas: accessed=false até que o conteúdo seja efetivamente consultado (tools/seed/mark-accessed.mjs)
ext('ext-openstax-calc1', 'OpenStax — Calculus Volume 1', 'externa-livro', 'calculo2', 'https://openstax.org/books/calculus-volume-1', 'CC BY-NC-SA 4.0 (verificar termos de uso)', 'Referência para aprofundamento; nenhum texto é copiado, questões são originais.', ['lhopital', 'primitivas', 'substituicao', 'integral-definida', 'maxmin', 'derivadas']);
ext('ext-openstax-calc2', 'OpenStax — Calculus Volume 2', 'externa-livro', 'calculo2', 'https://openstax.org/books/calculus-volume-2', 'CC BY-NC-SA 4.0 (verificar termos de uso)', 'Referência para Taylor/Maclaurin e integrais.', ['taylor', 'integral-definida']);
ext('ext-openstax-calc3', 'OpenStax — Calculus Volume 3', 'externa-livro', 'calculo2', 'https://openstax.org/books/calculus-volume-3', 'CC BY-NC-SA 4.0 (verificar termos de uso)', 'Referência para funções de várias variáveis, parciais, integrais duplas e Lagrange.', ['funcoes-2-var', 'derivadas-parciais', 'integrais-duplas', 'otimizacao']);
ext('ext-mdn-html', 'MDN Web Docs — HTML', 'externa-oficial', 'fullstack', 'https://developer.mozilla.org/pt-BR/docs/Web/HTML', 'CC BY-SA 2.5 (conteúdo) — usado como referência', 'Referência para elaboração e verificação; sem cópia literal.', ['html']);
ext('ext-mdn-css', 'MDN Web Docs — CSS', 'externa-oficial', 'fullstack', 'https://developer.mozilla.org/pt-BR/docs/Web/CSS', 'CC BY-SA 2.5 (conteúdo)', 'Referência para Flexbox, Grid, media queries.', ['css']);
ext('ext-mdn-js', 'MDN Web Docs — JavaScript', 'externa-oficial', 'fullstack', 'https://developer.mozilla.org/pt-BR/docs/Web/JavaScript', 'CC BY-SA 2.5 (conteúdo)', 'Referência para arrays, funções, classes, Promises.', ['js-funcoes', 'fetch-async', 'classes-erros']);
ext('ext-mdn-fetch', 'MDN Web Docs — Fetch API e CORS', 'externa-oficial', 'fullstack', 'https://developer.mozilla.org/pt-BR/docs/Web/API/Fetch_API', 'CC BY-SA 2.5 (conteúdo)', 'Referência para fetch, Response.ok e CORS.', ['fetch-async', 'deploy']);
ext('ext-react-dev', 'React — documentação oficial (react.dev)', 'externa-oficial', 'fullstack', 'https://react.dev', 'CC BY 4.0 (conteúdo da documentação)', 'Referência para componentes, hooks e formulários.', ['react-componentes', 'react-hooks-forms']);
ext('ext-react-router', 'React Router — documentação oficial', 'externa-oficial', 'fullstack', 'https://reactrouter.com', 'MIT (projeto); verificar termos da documentação', 'Referência para rotas e parâmetros.', ['react-router']);
ext('ext-express', 'Express — documentação oficial (expressjs.com)', 'externa-oficial', 'fullstack', 'https://expressjs.com', 'CC BY-SA 3.0 (documentação)', 'Referência para roteamento, middlewares e tratamento de erros.', ['express-rest', 'validacao-erros', 'jwt-auth']);
ext('ext-mysql-ref', 'MySQL 8.4 Reference Manual', 'externa-oficial', 'fullstack', 'https://dev.mysql.com/doc/refman/8.4/en/', 'Direitos Oracle — somente referência (sem cópia)', 'Referência para SQL, FKs e AUTO_INCREMENT.', ['mysql']);
ext('ext-mysql2', 'mysql2 — documentação (sidorares.github.io/node-mysql2)', 'externa-oficial', 'fullstack', 'https://sidorares.github.io/node-mysql2/docs', 'MIT (projeto)', 'Referência para pool, placeholders e insertId.', ['mysql']);
ext('ext-rfc7519', 'RFC 7519 — JSON Web Token (JWT)', 'externa-oficial', 'fullstack', 'https://datatracker.ietf.org/doc/html/rfc7519', 'IETF Trust — uso livre para referência', 'Referência para claims e estrutura do JWT.', ['jwt-auth']);
ext('ext-rfc9110', 'RFC 9110 — HTTP Semantics', 'externa-oficial', 'fullstack', 'https://datatracker.ietf.org/doc/html/rfc9110', 'IETF Trust — uso livre para referência', 'Referência para métodos e códigos de status HTTP.', ['express-rest', 'jwt-auth', 'validacao-erros']);
ext('ext-nodejs-docs', 'Node.js — documentação oficial', 'externa-oficial', 'fullstack', 'https://nodejs.org/docs/latest/api/', 'MIT/CC-BY (documentação do projeto)', 'Referência para process.env e módulos.', ['express-rest', 'deploy']);
ext('ext-render-docs', 'Render — documentação oficial', 'externa-oficial', 'fullstack', 'https://render.com/docs', 'Termos do fornecedor — somente referência', 'Referência para Web Services e variáveis de ambiente.', ['deploy']);
ext('ext-netlify-docs', 'Netlify — documentação oficial', 'externa-oficial', 'fullstack', 'https://docs.netlify.com', 'Termos do fornecedor — somente referência', 'Referência para redirects de SPA e deploy.', ['deploy']);
ext('ext-owasp-passwords', 'OWASP Cheat Sheet — Password Storage', 'externa-oficial', 'fullstack', 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html', 'CC BY-SA 4.0', 'Referência para hash de senha e bcrypt.', ['jwt-auth']);

fs.writeFileSync('content/sources.json', JSON.stringify(out, null, 1) + '\n');
console.log(`${out.length} fontes (${out.filter((s) => s.accessed).length} acessadas)`);
