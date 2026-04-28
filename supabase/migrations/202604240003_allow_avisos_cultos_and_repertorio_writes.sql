create policy "avisos_cultos_authenticated_insert"
on public.avisos_cultos
for insert
to authenticated
with check (auth.role() = 'authenticated');

create policy "avisos_cultos_authenticated_update"
on public.avisos_cultos
for update
to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "avisos_cultos_authenticated_delete"
on public.avisos_cultos
for delete
to authenticated
using (auth.role() = 'authenticated');

create policy "repertorio_authenticated_insert"
on public.repertorio
for insert
to authenticated
with check (auth.role() = 'authenticated');

create policy "repertorio_authenticated_update"
on public.repertorio
for update
to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "repertorio_authenticated_delete"
on public.repertorio
for delete
to authenticated
using (auth.role() = 'authenticated');
