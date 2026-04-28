create schema if not exists private;

create table if not exists public.ministerios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null,
  descricao text,
  ativo boolean not null default true,
  modulos jsonb not null default '["dashboard","scales","music","team"]'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists ministerios_slug_unique_idx
  on public.ministerios (lower(slug));

create table if not exists public.membros_ministerios (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.membros (id) on delete cascade,
  ministerio_id uuid not null references public.ministerios (id) on delete cascade,
  principal boolean not null default false,
  ativo boolean not null default true,
  papel text not null default 'membro',
  created_at timestamptz not null default now(),
  unique (membro_id, ministerio_id)
);

create unique index if not exists membros_ministerios_principal_unique_idx
  on public.membros_ministerios (membro_id)
  where principal;

create index if not exists idx_membros_ministerios_membro
  on public.membros_ministerios (membro_id);

create index if not exists idx_membros_ministerios_ministerio
  on public.membros_ministerios (ministerio_id);

do $$
begin
  if not exists (
    select 1
    from public.ministerios
    where lower(slug) = 'louvor'
  ) then
    insert into public.ministerios (nome, slug, descricao, modulos)
    values (
      'Louvor',
      'louvor',
      'Ministério legado padrão',
      '["dashboard","scales","music","team"]'::jsonb
    );
  end if;
end $$;

insert into public.membros_ministerios (membro_id, ministerio_id, principal, ativo, papel)
select
  membros.id,
  ministerios.id,
  true,
  coalesce(membros.ativo, true),
  case
    when lower(coalesce(membros.perfil, '')) like '%admin%' then 'administrador'
    when lower(coalesce(membros.perfil, '')) like '%lider%' or lower(coalesce(membros.perfil, '')) like '%líder%' then 'lider'
    else 'membro'
  end
from public.membros
cross join lateral (
  select id
  from public.ministerios
  where lower(slug) = 'louvor'
  limit 1
) as ministerios
on conflict (membro_id, ministerio_id) do update
set
  ativo = excluded.ativo,
  principal = true;

alter table public.funcao
  add column if not exists ministerio_id uuid;

update public.funcao
set ministerio_id = ministerios.id
from (
  select id
  from public.ministerios
  where lower(slug) = 'louvor'
  limit 1
) as ministerios
where public.funcao.ministerio_id is null;

alter table public.funcao
  alter column ministerio_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'funcao_ministerio_id_fkey'
      and conrelid = 'public.funcao'::regclass
  ) then
    alter table public.funcao
      add constraint funcao_ministerio_id_fkey
      foreign key (ministerio_id)
      references public.ministerios (id)
      on delete restrict;
  end if;
end $$;

alter table public.funcao
  drop constraint if exists funcao_nome_funcao_key;

create unique index if not exists funcao_ministerio_nome_unique_idx
  on public.funcao (ministerio_id, nome_funcao);

create index if not exists idx_funcao_ministerio
  on public.funcao (ministerio_id);

alter table public.escalas
  add column if not exists ministerio_id uuid;

update public.escalas as escalas
set ministerio_id = coalesce(funcao.ministerio_id, ministerios.id)
from public.funcao
cross join lateral (
  select id
  from public.ministerios
  where lower(slug) = 'louvor'
  limit 1
) as ministerios
where escalas.id_funcao = funcao.id
  and escalas.ministerio_id is null;

update public.escalas
set ministerio_id = ministerios.id
from (
  select id
  from public.ministerios
  where lower(slug) = 'louvor'
  limit 1
) as ministerios
where public.escalas.ministerio_id is null;

alter table public.escalas
  alter column ministerio_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'escalas_ministerio_id_fkey'
      and conrelid = 'public.escalas'::regclass
  ) then
    alter table public.escalas
      add constraint escalas_ministerio_id_fkey
      foreign key (ministerio_id)
      references public.ministerios (id)
      on delete restrict;
  end if;
end $$;

create index if not exists idx_escalas_ministerio_culto
  on public.escalas (ministerio_id, id_culto);

alter table public.avisos_cultos
  add column if not exists ministerio_id uuid;

update public.avisos_cultos as avisos
set ministerio_id = escalas.ministerio_id
from public.escalas
where avisos.ministerio_id is null
  and avisos.id_cultos = escalas.id_culto
  and avisos.id_membros = escalas.id_membros;

update public.avisos_cultos
set ministerio_id = ministerios.id
from (
  select id
  from public.ministerios
  where lower(slug) = 'louvor'
  limit 1
) as ministerios
where public.avisos_cultos.ministerio_id is null;

