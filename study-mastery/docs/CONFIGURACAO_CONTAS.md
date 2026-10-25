# Ativar contas, materiais e IA (Supabase)

Sem esta configuração o Study Mastery funciona como sempre: banco existente, progresso, disciplinas e calendário
**neste aparelho**. As contas só aparecem quando o build recebe as duas variáveis públicas abaixo.

> Contas podem usar Supabase Free dentro das quotas; a capacidade para uma turma depende do uso e precisa ser medida.
> Geração por IA é opcional e paga, e permanece desativada nesta publicação. Limites em `ARQUITETURA_V06.md`.
> Segredos (senha do banco, chave secreta/service role, chave de IA, senha SMTP) **nunca** vão para o repositório,
> para o frontend, para variáveis `VITE_*` nem para mensagens de chat.

## 1. Criar o projeto (feito por você, ou por mim com sua autorização)

1. Painel do Supabase → organização **Tiago** (plano Free) → *New project*.
2. Nome: `study-mastery`. Região: **South America (São Paulo)**. Guarde a senha do banco num gerenciador de senhas.

## 2. Banco: aplicar as migrações

Em ordem, os arquivos de `study-mastery/supabase/migrations/` (SQL Editor do painel, colando um por vez, ou
`npx supabase link` + `npx supabase db push` no seu computador). Elas criam tabelas, limites, RLS em todas as
tabelas e as políticas do Storage.

Depois: painel → *Advisors → Security* deve ficar sem alertas de RLS desativado.

## 3. Autenticação

- *Authentication → Sign In / Providers → Email*: ativado, **Confirm email ligado**.
- *Authentication → URL Configuration*:
  - **Site URL**: `https://study-mastery.pages.dev/`
  - **Redirect URLs**: `https://study-mastery.pages.dev/`, `https://tiago-u12.github.io/projeto-faculdade/study-mastery/`
    e, para testar no computador, `http://localhost:5173/`.
- **E-mail (SMTP)**: o SMTP padrão do Supabase **só entrega para membros da equipe da organização** e tem limite
  baixo por hora. Para colegas criarem conta e recuperarem senha, configure um SMTP próprio em
  *Authentication → Emails → SMTP Settings* (ex.: Resend ou Brevo, que têm faixa gratuita). A senha do SMTP fica só
  no painel do Supabase.

## 4. Funções do servidor (Edge Functions)

Pasta `study-mastery/supabase/functions/`:

| Função | Para quê |
|---|---|
| `process-material` | confere no servidor o PDF enviado (tipo real, tamanho, hash) e o texto extraído; só ela marca o material como conferido |
| `delete-account` | apaga os arquivos da conta no Storage e a conta (o banco apaga o resto em cascata) |
| `generate` | gera questões (lotes de até 10) e seções de guia a partir dos materiais **prontos** da própria conta; valida antes de salvar e registra o consumo |

