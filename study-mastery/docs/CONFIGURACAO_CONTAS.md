# Ativar contas, materiais e IA (Supabase)

Sem esta configuração o Study Mastery funciona como sempre: banco existente, progresso, disciplinas e calendário
**neste aparelho**. As contas só aparecem quando o build recebe as duas variáveis públicas abaixo.

> Nada aqui exige plano pago. O Supabase Free cobre o uso de uma turma (limites em `ARQUITETURA_V06.md`).
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

Publicar (no seu computador, com a [CLI do Supabase](https://supabase.com/docs/guides/cli)):

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npx supabase functions deploy process-material
npx supabase functions deploy delete-account
```

As funções usam as variáveis que o Supabase já injeta (`SUPABASE_URL` e as chaves). Opcional: `ALLOWED_ORIGINS`
(origens do app, separadas por vírgula) em *Edge Functions → Secrets*; sem ela valem o Cloudflare, o GitHub Pages e
`localhost:5173`.

## 5. Publicar com contas

Valores em *Project Settings → API*: a **URL do projeto** e a **chave publicável** (`sb_publishable_…`, ou a antiga
`anon`). As duas são públicas por natureza — o que protege os dados é o RLS.

- **Cloudflare Pages** → projeto `study-mastery` → *Settings → Variables*: `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_PUBLISHABLE_KEY` (Production e Preview) → novo deploy.
- **GitHub Pages**: variáveis do repositório `STUDY_SUPABASE_URL` e `STUDY_SUPABASE_PUBLISHABLE_KEY`
  (o workflow já as repassa ao build).

O app recusa, por segurança, uma chave secreta colada por engano nessas variáveis (fica sem contas).

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
- Funções conferidas com `deno check` (Deno 2.9.6).
- Isso **não** testa a API real (PostgREST, Auth, Storage) nem os limites de tipo/tamanho do bucket: esses dependem
  do projeto hospedado (script de integração acima).
