# Auditoria das 50 questões legadas de Full Stack (v0.1)

Arquivo: `content/legacy/legacy-v01.json` (intocado). **Nenhuma** das 50 foi publicada: o app só lê o banco `approved` gerado pelo pipeline.

## Achados

| Problema | Quantidade | Detalhe |
|---|---:|---|
| Explicação genérica (“Revise …”) | 50 | nenhuma explica por que a alternativa está certa nem por que as outras estão erradas |
| Sem motivo por alternativa errada | 50 | exigência do pipeline v0.3 |
| Dificuldade única (`intermediario`) | 50 | impossível cumprir as cotas fácil/média/difícil |
| Sem fonte rastreável | 50 | apenas `legado-fullstack-v01` |
| Sem verificação executável | 50 | gabarito não demonstrado |
| Enunciado com defeito | 1 | `fs-026` tem dupla negação (“Por que **não** devemos **evitar** explodir um objeto…”) |

Conferência factual do gabarito: nenhum erro de conteúdo foi encontrado nas 50 (por exemplo, `fs-039` — porta 3333 — está confirmada no README da Aula 09; `fs-049` — Express 5 e Promises rejeitadas — confere com a Aula 12 e foi reexecutado no verificador).

## Decisão

Em vez de “remendar” as 50 (que ficariam sem dificuldade variada nem verificação), os **mesmos assuntos** foram cobertos por 300 questões novas, originais, com gabarito demonstrado por execução, fonte e motivos por alternativa. O legado permanece no repositório apenas como referência histórica.

## Mapeamento por assunto

| Assunto legado (nº) | Assunto atual | Aprovadas |
|---|---|---:|
| HTML Semântico (4) | `html` | 20 |
| CSS Flexbox/Grid (5) | `css` | 24 |
| JS Funções (5) | `js-funcoes` | 27 |
| Fetch API (4) | `fetch-async` | 26 |
| Classes JS e Erros (4) | `classes-erros` | 22 |
| React Componentes (4) | `react-componentes` | 24 |
| React useEffect/Forms (7) | `react-hooks-forms` | 27 |
| React Router (4) | `react-router` | 18 |
| Express (4) | `express-rest` | 27 |
| MySQL (4) | `mysql` | 26 |
| JWT (4) | `jwt-auth` | 25 |
| Error Handlers (3) | `validacao-erros` | 18 |
| — (deploy não existia no legado) | `deploy` | 16 |
