create table if not exists public.escalas_confirmacoes (
  id uuid primary key default gen_random_uuid(),
  escala_id uuid not null references public.escalas(id) on delete cascade,
  membro_id uuid not null references public.membros(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'confirmado', 'recusado')),
  observacao text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint escalas_confirmacoes_unique unique (escala_id, membro_id)
);

create index if not exists escalas_confirmacoes_membro_id_idx on public.escalas_confirmacoes (membro_id);
create index if not exists escalas_confirmacoes_status_idx on public.escalas_confirmacoes (status);

alter table public.escalas_confirmacoes enable row level security;

drop policy if exists escalas_confirmacoes_select on public.escalas_confirmacoes;
create policy escalas_confirmacoes_select on public.escalas_confirmacoes
  for select to authenticated
  using (
    membro_id = (select auth.uid())
    or (select private.is_global_admin_or_lider())
    or exists (
      select 1
      from public.escalas e
      where e.id = escalas_confirmacoes.escala_id
        and e.ministerio_id = any (coalesce((select private.user_ministerio_ids()), '{}'::uuid[]))
    )
  );

drop policy if exists escalas_confirmacoes_insert on public.escalas_confirmacoes;
create policy escalas_confirmacoes_insert on public.escalas_confirmacoes
  for insert to authenticated
  with check (
    membro_id = (select auth.uid())
    or (select private.is_global_admin_or_lider())
    or exists (
      select 1
      from public.escalas e
      where e.id = escalas_confirmacoes.escala_id
        and e.ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
    )
  );

drop policy if exists escalas_confirmacoes_update on public.escalas_confirmacoes;
create policy escalas_confirmacoes_update on public.escalas_confirmacoes
  for update to authenticated
  using (
    membro_id = (select auth.uid())
    or (select private.is_global_admin_or_lider())
    or exists (
      select 1
      from public.escalas e
      where e.id = escalas_confirmacoes.escala_id
        and e.ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
    )
  )
  with check (
    membro_id = (select auth.uid())
    or (select private.is_global_admin_or_lider())
    or exists (
      select 1
      from public.escalas e
      where e.id = escalas_confirmacoes.escala_id
        and e.ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
    )
  );
