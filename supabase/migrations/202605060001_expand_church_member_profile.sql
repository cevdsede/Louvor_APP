alter table public.membros
  add column if not exists endereco text,
  add column if not exists numero_casa text,
  add column if not exists cep text,
  add column if not exists bairro text,
  add column if not exists nome_pai text,
  add column if not exists nome_mae text,
  add column if not exists data_batismo date,
  add column if not exists igreja_batismo text,
  add column if not exists estado_civil text,
  add column if not exists nome_conjuge text,
  add column if not exists profissao text,
  add column if not exists escolaridade text,
  add column if not exists telefone_residencial text,
  add column if not exists telefone_comercial text,
  add column if not exists telefone_celular text,
  add column if not exists telefone_recados text,
  add column if not exists posicao_igreja text,
  add column if not exists nome_discipulador text,
  add column if not exists esta_em_celula boolean default false,
  add column if not exists qual_celula text,
  add column if not exists dados_atualizados_em timestamptz;

update public.membros
set
  perfil = coalesce(nullif(trim(perfil), ''), 'user'),
  ativo = coalesce(ativo, true),
  posicao_igreja = coalesce(nullif(trim(posicao_igreja), ''), 'Membro'),
  telefone_celular = coalesce(nullif(trim(telefone_celular), ''), nullif(trim(telefone), ''))
where
  perfil is null
  or trim(coalesce(perfil, '')) = ''
  or ativo is null
  or posicao_igreja is null
  or trim(coalesce(posicao_igreja, '')) = ''
  or telefone_celular is null;

alter table public.membros
  alter column perfil set default 'user',
  alter column ativo set default true,
  alter column posicao_igreja set default 'Membro',
  alter column esta_em_celula set default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'membros_estado_civil_check'
      and conrelid = 'public.membros'::regclass
  ) then
    alter table public.membros
      add constraint membros_estado_civil_check
      check (
        estado_civil is null
        or estado_civil in ('Solteiro(a)', 'Casado(a)', 'Viúvo(a)', 'Divorciado(a)', 'Concubinato')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'membros_escolaridade_check'
      and conrelid = 'public.membros'::regclass
  ) then
    alter table public.membros
      add constraint membros_escolaridade_check
      check (
        escolaridade is null
        or escolaridade in (
          'Nenhuma',
          'Ensino Fundamental',
          'Ensino Fundamental Incompleto',
          'Ensino Médio',
          'Ensino Médio Incompleto',
          'Superior',
          'Superior Incompleto'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'membros_posicao_igreja_check'
      and conrelid = 'public.membros'::regclass
  ) then
    alter table public.membros
      add constraint membros_posicao_igreja_check
      check (
        posicao_igreja is null
        or posicao_igreja in (
          'Pastor(a)',
          'Levita',
          'Membro',
          'Secretario(a)',
          'Tesoureiro(a)',
          'Missionário'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'membros_perfil_check'
      and conrelid = 'public.membros'::regclass
  ) then
    alter table public.membros
      add constraint membros_perfil_check
      check (
        perfil is null
        or lower(perfil) in ('user', 'membro', 'admin', 'administrador', 'pastor', 'lider', 'líder', 'advanced')
      );
  end if;
end $$;

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
    email,
    genero,
    telefone,
    telefone_celular,
    perfil,
    posicao_igreja,
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
    lower(new.email),
    nullif(new.raw_user_meta_data ->> 'genero', '')::public.genero_membros,
    nullif(new.raw_user_meta_data ->> 'telefone', ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'telefone_celular', new.raw_user_meta_data ->> 'telefone'), ''),
    'user',
    coalesce(nullif(new.raw_user_meta_data ->> 'posicao_igreja', ''), 'Membro'),
    true
  )
  on conflict (id) do update
  set
    nome = coalesce(excluded.nome, public.membros.nome),
    email = coalesce(excluded.email, public.membros.email),
    genero = coalesce(excluded.genero, public.membros.genero),
    telefone = coalesce(excluded.telefone, public.membros.telefone),
    telefone_celular = coalesce(excluded.telefone_celular, public.membros.telefone_celular),
    perfil = coalesce(nullif(public.membros.perfil, ''), 'user'),
    posicao_igreja = coalesce(nullif(public.membros.posicao_igreja, ''), excluded.posicao_igreja, 'Membro'),
    ativo = coalesce(public.membros.ativo, true);

  return new;
end;
$$;

create or replace function public.touch_membros_dados_atualizados_em()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.dados_atualizados_em = now();
  return new;
end;
$$;

drop trigger if exists tr_touch_membros_dados_atualizados_em on public.membros;
create trigger tr_touch_membros_dados_atualizados_em
before update on public.membros
for each row
execute function public.touch_membros_dados_atualizados_em();
