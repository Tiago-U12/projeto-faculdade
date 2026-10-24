-- Study Mastery 0.6 — agenda interna (provas, entregas, estudo, revisão e simulado).
-- Dia inteiro guarda só a data (igual em qualquer fuso); com horário guarda o instante e o fuso em que foi informado.
-- "Atrasado" não é estado guardado: é agendado com horário já passado — nada é concluído automaticamente.
-- discipline_id é texto: disciplina pessoal (uuid) ou do banco existente ("calculo2", "fullstack").

create table public.events (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  discipline_id text not null check (char_length(discipline_id) between 1 and 64),
  type text not null check (type in ('prova', 'entrega', 'estudo', 'revisao', 'simulado')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  status text not null check (status in ('agendado', 'concluido', 'cancelado')),
  all_day boolean not null,
  date date,
  start_at timestamptz,
  duration_min integer check (duration_min is null or duration_min between 5 and 720),
  time_zone text not null check (char_length(time_zone) between 1 and 64),
  completed_at timestamptz,
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id),
  check ((all_day and date is not null and start_at is null) or (not all_day and start_at is not null and date is null)),
  check (status = 'concluido' or completed_at is null)
);
create index events_por_data on public.events (owner_id, date);
create index events_por_inicio on public.events (owner_id, start_at);

create trigger events_touch before update on public.events for each row execute function private.touch_updated_at();
create trigger events_limite before insert on public.events for each row execute function private.limit_rows('2000');

alter table public.events enable row level security;
create policy events_select on public.events for select to authenticated using (owner_id = (select auth.uid()));
create policy events_insert on public.events for insert to authenticated with check (owner_id = (select auth.uid()));
create policy events_update on public.events for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy events_delete on public.events for delete to authenticated using (owner_id = (select auth.uid()));
revoke all on public.events from anon;

-- Excluir uma disciplina pessoal leva os eventos dela (mesmo se a exclusão vier de outro aparelho).
create or replace function private.disciplines_delete_events() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.events where owner_id = old.owner_id and discipline_id = old.id::text;
  return old;
end $$;
create trigger disciplines_events after delete on public.disciplines for each row execute function private.disciplines_delete_events();
