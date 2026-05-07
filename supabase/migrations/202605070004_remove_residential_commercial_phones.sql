create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.membros (
    id,
    nome,
    display_name,
    nome_planilha,
    email,
    endereco,
    numero_casa,
    cep,
    bairro,
    data_nasc,
    genero,
    nome_pai,
    nome_mae,
    data_batismo,
    igreja_batismo,
    estado_civil,
    nome_conjuge,
    profissao,
    escolaridade,
    telefone,
    telefone_celular,
    telefone_recados,
    posicao_igreja,
    ministerio_levita,
    nome_discipulador,
    esta_em_celula,
    qual_celula,
    foto,
    perfil,
    ativo
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'nome',
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(coalesce(new.email, ''), '@', 1),
      'Novo membro'
    ),
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'nome_planilha', ''),
    lower(new.email),
    nullif(new.raw_user_meta_data ->> 'endereco', ''),
    nullif(new.raw_user_meta_data ->> 'numero_casa', ''),
    nullif(new.raw_user_meta_data ->> 'cep', ''),
    nullif(new.raw_user_meta_data ->> 'bairro', ''),
    nullif(new.raw_user_meta_data ->> 'data_nasc', '')::date,
    nullif(new.raw_user_meta_data ->> 'genero', '')::public.genero_membros,
    nullif(new.raw_user_meta_data ->> 'nome_pai', ''),
    nullif(new.raw_user_meta_data ->> 'nome_mae', ''),
    nullif(new.raw_user_meta_data ->> 'data_batismo', '')::date,
    nullif(new.raw_user_meta_data ->> 'igreja_batismo', ''),
    nullif(new.raw_user_meta_data ->> 'estado_civil', ''),
    nullif(new.raw_user_meta_data ->> 'nome_conjuge', ''),
    nullif(new.raw_user_meta_data ->> 'profissao', ''),
    nullif(new.raw_user_meta_data ->> 'escolaridade', ''),
    nullif(new.raw_user_meta_data ->> 'telefone', ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'telefone_celular', new.raw_user_meta_data ->> 'telefone'), ''),
    nullif(new.raw_user_meta_data ->> 'telefone_recados', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'posicao_igreja', ''), 'Membro'),
    nullif(new.raw_user_meta_data ->> 'ministerio_levita', ''),
    nullif(new.raw_user_meta_data ->> 'nome_discipulador', ''),
    coalesce((new.raw_user_meta_data ->> 'esta_em_celula')::boolean, false),
    nullif(new.raw_user_meta_data ->> 'qual_celula', ''),
    nullif(new.raw_user_meta_data ->> 'foto', ''),
    'user',
    true
  )
  on conflict (id) do update
  set
    nome = coalesce(excluded.nome, public.membros.nome),
    display_name = coalesce(excluded.display_name, public.membros.display_name),
    nome_planilha = coalesce(excluded.nome_planilha, public.membros.nome_planilha),
    email = coalesce(excluded.email, public.membros.email),
    endereco = coalesce(excluded.endereco, public.membros.endereco),
    numero_casa = coalesce(excluded.numero_casa, public.membros.numero_casa),
    cep = coalesce(excluded.cep, public.membros.cep),
    bairro = coalesce(excluded.bairro, public.membros.bairro),
    data_nasc = coalesce(excluded.data_nasc, public.membros.data_nasc),
    genero = coalesce(excluded.genero, public.membros.genero),
    nome_pai = coalesce(excluded.nome_pai, public.membros.nome_pai),
    nome_mae = coalesce(excluded.nome_mae, public.membros.nome_mae),
    data_batismo = coalesce(excluded.data_batismo, public.membros.data_batismo),
    igreja_batismo = coalesce(excluded.igreja_batismo, public.membros.igreja_batismo),
    estado_civil = coalesce(excluded.estado_civil, public.membros.estado_civil),
    nome_conjuge = coalesce(excluded.nome_conjuge, public.membros.nome_conjuge),
    profissao = coalesce(excluded.profissao, public.membros.profissao),
    escolaridade = coalesce(excluded.escolaridade, public.membros.escolaridade),
    telefone = coalesce(excluded.telefone, public.membros.telefone),
    telefone_celular = coalesce(excluded.telefone_celular, public.membros.telefone_celular),
    telefone_recados = coalesce(excluded.telefone_recados, public.membros.telefone_recados),
    posicao_igreja = coalesce(nullif(excluded.posicao_igreja, ''), public.membros.posicao_igreja, 'Membro'),
    ministerio_levita = coalesce(excluded.ministerio_levita, public.membros.ministerio_levita),
    nome_discipulador = coalesce(excluded.nome_discipulador, public.membros.nome_discipulador),
    esta_em_celula = coalesce(excluded.esta_em_celula, public.membros.esta_em_celula, false),
    qual_celula = coalesce(excluded.qual_celula, public.membros.qual_celula),
    foto = coalesce(excluded.foto, public.membros.foto),
    perfil = coalesce(nullif(public.membros.perfil, ''), 'user'),
    ativo = coalesce(public.membros.ativo, true);

  return new;
end;
$$;

alter table public.membros
  drop column if exists telefone_residencial,
  drop column if exists telefone_comercial;