Publicar (no seu computador, com a [CLI do Supabase](https://supabase.com/docs/guides/cli)):

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npx supabase functions deploy process-material
npx supabase functions deploy delete-account
npx supabase functions deploy generate
```

As funções usam as variáveis que o Supabase já injeta (`SUPABASE_URL` e as chaves). Opcional: `ALLOWED_ORIGINS`
(origens do app, separadas por vírgula) em *Edge Functions → Secrets*; sem ela valem o Cloudflare, o GitHub Pages e
`localhost:5173`.

### Geração por IA (opcional, paga)

Sem chave, `generate` responde que a IA não está configurada e o app mostra isso — nada é simulado. Para ativar,
em *Edge Functions → Secrets* (nunca no repositório, no frontend ou em variáveis `VITE_`):

| Secret | Obrigatório | Padrão | Para quê |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | sim | — | chave da API (console da Anthropic, com limite de gasto definido lá) |
| `AI_MODEL` | não | `claude-opus-5-5` | modelo usado |
| `AI_EFFORT` | não | `high` | esforço do modelo (`low`, `medium`, `high`…) — menor gasta menos |
| `AI_DAILY_LIMIT` | não | `20` | pedidos por conta em 24 h (falhas contam) |
| `AI_MAX_ATTEMPTS` | não | `2` | tentativas para o mesmo pedido antes de recusar |

Como funciona: o pedido vira uma tarefa (`jobs`) com chave derivada do pedido e da versão dos materiais — repetir o
mesmo pedido devolve o resultado anterior em vez de gerar de novo. A resposta da IA vem em formato estruturado e só é
salva o que cita um trecho literal existente na página indicada; o resto é descartado e listado ao estudante. Se o
modelo recusar o pedido pelos filtros de segurança, o provedor tenta automaticamente um modelo alternativo
("fallback" do lado do servidor, ativado em `_shared/ai.ts`); se ainda assim recusar, a tarefa falha com essa
explicação. O consumo (tokens e custo estimado) fica em `usage_events`, visível só ao dono.

## 5. Publicar com contas

Valores em *Project Settings → API*: a **URL do projeto** e a **chave publicável** (`sb_publishable_…`, ou a antiga
`anon`). As duas são públicas por natureza — o que protege os dados é o RLS.

- **Cloudflare Pages** → projeto `study-mastery` → *Settings → Variables*: `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_PUBLISHABLE_KEY` (Production e Preview) → novo deploy.
- **GitHub Pages**: variáveis do repositório `STUDY_SUPABASE_URL` e `STUDY_SUPABASE_PUBLISHABLE_KEY`
  (o workflow já as repassa ao build).

O app recusa usar uma chave secreta colada por engano nessas variáveis, mas isso não impede que o Vite inclua o valor no bundle. Nunca configure segredos em `VITE_*`; conferir as variáveis antes do build é obrigatório.

## 6. Conferir

1. Criar duas contas de teste (dois e-mails seus).
2. Na conta A, criar uma disciplina; na conta B, conferir que ela não aparece.
3. Rodar `tests/integration/supabase-real.ts` com as variáveis descritas no topo do arquivo (duas contas de teste,
   URL e chave publicável). Ele tenta, com a conta B, ler, alterar, apagar, baixar e enviar dados da conta A pelos IDs;
   confere os limites de tipo/tamanho do bucket, a conferência do PDF no servidor, pedidos repetidos e a exclusão no
   Storage. Precisa de rede até `*.supabase.co` (bloqueada no ambiente em que o código foi escrito).

## O que já foi testado sem o projeto

- Migrações e RLS em Postgres 16 local com o mesmo `auth.uid()` do Supabase: `npx vitest run tests/db`
  (duas contas, mesmos IDs, troca de `owner_id`, FKs cruzadas, visitante sem login, limites, exclusão da conta).
- Materiais: `tests/db/materiais.test.ts` (isolamento, campos que só o servidor define, cota de 50 MB, políticas do
  Storage por pasta) e `tests/functions/processMaterial.test.ts` (regras da conferência, com banco e Storage simulados).
- Guias e questões: `tests/db/guias.test.ts` (isolamento, tarefas e consumo só pelo servidor, mescla de seção sem
  perder a versão anterior, exclusão em cascata) e `tests/functions/generation.test.ts` + `generateCore.test.ts`
  (validação e fluxo da geração com IA **simulada** — não comprovam a chamada real ao provedor).
- Funções conferidas com `deno check` (Deno 2.9.6).
- Isso **não** testa a API real (PostgREST, Auth, Storage) nem os limites de tipo/tamanho do bucket: esses dependem
  do projeto hospedado (script de integração acima).

## Antes de ativar IA paga

A cota diária atual consulta consumo antes de iniciar a tarefa e não constitui um teto financeiro atômico: pedidos distintos simultâneos podem ultrapassá-la. Antes de ativar a IA, implementar reserva atômica de cota, limite global e orçamento aprovado, além dos limites do provedor. Nenhuma chave ou geração paga foi ativada na publicação do modo local.
