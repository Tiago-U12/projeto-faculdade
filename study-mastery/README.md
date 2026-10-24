# Study Mastery v0.6.0

Plataforma universitária de estudos, mobile-first: banco de questões verificado (Cálculo II e Full Stack) e, a partir
da 0.6, **estudos personalizados** — disciplinas próprias, materiais (PDF com texto ou texto colado), guias com
trechos do material, questões pessoais, agenda e planejamento até a prova.

> **Estado em 24/10/2026:** a 0.6 está na branch `ccr-71aa1f28-s1s3f6`, **pronta para revisão, não publicada** e sem
> merge na `main`. Tudo que roda **sem conta** está funcionando e testado no navegador. **Contas** (Supabase) e
> **geração por IA** têm o código e os testes locais prontos, mas dependem de configuração que ainda não foi feita —
> o app diz isso nas telas e não simula resultado. Acompanhamento etapa por etapa: [docs/ACOMPANHAMENTO.md](docs/ACOMPANHAMENTO.md).

## Funcionalidades

**Funcionando sem conta (dados no aparelho):**
- Banco existente: 600 questões, filtros estritos por assunto, 4 modos, explicações, progresso, PWA offline, Study Radio.
- Disciplinas pessoais (nome, descrição, período, cor, assuntos).
- Materiais: PDF com texto selecionável (lido no navegador) ou texto colado; estados Recebido / Processando / Pronto /
  Precisa de atenção / Falhou; prévia por página; assuntos sugeridos para confirmar; exclusão com tudo que deriva dele.
- Guias: assuntos e escopo da prova confirmados antes; “Trechos do seu material” (sem IA, com página); versões.
- Questões pessoais: criar, editar (nova versão), arquivar, relatar erro, praticar com filtro estrito; o histórico
  guarda a versão respondida.
- Agenda: lista diária, semana e mês; prova, entrega, estudo, revisão e simulado; concluir, reagendar, cancelar;
  atrasados nunca concluídos sozinhos; fuso editável; planejamento por regras com prévia e confirmação. Regras: [docs/AGENDA.md](docs/AGENDA.md).
- Progresso separando atividade, desempenho e evidência; próximas provas e pendências.

**Pronto no código, depende de configuração (ver [docs/CONFIGURACAO_CONTAS.md](docs/CONFIGURACAO_CONTAS.md)):**
- Contas (e-mail e senha, recuperação), dados privados por conta (RLS), retomada em outro aparelho, importação
  explícita dos dados do aparelho, PDF em pasta privada conferido no servidor, exclusão da conta.
- Geração por IA no servidor: questões em lotes de até 10 e seções de guia (resumo, conceitos, exemplos,
  pré-requisitos, exercícios), só com trecho literal conferido no material; complemento opcional e marcado.

**Futuro (não implementado):** Google Agenda, notificações com o site fechado, importação do Moodle/Drive, OCR,
áudio e vídeo, compartilhamento público, pagamentos, app nativo.

## Arquitetura

React 19 + TypeScript + Vite 6 (PWA, rotas por hash), sem servidor próprio. Dois espaços de dados com a mesma
interface (`src/personal/repo.ts`): **neste aparelho** (localStorage + IndexedDB) e **conta** (Supabase: Postgres com
RLS em todas as tabelas, Storage privado, Edge Functions em Deno). Regras puras e testadas em `src/calendar`,
`src/lib` e `supabase/functions/_shared`. Decisões e justificativas: [docs/ARQUITETURA_V06.md](docs/ARQUITETURA_V06.md).

| Serviço | Para quê | Estado |
|---|---|---|
| GitHub Pages / Cloudflare Pages | site estático | publicado (0.5.2); 0.6 não publicada |
| Supabase (Free) | contas, banco, arquivos, funções | **não criado** (precisa da sua autorização) |
| Anthropic API | geração de questões e seções | **sem chave** (decisão sua; tem custo) |

## Configuração (sem segredos)

| Variável | Onde | Pública? |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | build (Cloudflare Pages / `.env.local`) | sim — a proteção é o RLS |
| `STUDY_SUPABASE_URL`, `STUDY_SUPABASE_PUBLISHABLE_KEY` | variáveis do repositório (workflow do GitHub Pages) | sim |
| `ANTHROPIC_API_KEY` | Supabase → Edge Functions → Secrets | **secreta**; nunca no repositório ou no navegador |
| `AI_MODEL`, `AI_EFFORT`, `AI_DAILY_LIMIT`, `AI_MAX_ATTEMPTS`, `ALLOWED_ORIGINS` | Supabase → Edge Functions → Secrets | configuração |
| `PUBLICAR_STUDY_MASTERY` | variável do repositório | liga a publicação (só com autorização) |

