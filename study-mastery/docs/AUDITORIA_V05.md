# Auditoria v0.5.0 — 2026-10-23

## Banco e procedência

600 questões aprovadas: Cálculo II e Desenvolvimento Web Full Stack, cada uma com **100 fáceis + 100 médias + 100 difíceis** (100/100/100 × 2). Todas as aprovações são **ai-assisted**; revisão humana pendente. Aprovação editorial assistida e verificação automática não equivalem a revisão humana.

Esta continuação parte de `64bc809` no branch `ccr-71aa1f28-s1s3f6`, preservando também o trabalho de `5c8c3f8`. Os 28 arquivos de questões editoriais e banco publicado foram comparados por hash Git: idênticos a `64bc809`. Não foram criadas, reclassificadas nem republicadas questões.

## Errata já incorporada

As 11 questões abaixo têm errata versionada em `content/questions/`. A reexecução completa informada na etapa anterior pertence aos commits anteriores; **não foi repetida com sucesso neste ambiente**.

| Questões | Correção |
|---|---|
| `fs-react-componentes-017` | Enunciado usava `renderToStaticMarkup`, enquanto a verificação executava `createRoot`. O código foi alinhado à verificação do aviso de chave duplicada. |
| `fs-react-componentes-006` | Aviso explicitamente restrito ao modo de desenvolvimento. |
| `fs-react-hooks-forms-014`, `fs-react-hooks-forms-025` | Avisos de React explicitamente restritos ao desenvolvimento. |
| `fs-react-hooks-forms-004`, `012`, `013`, `020`, `021`, `022`, `026` | Enunciados explicitam **Sem `<StrictMode>`**. Renderizações/efeitos extras em desenvolvimento alteravam as contagens; em 004/012/020 a saída podia coincidir com um distrator. Todos os números desta linha usam o prefixo `fs-react-hooks-forms-`. |

O fluxo existente `sm ingest --revise <ids> --reason "motivo"` retira a aprovação, registra errata e exige nova validação/revisão. A auditoria de StrictMode está em `tools/audit/strictmode.ts`. O sandbox mantém as versões dos starters das aulas.

## Dificuldade: decisão humana pendente

Os itens a seguir continuam classificados como `dificil`. A observação é editorial e provisória: o nível depende dos objetivos da disciplina e dos conhecimentos dos alunos. **Nenhuma classificação foi alterada.**

| Questão | Motivo para discutir o nível |
|---|---|
| `c2-integral-definida-028` | Integral de polinômio ímpar em intervalo simétrico; o próprio enunciado pede simetria. |
| `c2-taylor-018` | Comparação qualitativa de Maclaurin para exponencial perto/longe de zero, sem cálculo de erro ou ordem. |
| `c2-primitivas-032` | Primitiva de `2x` com uma condição pontual; basta determinar a constante. |
| `c2-primitivas-033` | Derivar uma primitiva polinomial dada e avaliar em zero. |
| `c2-primitivas-034` | Reescrever uma raiz como potência e aplicar a regra de integração. |
| `c2-derivadas-014` | Regra da cadeia direta para logaritmo de `x²+1`. |
| `c2-derivadas-017` | Derivada de um monômio em um ponto, embora formulada como limite pela definição. |
| `c2-funcoes-2-var-013` | Substituição de duas expressões e expansão de um quadrado. |
| `c2-funcoes-2-var-015` | Avaliar a função no ponto para obter a constante da curva de nível. |

## Limitações

- SQL é executado em **MariaDB**, não em uma instância MySQL idêntica à aula. Compatibilidade não assegura igualdade de versões, modos SQL, mensagens e detalhes de comportamento. Conferência em MySQL continua recomendada antes de afirmar equivalência completa.
- Revisão humana das 600 questões, fontes e calibração de dificuldade permanece pendente.
- Cache offline depende de instalação inicial completa e espaço disponível. O navegador pode remover armazenamento. Música externa não acompanha o projeto.
- Largura mínima: confirmada em 2026-10-23 pelo `e2e:render` (600 questões e tela de resultados em 390 e 320 px, sem rolagem horizontal). Larguras abaixo de 320 px não foram testadas.

