alter table public.permissoes_igreja
  add column if not exists mostrar_pastor_inicio boolean not null default false;

insert into public.permissoes_igreja (membro_id, gerenciar_eventos_igreja, mostrar_pastor_inicio)
select m.id, false, true
from public.membros m
where lower(coalesce(m.posicao_igreja, '')) like '%pastor%'
on conflict (membro_id) do update
set mostrar_pastor_inicio = true,
    updated_at = now();

create or replace function public.get_eventos_igreja_publicos()
returns setof public.eventos_igreja
language sql
security definer
set search_path = public
as $$
  select e.*
  from public.eventos_igreja e
  where e.ativo = true
    and (e.visivel_dashboard = true or e.visivel_agenda = true)
  order by e.data_inicio asc, e.prioridade desc;
$$;

grant execute on function public.get_eventos_igreja_publicos() to anon, authenticated;

create or replace function public.get_pastores_inicio_publicos()
returns table (
  id uuid,
  nome text,
  display_name text,
  foto jsonb,
  posicao_igreja text,
  ministerio_levita text
)
language sql
security definer
set search_path = public
as $$
  select
    m.id,
    m.nome,
    m.display_name,
    m.foto,
    m.posicao_igreja,
    m.ministerio_levita
  from public.permissoes_igreja p
  join public.membros m on m.id = p.membro_id
  where p.mostrar_pastor_inicio = true
  order by coalesce(nullif(m.display_name, ''), m.nome);
$$;

grant execute on function public.get_pastores_inicio_publicos() to anon, authenticated;

create or replace function public.get_inicio_igreja_public_stats()
returns table (
  total_membros bigint,
  aniversariantes_mes bigint,
  total_levitas bigint
)
language sql
security definer
set search_path = public
as $$
  select
    count(*)::bigint as total_membros,
    count(*) filter (
      where m.data_nasc is not null
        and extract(month from m.data_nasc::date) = extract(month from current_date)
    )::bigint as aniversariantes_mes,
    count(*) filter (
      where lower(coalesce(m.posicao_igreja, '')) = 'levita'
    )::bigint as total_levitas
  from public.membros m;
$$;

grant execute on function public.get_inicio_igreja_public_stats() to anon, authenticated;
