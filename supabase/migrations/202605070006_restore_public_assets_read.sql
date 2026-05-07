drop policy if exists "Public Assets Read" on storage.objects;
drop policy if exists leitura_publica on storage.objects;

create policy "Public Assets Read"
on storage.objects
for select
to public
using (bucket_id = 'public-assets');
