# Changelog

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
