create index if not exists eventos_igreja_created_by_idx
  on public.eventos_igreja (created_by);

drop policy if exists permissoes_igreja_select on public.permissoes_igreja;
drop policy if exists permissoes_igreja_manage on public.permissoes_igreja;

create policy permissoes_igreja_select
on public.permissoes_igreja
for select
to authenticated
using ((select private.can_manage_church_events()) or membro_id = (select auth.uid()));

create policy permissoes_igreja_insert
on public.permissoes_igreja
for insert
to authenticated
with check (
  exists (
    select 1
    from public.membros
    where id = (select auth.uid())
      and lower(coalesce(perfil, '')) like '%admin%'
  )
);

create policy permissoes_igreja_update
on public.permissoes_igreja
for update
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

create policy permissoes_igreja_delete
on public.permissoes_igreja
for delete
to authenticated
using (
  exists (
    select 1
    from public.membros
    where id = (select auth.uid())
      and lower(coalesce(perfil, '')) like '%admin%'
  )
);
