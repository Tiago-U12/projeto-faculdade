# Study Mastery 0.6 — arquitetura e plano

Este documento registra o ponto de partida, o que foi reaproveitado, a arquitetura proposta e as decisões da evolução
para estudos personalizados (contas, disciplinas, materiais, guias, questões pessoais, calendário e planejamento).
O andamento por etapa está em [ACOMPANHAMENTO.md](ACOMPANHAMENTO.md).

## 1. Arquitetura atual (0.5.2, confirmada no código em 24/10/2026)

- **App**: React 19 + TypeScript + Vite 6, rotas por hash, KaTeX, `lucide-react`. PWA com service worker próprio
  (`public/sw.js`, pré-cache gerado por `tools/pwa.ts`).
- **Publicação**: Cloudflare Pages (`study-mastery.pages.dev`, configurado no painel) e GitHub Pages (workflow
  `.github/workflows/deploy.yml`, condicionado à variável `PUBLICAR_STUDY_MASTERY`). Ambos estáticos.
- **Banco existente**: 600 questões (300 Cálculo II + 300 Full Stack) em `src/data/published/*.json`, geradas pelo
  pipeline `tools/sm.ts` (draft → verified → approved). Verificação por finalidade e contagens: tela Acervo.
- **Estado do estudante**: `localStorage` `study-mastery:state:v1` (tentativas, estatísticas de repetição espaçada,
  configurações, sessão em andamento). Study Radio: `study-mastery:radio:v1` + IndexedDB `study-mastery-radio`.
- **Não existiam**: autenticação, servidor, banco de dados, armazenamento de arquivos, IA no app.

## 2. Partes reaproveitadas

| Parte | Reuso |
|---|---|
| `lib/engine.ts` (filtros estritos, modos, embaralhamento por ID estável) | Sessões com questões pessoais usam o mesmo motor; o filtro por assunto continua estrito e a falta de questões é informada, nunca completada com outros assuntos |
| `lib/srs.ts` (Leitner) | Estatísticas das questões pessoais e base para "questões para revisar" |
| `lib/storage.ts` (exportar/importar com mescla sem duplicar) | Importação explícita do progresso local para a conta (mesma regra de IDs) |
| Quiz, Resultados, Explicação | Mesmas telas para questões pessoais, com fonte = material + página |
| Service worker e homologação | Mantidos; testes de navegador estendidos |
| Identidade visual (`styles.css`) | Novas telas usam os mesmos tokens, tipografia e componentes |

## 3. Arquitetura proposta

```
Navegador (React/Vite, estático no Cloudflare/GitHub Pages)
 ├─ Banco existente (JSON publicado) ............ igual à 0.5, funciona offline e sem conta
 ├─ Espaço "Neste aparelho" (sem conta) ......... localStorage + IndexedDB
 │    disciplinas, materiais (só texto extraído), questões criadas pelo aluno, calendário, planos
 └─ Espaço "Conta" (opcional, quando configurado) supabase-js (carregado sob demanda)
        │  JWT do usuário em todas as chamadas
        ▼
Supabase (plano gratuito)
 ├─ Auth: e-mail + senha, confirmação e recuperação por e-mail
 ├─ Postgres com RLS: owner_id = auth.uid() em todas as tabelas; FKs compostas (id, owner_id)
 │    impedem ligar um registro a disciplina/material de outra conta
 ├─ Storage: bucket privado "materiais", PDF até 10 MB, pasta = id do usuário (políticas por pasta)
 └─ Edge Functions (Deno)
      ├─ process-material: confere no servidor tipo real (%PDF), tamanho e hash do arquivo enviado
      ├─ generate: guias e lotes pequenos de questões com IA (chave só no servidor), tarefas idempotentes,
      │    limites diários, registro de consumo, validação da saída antes de salvar
      └─ delete-account: apaga arquivos do Storage e a conta (cascata no banco)
```

- **Sem conta** o app continua como hoje e ganha disciplinas, materiais por texto/PDF (texto extraído no aparelho),
  questões criadas pelo aluno, calendário e planejamento — tudo só neste aparelho, com exportação.
- **Com conta** os mesmos recursos ficam no Supabase, isolados por RLS, e o progresso do banco existente sincroniza
  entre aparelhos. Geração por IA só existe com conta (precisa do servidor) e com chave configurada.
- **Importação** do aparelho para a conta só acontece quando o estudante pede, mostrando o que será enviado; IDs
  estáveis evitam duplicar; o original fica no aparelho até o estudante apagá-lo.

## 4. Decisões e justificativas