## Validação anterior (bloqueada pelo ambiente — histórico)

Esta seção registra a sessão que escreveu `99bda67`/`f6437cf`; ela **não** validou build, Vitest, E2E nem reexecução editorial. A validação completa está em [Validação completa](#validação-completa--2026-10-23-commit-final-do-branch).

Ambiente: Node 24.19.0; sem checkout inicial, recuperado pelo conector GitHub; rede do shell negada (`connect EPERM` ao proxy). As solicitações de permissão de rede ficaram pendentes e foram interrompidas. Não houve execução de deploy nem merge.

| Verificação | Resultado real |
|---|---|
| `npm run test:pwa` | **6/6 passaram**: assets/hash; limpeza de caches; Range completo/aberto/sufixo/416/HEAD; escopo de URL; HEAD sem download; quota esgotada. Os dois últimos falharam antes da correção e passaram depois. |
| Funções `reviewConfig`, `eligible` e utilitários de rádio via Node nativo | 11 asserções diretas passaram; não substituem a suíte Vitest. |
| `node --check public/sw.js` e `git diff --check` | Passaram. |
| Ícones PNG | 192×192, 512×512, maskable 512×512, apple-touch 180×180 conferidos. |
| Workflow | Três passos novos condicionados; passos anteriores comparados e preservados. Simulação de cópia com fixtures e valores ausente/false/true passou; **build real não simulado**. |
| `npm ci --offline` / `npm run sandbox:install` com npm offline | Falharam, código 1, `ENOTCACHED`. Cache local sem dependências. Tentativa anterior de rede falhou em `EPERM`. |
| `npm run typecheck` | Não iniciou: código 127, `tsc: not found`. |
| `npm test` | Não iniciou: código 127, `vitest: not found`. |
| `npm run build` | Não iniciou: código 127, `tsc: not found`. |
| `npm run e2e`, `npm run e2e:render`, `npm run e2e:offline` | Não iniciaram: código 127, `tsx: not found`. |
| `npx --offline tsx tests/e2e/render-all.ts` | Falhou, código 1, `ENOTCACHED`. |
| Chromium via Playwright instalado no ambiente | Não iniciou: `setsockopt: Operation not permitted`, `SIGTRAP`. |
| `npm run sm -- validate --recheck-approved` | Não iniciou: código 127, `tsx: not found`; `mariadbd` também ausente. |
| `npm run content:coverage`, `npm run progress` | Scripts npm não iniciaram por falta de `tsx`. Relatórios efetivamente regenerados com as mesmas funções `buildCoverage`/`renderCoverageMarkdown`/`loadQuestions` e `tools/progress.ts`, usando TypeScript nativo do Node 24 e um resolvedor temporário de imports relativos. Resultado: 600/600, `ai-assisted: 600`. |

Os testes React/jsdom de sessões, resultados e RadioPlayer foram adicionados, mas não executados aqui. A revisão de código por outro agente identificou os dois casos de rádio acima e um listener duplicado de diálogo no teste offline; foram corrigidos. Essa revisão também é assistida por IA.

Antes de considerar a versão validada, executar em ambiente com rede, Chromium funcional, Python/SymPy/mpmath e MariaDB:

```bash
npm ci
npm run sandbox:install
npm run typecheck
npm test
npm run test:pwa
npm run build && npm run e2e
npx tsx tests/e2e/render-all.ts
npm run e2e:offline
npm run sm -- validate --recheck-approved
npm run content:coverage
npm run progress
```

Defina `CHROMIUM_PATH` se o executável não estiver em `/usr/bin/chromium`.

## Validação completa — 2026-10-23 (commit final do branch)

Executada de ponta a ponta, em ambiente com rede para o registro npm. Versões: Node 22.22.0, Chromium 141.0.7390.37 (`CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`), MariaDB 10.11.14, Python com SymPy 1.14.0 e mpmath 1.3.0. As versões do sandbox (`tools/sandbox/package-lock.json`) não foram alteradas.

| Comando | Resultado real |
|---|---|
| `npm ci` / `npm run sandbox:install` | OK |
| `npm run typecheck` | OK — depois de corrigir `Sessions.test.tsx` (`exact` não existe em `ByRoleOptions`; nome em string já é exato) |
| `npm test` | **9 arquivos, 681 testes passaram** |
| `npm run test:pwa` | **6/6** |
| `npm run build` | OK |
| `npm run e2e` | **E2E ok — 39 verificações, 0 falhas**, sem erros de console (390 px) |
| `npm run e2e:render` | **600 questões × 390 e 320 px, 0 problemas**, incluindo a tela de resultados com todas as revisões abertas |
| `npm run e2e:offline` | OK — build real em `/projeto-faculdade/study-mastery/`, todos os assets pré-cacheados, as duas disciplinas offline, Range 206, caches `trocaticket-`/`aysha-park-`/`dungeon-cooked-` preservados e `study-mastery-old` removido |
| `npm run sm -- validate --recheck-approved` | **600 aprovadas reexecutadas sem regressão**, 0 erros, 0 avisos, 0 duplicatas. Só o campo `ranAt` mudou nos arquivos de questões |
| `npm run content:coverage` / `npm run progress` | 600/600 (100/100/100 por disciplina), 600 `ai-assisted` |

Falhas reais encontradas e corrigidas nesta execução (nenhum teste foi enfraquecido):

1. **Rolagem horizontal em 320 px — resultados.** `.explain` é um grid cuja coluna implícita crescia até a fórmula mais larga, empurrando todos os blocos (281 px num espaço de 272). Correção: `grid-template-columns: minmax(0, 1fr)` e `min-width: 0` nos textos de `.why-right`/`.why-wrong`.
2. **Rolagem horizontal em 320 px — última questão.** “Encerrar agora” + “Ver resultados” somavam cerca de 337 px. Correção: `.quizactions` quebra linha e o botão principal fica alinhado à direita.
3. **Teste de filtros estritos estourava 5 s sob carga.** O teste recriava um `Map` de 600 questões por sessão e fazia ~280 mil `expect`. Agora acumula as violações e faz uma asserção final, com as mesmas checagens. Teste de mutação: removendo o filtro de assunto de `eligible`, os dois testes de filtro falham. O motor ganhou um `Map` no modo Revisão (antes, busca O(n²)).
4. `render-all` passou a ignorar os SVGs de raízes do KaTeX recortados por `.hide-tail`: eles não geram rolagem e mascaravam o elemento culpado.

Simulação do GitHub Pages com o **build real**, em diretório temporário:
- passos existentes do workflow: TrocaTicket (`npm ci` + build), Aysha Park e Dungeon Cooked;
- depois os três passos condicionados, como se `PUBLICAR_STUDY_MASTERY == 'true'`;
- os 42 arquivos fora de `study-mastery/` ficaram idênticos com e sem a inclusão.

Servido em `/projeto-faculdade/` no Chromium:
- TrocaTicket, Dungeon Cooked e Study Mastery abrem sem erros;
- service worker com escopo `/projeto-faculdade/study-mastery/`; a raiz do TrocaTicket não fica sob o controle dele;
- o único 404 é a sondagem `HEAD` de `audio/study-radio.mp3`, esperada sem música.

**Aysha Park** lança `TypeError: Cannot set properties of undefined (setting 'width')` no Chromium headless, também com WebGL por software. Nenhum arquivo de Aysha Park mudou neste branch e a regra é não alterá-lo: fica registrado como questão preexistente, fora do escopo.

Continua dependendo de pessoas: revisão humana das 600 questões e da calibração de dificuldade (lista acima), conferência do SQL em MySQL, autorização para `PUBLICAR_STUDY_MASTERY` e um MP3 com direito de uso.