alter table public.avisos_cultos
  alter column ministerio_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'avisos_cultos_ministerio_id_fkey'
      and conrelid = 'public.avisos_cultos'::regclass
  ) then
    alter table public.avisos_cultos
      add constraint avisos_cultos_ministerio_id_fkey
      foreign key (ministerio_id)
      references public.ministerios (id)
      on delete restrict;
  end if;
end $$;

create index if not exists idx_avisos_cultos_ministerio_culto
  on public.avisos_cultos (ministerio_id, id_cultos);

create unique index if not exists membros_funcoes_member_role_unique_idx
  on public.membros_funcoes (id_membro, id_funcao);

create index if not exists idx_membros_funcoes_membro
  on public.membros_funcoes (id_membro);

create index if not exists idx_membros_funcoes_funcao
  on public.membros_funcoes (id_funcao);

alter table public.solicitacoes_membro
  add column if not exists status text,
  add column if not exists processado_em timestamptz,
  add column if not exists processado_por uuid;

update public.solicitacoes_membro
set status = case
  when aprovado is true then 'aprovado'
  else 'pendente'
end
where status is null;

alter table public.solicitacoes_membro
  alter column status set default 'pendente',
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'solicitacoes_membro_processado_por_fkey'
      and conrelid = 'public.solicitacoes_membro'::regclass
  ) then
    alter table public.solicitacoes_membro
      add constraint solicitacoes_membro_processado_por_fkey
      foreign key (processado_por)
      references public.membros (id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_solicitacoes_membro_status
  on public.solicitacoes_membro (status);

create or replace function private.is_global_admin_or_lider()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.membros
    where id = (select auth.uid())
      and (
        lower(coalesce(perfil, '')) like '%admin%'
        or lower(coalesce(perfil, '')) like '%lider%'
        or lower(coalesce(perfil, '')) like '%líder%'
      )
  );
$$;

create or replace function private.user_ministerio_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(ministerio_id),
    '{}'::uuid[]
  )
  from public.membros_ministerios
  where membro_id = (select auth.uid())
    and ativo is not false;
$$;

create or replace function private.managed_ministerio_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(ministerio_id),
    '{}'::uuid[]
  )
  from public.membros_ministerios
  where membro_id = (select auth.uid())
    and ativo is not false
    and (
      lower(coalesce(papel, '')) like '%admin%'
      or lower(coalesce(papel, '')) like '%lider%'
      or lower(coalesce(papel, '')) like '%líder%'
      or lower(coalesce(papel, '')) like '%coordenador%'
    );
$$;

create or replace function private.is_louvor_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (select private.is_global_admin_or_lider())
    or exists (
      select 1
      from public.membros_ministerios mm
      join public.ministerios ministerios
        on ministerios.id = mm.ministerio_id
      where mm.membro_id = (select auth.uid())
        and mm.ativo is not false
        and lower(ministerios.slug) = 'louvor'
    );
$$;

create or replace function private.can_manage_louvor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (select private.is_global_admin_or_lider())
    or exists (
      select 1
      from public.membros_ministerios mm
      join public.ministerios ministerios
        on ministerios.id = mm.ministerio_id
      where mm.membro_id = (select auth.uid())
        and mm.ativo is not false
        and lower(ministerios.slug) = 'louvor'
        and (
          lower(coalesce(mm.papel, '')) like '%admin%'
          or lower(coalesce(mm.papel, '')) like '%lider%'
          or lower(coalesce(mm.papel, '')) like '%líder%'
          or lower(coalesce(mm.papel, '')) like '%coordenador%'
        )
    );
$$;

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
    false
  )
  on conflict (id) do update
  set
    nome = excluded.nome,
    email = excluded.email,
    ativo = false;

  return new;
end;
$$;

