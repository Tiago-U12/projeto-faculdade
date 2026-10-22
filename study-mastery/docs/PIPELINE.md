# Pipeline editorial — como uma questão chega ao estudante

## Estados

| Estado | Significado | Quem muda |
|---|---|---|
| `draft` | rascunho (humano ou IA); nunca é publicado | `ingest`, `generate-drafts` |
| `verified` | passou em todas as checagens automáticas | `validate` |
| `approved` | revisão registrada (revisor, data, checklist completo) | `review approve` |
| `rejected` | recusada com motivo; **o ID nunca é reutilizado** | `review reject` |

`publish` só inclui `approved` e **reexecuta** validação + verificação. Um ID já publicado que sumir do banco vira "aposentado" em `content/published-ledger.json` e não pode voltar com outro conteúdo; o histórico dos estudantes continua apontando para IDs estáveis.

## O que `validate` garante

1. **Schema**: 4 alternativas únicas, 1 correta, assunto/dificuldade/camada válidos, sem "todas/nenhuma das anteriores".
2. **Explicações**: correta ≥ 60 caracteres, motivo para **cada** alternativa errada, passo a passo nas questões de cálculo.
3. **LaTeX**: cada trecho `$…$` é compilado pelo KaTeX (erro = bloqueio).
4. **Fontes**: cada referência aponta para uma fonte cadastrada **e efetivamente lida** (`accessed: true`); camada "aula" exige fonte da faculdade. Nada de proveniência alegada sem leitura.
5. **Duplicatas**: texto em linguagem natural (Jaccard de bigramas) e molde numérico (mesma expressão com números trocados).
6. **Gabarito demonstrado** (`verification`):
   - `limit`, `form`, `derivative`, `integral`, `definite`, `expr`, `function`: **SymPy** (simbólico) + **mpmath** (numérico independente: sequências com 250 dígitos, quadratura, diferença finita). Exige que **somente** a alternativa correta satisfaça a verificação.
   - `js`: executa o código em Node isolado (`--permission`) e compara a saída real com cada alternativa (reproduz a ordem real de `nextTick`, microtasks e timers).
   - `source`: afirmações conferidas contra a fonte lida (não há execução; fica registrado como `source-review`).

## Revisão

`review sheet` imprime enunciado, alternativas, motivos, passo a passo e resultado da verificação. `review approve` exige `--attest-checklist` (7 itens) e grava revisor + tipo (`human` ou `ai-assisted`) em `content/reviews/log.jsonl`.

**Honestidade sobre a revisão**: todas as aprovações feitas até agora são `ai-assisted` (verificação automática + leitura crítica em passada separada da autoria). Para publicar apenas o que uma pessoa aprovou: `npm run sm -- publish --require-human`. O app declara isso na tela *Acervo*.

## Geração com IA

`generate-drafts` monta o prompt com assunto, dificuldade, camada, **fontes permitidas** (as não lidas são marcadas "não use"), trechos extraídos e as questões já existentes (anti-duplicação), e pede um array JSON no formato do DSL. O provedor é injetável (`MockProvider` para testes; `AnthropicProvider` lê `ANTHROPIC_API_KEY`). O gerador **só cria rascunhos** — mesmo que o modelo devolva `status: approved`, o campo é descartado.

## Importação de materiais

`import` percorre PDFs/MD/TXT/HTML/ZIP (recusa *zip-slip*), calcula SHA-256, detecta duplicatas e atualizações, extrai texto (`pdftotext`), classifica assuntos por palavras-chave (`content/keywords.json`), sugere cabeçalhos de assuntos novos e registra novas fontes. `--drive <pasta>` baixa de uma pasta do Google Drive pela API REST usando `GOOGLE_DRIVE_TOKEN` (testado com `fetch` simulado, **não** contra o Drive real).

## Limites conhecidos

- `source-review` não é verificação executável: depende da leitura da fonte e da revisão.
- O Node `--permission` não bloqueia rede em loopback; para código gerado por IA não confiável, rode `validate` dentro de um contêiner.
- A verificação numérica de limites usa sequências finitas: não decide convergências extremamente lentas (ex.: $(\ln x)^5/x^{0{,}1}$) — nesses casos a questão é reformulada.
