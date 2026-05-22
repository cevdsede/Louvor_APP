alter table public.permissoes_igreja
  add column if not exists gerenciar_visitantes_igreja boolean not null default false,
  add column if not exists gerenciar_novos_convertidos_igreja boolean not null default false;

create or replace function private.can_manage_church_visitors()
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
      and gerenciar_visitantes_igreja is true
  );
$$;

create or replace function private.can_manage_church_converts()
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
      and gerenciar_novos_convertidos_igreja is true
  );
$$;

create table if not exists public.visitantes_igreja (
  id uuid primary key default gen_random_uuid(),
  data_ficha date not null default current_date,
  nome text not null,
  data_nascimento date null,
  endereco text null,
  bairro text null,
  telefone text null,
  e_cristao boolean null,
  deseja_oracao_lar boolean not null default false,
  deseja_aconselhamento boolean not null default false,
  deseja_informacoes_igreja boolean not null default false,
  convidado_por text null,
  observacoes text null,
  created_by uuid null references public.membros(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.novos_convertidos_igreja (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  endereco text null,
  numero text null,
  bairro text null,
  data_nascimento date null,
  data_conversao date null,
  estado_civil text null,
  email text null,
  contato text null,
  contato_recado text null,
  nome_contato_recado text null,
  observacoes text null,
  created_by uuid null references public.membros(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint novos_convertidos_igreja_estado_civil_check check (
    estado_civil is null
    or estado_civil in ('Solteiro(a)', 'Casado(a)', 'Viuvo(a)', 'Divorciado(a)', 'Concubinato')
  )
);

create index if not exists visitantes_igreja_data_ficha_idx
  on public.visitantes_igreja (data_ficha desc);

create index if not exists visitantes_igreja_nome_idx
  on public.visitantes_igreja (nome);

create index if not exists novos_convertidos_igreja_data_conversao_idx
  on public.novos_convertidos_igreja (data_conversao desc);

create index if not exists novos_convertidos_igreja_nome_idx
  on public.novos_convertidos_igreja (nome);

alter table public.visitantes_igreja enable row level security;
alter table public.novos_convertidos_igreja enable row level security;

create or replace function public.touch_visitantes_igreja_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_novos_convertidos_igreja_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_touch_visitantes_igreja_updated_at on public.visitantes_igreja;
create trigger tr_touch_visitantes_igreja_updated_at
before update on public.visitantes_igreja
for each row
execute function public.touch_visitantes_igreja_updated_at();

drop trigger if exists tr_touch_novos_convertidos_igreja_updated_at on public.novos_convertidos_igreja;
create trigger tr_touch_novos_convertidos_igreja_updated_at
before update on public.novos_convertidos_igreja
for each row
execute function public.touch_novos_convertidos_igreja_updated_at();

drop policy if exists visitantes_igreja_select on public.visitantes_igreja;
create policy visitantes_igreja_select
on public.visitantes_igreja
for select
to authenticated
using ((select private.can_manage_church_visitors()));

drop policy if exists visitantes_igreja_insert on public.visitantes_igreja;
create policy visitantes_igreja_insert
on public.visitantes_igreja
for insert
to authenticated
with check ((select private.can_manage_church_visitors()));

drop policy if exists visitantes_igreja_update on public.visitantes_igreja;
create policy visitantes_igreja_update
on public.visitantes_igreja
for update
to authenticated
using ((select private.can_manage_church_visitors()))
with check ((select private.can_manage_church_visitors()));

drop policy if exists visitantes_igreja_delete on public.visitantes_igreja;
create policy visitantes_igreja_delete
on public.visitantes_igreja
for delete
to authenticated
using ((select private.can_manage_church_visitors()));

drop policy if exists novos_convertidos_igreja_select on public.novos_convertidos_igreja;
create policy novos_convertidos_igreja_select
on public.novos_convertidos_igreja
for select
to authenticated
using ((select private.can_manage_church_converts()));

drop policy if exists novos_convertidos_igreja_insert on public.novos_convertidos_igreja;
create policy novos_convertidos_igreja_insert
on public.novos_convertidos_igreja
for insert
to authenticated
with check ((select private.can_manage_church_converts()));

drop policy if exists novos_convertidos_igreja_update on public.novos_convertidos_igreja;
create policy novos_convertidos_igreja_update
on public.novos_convertidos_igreja
for update
to authenticated
using ((select private.can_manage_church_converts()))
with check ((select private.can_manage_church_converts()));

drop policy if exists novos_convertidos_igreja_delete on public.novos_convertidos_igreja;
create policy novos_convertidos_igreja_delete
on public.novos_convertidos_igreja
for delete
to authenticated
using ((select private.can_manage_church_converts()));