create or replace function public.handle_novo_cadastro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.solicitacoes_membro (
    id,
    email,
    nome,
    aprovado,
    status
  )
  values (
    new.id,
    lower(new.email),
    coalesce(
      new.raw_user_meta_data ->> 'nome',
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(coalesce(new.email, ''), '@', 1),
      'Novo membro'
    ),
    false,
    'pendente'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    nome = excluded.nome,
    aprovado = false,
    status = 'pendente',
    processado_em = null,
    processado_por = null;

  return new;
end;
$$;

drop function if exists public.aprovar_membro(uuid);
drop function if exists public.aprovar_membro(uuid, bigint[]);

create or replace function public.aprovar_membro(
  user_id uuid,
  ministerio_ids uuid[] default null,
  lista_funcao_ids bigint[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_member public.membros%rowtype;
  target_request public.solicitacoes_membro%rowtype;
  target_ministerios uuid[];
  default_louvor uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuário não autenticado';
  end if;

  if not (select private.is_global_admin_or_lider()) then
    raise exception 'Sem permissão para aprovar membros';
  end if;

  select *
  into target_member
  from public.membros
  where id = user_id;

  if not found then
    raise exception 'Membro % não encontrado', user_id;
  end if;

  select *
  into target_request
  from public.solicitacoes_membro
  where id = user_id;

  select id
  into default_louvor
  from public.ministerios
  where lower(slug) = 'louvor'
  limit 1;

  if default_louvor is null then
    raise exception 'Ministério padrão não encontrado';
  end if;

  if array_length(ministerio_ids, 1) is null then
    target_ministerios := array[default_louvor]::uuid[];
  else
    target_ministerios := ministerio_ids;
  end if;

  update public.membros
  set
    nome = coalesce(target_request.nome, target_member.nome),
    email = coalesce(lower(target_request.email), lower(target_member.email)),
    ativo = true
  where id = user_id;

  update public.membros_ministerios
  set principal = false
  where membro_id = user_id
    and principal = true
    and ministerio_id <> target_ministerios[1];

  insert into public.membros_ministerios (membro_id, ministerio_id, principal, ativo, papel)
  select
    user_id,
    ministerio_id,
    ministerio_id = target_ministerios[1],
    true,
    case
      when lower(coalesce(target_member.perfil, '')) like '%admin%' then 'administrador'
      when lower(coalesce(target_member.perfil, '')) like '%lider%' or lower(coalesce(target_member.perfil, '')) like '%líder%' then 'lider'
      else 'membro'
    end
  from unnest(target_ministerios) as ministerio_id
  on conflict (membro_id, ministerio_id) do update
  set
    ativo = true,
    principal = excluded.principal;

  if array_length(lista_funcao_ids, 1) is not null then
    insert into public.membros_funcoes (id_membro, id_funcao)
    select distinct
      user_id,
      funcao.id
    from public.funcao
    where funcao.id = any(lista_funcao_ids)
      and funcao.ministerio_id = any(target_ministerios)
    on conflict (id_membro, id_funcao) do nothing;
  end if;

  update public.solicitacoes_membro
  set
    aprovado = true,
    status = 'aprovado',
    processado_em = now(),
    processado_por = (select auth.uid())
  where id = user_id;

  return jsonb_build_object(
    'success', true,
    'user_id', user_id,
    'ministerio_ids', target_ministerios,
    'funcoes_aprovadas', coalesce(lista_funcao_ids, '{}'::bigint[])
  );
end;
$$;

alter table public.ministerios enable row level security;
alter table public.membros_ministerios enable row level security;
alter table public.membros enable row level security;
alter table public.funcao enable row level security;
alter table public.membros_funcoes enable row level security;
alter table public.escalas enable row level security;
alter table public.avisos_cultos enable row level security;
alter table public.solicitacoes_membro enable row level security;
alter table public.musicas enable row level security;
alter table public.repertorio enable row level security;
alter table public.historico_musicas enable row level security;

do $$
declare
  target_policy record;
begin
  for target_policy in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'ministerios',
        'membros_ministerios',
        'membros',
        'funcao',
        'membros_funcoes',
        'escalas',
        'avisos_cultos',
        'solicitacoes_membro',
        'musicas',
        'repertorio',
        'historico_musicas'
      )
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      target_policy.policyname,
      target_policy.tablename
    );
  end loop;
end $$;

create policy "ministerios_select"
on public.ministerios
for select
to authenticated
using (
  (select private.is_global_admin_or_lider())
  or id = any(coalesce((select private.user_ministerio_ids()), '{}'::uuid[]))
);

create policy "ministerios_manage"
on public.ministerios
for all
to authenticated
using ((select private.is_global_admin_or_lider()))
with check ((select private.is_global_admin_or_lider()));

create policy "membros_ministerios_select"
on public.membros_ministerios
for select
to authenticated
using (
  (select private.is_global_admin_or_lider())
  or membro_id = (select auth.uid())
  or ministerio_id = any(coalesce((select private.user_ministerio_ids()), '{}'::uuid[]))
);

create policy "membros_ministerios_manage"
on public.membros_ministerios
for all
to authenticated
using (
  (select private.is_global_admin_or_lider())
  or ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
)
with check (
  (select private.is_global_admin_or_lider())
  or ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
);

create policy "membros_select"
on public.membros
for select
to authenticated
using (
  (select private.is_global_admin_or_lider())
  or id = (select auth.uid())
  or exists (
    select 1
    from public.membros_ministerios mm
    where mm.membro_id = membros.id
      and mm.ativo is not false
      and mm.ministerio_id = any(coalesce((select private.user_ministerio_ids()), '{}'::uuid[]))
  )
);

create policy "membros_update"
on public.membros
for update
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_global_admin_or_lider())
  or exists (
    select 1
    from public.membros_ministerios mm
    where mm.membro_id = membros.id
      and mm.ativo is not false
      and mm.ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
  )
)
with check (
  id = (select auth.uid())
  or (select private.is_global_admin_or_lider())
  or exists (
    select 1
    from public.membros_ministerios mm
    where mm.membro_id = membros.id
      and mm.ativo is not false
      and mm.ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
  )
);

