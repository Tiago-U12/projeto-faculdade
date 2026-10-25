# Acompanhamento — Study Mastery 0.6 (estudos personalizados)

Lista viva para retomar o trabalho sem repetir. Atualizada a cada checkpoint.

- **Branch**: `ccr-71aa1f28-s1s3f6` (base da entrega; publicação do modo local autorizada em 24/10/2026).
- **Pedido**: evoluir para estudos personalizados (etapas A–F). Arquitetura e decisões: [ARQUITETURA_V06.md](ARQUITETURA_V06.md).
- **Regras que valem sempre**: não declarar revisão humana; publicação e merge apenas no escopo autorizado; não criar serviço pago;
  segredos nunca no repositório/frontend/logs; IA só no servidor; nada simulado apresentado como integração real.

## Continuação Codex — autorização atual

Tiago autorizou finalizar e colocar o site no ar. A liberação cobre a versão local gratuita; contas/Supabase/SMTP e IA não são ativados sem configuração e validação reais. As restrições de não publicar dos checkpoints anteriores foram superadas por essa autorização. Código e resultados novos em [ENTREGA_V06_CODEX.md](ENTREGA_V06_CODEX.md); os resultados abaixo permanecem como histórico do trabalho anterior.

## Estado por etapa

| Etapa | Estado | Checkpoint | Evidência |
|---|---|---|---|
| A. Diagnóstico e melhorias existentes | concluída | commit "Etapa A" | `docs/DIAGNOSTICO_A52.md`; `tests/e2e/a52-diagnostico.ts` (4 cenários); vitest 682; e2e 39; homologação 138/138 (GitHub e Cloudflare); render 600×2; offline; redirects; test:pwa 7 |
| B. Contas, autorização e disciplinas | concluída (sem projeto Supabase real) | commit "Etapa B" | `tests/db/contas.test.ts` 10 casos de duas contas em Postgres 16 local; vitest 712; `tests/e2e/v06.ts` 33 (390/320 px, axe); e2e 39; homologação 138/138. **Não testado**: Auth/PostgREST/Storage reais (sem projeto e sem rede até supabase.co) |
| C. Materiais e processamento | concluída (sem projeto Supabase real) | commit "Etapa C" | coleção `tests/fixtures/materiais` (9 casos, conteúdo próprio, gerador em `tools/fixtures`); `src/materials/__tests__/extract.test.ts` 10 (pdf.js real); `tests/db/materiais.test.ts` 7; `tests/functions/processMaterial.test.ts` 7 (simulado); `deno check` das funções; `tests/e2e/v06.ts` 65 (390/320 px, axe). **Não testado**: Storage/Edge Functions reais (`tests/integration/supabase-real.ts` pronto, não executado) |
| D. Guias e questões | concluída (sem projeto Supabase real e sem chave de IA) | commit "Etapa D" | `tests/functions/generation.test.ts` 14 (trecho literal na página citada, 4 alternativas distintas, sem "todas/nenhuma", duplicatas, complemento marcado); `tests/functions/generateCore.test.ts` 8 (pedido repetido não gera em dobro, concorrência, limite diário, falha preserva a seção anterior; IA simulada); `tests/db/guias.test.ts` 6 (isolamento, só o servidor grava tarefas/consumo, mescla de seção com versão anterior, exclusão em cascata a partir do material); `src/lib/__tests__/personal-session.test.ts` 5 (filtro estrito, sessão menor sem completar com outro assunto, gabarito preservado, versão respondida no histórico); `src/materials/__tests__/delete.test.ts` 2; `src/personal/__tests__/ai.test.ts` 6; `deno check` das 3 funções; `tests/e2e/v06.ts` 113 (390/320 px, axe); e2e, offline, homologação 138/138, render 600×2, test:pwa 7. **Não testado**: chamada real ao provedor de IA (sem chave; o provedor em `_shared/ai.ts` só passou no `deno check`) e a função `generate` hospedada |
| E. Calendário e planejamento | concluída (sem projeto Supabase real) | commit "Etapa E" | regras em [AGENDA.md](AGENDA.md); `src/calendar/__tests__/time.test.ts` 7 (fusos, horário de verão, meia-noite, dia inteiro); `plan.test.ts` 12 (nada na prova ou depois, disponibilidade, conflitos, tempo insuficiente, desempenho só com evidência, plano adulterado recusado, atraso nunca concluído, sugestão para sessão perdida); `tests/db/agenda.test.ts` 3 (duas contas, dia inteiro × horário, exclusão com a disciplina); mapeamento evento ↔ linha; `tests/e2e/v06.ts` 175 (390/320 px, axe: criar, atrasado, reagendar com sugestão, conflito, concluir, cancelar, mês/semana/lista, Hoje, fuso, planejamento com falta de tempo e com confirmação). **Não testado**: tabela `events` no Supabase real. Google Agenda: só documentado (não implementado) |
| F. Integração, revisão e documentação | concluída (sem serviços reais) | commit "Etapa F" | progresso com atividade × desempenho × evidência (`src/lib/__tests__/progress.test.ts` 5); próximas provas e pendências no Progresso e no Início; página “Seus dados e privacidade” (`#/dados`) e aviso do que vai para a IA ao lado dos botões de gerar; exclusão do material também leva as tarefas de geração que o usaram (`tests/db/guias.test.ts`); custos com preços oficiais ([CUSTOS_E_LIMITES.md](CUSTOS_E_LIMITES.md)); README; [roteiro para colegas](ROTEIRO_TESTES_COLEGAS.md); `tests/e2e/v06.ts` 293 (390, 320 e 1280 px, axe, console, build sem segredos); `tests/integration/supabase-real.ts` ampliado (guias, questões, agenda, funções) — **não executado** |

