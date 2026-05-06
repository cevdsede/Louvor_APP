create table if not exists public.eventos_igreja (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  local text,
  imagem_url text,
  categoria text,
  cor text,
  data_inicio timestamptz not null,
  data_fim timestamptz,
  horario_inicio time,
  horario_fim time,
  ativo boolean not null default true,
  visivel_dashboard boolean not null default true,
  visivel_agenda boolean not null default true,
  recorrente boolean not null default false,
  recorrencia_tipo text,
  recorrencia_intervalo integer not null default 1,
  recorrencia_dias_semana integer[],
  recorrencia_dia_mes integer,
  recorrencia_ordem_semana integer,
  recorrencia_data_fim date,
  prioridade integer not null default 0,
  substitui_eventos_menor_prioridade boolean not null default false,
  created_by uuid references public.membros(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint eventos_igreja_periodo_check check (data_fim is null or data_fim >= data_inicio),
  constraint eventos_igreja_recorrencia_intervalo_check check (recorrencia_intervalo >= 1),
  constraint eventos_igreja_recorrencia_tipo_check check (
    recorrencia_tipo is null
    or recorrencia_tipo in ('diaria', 'semanal', 'mensal_dia_mes', 'mensal_ordem_semana')
  ),
  constraint eventos_igreja_dias_semana_check check (
    recorrencia_dias_semana is null
    or recorrencia_dias_semana <@ array[0, 1, 2, 3, 4, 5, 6]
  ),
  constraint eventos_igreja_dia_mes_check check (
    recorrencia_dia_mes is null
    or recorrencia_dia_mes between 1 and 31
  ),
  constraint eventos_igreja_ordem_semana_check check (
    recorrencia_ordem_semana is null
    or recorrencia_ordem_semana between 1 and 5
  )
);

create index if not exists eventos_igreja_data_inicio_idx
  on public.eventos_igreja (data_inicio);

create index if not exists eventos_igreja_ativo_data_inicio_idx
  on public.eventos_igreja (ativo, data_inicio);

create index if not exists eventos_igreja_recorrente_idx
  on public.eventos_igreja (recorrente)
  where recorrente is true;

alter table public.eventos_igreja enable row level security;

create or replace function public.touch_eventos_igreja_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_touch_eventos_igreja_updated_at on public.eventos_igreja;
create trigger tr_touch_eventos_igreja_updated_at
before update on public.eventos_igreja
for each row
execute function public.touch_eventos_igreja_updated_at();

drop policy if exists eventos_igreja_select on public.eventos_igreja;
create policy eventos_igreja_select
on public.eventos_igreja
for select
to authenticated
using (ativo is true or (select private.is_global_admin_or_lider()));

drop policy if exists eventos_igreja_manage_insert on public.eventos_igreja;
create policy eventos_igreja_manage_insert
on public.eventos_igreja
for insert
to authenticated
with check ((select private.is_global_admin_or_lider()));

drop policy if exists eventos_igreja_manage_update on public.eventos_igreja;
create policy eventos_igreja_manage_update
on public.eventos_igreja
for update
to authenticated
using ((select private.is_global_admin_or_lider()))
with check ((select private.is_global_admin_or_lider()));

drop policy if exists eventos_igreja_manage_delete on public.eventos_igreja;
create policy eventos_igreja_manage_delete
on public.eventos_igreja
for delete
to authenticated
using ((select private.is_global_admin_or_lider()));
