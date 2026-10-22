# Study Mastery v0.3

Plataforma de estudos universitária gratuita e mobile-first: questões, simulados, explicações e acompanhamento do aprendizado — **sem cadastro e sem chamadas de IA durante as sessões**. O estudante usa um banco de questões **previamente verificado e aprovado**, versionado em JSON; todo o progresso fica no próprio aparelho.

> Estado real: veja [`PROGRESSO.md`](PROGRESSO.md) (contagens geradas do banco, sem arredondar). Meta: 600 questões aprovadas (100 fáceis + 100 médias + 100 difíceis por disciplina). Nada foi publicado na internet; o deploy depende da sua autorização.

## Executar

Requer Node 22+ (e Python 3 com `sympy`/`mpmath` apenas para o processo editorial).

```bash
npm install
npm run dev        # app em modo desenvolvimento
npm run build      # build de produção (tsc + vite)
npm test           # testes unitários e do pipeline
npm run e2e        # E2E em Chromium (390 px); exige `npm run build` antes
```

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
