drop policy if exists "escala_publica_write_authenticated" on public.escala_publica;

drop policy if exists "escala_publica_insert_managers" on public.escala_publica;
create policy "escala_publica_insert_managers"
on public.escala_publica
for insert
to authenticated
with check (
  (select private.is_global_admin_or_lider())
  or (
    ministerio_id is not null
    and ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
  )
);

drop policy if exists "escala_publica_update_managers" on public.escala_publica;
create policy "escala_publica_update_managers"
on public.escala_publica
for update
to authenticated
using (
  (select private.is_global_admin_or_lider())
  or (
    ministerio_id is not null
    and ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
  )
)
with check (
  (select private.is_global_admin_or_lider())
  or (
    ministerio_id is not null
    and ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
  )
);

drop policy if exists "escala_publica_delete_managers" on public.escala_publica;
create policy "escala_publica_delete_managers"
on public.escala_publica
for delete
to authenticated
using (
  (select private.is_global_admin_or_lider())
  or (
    ministerio_id is not null
    and ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
  )
);