O app recusa uma chave secreta colada por engano nas variáveis públicas. O teste de navegador confere que o build não
contém chaves.

## Migrações

`supabase/migrations/`, em ordem: `…120000_contas_disciplinas_progresso.sql`, `…130000_materiais.sql`,
`…140000_guias_questoes.sql`, `…150000_agenda.sql`. Nenhuma foi aplicada em projeto real ainda.

## Executar e testar

Requer Node 22+.

```bash
npm ci
npm run dev            # desenvolvimento
npm run build          # tsc + vite
npm test               # unitários, regras, funções (IA simulada) e banco (Postgres local, se houver binários)
npm run test:db        # só o banco: RLS com duas contas, limites, exclusões (Postgres 16 local)
npm run e2e:v06        # fluxos da 0.6 no navegador: 390, 320 e 1280 px, axe, sem segredos no build (exige build)
npm run e2e:homologacao # checklist de uso real do banco existente
npm run e2e:a52        # cenários do relato no Galaxy A52 (emulação)
npm run test:integration # Supabase REAL: duas contas, Storage, funções (variáveis no topo do arquivo; não roda sem projeto)
```

Também: `npm run e2e`, `e2e:render`, `e2e:offline`, `e2e:redirects`, `test:pwa` e `deno check` das funções
(`supabase/functions/*/index.ts`). O que é simulado e o que é real está em [docs/ACOMPANHAMENTO.md](docs/ACOMPANHAMENTO.md).

## Publicação

Só com autorização: [docs/PUBLICACAO.md](docs/PUBLICACAO.md). Com contas, siga antes [docs/CONFIGURACAO_CONTAS.md](docs/CONFIGURACAO_CONTAS.md).

## Custos e limites

[docs/CUSTOS_E_LIMITES.md](docs/CUSTOS_E_LIMITES.md): preços oficiais consultados em 24/10/2026, premissas e
estimativas (sem medição real ainda), limites por conta.

## Limitações

- Contas e IA não foram testadas contra os serviços reais (sem projeto, sem chave e sem rede até `*.supabase.co` neste
  ambiente); os testes locais usam Postgres real com as mesmas regras e IA simulada.
- Sem OCR: PDF escaneado fica “Precisa de atenção”. Fórmulas e tabelas extraídas de PDF podem perder formatação (o app avisa).
- Cálculos e código das questões geradas por IA não são executados; nenhuma questão tem revisão humana.
- Materiais, guias, questões e eventos criados sem conta não são importados para a conta nesta versão.
- Sem notificações e sem Google Agenda.

## Documentação

[Privacidade e dados](src/components/Privacy.tsx) (também no app em `#/dados`) · [Agenda](docs/AGENDA.md) ·
[Custos](docs/CUSTOS_E_LIMITES.md) · [Configuração](docs/CONFIGURACAO_CONTAS.md) · [Arquitetura](docs/ARQUITETURA_V06.md) ·
[Diagnóstico A52](docs/DIAGNOSTICO_A52.md) · [Roteiro para colegas](docs/ROTEIRO_TESTES_COLEGAS.md) ·
[Acompanhamento](docs/ACOMPANHAMENTO.md)

## Histórico: estado da v0.5

**Publicado:** <https://tiago-u12.github.io/projeto-faculdade/study-mastery/> (GitHub Pages) e <https://study-mastery.pages.dev/> (Cloudflare Pages). Homologação do uso real (137/137 verificações automatizadas): [HOMOLOGACAO_V05.md](docs/HOMOLOGACAO_V05.md).


Validação completa em 2026-10-23 (typecheck, 681 testes, PWA, build, E2E, as 600 questões renderizadas em 390/320 px, offline no subcaminho do Pages e reexecução editorial das 600). Detalhes: [AUDITORIA_V05.md](docs/AUDITORIA_V05.md).

