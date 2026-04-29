create table if not exists public.membros_indisponibilidades (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.membros(id) on delete cascade,
  data_inicio date not null,
  data_fim date not null,
  motivo text,
  recorrencia text not null default 'nenhuma' check (recorrencia in ('nenhuma', 'semanal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membros_indisponibilidades_periodo_valido check (data_fim >= data_inicio)
);

create index if not exists membros_indisponibilidades_membro_id_idx on public.membros_indisponibilidades (membro_id);
create index if not exists membros_indisponibilidades_periodo_idx on public.membros_indisponibilidades (data_inicio, data_fim);

alter table public.membros_indisponibilidades enable row level security;

drop policy if exists membros_indisponibilidades_select on public.membros_indisponibilidades;
create policy membros_indisponibilidades_select on public.membros_indisponibilidades
  for select to authenticated
  using (
    membro_id = (select auth.uid())
    or (select private.is_global_admin_or_lider())
    or exists (
      select 1
      from public.membros_ministerios mm
      where mm.membro_id = membros_indisponibilidades.membro_id
        and mm.ministerio_id = any (coalesce((select private.user_ministerio_ids()), '{}'::uuid[]))
    )
  );

drop policy if exists membros_indisponibilidades_insert_self on public.membros_indisponibilidades;
create policy membros_indisponibilidades_insert_self on public.membros_indisponibilidades
  for insert to authenticated
  with check (
    membro_id = (select auth.uid())
    or (select private.is_global_admin_or_lider())
    or exists (
      select 1
      from public.membros_ministerios mm
      where mm.membro_id = membros_indisponibilidades.membro_id
        and mm.ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
    )
  );

drop policy if exists membros_indisponibilidades_update_self on public.membros_indisponibilidades;
create policy membros_indisponibilidades_update_self on public.membros_indisponibilidades
  for update to authenticated
  using (
    membro_id = (select auth.uid())
    or (select private.is_global_admin_or_lider())
    or exists (
      select 1
      from public.membros_ministerios mm
      where mm.membro_id = membros_indisponibilidades.membro_id
        and mm.ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
    )
  )
  with check (
    membro_id = (select auth.uid())
    or (select private.is_global_admin_or_lider())
    or exists (
      select 1
      from public.membros_ministerios mm
      where mm.membro_id = membros_indisponibilidades.membro_id
        and mm.ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
    )
  );

drop policy if exists membros_indisponibilidades_delete_self on public.membros_indisponibilidades;
create policy membros_indisponibilidades_delete_self on public.membros_indisponibilidades
  for delete to authenticated
  using (
    membro_id = (select auth.uid())
    or (select private.is_global_admin_or_lider())
    or exists (
      select 1
      from public.membros_ministerios mm
      where mm.membro_id = membros_indisponibilidades.membro_id
        and mm.ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
    )
  );
