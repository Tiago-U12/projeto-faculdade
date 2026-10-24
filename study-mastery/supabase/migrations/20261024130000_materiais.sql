-- Study Mastery 0.6 — materiais (PDF com texto selecionável ou texto colado), texto extraído por página e arquivo
-- privado no Storage. O navegador extrai o texto (pdf.js); o servidor (Edge Function process-material) confere o
-- arquivo enviado — tipo real, tamanho e hash — e só ele marca o material como conferido.

create table public.materials (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  discipline_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  kind text not null check (kind in ('pdf', 'texto')),
  status text not null default 'recebido' check (status in ('recebido', 'processando', 'pronto', 'atencao', 'falhou')),
  status_detail text check (status_detail is null or char_length(status_detail) <= 500),
  file_name text check (file_name is null or char_length(file_name) <= 200),
  file_size integer check (file_size is null or file_size between 1 and 10485760),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  page_count integer not null default 0 check (page_count between 0 and 300),
  char_count integer not null default 0 check (char_count between 0 and 2000000),
  issues jsonb not null default '[]' check (jsonb_typeof(issues) = 'array' and octet_length(issues::text) <= 20000),
  suggested_topics jsonb not null default '[]' check (jsonb_typeof(suggested_topics) = 'array' and octet_length(suggested_topics::text) <= 8000),
  topic_ids uuid[] not null default '{}' check (cardinality(topic_ids) <= 60),
  version integer not null default 1 check (version >= 1),
  -- preenchido só pela função do servidor (papel service_role)
  server_checked_at timestamptz,
  -- sobe a cada mudança no texto (material_pages): a conferência só conclui se ele não mudou durante ela
  pages_rev integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id),
  foreign key (owner_id, discipline_id) references public.disciplines (owner_id, id) on delete cascade,
  -- PDF só fica pronto (ou "precisa de atenção") depois da conferência do arquivo no servidor
  -- "PDF só fica pronto/atenção depois de conferido" está no gatilho materials_guard: um CHECK seria avaliado na linha
  -- proposta de um upsert (sem os campos do servidor) e recusaria editar um PDF já conferido
  check ((kind = 'pdf') = (file_size is not null and sha256 is not null and file_name is not null))
);
create index materials_por_disciplina on public.materials (owner_id, discipline_id);

create table public.material_pages (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  material_id uuid not null,
  page integer not null check (page between 1 and 300),
  text text not null check (char_length(text) <= 20000),
  primary key (owner_id, material_id, page),
  foreign key (owner_id, material_id) references public.materials (owner_id, id) on delete cascade
);

create trigger materials_touch before update on public.materials for each row execute function private.touch_updated_at();
create trigger materials_limite before insert on public.materials for each row execute function private.limit_rows('40');

-- Campos que só o servidor define: o navegador não marca "conferido", nem "pronto"/"precisa de atenção" (PDF ou
-- texto colado), e não troca arquivo/hash depois do envio. Upsert de linha existente é validado como UPDATE.
create or replace function private.materials_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- INSERT ... ON CONFLICT de um material que já existe: quem valida é o gatilho de UPDATE, com a linha final
  if tg_op = 'INSERT' and exists (select 1 from public.materials m where m.owner_id = new.owner_id and m.id = new.id) then
    return new;
  end if;
  -- requisições de usuários (funções internas security definer e o servidor não passam por estas regras)
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if new.server_checked_at is not null or new.pages_rev <> 0 or new.status not in ('recebido', 'processando', 'falhou') then
        raise exception 'estado inicial inválido para material' using errcode = 'check_violation';
      end if;
    else
      if new.server_checked_at is distinct from old.server_checked_at or new.pages_rev is distinct from old.pages_rev
         or new.sha256 is distinct from old.sha256 or new.file_size is distinct from old.file_size or new.kind is distinct from old.kind then
        raise exception 'campo controlado pelo servidor' using errcode = 'insufficient_privilege';
      end if;
      if new.status is distinct from old.status and new.status not in ('recebido', 'processando', 'falhou') then
        raise exception 'só o servidor conclui a conferência de um material' using errcode = 'insufficient_privilege';
      end if;
    end if;
  end if;
  -- para todos, inclusive o servidor: PDF só fica pronto/atenção depois de conferido
  if new.kind = 'pdf' and new.status in ('pronto', 'atencao') and new.server_checked_at is null then
    raise exception 'PDF sem conferência do servidor não pode ficar pronto' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger materials_guard before insert or update on public.materials for each row execute function private.materials_guard();

