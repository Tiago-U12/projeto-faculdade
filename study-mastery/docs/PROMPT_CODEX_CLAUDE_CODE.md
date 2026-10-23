# PROMPT PRINCIPAL — CODEX OU CLAUDE CODE — STUDY MASTERY v0.2.1

Assuma o papel de desenvolvedor sênior full stack, designer de produto mobile-first e arquiteto de conteúdo educacional. Sua missão é transformar o projeto React/TypeScript fornecido neste ZIP em uma aplicação funcional, agradável, acessível e testada; construir também o pipeline editorial que irá gerar e validar um banco-alvo de 600 questões. Trabalhe diretamente nos arquivos, com entregas incrementais e registros de progresso. Não comece do zero.

## 0. Estado real e recursos já existentes
- Antes de editar, leia `README.md`, `docs/IMPLEMENTACAO.md`, `src/main.tsx`, `src/engine.ts`, `src/engine.test.ts`, `src/data/calculo.json`, `src/data/legacy.json` e o presente documento.
- Há 50 questões legadas de Full Stack, marcadas como necessitando revisão, e apenas 4 questões demonstrativas de Cálculo II. NÃO afirme que 600 questões já existem.
- As 13 aulas de Desenvolvimento Web Full Stack e 15 PDFs de Cálculo II estão organizados no Google Drive, caso a conexão autorizada esteja disponível. A ferramenta de código pode não ter acesso automático ao Drive, mesmo que a conversa anterior tivesse. Se faltar acesso, desenvolva a aplicação e pipeline com fontes locais/fixtures e produza um manifesto preciso dos arquivos que faltam, sem alegar que os leu.
- Biblioteca: `Biblioteca IA Compartilhada → 03 - Estudos → 2º Semestre → Cálculo II / Desenvolvimento Web Full Stack`.
- Design editável: https://www.figma.com/design/lzLggq8DeRH3fMgWnsFbgQ . Evolua as telas sem reinventar a identidade visual (fundo azul-marinho, lavanda e verde-menta), com ótima usabilidade no celular.
- Não inclua Projeto Interdisciplinar / TrocaTicket na disciplina Full Stack.

## 1. Meta do banco: 600 questões de qualidade
- Cálculo II: 100 fáceis, 100 médias e 100 difíceis = 300.
- Desenvolvimento Web Full Stack: 100 fáceis, 100 médias e 100 difíceis = 300.
- Total = 600 questões **aprovadas** como META de produção. Questões candidatas/rejeitadas não contam nessa meta.
- Distribua a meta entre os assuntos reais de cada disciplina (não 100 de cada assunto). Faça uma tabela de cotas por assunto x dificuldade baseada no currículo e na importância pedagógica. Evite que um assunto tenha poucas questões quando o estudante quiser um simulado de 20; onde a cobertura for insuficiente, mostre aviso e registre lacuna em vez de inserir temas não selecionados.
- Trabalhe em lotes pequenos (por exemplo 10–20 por assunto/dificuldade), validando cada lote antes do próximo. Não force 600 questões superficiais em uma única resposta/chamada. Registre contagem: candidatas, aprovadas, rejeitadas, fontes faltantes, assunto e dificuldade. Se não for possível completar todas as 600 com rigor ou recursos disponíveis, entregue as aprovadas + gerador/revisor + relatório de lacunas; nunca marque a meta como concluída sem verificação.

## 2. Fontes e profundidade
- Camada `aula`: aderência aos materiais da faculdade. Crie questões novas sobre os conceitos da fonte, sem copiar enunciados protegidos indevidamente.
- Camada `aprofundamento`: métodos alternativos, novos exemplos e aplicações dos MESMOS assuntos escolhidos. Use fontes externas de confiança e com uso permitido: documentação oficial para HTML/CSS/JS/React/Node e materiais matemáticos cuja licença/termos permitam o uso pretendido.
- Camada `desafio`: problemas com raciocínio mais profundo, mas ainda dentro dos tópicos selecionados.
- `difficulty` (`facil|medio|dificil`) é independente de `scope` (`aula|aprofundamento|desafio`). Não confunda questão difícil com tópico externo não selecionado.
- Nunca alegue proveniência documental sem ter acessado a fonte. Registre metadados título, URL/Drive ID, instituição/autor, licença quando aplicável, seção/página, data e tipo de uso. Não copie conteúdo de terceiros sem autorização nem use dados pessoais de alunos.