| # | Decisão | Por quê | Alternativas descartadas |
|---|---|---|---|
| D1 | Manter React/Vite/PWA | Funciona, testado; nada no escopo exige SSR | Next.js (migração sem necessidade) |
| D2 | Supabase para Auth, banco, arquivos e funções | Plano gratuito cobre o uso de uma turma; RLS põe a autorização no banco e no Storage; recuperação de senha pronta; organização "Tiago" já existe (plano Free, sem projetos) | Cloudflare D1/R2 + autenticação própria (login, sessões, recuperação e envio de e-mail feitos à mão — mais código sensível para manter) |
| D3 | Dois espaços (aparelho / conta) com importação explícita | O pedido proíbe associar automaticamente dados de um aparelho compartilhado à primeira conta | Migração automática no login |
| D4 | RLS + FKs compostas + funções com o JWT do usuário | Alterar um ID na requisição não dá acesso nem permite ligar dados a registros de outra conta | Checagem só no frontend |
| D5 | Texto do PDF extraído no navegador (pdf.js); arquivo validado no servidor | Limite de 2 s de CPU por requisição nas Edge Functions torna extração de PDFs grandes no servidor arriscada; no aparelho é gratuita e mostra a prévia na hora | Extração só no servidor |
| D6 | IA só no servidor, atrás de interface de provedor; sem chave = "IA não configurada" | Chave fora do frontend; nada simulado apresentado como real | Chamar a IA do navegador |
| D7 | Guia sem IA = "Trechos do seu material" por assunto, com página | Útil e verificável; não finge resumo | Resumo "inventado" por heurística |
| D8 | Questões pessoais com status próprio ("criada por você", "gerada por IA — checagens automáticas") | Não herdar as verificações do banco existente | Marcar como "verificada" |
| D9 | Calendário interno; datas de dia inteiro como `AAAA-MM-DD`; horários como hora local + fuso do evento | Dia inteiro nunca muda de dia por fuso; fuso editável | Guardar tudo em UTC |
| D10 | Planejamento por regras determinísticas, com prévia e confirmação | Verificável e testável; sem custo | Plano por IA sem validação |
| D11 | Progresso do banco existente sincronizado por tentativas imutáveis (IDs) e estatísticas recalculadas | Mescla sem conflito entre aparelhos | Último a salvar vence |

## 5. Dependências externas

| Serviço | Uso | Situação |
|---|---|---|
| Supabase (Free) | Auth, Postgres, Storage, Edge Functions | Código e migrações prontos; **projeto ainda não criado** (precisa de autorização) |
| SMTP próprio (ex.: Resend, Brevo) | E-mails de confirmação e recuperação para colegas | O SMTP padrão do Supabase só envia para membros da equipe da organização e com limite por hora |
| Provedor de IA | Guias e questões geradas | Opcional; **sem chave configurada** a geração aparece como indisponível |
| Cloudflare Pages | Publicação | Já existe; recebe `VITE_SUPABASE_URL` e a chave publicável quando a conta for ativada |

Limites oficiais do Supabase Free (docs consultadas em 24/10/2026): 2 projetos ativos; banco de 500 MB por projeto
(acima disso fica somente leitura); 1 GB de Storage; 5 GB de egress; 500 mil invocações de Edge Functions/mês;
50 mil usuários ativos/mês; Edge Functions com 256 MB de memória, 2 s de CPU por requisição e 150 s de duração;
projeto pausado após 7 dias de pouca atividade (retomável pelo painel em até 90 dias).

## 6. Etapas e critérios de aceitação

| Etapa | Critério de aceitação |
|---|---|
| A. Diagnóstico e melhorias | Painel "Como verificamos as questões" com contagens do banco; "questões disponíveis"; diagnóstico do A52 com reproduzido × hipótese × limitação; ajuda que não apaga progresso |
| B. Contas, autorização, disciplinas | Migrações com RLS; teste com duas contas tentando ler/alterar/ligar dados uma da outra falha em todos os casos; login, saída e recuperação; importação explícita sem duplicar; disciplinas com nome, descrição, período, cor e assuntos |
| C. Materiais | PDF e texto colado; tipo e tamanho validados no servidor; página de origem; prévia; vazio/insuficiente/fórmulas sinalizados; estados Recebido → Processando → Pronto / Precisa de atenção / Falhou; nova tentativa sem duplicar; exclusão em cascata |
| D. Guias e questões | Assuntos confirmados antes de gerar; escopo de prova confirmado; complemento identificado; seção regenerável com versão; questões pessoais com ID, versão e status; sessões até 20 sem completar com outros assuntos; relatar erro; histórico com a versão respondida |
| E. Calendário e planejamento | Mês, semana e lista; tipos e status; vencidos não concluídos sozinhos; prévia do plano antes de criar; conflitos, falta de tempo, nada depois da prova; sessão perdida com sugestão que espera confirmação; fuso editável |
| F. Integração e documentação | Progresso por assunto/disciplina com diferença entre atividade concluída, desempenho e evidência; docs, custos e limites; roteiro de teste para colegas; testes de navegador com capturas |