-- Cota de armazenamento por conta (soma dos PDFs declarados; o tamanho real é conferido no servidor)
create or replace function private.materials_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  total bigint;
begin
  if new.file_size is null then
    return new;
  end if;
  select coalesce(sum(file_size), 0) into total from public.materials where owner_id = new.owner_id and id <> new.id;
  if total + new.file_size > 52428800 then
    raise exception 'limite de 50 MB de PDFs por conta atingido' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger materials_quota before insert or update of file_size on public.materials for each row execute function private.materials_quota();

-- Toda mudança de texto feita pelo usuário sobe pages_rev (a conferência só conclui se o texto não mudou durante ela).
-- Depois de conferido, a mudança também volta o material a "recebido" e sobe a versão (guias e questões guardam a
-- versão usada).
create or replace function private.material_pages_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  mid uuid := coalesce(new.material_id, old.material_id);
  oid uuid := coalesce(new.owner_id, old.owner_id);
begin
  -- (security definer: current_user é o dono da função; quem chamou vem do JWT)
  if coalesce(auth.role(), '') <> 'service_role' then
    update public.materials
       set pages_rev = pages_rev + 1,
           version = case when server_checked_at is not null then version + 1 else version end,
           status = case when server_checked_at is not null and status in ('pronto', 'atencao', 'falhou') then 'recebido' else status end,
           server_checked_at = null
     where owner_id = oid and id = mid;
  end if;
  return null;
end $$;
create trigger material_pages_changed after insert or update or delete on public.material_pages for each row execute function private.material_pages_changed();

alter table public.materials enable row level security;
alter table public.material_pages enable row level security;
create policy materials_select on public.materials for select to authenticated using (owner_id = (select auth.uid()));
create policy materials_insert on public.materials for insert to authenticated with check (owner_id = (select auth.uid()));
create policy materials_update on public.materials for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy materials_delete on public.materials for delete to authenticated using (owner_id = (select auth.uid()));
create policy pages_select on public.material_pages for select to authenticated using (owner_id = (select auth.uid()));
create policy pages_insert on public.material_pages for insert to authenticated with check (owner_id = (select auth.uid()));
create policy pages_update on public.material_pages for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy pages_delete on public.material_pages for delete to authenticated using (owner_id = (select auth.uid()));
revoke all on public.materials, public.material_pages from anon;

-- ---------------------------------------------------------------- Storage: bucket privado
-- Tipo e tamanho são impostos pela API do Storage (servidor) com estes limites.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materiais', 'materiais', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['application/pdf'];

-- Caminho obrigatório: <id do usuário>/<id do material>.pdf, e só para um material PDF do próprio usuário ainda
-- não conferido (impede usar o bucket como depósito genérico ou trocar o arquivo depois da conferência).
create policy materiais_ler on storage.objects for select to authenticated
  using (bucket_id = 'materiais' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy materiais_enviar on storage.objects for insert to authenticated
  with check (
    bucket_id = 'materiais'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.materials m
       where m.owner_id = (select auth.uid()) and m.kind = 'pdf' and m.server_checked_at is null
         and name = m.owner_id::text || '/' || m.id::text || '.pdf'
    )
  );
create policy materiais_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'materiais' and (storage.foldername(name))[1] = (select auth.uid())::text);
