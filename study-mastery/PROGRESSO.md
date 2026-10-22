# Progresso — Study Mastery

Atualizado a cada etapa. As **contagens** abaixo são geradas do banco (`npm run progress`); o restante é mantido à mão.

## Contagens validadas

<!-- CONTAGENS:INICIO -->
_Gerado automaticamente em 2026-10-22T23:43:00.315Z por `npm run progress`. Só contam questões **aprovadas**; rascunhos, verificadas-não-aprovadas e rejeitadas ficam fora._

**Total aprovado: 243 de 600** (faltam 357).

| Disciplina | Fácil | Média | Difícil | Total |
|---|---:|---:|---:|---:|
| Cálculo II | 81/100 | 81/100 | 81/100 | 243/300 |
| Desenvolvimento Web Full Stack | 0/100 | 0/100 | 0/100 | 0/300 |

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
| Derivadas parciais e derivada total | 0/7 | 0/7 | 0/7 | 0/21 | não |
| Integrais duplas | 0/6 | 0/6 | 0/6 | 0/18 | não |
| Otimização com e sem restrições | 0/6 | 0/6 | 0/6 | 0/18 | não |

Fluxo editorial (todas as questões da disciplina): aprovadas 243 · verificadas aguardando revisão 0 · rascunhos 0 · rejeitadas 0.

#### Desenvolvimento Web Full Stack — por assunto

| Assunto | Fácil | Média | Difícil | Total | Sessão de 20? |
|---|---:|---:|---:|---:|:--:|
| HTML semântico e Emmet | 0/7 | 0/7 | 0/6 | 0/20 | não |
| CSS: Flexbox, Grid e mobile-first | 0/8 | 0/8 | 0/8 | 0/24 | não |
| JavaScript: funções puras e arrays | 0/10 | 0/9 | 0/8 | 0/27 | não |
| Fetch, Promises e CORS | 0/9 | 0/8 | 0/9 | 0/26 | não |
| Classes, validação e erros customizados | 0/7 | 0/7 | 0/8 | 0/22 | não |
| React: componentes, JSX e props | 0/8 | 0/8 | 0/8 | 0/24 | não |
| React: useState, useEffect e formulários | 0/9 | 0/9 | 0/9 | 0/27 | não |
| React Router | 0/6 | 0/6 | 0/6 | 0/18 | não |
| API REST com Express | 0/9 | 0/9 | 0/9 | 0/27 | não |
| MySQL e persistência | 0/8 | 0/9 | 0/9 | 0/26 | não |
| Autenticação: JWT e bcrypt | 0/8 | 0/8 | 0/9 | 0/25 | não |
| Validação e tratamento de erros na API | 0/6 | 0/6 | 0/6 | 0/18 | não |
| Deploy: Render, MySQL gerenciado e Netlify | 0/5 | 0/6 | 0/5 | 0/16 | não |

Fluxo editorial (todas as questões da disciplina): aprovadas 0 · verificadas aguardando revisão 0 · rascunhos 0 · rejeitadas 0.

★ = assunto cobrado na prova de 26/10/2026.

Verificação das aprovadas: 62 por `sympy+mpmath.diff` · 10 por `sympy+amostragem` · 37 por `sympy+mpmath` · 62 por `sympy+independente` · 7 por `sympy+mpmath (por alternativa)` · 37 por `sympy+mpmath.quad` · 12 por `source-review` · 2 por `sympy+mpmath (forma)` · 14 por `sympy+amostragem+mpmath.taylor`.
Revisão das aprovadas: 243 `ai-assisted`. **Nenhuma questão passou por revisão humana ainda** quando `human` não aparece acima.
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

- **Revisão humana**: toda aprovação até aqui é "assistida por IA" (verificação automática + leitura crítica em passada separada da autoria). Recomenda-se amostragem humana; `npm run sm -- publish --require-human` publica só o que um humano aprovou.
- **Rede bloqueada para fontes externas** (OpenStax, MDN, react.dev, RFCs, dev.mysql.com): nenhuma questão cita essas fontes (a validação recusa fontes não lidas). Para liberar, adicione os hosts em *Allowed domains* do ambiente.
- **Materiais não lidos**: `Lista_CalcII.pdf` (Revisão NI1) e `3a Lista CB — Máximos e Mínimos` nunca foram recebidos (registrado no Drive). O PDF da 2ª lista de L'Hôpital/integrais tem matemática em imagem; foi lida por renderização.
- **Deploy**: nada foi publicado. O workflow `.github/workflows/deploy.yml` do repositório não foi alterado.
