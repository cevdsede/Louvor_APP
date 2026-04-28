alter policy "Admins e lideres controle total" on public.cultos
  using (exists (
    select 1 from public.membros
    where membros.id = (select auth.uid())
      and lower(membros.perfil) = any (array['admin'::text, 'lider'::text])
  ))
  with check (exists (
    select 1 from public.membros
    where membros.id = (select auth.uid())
      and lower(membros.perfil) = any (array['admin'::text, 'lider'::text])
  ));

alter policy "Usuários autenticados podem ver cultos" on public.cultos
  using ((select auth.role()) = 'authenticated'::text);

alter policy "Users can delete eventos" on public.eventos
  using ((select auth.role()) = 'authenticated'::text);

alter policy "Users can insert eventos" on public.eventos
  with check ((select auth.role()) = 'authenticated'::text);

alter policy "Users can update eventos" on public.eventos
  using ((select auth.role()) = 'authenticated'::text);

alter policy "Users can view eventos" on public.eventos
  using ((select auth.role()) = 'authenticated'::text);

alter policy "Usuários autenticados podem ver eventos" on public.eventos
  using ((select auth.role()) = 'authenticated'::text);

alter policy limpeza_admin_lider_full on public.limpeza
  using (exists (
    select 1 from public.membros
    where membros.id = (select auth.uid())
      and lower(membros.perfil) = any (array['admin'::text, 'lider'::text])
  ))
  with check (exists (
    select 1 from public.membros
    where membros.id = (select auth.uid())
      and lower(membros.perfil) = any (array['admin'::text, 'lider'::text])
  ));

alter policy "Usuários autenticados podem ver nome_cultos" on public.nome_cultos
  using ((select auth.role()) = 'authenticated'::text);

alter policy "Users can delete presencas" on public.presenca_evento
  using ((select auth.role()) = 'authenticated'::text);

alter policy "Users can insert presencas" on public.presenca_evento
  with check ((select auth.role()) = 'authenticated'::text);

alter policy "Users can update presencas" on public.presenca_evento
  using ((select auth.role()) = 'authenticated'::text);

alter policy "Users can view presencas" on public.presenca_evento
  using ((select auth.role()) = 'authenticated'::text);

alter policy "Usuários autenticados podem criar presenca_consagracao" on public.presenca_evento
  with check ((select auth.role()) = 'authenticated'::text);

alter policy "Usuários autenticados podem ver presenca_consagracao" on public.presenca_evento
  using ((select auth.role()) = 'authenticated'::text);

alter policy "Usuários autenticados podem ver temas" on public.temas
  using ((select auth.role()) = 'authenticated'::text);

alter policy "Usuários autenticados podem ver tons" on public.tons
  using ((select auth.role()) = 'authenticated'::text);
