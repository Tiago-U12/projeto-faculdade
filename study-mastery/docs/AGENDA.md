# Agenda interna e planejamento — regras (Study Mastery 0.6)

A agenda é **interna**: fica no espaço atual (neste aparelho ou na conta) e não sincroniza com nenhum serviço externo.
Código: `src/calendar/` (regras puras, testadas) e `src/components/Calendar.tsx`, `EventPage.tsx`, `Planner.tsx`.

## Eventos

| Campo | Regra |
|---|---|
| Tipo | prova, entrega, estudo, revisão, simulado |
| Disciplina | pessoal ou do banco existente (Cálculo II, Full Stack); a cor vem da disciplina |
| Data e horário | **dia inteiro** guarda só a data (`AAAA-MM-DD`) — a mesma em qualquer fuso; **com horário** guarda o instante (UTC) e o fuso em que foi informado |
| Duração | opcional; para conflitos, um evento com horário e sem duração conta como 60 min |
| Assuntos, observações | opcionais |
| Conteúdo vinculado | guia, questões pessoais (com assuntos e modo) ou questões do banco; “Nenhum” também é possível |
| Status | agendado, concluído, cancelado. **Atrasado** não é guardado: é um evento agendado cujo horário (ou dia) já passou |

- Nada é concluído automaticamente. Um evento vencido aparece em “Atrasados” até o estudante concluir, reagendar ou
  cancelar.
- Cancelar mantém o registro (dá para reativar). Excluir apaga.
- Reagendar guarda o histórico (de → para), visível no evento.
- Conflito de horário com outro evento agendado: o app avisa antes de salvar; salvar mesmo assim é escolha do estudante.
- Tudo funciona por botões e formulários (não há arrastar e soltar nesta versão).

## Fuso horário

- Padrão: o fuso do aparelho. Editável na agenda (“Alterar fuso”); fica nas configurações do espaço atual.
- Eventos com horário são mostrados no fuso escolhido (o mesmo instante: 19:00 em São Paulo aparece 18:00 em Manaus).
- Eventos de dia inteiro mantêm a data em qualquer fuso.
- Conversões com `Intl` (sem biblioteca), testadas com horário de verão (Nova York, Lisboa) e perto da meia-noite.

## Planejamento até a prova

Entradas: data da prova, assuntos confirmados, dias da semana disponíveis, janela de horário, tempo por dia e duração
da sessão. Saída: uma **prévia**; os eventos só são criados depois de “Criar N eventos”.

Regras (função `buildPlan`, conferida por `checkPlan` antes de criar):

1. Só entre hoje e a **véspera** da prova; nenhum horário já passado; nada no dia da prova ou depois.
2. Só nos dias e na janela informados, até o tempo por dia, com 10 min entre sessões.
3. Pula horários ocupados por eventos agendados com horário (provas, entregas, outras sessões) e lista quais evitou.
4. Por assunto: estudo, exercícios e uma revisão espaçada (a revisão de um assunto vem depois do estudo do seguinte);
   no fim, um simulado no último horário.
5. Dificuldades observadas: com pelo menos **5 respostas** no assunto, acerto abaixo de 60% ganha mais uma sessão de
   exercícios e vem primeiro; acerto de 80% ou mais dispensa a sessão de exercícios. Com menos respostas, nada muda
   (uma resposta não indica domínio).
6. Tempo insuficiente: nada é espremido. O aviso mostra quantas sessões o plano pede, quantos horários há, quanto
   falta e o que ficou de fora (pela prioridade: estudo de todos os assuntos, exercícios, simulado, revisões, reforço).
7. O plano não ocupa todos os horários livres: o que sobra é informado.
8. A duração é por tempo, não por número de questões (“faça o quanto couber”).
9. Refazer o planejamento da mesma disciplina pode **cancelar** (não apagar) as sessões futuras ainda não feitas do
   plano anterior.

Não há IA no planejamento: as regras acima são determinísticas e testadas (`src/calendar/__tests__/plan.test.ts`).

### Sessão perdida

“Reagendar” em uma sessão atrasada mostra uma **sugestão** (`suggestReschedule`) com o impacto, e só aplica com
“Aplicar sugestão”:

- sessão de um planejamento: próximo horário livre na mesma disponibilidade, respeitando o tempo por dia, **antes da
  prova**; se não houver, explica e pede escolha manual;
- sessão avulsa: mesmo período do dia, nos próximos 14 dias;
- provas e entregas não recebem sugestão (compromissos fixos); outros compromissos com horário não são movidos.

## Exclusão

- Excluir uma disciplina pessoal exclui os eventos dela (no app e, na conta, também por gatilho no banco).
- Excluir um material ou guia **não** exclui eventos: eles são a agenda do estudante. O evento mostra “O guia vinculado
  foi excluído” e oferece as questões.
- Excluir a conta apaga os eventos (cascata no banco).

## Notificações

Não há lembretes com o site fechado nesta versão (precisaria de push com servidor e permissão do navegador). A agenda
diz isso na própria tela.

## Google Agenda — evolução futura (não implementada)

Nada disto existe no app; está aqui para orientar uma versão futura.

| Tema | Proposta |
|---|---|
| Autorização | OAuth do Google com escopo mínimo (`calendar.events` em uma agenda dedicada “Study Mastery”, não na principal); tokens só no servidor (Edge Function + Vault), nunca no navegador |
| Modo inicial | **exportação** de mão única (Study Mastery → Google) com link de assinatura `.ics` privado ou criação de eventos via API; mais simples e sem conflito de edição |
| Bidirecional | só depois: `syncToken` incremental + webhook (`events.watch`); regra explícita de quem vence em edição simultânea (última alteração, com registro) |
| Duplicações | guardar o `id` do Google no evento (`external_id`) e usar `iCalUID` estável derivado do id do Study Mastery; nunca criar de novo o que já tem vínculo |
| Alterações e exclusões | alteração no app → `PATCH`; exclusão → `DELETE` (ou cancelado → `status=cancelled`); no bidirecional, eventos apagados no Google viram “cancelados” aqui, não somem |
| Revogação | ao desconectar: apagar tokens, parar o canal de webhook, perguntar se remove a agenda “Study Mastery” do Google; tratar `invalid_grant` como revogado |
| Fusos | enviar `dateTime` com `timeZone` para eventos com horário e `date` para dia inteiro (sem fuso), como já é guardado aqui |

Não implementar sincronização parcial apresentada como completa: a primeira entrega deve dizer claramente “só envia
para o Google”.
