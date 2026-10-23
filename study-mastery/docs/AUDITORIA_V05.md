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
- Os ajustes de largura mínima dos blocos de explicação/resultados e o cabeçalho em 320px precisam de confirmação pelo `e2e:render`; o problema anterior de resultados Full Stack em 390px **não é declarado resolvido sem essa execução**.

## Validação desta continuação

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

Defina `CHROMIUM_PATH` se o executável não estiver em `/usr/bin/chromium`. O PR deve permanecer em rascunho enquanto esses bloqueios de validação não forem resolvidos.
