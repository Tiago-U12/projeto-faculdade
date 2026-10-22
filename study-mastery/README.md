# Study Mastery v0.2 — Protótipo funcional e handoff

## Executar
`npm install && npm run dev` — abrir URL exibida pelo Vite. `npm run build` e `npm test` para validar. **A compilação não foi confirmada neste ambiente por indisponibilidade/timeout ao instalar dependências.**

## Incluído
- React + TypeScript + Vite, UI mobile-first, configuração por disciplina/assunto, profundidade, modos (aprender/simulado/revisão/misto — misto usa sorteio geral nesta etapa), sorteio sem reposição, alternativas embaralhadas com gabarito consistente, resultado e persistência local.
- 50 questões originais importadas integralmente de `Quiz Fullstack.txt` para `src/data/legacy.json`, mantendo enunciados e índices. Marcadas `needs-review` porque precisam de verificação pedagógica; o interruptor na tela permite testá-las deliberadamente.
- 4 questões iniciais de Cálculo II, com referências de origem, para demonstrar o formato. Apenas uma parte pequena do acervo foi transformada em perguntas. Questões adicionais precisam de validação humana.
- Não há backend, autenticação, scraping, geração automática de questões ou sincronização com Google Drive ativos. Essas integrações estão na especificação.

## Priorização para Codex / Claude Code
1. Rodar npm install/build/test, corrigir problemas e adicionar testes de interface.
2. Ajustar erro de lógica: `modo revisão` deve priorizar assuntos fracos **sem permitir que prepare() embaralhe a lista priorizada**; criar algoritmo com quotas e não repetir IDs.
3. Remover o modo demonstração `includeLegacy` por padrão na publicação, validar/atualizar as 50 questões e incorporar explicações fundamentadas.
4. Implementar matemática com KaTeX e LaTeX estruturado no schema, não parsing heurístico de texto solto.
5. Exportar/importar progresso, filtros persistentes, acessibilidade WCAG, pwa e offline.
6. Criar pipeline offline de ingestão autorizada de materiais, busca em referências licenciadas, elaboração de rascunhos, validação e aprovação, com fontes obrigatórias.

## Arquitetura do banco
Question: `id`, `disciplina`, `topic`, `stem`, `options[]`, `correctIndex`, `explanation`, `difficulty`, `scope`, `status`, `sourceRefs[]`. `eligible()` filtra assunto, escopo e aprovação; `prepare()` embaralha questões e alternativas, remapeia o gabarito. Acervo original e fontes estão em `src/data/`.

## Critérios de pronto v0.2
- Aluno consegue selecionar disciplinas e assuntos, responder e corrigir sessão sem backend, ver feedback e progresso local.
- Nunca inserir conteúdo de tópico não marcado.
- Não fingir ter 20 questões quando só há menos disponíveis.
- Nunca publicar uma pergunta marcada `needs-review` em produção.

## Fontes do usuário
- Documento de visão v0.1 e decisões desta conversa.
- `Quiz Fullstack.txt` (React legado) e `quiz_fullstack.html` (legado).
- PDFs do Moodle, biblioteca `Biblioteca IA Compartilhada / 03 - Estudos / 2º Semestre`.

## Design editável
Figma: https://www.figma.com/design/lzLggq8DeRH3fMgWnsFbgQ
