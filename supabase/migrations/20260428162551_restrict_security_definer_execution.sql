revoke execute on function public.aprovar_membro(uuid, uuid[], bigint[]) from public, anon;
grant execute on function public.aprovar_membro(uuid, uuid[], bigint[]) to authenticated;

revoke execute on function public.get_auth_display_names() from public, anon;
grant execute on function public.get_auth_display_names() to authenticated;

revoke execute on function public.get_user_display_names() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_novo_cadastro() from public, anon, authenticated;
