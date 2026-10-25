-- Study Mastery 0.6 — guias, questões pessoais, tarefas de geração e registro de consumo.
-- Questões e guias pertencem ao dono (RLS) e guardam de quais materiais dependem (material_ids), para que excluir um
-- material leve junto o que foi gerado dele. Tarefas e consumo só o servidor grava; o estudante consulta os seus.

create table public.questions (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  discipline_id uuid not null,
  topic_id uuid not null,
  status text not null check (status in ('gerada_ia', 'criada_aluno', 'reportada', 'arquivada')),
  difficulty text not null check (difficulty in ('facil', 'medio', 'dificil')),
  version integer not null default 1 check (version >= 1),
  material_ids uuid[] not null default '{}' check (cardinality(material_ids) <= 10),
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 40000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id),
  foreign key (owner_id, discipline_id) references public.disciplines (owner_id, id) on delete cascade,
  foreign key (owner_id, topic_id) references public.topics (owner_id, id) on delete cascade
);
create index questions_por_assunto on public.questions (owner_id, discipline_id, topic_id);
create index questions_por_material on public.questions using gin (material_ids);

create table public.guides (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  discipline_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  material_ids uuid[] not null default '{}' check (cardinality(material_ids) <= 20),
  version integer not null default 1 check (version >= 1),
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 800000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id),
  foreign key (owner_id, discipline_id) references public.disciplines (owner_id, id) on delete cascade
);
create index guides_por_material on public.guides using gin (material_ids);

create table public.jobs (
  owner_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  kind text not null check (kind in ('questoes', 'secao')),
  idem_key text not null check (char_length(idem_key) = 64),
  status text not null check (status in ('running', 'done', 'failed')),
  attempts integer not null default 1 check (attempts between 1 and 10),
  max_attempts integer not null default 2 check (max_attempts between 1 and 10),
  input jsonb not null default '{}',
  result jsonb,
  error text check (error is null or char_length(error) <= 500),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (owner_id, id),
  unique (owner_id, idem_key)
);

create table public.usage_events (
  owner_id uuid not null references auth.users (id) on delete cascade,
  id bigint generated always as identity primary key,
  job_id uuid,
  kind text not null,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  ok boolean not null default true,
  created_at timestamptz not null default now()
);
create index usage_por_dono on public.usage_events (owner_id, created_at desc);

-- histórico: a versão da questão pessoal respondida fica junto da tentativa
alter table public.attempts add column snapshots jsonb check (snapshots is null or (jsonb_typeof(snapshots) = 'object' and octet_length(snapshots::text) <= 400000));

create trigger questions_touch before update on public.questions for each row execute function private.touch_updated_at();
create trigger guides_touch before update on public.guides for each row execute function private.touch_updated_at();
create trigger questions_limite before insert on public.questions for each row execute function private.limit_rows('3000');
create trigger guides_limite before insert on public.guides for each row execute function private.limit_rows('60');

alter table public.questions enable row level security;
alter table public.guides enable row level security;
alter table public.jobs enable row level security;
alter table public.usage_events enable row level security;

create policy questions_select on public.questions for select to authenticated using (owner_id = (select auth.uid()));
create policy questions_insert on public.questions for insert to authenticated with check (owner_id = (select auth.uid()));
create policy questions_update on public.questions for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy questions_delete on public.questions for delete to authenticated using (owner_id = (select auth.uid()));
create policy guides_select on public.guides for select to authenticated using (owner_id = (select auth.uid()));
create policy guides_insert on public.guides for insert to authenticated with check (owner_id = (select auth.uid()));
create policy guides_update on public.guides for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy guides_delete on public.guides for delete to authenticated using (owner_id = (select auth.uid()));
-- tarefas e consumo: o estudante só consulta os seus; quem grava é a função do servidor
create policy jobs_select on public.jobs for select to authenticated using (owner_id = (select auth.uid()));
create policy usage_select on public.usage_events for select to authenticated using (owner_id = (select auth.uid()));
revoke all on public.questions, public.guides, public.jobs, public.usage_events from anon;
revoke insert, update, delete on public.jobs, public.usage_events from authenticated;

-- Mescla uma seção do guia numa única instrução (sem perder outra seção gerada ao mesmo tempo). Com itens novos, a
-- versão anterior fica em "previous": regenerar uma seção não destrói o resto do guia nem a versão anterior.
create or replace function public.set_guide_section(p_guide uuid, p_key text, p_patch jsonb) returns void
language sql security invoker set search_path = '' as $$
  update public.guides g
     set data = jsonb_set(
           g.data, array['sections', p_key],
           case
             when p_patch ? 'items' and coalesce(g.data -> 'sections' -> p_key, '{}'::jsonb) ? 'items'
               then (g.data -> 'sections' -> p_key) || p_patch || jsonb_build_object('previous', (g.data -> 'sections' -> p_key) - 'previous')
             else coalesce(g.data -> 'sections' -> p_key, '{}'::jsonb) || p_patch
           end, true)
   where g.owner_id = (select auth.uid()) and g.id = p_guide;
$$;

-- Excluir um material leva junto: texto extraído (FK), questões e guias gerados a partir dele, o texto dessas
-- questões guardado no histórico de tentativas (fica só o acerto/erro) e as tarefas de geração que o usaram (o
-- resultado delas cita trechos de questões descartadas). O registro de consumo fica (sem conteúdo). O arquivo no
-- Storage é apagado pelo app antes.
create or replace function public.delete_material_cascade(p_material uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  qids text[];
  nq integer;
  ng integer;
begin
  if uid is null then
    raise exception 'sem usuário' using errcode = 'insufficient_privilege';
  end if;
  select coalesce(array_agg(id::text), '{}') into qids from public.questions where owner_id = uid and p_material = any (material_ids);
  update public.attempts set snapshots = snapshots - qids where owner_id = uid and snapshots is not null and snapshots ?| qids;
  delete from public.questions where owner_id = uid and p_material = any (material_ids);
  get diagnostics nq = row_count;
  delete from public.guides where owner_id = uid and p_material = any (material_ids);
  get diagnostics ng = row_count;
  delete from public.jobs j where j.owner_id = uid and exists (
    select 1 from jsonb_array_elements(case when jsonb_typeof(j.input -> 'materials') = 'array' then j.input -> 'materials' else '[]'::jsonb end) m
     where m ->> 0 = p_material::text);
  delete from public.materials where owner_id = uid and id = p_material;
  return jsonb_build_object('questoes', nq, 'guias', ng);
end $$;
revoke all on function public.delete_material_cascade(uuid) from public, anon;
grant execute on function public.delete_material_cascade(uuid) to authenticated;
revoke all on function public.set_guide_section(uuid, text, jsonb) from public, anon;
grant execute on function public.set_guide_section(uuid, text, jsonb) to authenticated;
