alter table public.aviso_geral
  alter column created_at type timestamptz
  using case
    when created_at is null then now()
    else created_at::timestamp with time zone
  end;

alter table public.aviso_geral
  add column if not exists titulo text,
  add column if not exists tipo text not null default 'aviso_geral',
  add column if not exists remetente_id uuid references public.membros(id),
  add column if not exists ministerio_id uuid references public.ministerios(id),
  add column if not exists destino text not null default 'todos',
  add column if not exists id_culto uuid references public.cultos(id),
  add column if not exists lida boolean not null default false;

update public.aviso_geral
set
  titulo = coalesce(titulo, 'Aviso geral'),
  tipo = coalesce(tipo, 'aviso_geral'),
  destino = coalesce(destino, 'todos'),
  lida = coalesce(lida, false)
where true;

create index if not exists aviso_geral_id_membro_idx
  on public.aviso_geral (id_membro);

create index if not exists aviso_geral_ministerio_idx
  on public.aviso_geral (ministerio_id);

create index if not exists aviso_geral_lida_idx
  on public.aviso_geral (lida);

create index if not exists aviso_geral_created_at_idx
  on public.aviso_geral (created_at desc);
