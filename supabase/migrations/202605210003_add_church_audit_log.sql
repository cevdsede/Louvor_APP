create table if not exists public.auditoria_igreja (
  id uuid primary key default gen_random_uuid(),
  acao text not null,
  entidade text not null,
  entidade_id uuid null,
  descricao text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid null references public.membros(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists auditoria_igreja_entidade_idx
  on public.auditoria_igreja (entidade, created_at desc);

create index if not exists auditoria_igreja_created_by_idx
  on public.auditoria_igreja (created_by, created_at desc);

alter table public.auditoria_igreja enable row level security;

drop policy if exists auditoria_igreja_select on public.auditoria_igreja;
create policy auditoria_igreja_select
on public.auditoria_igreja
for select
to authenticated
using ((select private.is_global_admin_or_lider()));

drop policy if exists auditoria_igreja_insert on public.auditoria_igreja;
create policy auditoria_igreja_insert
on public.auditoria_igreja
for insert
to authenticated
with check (auth.uid() is not null);
