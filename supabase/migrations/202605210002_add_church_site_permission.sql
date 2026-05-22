alter table public.permissoes_igreja
  add column if not exists gerenciar_site_igreja boolean not null default false;

create or replace function private.can_manage_church_site()
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
      and lower(coalesce(perfil, '')) like '%admin%'
  )
  or exists (
    select 1
    from public.permissoes_igreja
    where membro_id = (select auth.uid())
      and gerenciar_site_igreja is true
  );
$$;
