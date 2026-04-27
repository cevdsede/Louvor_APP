alter table public.membros
  add column if not exists display_name text,
  add column if not exists nome_planilha text;

comment on column public.membros.display_name is 'Nome exibido no app para o usuario.';
comment on column public.membros.nome_planilha is 'Nome/apelido usado para relacionar o membro com importacoes de escala da planilha.';

update public.membros
set display_name = coalesce(nullif(display_name, ''), nome),
    nome_planilha = coalesce(nullif(nome_planilha, ''), nome)
where display_name is null
   or display_name = ''
   or nome_planilha is null
   or nome_planilha = '';
