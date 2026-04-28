create or replace function private.ensure_seed_auth_user(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_profile text default 'User'
) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(p_email));
  v_now timestamptz := now();
  v_password_hash constant text := '$2a$10$bDn/sYGyGftalj96jLH5XebDapB3kUNWo1WymEvYZ7Szhnhf9f4ea';
begin
  if exists (select 1 from auth.users where id = p_user_id) then
    update auth.users
    set
      email = v_email,
      aud = 'authenticated',
      role = 'authenticated',
      encrypted_password = coalesce(auth.users.encrypted_password, v_password_hash),
      email_confirmed_at = coalesce(auth.users.email_confirmed_at, v_now),
      raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      raw_user_meta_data = jsonb_build_object(
        'email', v_email,
        'perfil', coalesce(p_profile, 'User'),
        'full_name', p_full_name,
        'display_name', p_full_name
      ),
      updated_at = v_now,
      deleted_at = null
    where id = p_user_id;
  else
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      is_anonymous
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      p_user_id,
      'authenticated',
      'authenticated',
      v_email,
      v_password_hash,
      v_now,
      '',
      '',
      '',
      '',
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object(
        'email', v_email,
        'perfil', coalesce(p_profile, 'User'),
        'full_name', p_full_name,
        'display_name', p_full_name
      ),
      v_now,
      v_now,
      false,
      false
    );
  end if;

  if exists (
    select 1
    from auth.identities
    where user_id = p_user_id
      and provider = 'email'
  ) then
    update auth.identities
    set
      provider_id = p_user_id::text,
      identity_data = jsonb_build_object('sub', p_user_id::text, 'email', v_email),
      last_sign_in_at = coalesce(auth.identities.last_sign_in_at, v_now),
      updated_at = v_now
    where user_id = p_user_id
      and provider = 'email';
  else
    insert into auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at,
      id
    )
    values (
      p_user_id::text,
      p_user_id,
      jsonb_build_object('sub', p_user_id::text, 'email', v_email),
      'email',
      v_now,
      v_now,
      v_now,
      gen_random_uuid()
    );
  end if;
end;
$$;

do $$
declare
  v_ministerio_id uuid;
  v_member_id uuid;
  v_existing_profile text;
  v_has_principal boolean;
  member_seed record;
