delete from public.aviso_geral
where titulo ilike 'Resposta da escala -%'
  or texto ilike '%confirmou presenca%'
  or texto ilike '%recusou a escala%';

drop table if exists public.escalas_confirmacoes cascade;