## Depende do Tiago (não bloqueia o trabalho local)

1. Autorizar a criação do projeto Supabase gratuito (organização "Tiago", plano Free, hoje sem projetos) — ou criá-lo.
2. Liberar o domínio `*.supabase.co` na rede deste ambiente, se quiser testes de integração reais daqui.
3. SMTP próprio para e-mails de confirmação/recuperação dos colegas (o SMTP padrão só envia para a equipe da organização).
4. Decidir se haverá IA paga (chave no Supabase, nunca no repositório) — sem isso, a geração por IA fica indisponível
   e o app diz isso (guias com trechos do material e questões criadas pelo estudante continuam funcionando).
5. Detalhes do problema no A52 (ver "O que pedir" em `DIAGNOSTICO_A52.md`).

## Revisão final do diff (skill code-review, todo o branch contra a `main`)

| Achado | Correção | Teste |
|---|---|---|
| Gatilho de material barrava o upsert de um PDF existente (envio do PDF na conta falharia) | regra do INSERT só para material novo; CHECK de "PDF pronto" virou regra no gatilho | `tests/db/materiais.test.ts` |
| Limite por conta barrava editar registro existente via upsert | `limit_rows` ignora linha que já existe | `tests/db/contas.test.ts` |
| Perfil nunca era criado (pedido do supabase-js sem `.then`) | pedido enviado; sincronização usa upsert do perfil | revisão de código |
| Lote concluído com 0 questões prendia o pedido para sempre | conta como tentativa e permite repetir até o limite | `tests/functions/generateCore.test.ts` |
| Falha ao regenerar seção marcava conteúdo antigo como atualizado | versões do material só entram com itens novos | idem |
| Texto alterado durante a conferência no servidor | `pages_rev`: só conclui se o texto não mudou | `tests/functions/processMaterial.test.ts`, `tests/db/materiais.test.ts` |
| Texto colado ficava "Pronto" na conta sem conferência e engolia a falha | só o servidor marca pronto; falha vira "Falhou" com “Tentar de novo” | `tests/db/materiais.test.ts` |
| `quantidade` não numérica gastava um pedido | recusa com 400 | `generateCore.test.ts` |
| Regravar menos páginas deixava páginas antigas na conta | apaga as que sobraram | `src/personal/__tests__/personal.test.ts` |
| Histórico inteiro baixado a cada volta ao app | conta primeiro; baixa só se mudou | `src/lib/__tests__/sync.test.ts` |

## Simulado × real

| Verificação | Como foi feita |
|---|---|
| RLS, limites, exclusões em cascata, gatilhos | **Postgres 16 real local** com o mesmo `auth.uid()` do Supabase (`tests/db`) — não é o Supabase hospedado |
| PostgREST, Auth, Storage, Edge Functions hospedados | **não testado** (`tests/integration/supabase-real.ts` pronto) |
| Funções `process-material` e `generate` | lógica testada com banco/Storage/IA **simulados**; `deno check` real |
| Chamada ao provedor de IA | **não testada** (sem chave) |
| Extração de PDF | pdf.js **real** com arquivos de teste próprios |
| Fluxos do app | **Chromium real** com o build de produção (sem conta) |
| Galaxy A52 | **emulação** (tela, CPU, rede); sem aparelho real |

## Próxima ação concreta

1. Revisão do Tiago na branch `ccr-71aa1f28-s1s3f6` (sem merge e sem publicação até autorizar).
2. Criar o projeto Supabase Free (ou autorizar que eu crie), aplicar as migrações, publicar as funções e rodar
   `npm run test:integration` com duas contas de teste.
3. Decidir sobre a IA paga (modelo, limite diário, teto de gasto no console) — ver CUSTOS_E_LIMITES.md.
4. Distribuir o roteiro para colegas num link de pré-visualização (não na produção).