create policy "funcao_select"
on public.funcao
for select
to authenticated
using (
  (select private.is_global_admin_or_lider())
  or ministerio_id = any(coalesce((select private.user_ministerio_ids()), '{}'::uuid[]))
);

create policy "funcao_manage"
on public.funcao
for all
to authenticated
using (
  (select private.is_global_admin_or_lider())
  or ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
)
with check (
  (select private.is_global_admin_or_lider())
  or ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
);

create policy "membros_funcoes_select"
on public.membros_funcoes
for select
to authenticated
using (
  id_membro = (select auth.uid())
  or (select private.is_global_admin_or_lider())
  or exists (
    select 1
    from public.funcao
    where funcao.id = membros_funcoes.id_funcao
      and funcao.ministerio_id = any(coalesce((select private.user_ministerio_ids()), '{}'::uuid[]))
  )
);

create policy "membros_funcoes_manage"
on public.membros_funcoes
for all
to authenticated
using (
  (select private.is_global_admin_or_lider())
  or exists (
    select 1
    from public.funcao
    where funcao.id = membros_funcoes.id_funcao
      and funcao.ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
  )
)
with check (
  (select private.is_global_admin_or_lider())
  or exists (
    select 1
    from public.funcao
    where funcao.id = membros_funcoes.id_funcao
      and funcao.ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
  )
);

create policy "escalas_select"
on public.escalas
for select
to authenticated
using (
  (select private.is_global_admin_or_lider())
  or ministerio_id = any(coalesce((select private.user_ministerio_ids()), '{}'::uuid[]))
);

create policy "escalas_manage"
on public.escalas
for all
to authenticated
using (
  (select private.is_global_admin_or_lider())
  or ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
)
with check (
  (select private.is_global_admin_or_lider())
  or ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
);

create policy "avisos_select"
on public.avisos_cultos
for select
to authenticated
using (
  (select private.is_global_admin_or_lider())
  or ministerio_id = any(coalesce((select private.user_ministerio_ids()), '{}'::uuid[]))
);

create policy "avisos_manage"
on public.avisos_cultos
for all
to authenticated
using (
  (select private.is_global_admin_or_lider())
  or ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
)
with check (
  (select private.is_global_admin_or_lider())
  or ministerio_id = any(coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))
);

create policy "solicitacoes_select"
on public.solicitacoes_membro
for select
to authenticated
using ((select private.is_global_admin_or_lider()));

create policy "solicitacoes_manage"
on public.solicitacoes_membro
for all
to authenticated
using ((select private.is_global_admin_or_lider()))
with check ((select private.is_global_admin_or_lider()));

create policy "musicas_select"
on public.musicas
for select
to authenticated
using ((select private.is_louvor_member()));

create policy "musicas_manage"
on public.musicas
for all
to authenticated
using ((select private.can_manage_louvor()))
with check ((select private.can_manage_louvor()));

create policy "repertorio_select"
on public.repertorio
for select
to authenticated
using ((select private.is_louvor_member()));

create policy "repertorio_manage"
on public.repertorio
for all
to authenticated
using ((select private.can_manage_louvor()))
with check ((select private.can_manage_louvor()));

create policy "historico_musicas_select"
on public.historico_musicas
for select
to authenticated
using ((select private.is_louvor_member()));

create policy "historico_musicas_manage"
on public.historico_musicas
for all
to authenticated
using ((select private.can_manage_louvor()))
with check ((select private.can_manage_louvor()));
