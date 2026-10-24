# Acompanhamento — Study Mastery 0.6 (estudos personalizados)

Lista viva para retomar o trabalho sem repetir. Atualizada a cada checkpoint.

- **Branch**: `ccr-71aa1f28-s1s3f6` (sem merge na `main`, sem publicação).
- **Pedido**: evoluir para estudos personalizados (etapas A–F). Arquitetura e decisões: [ARQUITETURA_V06.md](ARQUITETURA_V06.md).
- **Regras que valem sempre**: não declarar revisão humana; não publicar nem fazer merge; não criar serviço pago;
  segredos nunca no repositório/frontend/logs; IA só no servidor; nada simulado apresentado como integração real.

## Estado por etapa

| Etapa | Estado | Checkpoint | Evidência |
|---|---|---|---|
| A. Diagnóstico e melhorias existentes | concluída | commit "Etapa A" | `docs/DIAGNOSTICO_A52.md`; `tests/e2e/a52-diagnostico.ts` (4 cenários); vitest 682; e2e 39; homologação 138/138 (GitHub e Cloudflare); render 600×2; offline; redirects; test:pwa 7 |
| B. Contas, autorização e disciplinas | concluída (sem projeto Supabase real) | commit "Etapa B" | `tests/db/contas.test.ts` 10 casos de duas contas em Postgres 16 local; vitest 712; `tests/e2e/v06.ts` 33 (390/320 px, axe); e2e 39; homologação 138/138. **Não testado**: Auth/PostgREST/Storage reais (sem projeto e sem rede até supabase.co) |
| C. Materiais e processamento | concluída (sem projeto Supabase real) | commit "Etapa C" | coleção `tests/fixtures/materiais` (9 casos, conteúdo próprio, gerador em `tools/fixtures`); `src/materials/__tests__/extract.test.ts` 10 (pdf.js real); `tests/db/materiais.test.ts` 7; `tests/functions/processMaterial.test.ts` 7 (simulado); `deno check` das funções; `tests/e2e/v06.ts` 65 (390/320 px, axe). **Não testado**: Storage/Edge Functions reais (`tests/integration/supabase-real.ts` pronto, não executado) |
| D. Guias e questões | concluída (sem projeto Supabase real e sem chave de IA) | commit "Etapa D" | `tests/functions/generation.test.ts` 14 (trecho literal na página citada, 4 alternativas distintas, sem "todas/nenhuma", duplicatas, complemento marcado); `tests/functions/generateCore.test.ts` 8 (pedido repetido não gera em dobro, concorrência, limite diário, falha preserva a seção anterior; IA simulada); `tests/db/guias.test.ts` 6 (isolamento, só o servidor grava tarefas/consumo, mescla de seção com versão anterior, exclusão em cascata a partir do material); `src/lib/__tests__/personal-session.test.ts` 5 (filtro estrito, sessão menor sem completar com outro assunto, gabarito preservado, versão respondida no histórico); `src/materials/__tests__/delete.test.ts` 2; `src/personal/__tests__/ai.test.ts` 6; `deno check` das 3 funções; `tests/e2e/v06.ts` 113 (390/320 px, axe); e2e, offline, homologação 138/138, render 600×2, test:pwa 7. **Não testado**: chamada real ao provedor de IA (sem chave; o provedor em `_shared/ai.ts` só passou no `deno check`) e a função `generate` hospedada |
| E. Calendário e planejamento | pendente | — | — |
| F. Integração, revisão e documentação | pendente | — | — |

## Depende do Tiago (não bloqueia o trabalho local)

1. Autorizar a criação do projeto Supabase gratuito (organização "Tiago", plano Free, hoje sem projetos) — ou criá-lo.
2. Liberar o domínio `*.supabase.co` na rede deste ambiente, se quiser testes de integração reais daqui.
3. SMTP próprio para e-mails de confirmação/recuperação dos colegas (o SMTP padrão só envia para a equipe da organização).
4. Decidir se haverá IA paga (chave no Supabase, nunca no repositório) — sem isso, a geração por IA fica indisponível
   e o app diz isso (guias com trechos do material e questões criadas pelo estudante continuam funcionando).
5. Detalhes do problema no A52 (ver "O que pedir" em `DIAGNOSTICO_A52.md`).

## Próxima ação concreta

Ver a última linha "em andamento" acima.
