# Changelog

## 0.7.0 — Study Labs (em revisão, sem merge nem publicação)

### Core (PR 1, `feat/study-labs-core`)
- Subsistema `src/labs/`: tipos próprios (exercícios práticos não são questões), registro extensível de laboratórios, catálogo validado e carregado sob demanda, filtros estritos por disciplina/assunto/dificuldade/tipo/profundidade, sessões de 1 ou 3 exercícios que nunca completam com outros assuntos.
- Disciplinas pessoais encontram exercícios só por associação explícita de assuntos a capacidades (sem deduzir pelo nome).
- Rascunhos, tentativas, associações e tempo de prática no IndexedDB `study-mastery-labs`, separados por espaço (aparelho/conta), com fallback em memória e aviso; nada é enviado a servidor.
- Rotas `#/labs` e `#/lab`; entradas no Início, no foco da disciplina do banco, na disciplina pessoal, na explicação da questão, no guia, no evento da agenda e no Progresso (progresso prático separado do quiz).
- Rascunho pendente gravado na hora ao ocultar/sair da página (antes, recarregar logo após digitar perdia até 0,7 s de edição); entrada do Início e lista de associações com classes próprias (não colidem com o cartão "continuar" nem com a lista de assuntos quando há laboratórios registrados).
- Teste de homologação corrigido: o item do histórico era encontrado pelo texto "8/10", que também casa com a data 28/10 (falhava só nesse dia, também na `main`).

### SQL Lab (PR 2, `feat/study-labs-sql`)
- SQLite 3.49 (sql.js 1.14.2, WebAssembly servido pelo app) num Web Worker com protocolo tipado e validado, fila, limite de tempo (3 s/6 s) com worker encerrado e recriado, Cancelar, limites de tamanho/linhas/comandos/memória e banco novo por execução.
- 12 exercícios originais (loja, biblioteca, universidade): SELECT, WHERE, ORDER BY, LIMIT, JOIN, LEFT JOIN, GROUP BY, COUNT/SUM/AVG, HAVING, subconsultas, INSERT/UPDATE/DELETE e CREATE TABLE, com casos de duplicatas, NULL, clientes sem pedido, resultado vazio, decimais e ordem.
- Correção pelo comportamento em vários bancos de teste (resultado, estado final ou estrutura por sondas), nunca pelo texto; feedback educativo sem revelar a solução; desafios com menos pistas.
- Interface com dialeto informado, dados do banco, editor, Executar/Verificar/Restaurar, tabela com NULL, erros traduzidos e resultado por caso; uma coluna no celular, lado a lado no desktop.
- Pré-cache inclui worker e WebAssembly (offline verificado na raiz e no subcaminho); `public/sw.js` inalterado.
- Portabilidade: as soluções de referência dos 12 exercícios conferidas num MariaDB 10.11 com o modo do MySQL 8 (`npm run labs:sql-portability`), e as diferenças de dialeto documentadas foram confirmadas nos dois bancos.

### Web Lab e React Lab (PR 3, `feat/study-labs-web`)
- Web Lab (8 exercícios: HTML semântico, formulário acessível, Flexbox, grid mobile-first, funções puras, filtrar/ordenar sem mutar, validação com erro customizado, lista de tarefas) e React Lab (4: props e map, useState, formulário controlado, busca com estado derivado), todos originais.
- Código do estudante só numa página isolada: iframe `sandbox="allow-scripts allow-forms"` sem `allow-same-origin`, CSP sem rede, mensagens validadas por janela, origem, nonce, exercício, versão e formato; laços protegidos (acorn) e watchdog. Resultado dos testes descrito como educativo, não à prova de fraude.
- Testes declarativos executados em página nova por teste (DOM, estilos calculados, colunas do grid em 3 larguras, rótulos acessíveis, funções puras sem mutação, erros customizados, interações).
- Interface com abas de arquivo, prévia com largura selecionável, console didático com a linha do editor, testes e abas no celular.
- React 19 do próprio app embutido no sandbox e JSX transformado no aparelho (sucrase), no lugar do Sandpack (que depende de servidor externo, inacessível neste ambiente): React Lab funciona offline.
- Versão 0.7.0. Pré-cache 3,84 MB (era 2,41 MB na 0.6.1).

## 0.6.1 — feedbacks e melhorias (25/10/2026)

- Formulário de feedback com categorias, contexto da questão, até dois prints, consentimento e rascunho offline explícito.
- Caixa administrativa privada com status, notas, exportação por caso e exclusão de anexos/relato.
- API Cloudflare Pages + D1, verificação Turnstile, limites atômicos, idempotência, retenção e autorização no servidor. Configuração ausente mantém envios desativados.
- API fora do cache PWA; configuração de plataforma fora do pré-cache. Banco de questões, progresso, Study Radio e projetos vizinhos preservados.
- Operação e pendências documentadas em `docs/FEEDBACKS.md`.
- Automação optativa da configuração Cloudflare com bancos/chaves separados e bloqueio de preparação de produção sem protocolo revisado; 42 testes da automação passaram. Envio real com print conferido no preview pelo responsável; schema, widget e configuração de produção confirmados via API em 26/10/2026. Evidências e limites em `docs/ATIVACAO_FEEDBACKS.md`.

## 0.6.0 — entrega do modo local (24/10/2026)