begin
  select id
  into v_ministerio_id
  from public.ministerios
  where lower(slug) = 'midia'
  limit 1;

  if v_ministerio_id is null then
    insert into public.ministerios (
      nome,
      slug,
      descricao,
      ativo,
      modulos
    )
    values (
      'Mídia',
      'midia',
      'Ministério de mídia e comunicação',
      true,
      '["dashboard","scales","team"]'::jsonb
    )
    returning id into v_ministerio_id;
  else
    update public.ministerios
    set
      nome = 'Mídia',
      descricao = 'Ministério de mídia e comunicação',
      ativo = true,
      modulos = '["dashboard","scales","team"]'::jsonb
    where id = v_ministerio_id;
  end if;

  insert into public.funcao (nome_funcao, ministerio_id)
  select funcao_nome, v_ministerio_id
  from (
    values
      ('Data Show'),
      ('Apoio'),
      ('Celular'),
      ('Câmera'),
      ('Social Mídias')
  ) as funcoes(funcao_nome)
  where not exists (
    select 1
    from public.funcao
    where ministerio_id = v_ministerio_id
      and lower(nome_funcao) = lower(funcoes.funcao_nome)
  );

  for member_seed in
    select *
    from (
      values
        ('Ana Clara', 'ana.clara@cevd.com', 'Ana Clara'),
        ('Asafe Lima', 'asafe.lima@cevd.com', null),
        ('Eduardo', 'eduardo@cevd.com', 'Eduardo'),
        ('Felipe França', 'felipe.franca@cevd.com', null),
        ('Felipe Silva', 'felipe.silva@cevd.com', 'Felipe'),
        ('João Paulo', 'joao.paulo@cevd.com', null),
        ('Paulo Renan', 'paulo.renan@cevd.com', null),
        ('Samuel', 'samuel@cevd.com', null),
        ('Eliel', 'eliel@cevd.com', null),
        ('Vitória Rodrigues', 'vitoria.rodrigues@cevd.com', 'V. Rodrigues'),
        ('Yara Nycolly', 'yara.nycolly@cevd.com', null),
        ('Daniel', 'daniel@cevd.com', null),
        ('Anne Gabrielly', 'anne.gabrielly@cevd.com', 'Anne Gabrielly'),
        ('Juan', 'juan@cevd.com', null),
        ('Bárbara', 'barbara@cevd.com', null),
        ('Nicolas Pietro', 'nicolas.pietro@cevd.com', null)
    ) as seeds(target_name, target_email, match_name)
  loop
    v_member_id := null;

    if member_seed.match_name is not null then
      select id
      into v_member_id
      from public.membros
      where lower(nome) = lower(member_seed.match_name)
      limit 1;
    end if;

    if v_member_id is null then
      select id
      into v_member_id
      from public.membros
      where lower(email) = lower(member_seed.target_email)
      limit 1;
    end if;

    if v_member_id is null then
      select id
      into v_member_id
      from auth.users
      where lower(email) = lower(member_seed.target_email)
      limit 1;
    end if;

    if v_member_id is null then
      v_member_id := gen_random_uuid();
    end if;

    select coalesce(perfil, 'User')
    into v_existing_profile
    from public.membros
    where id = v_member_id;

    v_existing_profile := coalesce(v_existing_profile, 'User');

    perform private.ensure_seed_auth_user(
      v_member_id,
      member_seed.target_email,
      member_seed.target_name,
      v_existing_profile
    );

    insert into public.membros (
      id,
      nome,
      ativo,
      perfil,
      email
    )
    values (
      v_member_id,
      member_seed.target_name,
      true,
      v_existing_profile,
      lower(member_seed.target_email)
    )
    on conflict (id) do update
    set
      nome = excluded.nome,
      ativo = true,
      perfil = coalesce(public.membros.perfil, excluded.perfil),
      email = excluded.email;

    select exists (
      select 1
      from public.membros_ministerios
      where membro_id = v_member_id
        and principal = true
    )
    into v_has_principal;

    insert into public.membros_ministerios (
      membro_id,
      ministerio_id,
      principal,
      ativo,
      papel
    )
    values (
      v_member_id,
      v_ministerio_id,
      not v_has_principal,
      true,
      case
        when lower(member_seed.target_name) in ('paulo renan', 'ana clara') then 'lider'
        else 'membro'
      end
    )
    on conflict (membro_id, ministerio_id) do update
    set
      ativo = true,
      papel = excluded.papel,
      principal = case
        when public.membros_ministerios.principal then true
        else excluded.principal
      end;
  end loop;

  delete from public.membros_funcoes mf
  using public.funcao f
  join public.membros_ministerios mm
    on mm.ministerio_id = f.ministerio_id
  where f.ministerio_id = v_ministerio_id
    and mm.membro_id = mf.id_membro
    and mf.id_funcao = f.id
    and lower(coalesce(mm.papel, 'membro')) in ('membro', 'lider');

  insert into public.membros_funcoes (id_membro, id_funcao)
  select
    mm.membro_id,
    f.id
  from public.membros_ministerios mm
  join public.membros m
    on m.id = mm.membro_id
  join public.funcao f
    on f.ministerio_id = mm.ministerio_id
  where mm.ministerio_id = v_ministerio_id
    and mm.ativo = true
    and (
      lower(f.nome_funcao) <> lower('Câmera')
      or lower(m.nome) in (
        lower('Ana Clara'),
        lower('Felipe França'),
        lower('Eliel'),
        lower('Yara Nycolly'),
        lower('Daniel')
      )
    )
  on conflict (id_membro, id_funcao) do nothing;
end;
$$;

drop function if exists private.ensure_seed_auth_user(uuid, text, text, text);
