# Custos e limites — Study Mastery 0.6

Preços consultados nas páginas oficiais em **24/10/2026**. Nenhum serviço pago foi contratado. Os números de uso
abaixo são **estimativas com premissas declaradas**: não houve medição real, porque não há chave de IA nem projeto
Supabase configurados. Quando houver, o consumo real fica em `usage_events` (tokens e custo estimado por pedido).

## Sem conta e sem IA (como está publicado hoje)

Custo zero além da hospedagem estática (GitHub Pages e Cloudflare Pages, planos gratuitos). Tudo roda no navegador:
progresso, disciplinas, materiais (texto extraído), guias com trechos do material, questões criadas pelo estudante,
agenda e planejamento.

## Supabase (contas, banco, arquivos e funções)

Fonte: documentação oficial (Billing FAQ e páginas de uso; a página `supabase.com/pricing` não abriu deste ambiente).

| Plano | Preço | O que importa aqui |
|---|---|---|
| Free | US$ 0 | 2 projetos ativos por organização; 500 MB de banco; 1 GB de arquivos; 5 GB de tráfego; 50.000 usuários ativos/mês; 500 mil execuções de funções; projeto **pausa após 7 dias sem uso**; SMTP padrão só envia para a equipe |
| Pro | US$ 25/mês por organização | inclui US$ 10 em créditos de computação (cobre 1 projeto no tamanho padrão); 100.000 usuários ativos/mês; teto de gasto ligado por padrão; sem pausa |

Limites do próprio app (para caber no Free e evitar abuso), aplicados no banco:

| Item | Limite por conta |
|---|---|
| Disciplinas / assuntos por disciplina | 30 / 60 |
| Materiais | 40, até 50 MB somados; PDF até 10 MB; texto colado até 200 mil caracteres |
| Questões pessoais | 3.000 (até 10 por pedido de geração) |
| Guias | 60 (até 800 KB cada) |
| Eventos da agenda | 2.000 |

Estimativa de espaço: um PDF de aula típico (1–3 MB) e seu texto (50–150 KB). Com 40 materiais por aluno, ~10 alunos
ativos cabem no 1 GB de arquivos do Free; o banco (texto, questões, guias) fica bem abaixo de 500 MB para uma turma.

## IA (Anthropic, opcional)

Preço oficial por milhão de tokens (US$), `platform.claude.com/docs/en/about-claude/pricing`:

| Modelo | Entrada | Saída |
|---|---|---|
| Claude Opus 5.5 (padrão em `AI_MODEL`) | 4 | 20 |
| Claude Sonnet 5.5 | 2 | 10 |
| Claude Haiku 5.5 (pedidos até 100 mil tokens) | 0,10 | 0,50 |

Observações da página oficial: Haiku 5.5 custa mais acima de 100 mil tokens de entrada (o app limita o material a
60 mil caracteres por pedido, bem abaixo disso); inferência só nos EUA (`inference_geo: "us"`) multiplica por 1,1
(o app não usa); lote assíncrono (Batch API) tem 50% de desconto (o app não usa).

### Premissas

- Português ≈ 4 caracteres por token.
- **Lote de questões** (5 questões): entrada ≈ 2 mil tokens de instruções + até 15 mil do material; saída ≈ 4 mil
  tokens. Lote de 10: saída ≈ 8 mil.
- **Seção de guia**: entrada ≈ 12 mil tokens; saída ≈ 2,5 mil.
- O esforço `high` pode aumentar a saída (raciocínio é cobrado como saída); por isso há uma faixa “alta”.
- Falhas também contam no limite diário (`AI_DAILY_LIMIT`, padrão 20 pedidos por conta em 24 h).

### Estimativa por pedido (US$)

| Pedido | Opus 5.5 | Sonnet 5.5 | Haiku 5.5 |
|---|---|---|---|
| 5 questões | 0,15 (até 0,23) | 0,07 (até 0,11) | 0,004 |
| 10 questões | 0,23 (até 0,40) | 0,11 (até 0,20) | 0,006 |
| Seção de guia | 0,10 (até 0,15) | 0,05 (até 0,08) | 0,003 |

### Estimativa por aluno por mês

| Uso | Pedidos/mês | Opus 5.5 | Sonnet 5.5 | Haiku 5.5 |
|---|---|---|---|---|
| Leve: 3 materiais, 2 lotes de questões + 5 seções cada | 21 | ≈ US$ 2,40 | ≈ US$ 1,20 | ≈ US$ 0,07 |
| Máximo permitido pelo limite padrão (20/dia × 30) | 600 | até ≈ US$ 240 | até ≈ US$ 120 | até ≈ US$ 4 |

Recomendações antes de ativar a IA:

1. Definir um limite de gasto mensal no console da Anthropic (o app não substitui esse controle).
2. Para uma turma-piloto, começar com `AI_MODEL=claude-sonnet-5-5` ou `claude-haiku-5-5` e `AI_DAILY_LIMIT=5`.
3. Conferir o consumo real em `usage_events` na primeira semana e ajustar.

Pedidos repetidos com o mesmo material e a mesma configuração **não geram de novo** (o resultado anterior é devolvido),
e questões e guias ficam salvos — abrir de novo não chama a IA.