## 3. Qualidade e confiabilidade das questões
Cada questão deve possuir: ID persistente único; disciplina; tema/subtema; dificuldade; camada; tipo; enunciado claro; alternativas; ID estável da alternativa correta; explicação pedagógica para certo/errado e resolução passo a passo onde cabível; erros frequentes; referências verificáveis; status `draft|verified|approved|rejected`; versão e datas. Suportar LaTeX/KaTeX em matemática.
- Múltipla escolha como tipo inicial (4 alternativas, apenas uma correta); futuramente respostas numéricas, expressões e código.
- Embaralhar alternativas sem perder a resposta correta; nunca repetir ID numa rodada.
- Validação automatizada de schema, fórmulas, resposta única, faixa de dificuldade, integridade de fonte e duplicação lexical/semântica; não disfarçar duplicata só mudando números.
- Em Cálculo II, utilizar SymPy e testes numéricos como dupla verificação quando aplicável, além de revisão dos casos excepcionais (domínio, sinais, limites laterais, constantes de integração, regras de L'Hôpital, etc.). Em Full Stack, conferir comportamento com testes de código e documentação por versão; nunca executar código de candidatos sem isolamento seguro.
- Um gerador de IA produz **rascunhos** e um processo separado verifica; publicar somente itens `approved` após revisão final. Não publicar sem gabarito demonstravelmente correto.

## 4. Experiência do aluno
- Estrutura acadêmica: Semestre → Disciplina → Assunto → Questões.
- O estudante escolhe manualmente os assuntos da prova (ex.: apenas L'Hôpital) e a profundidade (apenas aula; aula + aprofundamento dos mesmos temas; também desafios dos mesmos temas). Nenhum tópico desmarcado aparece.
- Modos funcionais e distintos: Aprender (feedback imediato); Simulado (gabarito/resultado no final); Revisão (prioriza erros e repetição espaçada); Misto (mistura conteúdos selecionados e dificuldades).
- Sessões 5/10/20, sendo 20 o padrão. Configurações, progresso e histórico no dispositivo sem obrigar cadastro; opções de exportar/importar histórico. Nunca inventar 20 questões quando o conjunto elegível é menor.
- Interface mobile-first visualmente caprichada; dashboard, cartões por disciplina, progressão, evolução por tema, animações sutis, estados vazios, dark/light se viável, boa tipografia, acessibilidade teclado/leitor de tela, reduced-motion.
- Não usar chamada paga de IA para cada sessão: alunos consomem banco previamente aprovado, permitindo operação gratuita/baixo custo.

## 5. Pipeline editorial de expansão contínua
Separado da experiência do aluno:
1. Inventariar novos materiais com consentimento e conexão autorizada (Drive/arquivos importados, documentos externos permitidos).
2. Registrar origem, licença/termos, hash e conteúdo extraído; apontar duplicações e atualizações.
3. Classificar temas/subtemas e mapear lacunas de cobertura.
4. Gerar lotes de candidatas com IA com referências; injetar provedores por interface, configurar chaves SOMENTE via variáveis de ambiente do serviço de manutenção.
5. Validar esquema, matemática/código, gabarito, fontes e semelhança.
6. Submeter ao painel/fila de revisão editorial; aprovar/rejeitar com motivo e logs.
7. Publicar banco versionado em JSON inicialmente; Supabase/Postgres é evolução opcional, nunca requisito de uso do aluno.
8. Registrar mudança de versão e migrar histórico sem perder IDs.
- Expor comandos claros para `import`, `generate-drafts`, `validate`, `review`, `publish`, `coverage-report` ou equivalents; usar mocks/fixtures sem APIs para testes.
- Não faça scraping autenticado do Moodle sem capacidade explícita e autorização. Não salvar senha nem tokens no repositório.

## 6. Ordem de execução (prioridade)
P0. Inspecione o repositório existente, instale dependências, rode build/test, corrija erros e preserve o que funciona. Faça auditoria das 50 questões legadas e das quatro demonstrativas.
P1. Conclua a UI navegável e os quatro modos, os filtros estritos, o embaralhamento estável, histórico local e testes E2E. Use o Figma como referência. Mostre execução real com capturas quando possível.
P2. Crie schema do banco, importação, validadores, fonte/referência, fila de revisão e relatório de cobertura. Sem IA online obrigatória.
P3. Implemente mecanismo de geração por lotes com IA configurável e revisão; gere as primeiras questões fundamentadas efetivamente disponíveis, validando uma por uma e documentando quantas foram aprovadas.
P4. Amplie progressivamente até 100 fáceis + 100 médias + 100 difíceis para cada disciplina (600), por assunto, com rastreabilidade. Não sacrifique correção para cumprir número.
P5. Refine interface, desempenho, PWA/offline, acessibilidade, testes e documentação para deploy gratuito.

## 7. Aceite e prestação de contas
- Aplicação inicia com `npm install`, `npm run dev`; `npm run build` e `npm test` passam. Acrescente testes de filtragem, shuffle/gabarito, sessão sem repetição, localStorage/IndexedDB, permissões do pipeline e publicação.
- Estudante consegue concluir sessões de 20 questões dos assuntos elegíveis quando houver pelo menos 20 itens aprovados. Se não houver, informar a falta e não expandir silenciosamente para outro tema.
- Qualquer questão publicada possui explicação correta, referência e revisão documentada.
- O relatório final distingue implementado, testado e planejado; inclui contagem VALIDADA por dificuldade/tema/disciplina e meta restante para atingir 600.
- Atualize README, changelog, arquivos de especificação e um `PROGRESSO.md` a cada etapa. Não espere terminar as 600 para salvar e versionar.
- Se houver acesso a GitHub autorizado, faça commits pequenos e claros. Não publique nem faça deploy público sem autorização explícita.

Comece pela auditoria e pelos testes da base existente. Prossiga com código funcional e resultados verificáveis; não responda apenas com planejamento.