- Histórico abre cada tentativa por `#/results?id=...`; refazer erros usa as questões daquela tentativa.
- Confirmação antes de substituir sessão em andamento e botão “Revisar meus erros” no Progresso.
- [Study Radio](docs/STUDY_RADIO.md): MP3 opcional em loop, escolhido no aparelho ou fornecido no build; nenhuma música incluída.
- Pré-cache versionado, caches restritos ao app, Range de áudio e ícones PNG.
- [Publicação](docs/PUBLICACAO.md) condicionada a `PUBLICAR_STUDY_MASTERY=true`, somente após autorização do Tiago. Nenhum deploy ou merge executado nesta continuação.

## O que o estudante tem

- Semestre → Disciplina → Assunto; **filtros estritos**: só aparecem questões dos assuntos marcados.
- Profundidade cumulativa: *só aulas* → *aulas + aprofundamento* → *também desafios* (dos **mesmos** assuntos). A dificuldade (fácil/média/difícil) é um filtro independente.
- Sessões de 5, 10 ou 20. Se houver menos questões elegíveis do que o pedido, o app avisa e usa só as existentes (nunca completa com outro assunto).
- Quatro modos: **Aprender** (feedback imediato), **Simulado** (gabarito só no fim, navegação e troca de respostas), **Revisão** (erros primeiro, depois vencidas na repetição espaçada de Leitner, depois não vistas), **Misto** (assuntos e dificuldades intercalados).
- Alternativas embaralhadas por ID estável (o gabarito nunca se perde); nenhuma questão repete na rodada; sessão em andamento é salva e retomável.
- Explicação por alternativa (por que a sua está errada e por que a correta está certa), passo a passo, erros frequentes e a fonte exata (slide/página/exercício).
- Fórmulas com KaTeX, código em blocos, tema claro/escuro, `prefers-reduced-motion`, navegação por teclado (1–4 / A–D, Enter), PWA offline.
- Histórico local (localStorage), exportar/importar JSON (mesclar ou substituir), apagar dados.

## Banco de questões e pipeline editorial

O pipeline é **separado** do app. Estados: `draft → verified → approved` (ou `rejected`). Só `approved` é publicado.

```bash
npm run sm -- help
npm run sm -- import [pasta] [--drive <idPasta>]   # inventário de materiais (PDF/MD/ZIP/Drive), hash, duplicatas, assuntos novos
npm run sm -- ingest content/batches/lote.mjs      # carrega rascunhos
npm run sm -- generate-drafts --discipline calculo2 --topic lhopital --difficulty medio --provider anthropic
npm run sm -- validate                             # schema, LaTeX, fontes, duplicatas, SymPy+numérico, JS isolado
npm run sm -- review sheet <prefixo>               # folha de revisão legível
npm run sm -- review approve --all-verified --reviewer "Nome" --type human --attest-checklist
npm run sm -- publish                              # só aprovadas → src/data/published
npm run sm -- coverage-report --write              # cobertura por disciplina × dificuldade × assunto
npm run progress                                   # regenera as contagens do PROGRESSO.md
```

Detalhes, garantias e limites: [`docs/PIPELINE.md`](docs/PIPELINE.md). Estrutura de dados e decisões: [`docs/IMPLEMENTACAO.md`](docs/IMPLEMENTACAO.md). Meta por assunto: [`content/taxonomy.json`](content/taxonomy.json).

## Material da faculdade e direitos autorais

Os PDFs e READMEs das aulas ficam em `materiais/` (ignorado pelo git) e o texto extraído em `content/extracted/` (também ignorado). **Nada disso é publicado**: o repositório guarda só metadados (título, autor, instituição, hash SHA-256, localizador). As questões são originais.

## Segurança

- Código de verificação de questões roda isolado: Python com whitelist de AST (sem atributos, imports ou chamadas arbitrárias) e Node com `--permission` (sem fs, processos ou workers), com tempo limite.
- Chaves de API só via variáveis de ambiente do serviço de manutenção (`ANTHROPIC_API_KEY`, `GOOGLE_DRIVE_TOKEN`); nada é gravado no repositório.
- O texto das questões é renderizado como texto React; só a saída do KaTeX vira HTML.
- 0.6: RLS em todas as tabelas (`owner_id = auth.uid()`), chaves compostas que impedem apontar para dados de outra
  conta, tarefas e consumo gravados só pelo servidor, Storage por pasta da conta; testado com duas contas no Postgres
  local (`npm run test:db`). O material enviado é tratado como dado (delimitado no pedido à IA; nada é executado).
- A chave da IA fica só nos *secrets* das Edge Functions; o navegador nunca a recebe.
