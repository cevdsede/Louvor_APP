drop policy if exists "Usuarios autenticados podem atualizar aviso_geral" on public.aviso_geral;
drop policy if exists "Usuarios autenticados podem deletar aviso_geral" on public.aviso_geral;
drop policy if exists "Usuários autenticados podem criar aviso_geral" on public.aviso_geral;
drop policy if exists "Usuários autenticados podem ver aviso_geral" on public.aviso_geral;

drop policy if exists "avisos_cultos_authenticated_insert" on public.avisos_cultos;
drop policy if exists "avisos_cultos_authenticated_update" on public.avisos_cultos;
drop policy if exists "avisos_cultos_authenticated_delete" on public.avisos_cultos;

drop policy if exists "repertorio_authenticated_insert" on public.repertorio;
drop policy if exists "repertorio_authenticated_update" on public.repertorio;
drop policy if exists "repertorio_authenticated_delete" on public.repertorio;

alter table public.aviso_geral enable row level security;

create policy "aviso_geral_select_scoped"
on public.aviso_geral
for select
to authenticated
using (
  id_membro = (select auth.uid())
  or remetente_id = (select auth.uid())
  or (select private.is_global_admin_or_lider())
  or (
    ministerio_id is not null
    and ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
  )
);

create policy "aviso_geral_insert_scoped"
on public.aviso_geral
for insert
to authenticated
with check (
  id_membro = (select auth.uid())
  or (
    remetente_id = (select auth.uid())
    and ministerio_id is not null
    and ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
  )
  or (select private.is_global_admin_or_lider())
);

create policy "aviso_geral_update_scoped"
on public.aviso_geral
for update
to authenticated
using (
  id_membro = (select auth.uid())
  or remetente_id = (select auth.uid())
  or (select private.is_global_admin_or_lider())
  or (
    ministerio_id is not null
    and ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
  )
)
with check (
  id_membro = (select auth.uid())
  or remetente_id = (select auth.uid())
  or (select private.is_global_admin_or_lider())
  or (
    ministerio_id is not null
    and ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
  )
);

create policy "aviso_geral_delete_scoped"
on public.aviso_geral
for delete
to authenticated
using (
  id_membro = (select auth.uid())
  or remetente_id = (select auth.uid())
  or (select private.is_global_admin_or_lider())
  or (
    ministerio_id is not null
    and ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
  )
);
