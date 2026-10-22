# Changelog

## 0.3.0 — 2026-10-22
- Reescrita modular do app (React 19 + TypeScript + Vite): home, configuração, quiz, resultados, progresso e acervo; tema claro/escuro; PWA.
- Motor puro e testado: filtros estritos, sessões por modo, embaralhamento por ID, Leitner, armazenamento local com exportação/importação.
- Pipeline editorial completo (`tools/`): import, ingest, generate-drafts, validate, review, publish, coverage-report; verificação SymPy+mpmath e execução JS isolada.
- Taxonomia com cotas (100 por dificuldade por disciplina), registro de fontes com hash, livro-razão de IDs.
- Banco: Cálculo II — L'Hôpital, antiderivadas, substituição e integral definida (assuntos da prova de 26/10) aprovados.
- Corrigido: `React` não importado (o build do v0.2 falhava); modo Revisão reembaralhava a lista priorizada; fonte errada em `calc-003`.

## 0.2.1
- Protótipo recebido (50 questões legadas de Full Stack + 4 demonstrativas de Cálculo II).
