# Progresso — Study Mastery

Atualizado a cada etapa. As **contagens** abaixo são geradas do banco (`npm run progress`); o restante é mantido à mão.

## Contagens validadas

<!-- CONTAGENS:INICIO -->
_Gerado automaticamente em 2026-10-23T01:13:52.063Z por `npm run progress`. Só contam questões **aprovadas**; rascunhos, verificadas-não-aprovadas e rejeitadas ficam fora._

**Total aprovado: 397 de 600** (faltam 203).

| Disciplina | Fácil | Média | Difícil | Total |
|---|---:|---:|---:|---:|
| Cálculo II | 100/100 | 100/100 | 100/100 | 300/300 |
| Desenvolvimento Web Full Stack | 34/100 | 32/100 | 31/100 | 97/300 |

#### Cálculo II — por assunto

| Assunto | Fácil | Média | Difícil | Total | Sessão de 20? |
|---|---:|---:|---:|---:|:--:|
| Regras de derivação (revisão) | 6/6 | 6/6 | 5/5 | 17/17 | não |
| Linearização, Taylor e Maclaurin | 7/7 | 7/7 | 7/7 | 21/21 | sim |
| Máximos, mínimos, concavidade e inflexão | 9/9 | 9/9 | 9/9 | 27/27 | sim |
| Regra de L'Hôpital ★ | 15/15 | 15/15 | 15/15 | 45/45 | sim |
| Antiderivadas e integrais indefinidas ★ | 13/13 | 13/13 | 13/13 | 39/39 | sim |
| Integração por substituição ★ | 13/13 | 13/13 | 13/13 | 39/39 | sim |
| Integral definida, Riemann, TFC e áreas ★ | 13/13 | 13/13 | 14/14 | 40/40 | sim |
| Funções de várias variáveis | 5/5 | 5/5 | 5/5 | 15/15 | não |
| Derivadas parciais e derivada total | 7/7 | 7/7 | 7/7 | 21/21 | sim |
| Integrais duplas | 6/6 | 6/6 | 6/6 | 18/18 | não |
| Otimização com e sem restrições | 6/6 | 6/6 | 6/6 | 18/18 | não |

Fluxo editorial (todas as questões da disciplina): aprovadas 300 · verificadas aguardando revisão 0 · rascunhos 0 · rejeitadas 0.

#### Desenvolvimento Web Full Stack — por assunto

| Assunto | Fácil | Média | Difícil | Total | Sessão de 20? |
|---|---:|---:|---:|---:|:--:|
| HTML semântico e Emmet | 7/7 | 7/7 | 6/6 | 20/20 | sim |
| CSS: Flexbox, Grid e mobile-first | 8/8 | 8/8 | 8/8 | 24/24 | sim |
| JavaScript: funções puras e arrays | 10/10 | 9/9 | 8/8 | 27/27 | sim |
| Fetch, Promises e CORS | 9/9 | 8/8 | 9/9 | 26/26 | sim |
| Classes, validação e erros customizados | 0/7 | 0/7 | 0/8 | 0/22 | não |
| React: componentes, JSX e props | 0/8 | 0/8 | 0/8 | 0/24 | não |
| React: useState, useEffect e formulários | 0/9 | 0/9 | 0/9 | 0/27 | não |
| React Router | 0/6 | 0/6 | 0/6 | 0/18 | não |
| API REST com Express | 0/9 | 0/9 | 0/9 | 0/27 | não |
| MySQL e persistência | 0/8 | 0/9 | 0/9 | 0/26 | não |
| Autenticação: JWT e bcrypt | 0/8 | 0/8 | 0/9 | 0/25 | não |
| Validação e tratamento de erros na API | 0/6 | 0/6 | 0/6 | 0/18 | não |
| Deploy: Render, MySQL gerenciado e Netlify | 0/5 | 0/6 | 0/5 | 0/16 | não |

Fluxo editorial (todas as questões da disciplina): aprovadas 97 · verificadas aguardando revisão 0 · rascunhos 0 · rejeitadas 0.

★ = assunto cobrado na prova de 26/10/2026.

Verificação das aprovadas: 94 por `sympy+independente` · 68 por `sympy+mpmath.diff` · 11 por `sympy+amostragem` · 37 por `sympy+mpmath` · 7 por `sympy+mpmath (por alternativa)` · 18 por `sympy+mpmath.quad(aninhada)` · 37 por `sympy+mpmath.quad` · 16 por `source-review` · 2 por `sympy+mpmath (forma)` · 14 por `sympy+amostragem+mpmath.taylor` · 35 por `web-chromium (sem rede)` · 11 por `node-exec (--permission, sandbox)` · 38 por `js-exec (node --permission)` · 9 por `web-chromium (servidores locais)`.
Revisão das aprovadas: 397 `ai-assisted`. **Nenhuma questão passou por revisão humana ainda** quando `human` não aparece acima.
<!-- CONTAGENS:FIM -->

## Estado por etapa (implementado × testado × planejado)

| Etapa | Estado | Evidência |
|---|---|---|
| P0 — auditoria, build e testes do código existente | **feito** | build falhava (`React` não importado); reescrito em módulos; `npm run build` e `npm test` passam |
| P1 — UI navegável, 4 modos, filtros estritos, histórico local, E2E | **feito e testado** | testes unitários + E2E em Chromium 390 px (`npm run e2e`), capturas em `docs/screenshots/` |
| P2 — schema, importação, validadores, fila de revisão, cobertura | **feito e testado** | `tools/` + testes em `tools/lib/__tests__/` |
| P3 — gerador de rascunhos por lotes com provedor injetável | **feito**; provedor real **não testado contra a API** (sem chave neste ambiente) | testado com `MockProvider` e `fetch` simulado |
| P4 — expansão até 600 aprovadas | **em andamento** | ver contagens |
| P5 — PWA/offline, acessibilidade, deploy gratuito | PWA (service worker + manifest) feito; deploy **não feito** (precisa da sua autorização) | `public/sw.js` |

## Pendências e riscos

- **Próximo passo — Full Stack (0/300)**: auditar/reescrever as 50 questões legadas (`content/legacy/legacy-v01.json`), montar a verificação de Full Stack (sandbox Node com express/jsonwebtoken/bcryptjs/mysql2/react SSR, Chromium para HTML/CSS, SQLite para SQL), registrar as fontes (READMEs das aulas) e escrever os lotes por assunto conforme `content/taxonomy.json`. Cálculo II está completo (300/300).
- **Cálculo II sem aula no material**: derivadas parciais, integrais duplas e otimização usam o conteúdo programático (`c2-programa`) como fonte; os enunciados são originais e verificados por SymPy/mpmath. Se a professora enviar slides desses temas, vale conferir o alinhamento de notação.

- **Revisão humana**: toda aprovação até aqui é "assistida por IA" (verificação automática + leitura crítica em passada separada da autoria). Recomenda-se amostragem humana; `npm run sm -- publish --require-human` publica só o que um humano aprovou.
- **Rede bloqueada para fontes externas** (OpenStax, MDN, react.dev, RFCs, dev.mysql.com): nenhuma questão cita essas fontes (a validação recusa fontes não lidas). Para liberar, adicione os hosts em *Allowed domains* do ambiente.
- **Materiais não lidos**: `Lista_CalcII.pdf` (Revisão NI1) e `3a Lista CB — Máximos e Mínimos` nunca foram recebidos (registrado no Drive). O PDF da 2ª lista de L'Hôpital/integrais tem matemática em imagem; foi lida por renderização.
- **Deploy**: nada foi publicado. O workflow `.github/workflows/deploy.yml` do repositório não foi alterado.
