create or replace function public.handle_new_user_public_photo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.membros
  set foto = nullif(new.raw_user_meta_data ->> 'foto', '')
  where id = new.id
    and nullif(new.raw_user_meta_data ->> 'foto', '') is not null;

  return new;
end;
$$;

drop trigger if exists zz_handle_new_user_public_photo on auth.users;
create trigger zz_handle_new_user_public_photo
after insert on auth.users
for each row
execute function public.handle_new_user_public_photo();

revoke execute on function public.handle_new_user_public_photo() from public, anon, authenticated;
