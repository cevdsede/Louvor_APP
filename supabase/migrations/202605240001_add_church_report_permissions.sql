alter table public.permissoes_igreja
  add column if not exists acessar_relatorios_igreja boolean not null default false,
  add column if not exists exportar_relatorios_igreja boolean not null default false;
