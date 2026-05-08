-- Move member inactivity to ministry memberships, then remove the global member status.
update public.membros_ministerios mm
set ativo = false,
    principal = false
from public.membros m
where m.id = mm.membro_id
  and m.ativo = false;

alter table public.membros
drop column if exists ativo;
