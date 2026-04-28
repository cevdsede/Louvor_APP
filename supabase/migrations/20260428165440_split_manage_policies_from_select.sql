drop policy if exists "Admins e lideres controle total" on public.cultos;
create policy cultos_manage_insert on public.cultos for insert to authenticated with check (exists (select 1 from public.membros where membros.id = (select auth.uid()) and lower(membros.perfil) = any (array['admin'::text, 'lider'::text])));
create policy cultos_manage_update on public.cultos for update to authenticated using (exists (select 1 from public.membros where membros.id = (select auth.uid()) and lower(membros.perfil) = any (array['admin'::text, 'lider'::text]))) with check (exists (select 1 from public.membros where membros.id = (select auth.uid()) and lower(membros.perfil) = any (array['admin'::text, 'lider'::text])));
create policy cultos_manage_delete on public.cultos for delete to authenticated using (exists (select 1 from public.membros where membros.id = (select auth.uid()) and lower(membros.perfil) = any (array['admin'::text, 'lider'::text])));

drop policy if exists avisos_manage on public.avisos_cultos;
create policy avisos_manage_insert on public.avisos_cultos for insert to authenticated with check ((select private.is_global_admin_or_lider()) or ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[])));
create policy avisos_manage_update on public.avisos_cultos for update to authenticated using ((select private.is_global_admin_or_lider()) or ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))) with check ((select private.is_global_admin_or_lider()) or ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[])));
create policy avisos_manage_delete on public.avisos_cultos for delete to authenticated using ((select private.is_global_admin_or_lider()) or ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[])));

drop policy if exists escalas_manage on public.escalas;
create policy escalas_manage_insert on public.escalas for insert to authenticated with check ((select private.is_global_admin_or_lider()) or ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[])));
create policy escalas_manage_update on public.escalas for update to authenticated using ((select private.is_global_admin_or_lider()) or ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))) with check ((select private.is_global_admin_or_lider()) or ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[])));
create policy escalas_manage_delete on public.escalas for delete to authenticated using ((select private.is_global_admin_or_lider()) or ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[])));

drop policy if exists funcao_manage on public.funcao;
create policy funcao_manage_insert on public.funcao for insert to authenticated with check ((select private.is_global_admin_or_lider()) or ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[])));
create policy funcao_manage_update on public.funcao for update to authenticated using ((select private.is_global_admin_or_lider()) or ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))) with check ((select private.is_global_admin_or_lider()) or ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[])));
create policy funcao_manage_delete on public.funcao for delete to authenticated using ((select private.is_global_admin_or_lider()) or ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[])));

drop policy if exists historico_musicas_manage on public.historico_musicas;
create policy historico_musicas_manage_insert on public.historico_musicas for insert to authenticated with check ((select private.can_manage_louvor()));
create policy historico_musicas_manage_update on public.historico_musicas for update to authenticated using ((select private.can_manage_louvor())) with check ((select private.can_manage_louvor()));
create policy historico_musicas_manage_delete on public.historico_musicas for delete to authenticated using ((select private.can_manage_louvor()));

drop policy if exists limpeza_admin_lider_full on public.limpeza;
create policy limpeza_admin_lider_insert on public.limpeza for insert to authenticated with check (exists (select 1 from public.membros where membros.id = (select auth.uid()) and lower(membros.perfil) = any (array['admin'::text, 'lider'::text])));
create policy limpeza_admin_lider_update on public.limpeza for update to authenticated using (exists (select 1 from public.membros where membros.id = (select auth.uid()) and lower(membros.perfil) = any (array['admin'::text, 'lider'::text]))) with check (exists (select 1 from public.membros where membros.id = (select auth.uid()) and lower(membros.perfil) = any (array['admin'::text, 'lider'::text])));
create policy limpeza_admin_lider_delete on public.limpeza for delete to authenticated using (exists (select 1 from public.membros where membros.id = (select auth.uid()) and lower(membros.perfil) = any (array['admin'::text, 'lider'::text])));

drop policy if exists membros_funcoes_manage on public.membros_funcoes;
create policy membros_funcoes_manage_insert on public.membros_funcoes for insert to authenticated with check ((select private.is_global_admin_or_lider()) or exists (select 1 from public.funcao where funcao.id = membros_funcoes.id_funcao and funcao.ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))));
create policy membros_funcoes_manage_update on public.membros_funcoes for update to authenticated using ((select private.is_global_admin_or_lider()) or exists (select 1 from public.funcao where funcao.id = membros_funcoes.id_funcao and funcao.ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[])))) with check ((select private.is_global_admin_or_lider()) or exists (select 1 from public.funcao where funcao.id = membros_funcoes.id_funcao and funcao.ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))));
create policy membros_funcoes_manage_delete on public.membros_funcoes for delete to authenticated using ((select private.is_global_admin_or_lider()) or exists (select 1 from public.funcao where funcao.id = membros_funcoes.id_funcao and funcao.ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))));

drop policy if exists membros_ministerios_manage on public.membros_ministerios;
create policy membros_ministerios_manage_insert on public.membros_ministerios for insert to authenticated with check ((select private.is_global_admin_or_lider()) or ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[])));
create policy membros_ministerios_manage_update on public.membros_ministerios for update to authenticated using ((select private.is_global_admin_or_lider()) or ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[]))) with check ((select private.is_global_admin_or_lider()) or ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[])));
create policy membros_ministerios_manage_delete on public.membros_ministerios for delete to authenticated using ((select private.is_global_admin_or_lider()) or ministerio_id = any (coalesce((select private.managed_ministerio_ids()), '{}'::uuid[])));

drop policy if exists ministerios_manage on public.ministerios;
create policy ministerios_manage_insert on public.ministerios for insert to authenticated with check ((select private.is_global_admin_or_lider()));
create policy ministerios_manage_update on public.ministerios for update to authenticated using ((select private.is_global_admin_or_lider())) with check ((select private.is_global_admin_or_lider()));
create policy ministerios_manage_delete on public.ministerios for delete to authenticated using ((select private.is_global_admin_or_lider()));

drop policy if exists musicas_manage on public.musicas;
create policy musicas_manage_insert on public.musicas for insert to authenticated with check ((select private.can_manage_louvor()));
create policy musicas_manage_update on public.musicas for update to authenticated using ((select private.can_manage_louvor())) with check ((select private.can_manage_louvor()));
create policy musicas_manage_delete on public.musicas for delete to authenticated using ((select private.can_manage_louvor()));

drop policy if exists repertorio_manage on public.repertorio;
create policy repertorio_manage_insert on public.repertorio for insert to authenticated with check ((select private.can_manage_louvor()));
create policy repertorio_manage_update on public.repertorio for update to authenticated using ((select private.can_manage_louvor())) with check ((select private.can_manage_louvor()));
create policy repertorio_manage_delete on public.repertorio for delete to authenticated using ((select private.can_manage_louvor()));

drop policy if exists solicitacoes_manage on public.solicitacoes_membro;
create policy solicitacoes_manage_insert on public.solicitacoes_membro for insert to authenticated with check ((select private.is_global_admin_or_lider()));
create policy solicitacoes_manage_update on public.solicitacoes_membro for update to authenticated using ((select private.is_global_admin_or_lider())) with check ((select private.is_global_admin_or_lider()));
create policy solicitacoes_manage_delete on public.solicitacoes_membro for delete to authenticated using ((select private.is_global_admin_or_lider()));
