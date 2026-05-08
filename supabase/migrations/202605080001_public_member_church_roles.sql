alter table public.membros
  add column if not exists ministerio_levita text;

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
  select
    membros.id,
    membros.nome,
    membros.display_name,
    membros.nome_planilha,
    membros.foto,
    membros.posicao_igreja,
    membros.ministerio_levita,
    membros.ativo,
    membros.created_at
  from public.membros
  where membros.ativo is not false
  order by coalesce(membros.display_name, membros.nome, membros.nome_planilha);
$$;

revoke execute on function public.get_membros_igreja_publicos() from public, anon;
grant execute on function public.get_membros_igreja_publicos() to authenticated;
