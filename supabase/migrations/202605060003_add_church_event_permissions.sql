create table if not exists public.permissoes_igreja (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.membros(id) on delete cascade,
  gerenciar_eventos_igreja boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (membro_id)
);

alter table public.permissoes_igreja enable row level security;

create or replace function private.can_manage_church_events()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.membros
    where id = (select auth.uid())
      and (
        lower(coalesce(perfil, '')) like '%admin%'
        or lower(coalesce(perfil, '')) like '%pastor%'
      )
  )
  or exists (
    select 1
    from public.permissoes_igreja
    where membro_id = (select auth.uid())
      and gerenciar_eventos_igreja is true
  );
$$;

create or replace function public.touch_permissoes_igreja_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_touch_permissoes_igreja_updated_at on public.permissoes_igreja;
create trigger tr_touch_permissoes_igreja_updated_at
before update on public.permissoes_igreja
for each row
execute function public.touch_permissoes_igreja_updated_at();

drop policy if exists permissoes_igreja_select on public.permissoes_igreja;
create policy permissoes_igreja_select
on public.permissoes_igreja
for select
to authenticated
using ((select private.can_manage_church_events()) or membro_id = (select auth.uid()));

drop policy if exists permissoes_igreja_manage on public.permissoes_igreja;
create policy permissoes_igreja_manage
on public.permissoes_igreja
for all
to authenticated
using (
  exists (
    select 1
    from public.membros
    where id = (select auth.uid())
      and lower(coalesce(perfil, '')) like '%admin%'
  )
)
with check (
  exists (
    select 1
    from public.membros
    where id = (select auth.uid())
      and lower(coalesce(perfil, '')) like '%admin%'
  )
);

drop policy if exists eventos_igreja_manage_insert on public.eventos_igreja;
create policy eventos_igreja_manage_insert
on public.eventos_igreja
for insert
to authenticated
with check ((select private.can_manage_church_events()));

drop policy if exists eventos_igreja_manage_update on public.eventos_igreja;
create policy eventos_igreja_manage_update
on public.eventos_igreja
for update
to authenticated
using ((select private.can_manage_church_events()))
with check ((select private.can_manage_church_events()));

drop policy if exists eventos_igreja_manage_delete on public.eventos_igreja;
create policy eventos_igreja_manage_delete
on public.eventos_igreja
for delete
to authenticated
using ((select private.can_manage_church_events()));
