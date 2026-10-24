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
| D. Guias e questões | em andamento | — | — |
| E. Calendário e planejamento | pendente | — | — |
| F. Integração, revisão e documentação | pendente | — | — |

## Depende do Tiago (não bloqueia o trabalho local)

1. Autorizar a criação do projeto Supabase gratuito (organização "Tiago", plano Free, hoje sem projetos) — ou criá-lo.
2. Liberar o domínio `*.supabase.co` na rede deste ambiente, se quiser testes de integração reais daqui.
3. SMTP próprio para e-mails de confirmação/recuperação dos colegas (o SMTP padrão só envia para a equipe da organização).
4. Decidir se haverá IA paga (chave no Supabase, nunca no repositório) — sem isso, geração por IA fica indisponível.
5. Detalhes do problema no A52 (ver "O que pedir" em `DIAGNOSTICO_A52.md`).

## Próxima ação concreta

Ver a última linha "em andamento" acima.
