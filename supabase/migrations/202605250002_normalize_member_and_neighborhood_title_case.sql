create or replace function public.title_case_pt(input text)
returns text
language plpgsql
immutable
as $$
declare
  words text[];
  result text[] := array[]::text[];
  word text;
  normalized text;
  idx integer := 0;
begin
  if input is null or btrim(input) = '' then
    return null;
  end if;

  words := regexp_split_to_array(lower(regexp_replace(btrim(input), '\s+', ' ', 'g')), ' ');

  foreach word in array words loop
    idx := idx + 1;
    if idx > 1 and word in ('da', 'de', 'do', 'das', 'dos', 'e') then
      normalized := word;
    else
      normalized := upper(substr(word, 1, 1)) || substr(word, 2);
    end if;

    result := array_append(result, normalized);
  end loop;

  return array_to_string(result, ' ');
end;
$$;

update public.membros
set
  nome = public.title_case_pt(nome),
  display_name = public.title_case_pt(coalesce(display_name, nome)),
  nome_planilha = public.title_case_pt(coalesce(nome_planilha, nome)),
  bairro = public.title_case_pt(bairro)
where nome is not null or display_name is not null or nome_planilha is not null or bairro is not null;

update public.visitantes_igreja
set
  nome = public.title_case_pt(nome),
  bairro = public.title_case_pt(bairro)
where nome is not null or bairro is not null;

update public.novos_convertidos_igreja
set
  nome = public.title_case_pt(nome),
  bairro = public.title_case_pt(bairro),
  nome_contato_recado = public.title_case_pt(nome_contato_recado)
where nome is not null or bairro is not null or nome_contato_recado is not null;