- Disciplinas e materiais pessoais, extração local de PDF/texto, guias por trechos, questões manuais, agenda, planejamento e progresso implementados nos checkpoints A–F.
- Revisão Codex: explicação de qualidade curta, aviso humano visível e detalhes em três grupos com contagens reais; correção de blocos de código nas questões pessoais.
- Validação nova: 817 testes sem pulos, typecheck/build, PWA 7/7, fluxos v0.6 293 verificações, homologação Cloudflare 145/145 e renderização das 600 questões em duas larguras.
- Contas, SMTP, Supabase hospedado e IA permanecem desativados; banco existente com 600 revisões assistidas por IA, nenhuma humana.
- Publicação autorizada por Tiago; detalhes e limitações em `docs/ENTREGA_V06_CODEX.md`.

## 0.5.2 — 2026-10-23
- Corrigido o `ERR_FAILED` ao reabrir o Cloudflare Pages: a navegação usa a página canônica pré-cacheada, evitando a resposta redirecionada de `/index.html`.
- Regressão em Chromium para reload online/offline, perfil persistente reaberto e atualização de um worker antigo sem apagar a sessão.
- A homologação Cloudflare agora também reproduz o redirecionamento de `index.html` para `/`, além do fallback de SPA.

## 0.5.1 — 2026-10-23
- Publicado no GitHub Pages: <https://tiago-u12.github.io/projeto-faculdade/study-mastery/> (workflow com os passos do Study Mastery executados).
- Homologação do checklist de uso real: `npm run e2e:homologacao` — 137/137 verificações automatizadas; relatório em `docs/HOMOLOGACAO_V05.md`.
- Corrigido: “Pular para o conteúdo” tirava o estudante do quiz (rotas por `#`); Enter num link não avança mais a questão.
- Acessibilidade (axe-core WCAG 2.2 AA, 0 violações em 7 telas × 2 temas): contrastes do lilás selecionado, do selo da prova, do texto secundário e do verde no tema claro; letra das alternativas legível para leitores de tela; campos de arquivo escondidos fora do Tab; links do histórico com área de toque de 44 px.
- Telas cabem com zoom de texto alto (≈260 px): marca compacta, cartões de disciplina empilhados, métricas e listas quebram linha.

## 0.5.0 — 2026-10-23

- Continuação da auditoria: 600 aprovadas (100/100/100 × 2), todas `ai-assisted`; 11 erratas React e fluxo `ingest --revise` preservados dos commits anteriores.
- Study Radio próprio com MP3 opcional, IndexedDB e continuidade entre questões; nenhuma música incluída.
- Quiz com `.stem`/`.qnum`, foco no feedback e E2E sincronizado pelo número da questão; explicações usam contêineres de bloco.
- Confirmação para substituir sessão, resultados por ID no histórico, revisão de erros baseada na tentativa e botão de revisão no Progresso; seletores de disciplina com `aria-pressed`.
- Versão única vinda de `package.json` via Vite; Home e Acervo informam banco completo e revisão humana pendente.
- PWA com pré-cache dos assets e hash do build, limpeza somente de caches `study-mastery-`, MP3 completo/Range/HEAD e tolerância à quota; ícones PNG/Apple gerados do SVG.
- Workflow Pages ganha apenas três passos condicionados a `PUBLICAR_STUDY_MASTERY == 'true'`; nenhum merge/deploy.
- Cobertura regenerada para 600/600 e documentação de auditoria, publicação e rádio.
- Validação completa (2026-10-23): typecheck, 681 testes, PWA 6/6, build, E2E, render das 600 questões em 390/320 px, offline no subcaminho do Pages, 600 reexecutadas sem regressão e workflow simulado com o build real. Detalhes em `docs/AUDITORIA_V05.md`.
- Corrigido: rolagem horizontal em 320 px (grid das explicações e barra de ações da última questão), tipo inválido em `Sessions.test.tsx`, teste de filtros lento sob carga e busca O(n²) no modo Revisão.

## 0.4.0 — 2026-10-23
- **600 questões aprovadas**: Cálculo II (300) e Desenvolvimento Web Full Stack (300), 100 por dificuldade em cada disciplina, distribuídas pelos assuntos conforme `content/taxonomy.json`.
- Cálculo II completo: derivadas, Taylor, máximos e mínimos, funções de 2 variáveis, derivadas parciais, integrais duplas e otimização (além de L'Hôpital, primitivas, substituição e integral definida).
- Verificadores novos: `double` (integrais duplas com Fubini), `node` (Express, JWT, bcrypt, React, React Router, Vite, emmet), `sql` (MariaDB temporário), `web` (Chromium: roles/acessibilidade, layout, CORS real).
- Full Stack: 300 questões novas, todas com código ou comportamento executado de verdade; as 50 legadas ficaram como referência (veja `docs/AUDITORIA_LEGADO.md`).
- App: trechos de código e explicações de Full Stack testados em E2E (390 px); E2E ajustado ao banco completo.
- Nota: todas as aprovações são `ai-assisted`; revisão humana segue pendente.

## 0.3.0 — 2026-10-22
- Reescrita modular do app (React 19 + TypeScript + Vite): home, configuração, quiz, resultados, progresso e acervo; tema claro/escuro; PWA.
- Motor puro e testado: filtros estritos, sessões por modo, embaralhamento por ID, Leitner, armazenamento local com exportação/importação.
- Pipeline editorial completo (`tools/`): import, ingest, generate-drafts, validate, review, publish, coverage-report; verificação SymPy+mpmath e execução JS isolada.
- Taxonomia com cotas (100 por dificuldade por disciplina), registro de fontes com hash, livro-razão de IDs.
- Banco: Cálculo II — L'Hôpital, antiderivadas, substituição e integral definida (assuntos da prova de 26/10) aprovados.
- Corrigido: `React` não importado (o build do v0.2 falhava); modo Revisão reembaralhava a lista priorizada; fonte errada em `calc-003`.

## 0.2.1
- Protótipo recebido (50 questões legadas de Full Stack + 4 demonstrativas de Cálculo II).
