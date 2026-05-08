with active_member_ministries as (
  select
    mm.membro_id,
    string_agg(distinct min.nome, ', ' order by min.nome) as ministerios
  from public.membros_ministerios mm
  join public.ministerios min on min.id = mm.ministerio_id
  where mm.ativo is not false
    and lower(min.slug) in ('louvor', 'midia')
  group by mm.membro_id
)
update public.membros m
set
  posicao_igreja = 'Levita',
  ministerio_levita = active_member_ministries.ministerios
from active_member_ministries
where m.id = active_member_ministries.membro_id;

drop function if exists public.get_membros_igreja_publicos();

create function public.get_membros_igreja_publicos()
returns table (
  id uuid,
  nome text,
  display_name text,
  nome_planilha text,
  foto text,
  posicao_igreja text,
  ministerio_levita text,
  ativo boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  with active_member_ministries as (
    select
      mm.membro_id,
      string_agg(distinct min.nome, ', ' order by min.nome) as ministerios
    from public.membros_ministerios mm
    join public.ministerios min on min.id = mm.ministerio_id
    where mm.ativo is not false
      and min.ativo is not false
    group by mm.membro_id
  )
  select
    membros.id,
    membros.nome,
    membros.display_name,
    membros.nome_planilha,
    membros.foto,
    case
      when active_member_ministries.ministerios is not null
        and coalesce(membros.posicao_igreja, 'Membro') = 'Membro'
        then 'Levita'
      else membros.posicao_igreja
    end as posicao_igreja,
    active_member_ministries.ministerios as ministerio_levita,
    membros.ativo,
    membros.created_at
  from public.membros
  left join active_member_ministries on active_member_ministries.membro_id = membros.id
  where membros.ativo is not false
  order by coalesce(membros.display_name, membros.nome, membros.nome_planilha);
$$;

revoke execute on function public.get_membros_igreja_publicos() from public, anon;
grant execute on function public.get_membros_igreja_publicos() to authenticated;
