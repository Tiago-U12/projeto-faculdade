-- Study Mastery 0.6 — espaço privado por conta: perfil, disciplinas, assuntos, progresso e relatos de erro.
-- Regra geral: toda linha tem owner_id = auth.uid(); RLS em todas as tabelas; chaves primárias (owner_id, id) para
-- que IDs estáveis gerados no aparelho possam ser importados por contas diferentes sem colidir nem revelar nada;
-- FKs compostas (owner_id, x_id) impedem ligar um registro a dados de outra conta, mesmo alterando IDs na requisição.

create schema if not exists private;

create or replace function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- perfil
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  time_zone text not null default 'America/Sao_Paulo' check (char_length(time_zone) between 1 and 64),
  settings jsonb not null default '{}' check (jsonb_typeof(settings) = 'object' and octet_length(settings::text) <= 8192),
  -- sessão em andamento do banco existente (retomar em outro aparelho); último a salvar vence
  active_session jsonb check (active_session is null or octet_length(active_session::text) <= 300000),
  active_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- disciplinas e assuntos
create table public.disciplines (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  period text check (period is null or char_length(period) <= 40),
  color text not null check (color ~ '^[a-z]{3,16}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create table public.topics (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  discipline_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  position integer not null default 0 check (position between 0 and 10000),
  origin text not null default 'manual' check (origin in ('manual', 'material')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id),
  foreign key (owner_id, discipline_id) references public.disciplines (owner_id, id) on delete cascade
);
create unique index topics_nome_unico on public.topics (owner_id, discipline_id, lower(btrim(name)));

-- ---------------------------------------------------------------- progresso
-- Tentativas imutáveis: a mesma tentativa enviada de novo (outro aparelho, nova importação) não duplica.
create table public.attempts (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  date timestamptz not null,
  -- 'calculo2' | 'fullstack' (banco existente) ou id de disciplina pessoal
  discipline_id text not null check (char_length(discipline_id) between 1 and 80),
  source text not null default 'banco' check (source in ('banco', 'pessoal')),
  mode text not null check (mode in ('aprender', 'simulado', 'revisao', 'misto')),
  bank_version text not null check (char_length(bank_version) <= 80),
  answers jsonb not null check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) <= 50 and octet_length(answers::text) <= 300000),
  created_at timestamptz not null default now(),
  primary key (owner_id, id)
);
create index attempts_por_data on public.attempts (owner_id, date desc);

create table public.question_reports (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  question_id text not null check (char_length(question_id) between 1 and 100),
  question_version integer not null check (question_version between 1 and 100000),
  source text not null check (source in ('banco', 'pessoal')),
  reason text not null check (reason in ('gabarito', 'enunciado', 'explicacao', 'digitacao', 'outro')),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  primary key (owner_id, id)
);

-- ---------------------------------------------------------------- updated_at
create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();
create trigger disciplines_touch before update on public.disciplines for each row execute function private.touch_updated_at();
create trigger topics_touch before update on public.topics for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------- limites por conta
create or replace function private.limit_rows() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
  max_rows integer := tg_argv[0]::integer;
begin
  execute format('select count(*) from %I.%I where owner_id = $1', tg_table_schema, tg_table_name) into n using new.owner_id;
  if n >= max_rows then
    raise exception 'limite de % registros em % atingido', max_rows, tg_table_name using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger disciplines_limite before insert on public.disciplines for each row execute function private.limit_rows('30');
create trigger topics_limite before insert on public.topics for each row execute function private.limit_rows('600');
create trigger attempts_limite before insert on public.attempts for each row execute function private.limit_rows('5000');
create trigger reports_limite before insert on public.question_reports for each row execute function private.limit_rows('500');

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.disciplines enable row level security;
alter table public.topics enable row level security;
alter table public.attempts enable row level security;
alter table public.question_reports enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- disciplinas e assuntos: o dono faz tudo; ninguém mais vê nada
create policy disciplines_select on public.disciplines for select to authenticated using (owner_id = (select auth.uid()));
create policy disciplines_insert on public.disciplines for insert to authenticated with check (owner_id = (select auth.uid()));
create policy disciplines_update on public.disciplines for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy disciplines_delete on public.disciplines for delete to authenticated using (owner_id = (select auth.uid()));

create policy topics_select on public.topics for select to authenticated using (owner_id = (select auth.uid()));
create policy topics_insert on public.topics for insert to authenticated with check (owner_id = (select auth.uid()));
create policy topics_update on public.topics for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy topics_delete on public.topics for delete to authenticated using (owner_id = (select auth.uid()));

-- tentativas: inserir e ler; nunca alterar (histórico imutável); apagar só as próprias
create policy attempts_select on public.attempts for select to authenticated using (owner_id = (select auth.uid()));
create policy attempts_insert on public.attempts for insert to authenticated with check (owner_id = (select auth.uid()));
create policy attempts_delete on public.attempts for delete to authenticated using (owner_id = (select auth.uid()));

create policy reports_select on public.question_reports for select to authenticated using (owner_id = (select auth.uid()));
create policy reports_insert on public.question_reports for insert to authenticated with check (owner_id = (select auth.uid()));
create policy reports_delete on public.question_reports for delete to authenticated using (owner_id = (select auth.uid()));

-- visitantes sem login não acessam nada do espaço privado (além do RLS, sem privilégio algum)
revoke all on public.profiles, public.disciplines, public.topics, public.attempts, public.question_reports from anon;
revoke update on public.attempts from authenticated;
revoke all on schema private from anon, authenticated;
