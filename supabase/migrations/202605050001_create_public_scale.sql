create table if not exists public.escala_publica (
  id uuid primary key default gen_random_uuid(),
  ministerio_id uuid references public.ministerios(id) on delete set null,
  data date not null,
  dia_semana text not null default '',
  horario time without time zone not null default '19:00',
  culto text not null default '',
  ministro_1 text,
  ministro_2 text,
  back_1 text,
  back_2 text,
  back_3 text,
  violao text,
  teclado text,
  guitarra text,
  baixo text,
  bateria text,
  data_ensaio date,
  horario_ensaio time without time zone,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists escala_publica_ministerio_data_idx
  on public.escala_publica (ministerio_id, data, horario);

grant select on public.escala_publica to anon, authenticated;
grant insert, update, delete on public.escala_publica to authenticated;

alter table public.escala_publica enable row level security;

drop policy if exists "escala_publica_select_public" on public.escala_publica;
create policy "escala_publica_select_public"
on public.escala_publica
for select
to anon, authenticated
using (true);

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
