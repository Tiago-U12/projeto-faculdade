# Plano de implementação — Study Mastery

## Produto
Público universitário, primeira versão sem cadastro, mobile-first e gratuita no uso cotidiano. Semestre → Disciplina → Assunto → Questão; seleção manual de temas, avaliação configurada pelo estudante. 20 perguntas é a configuração principal; 5/10 opcionais. Modos aprender (feedback imediato), simulado (resultado final), revisão (foco nos erros) e misto (temas escolhidos).

## Expansão do conteúdo
Camada 1: materiais da faculdade com referência. Camada 2: fontes externas autorizadas/referências abertas, aprofundamento dos mesmos assuntos. Camada 3: desafios avançados relacionados ao filtro, não novos temas inadvertidos. Fontes candidatas: OpenStax (verificar licença/termos específicos de uso por IA), MDN, React, Node docs. Não copiar automaticamente material protegido.

Pipeline administrado separadamente do app: (1) inventário Drive/links com permissão, (2) extrair conteúdo e deduplicar por hash, (3) classificar disciplina e assunto, (4) encontrar lacunas, (5) elaborar candidatos com IA + citações, (6) validação sintática e factual (SymPy em matemática / testes em programação), (7) revisão humana e status `approved`, (8) versão do pacote de questões publicada. Alunos estudam localmente sem chamadas de IA por sessão.

## QA, segurança e rastreabilidade
Referência da fonte por questão; status de revisão; proibir pergunta sem gabarito coerente, alternativas ambíguas, duplicatas semânticas e fórmulas inválidas. Guardar versão, licença/URL/título/autor do material e data de acesso. Não indexar entregas pessoais, dados de estudantes ou conteúdo sem autorização. Nunca executar código gerado diretamente no navegador dos alunos.

## Roadmap
P0 — importar 50 questões legadas, filtros manuais, UI e sessões, modos básicos, teste de gabarito embaralhado, histórico local.
P1 — validadores, painel editorial, matemática com KaTeX, ingestão manual do banco validado de Cálculo II, filtros persistentes.
P2 — revisão espaçada e calibração por taxa de acerto.
P3 — automação controlada de ingestão externa; Supabase opcional para login/sincronização e pipeline editorial.

## Estado da implementação (v0.4)

- Entregue e testado: app React/Vite (4 modos, filtros estritos, Leitner, histórico local, exportar/importar, PWA), pipeline editorial completo (`tools/sm.ts`) e **600 questões aprovadas** (300 Cálculo II + 300 Full Stack) com verificação executável (SymPy/mpmath, Node isolado, React, Express, MariaDB temporário, Chromium).
- Suíte: testes unitários e do pipeline (`npm test`) e E2E em Chromium a 390 px (`npm run e2e`, inclui sessão de Full Stack com código).
- Pendências conscientes: revisão humana (todas as aprovações são `ai-assisted`); provedor de IA real e download real do Google Drive nunca rodaram contra as APIs (apenas mocks); fontes externas (`ext-*`) continuam `accessed: false` porque os domínios estavam bloqueados; deploy público não foi feito (depende de autorização).
- As 50 questões legadas de Full Stack não foram publicadas: veja `docs/AUDITORIA_LEGADO.md`.
