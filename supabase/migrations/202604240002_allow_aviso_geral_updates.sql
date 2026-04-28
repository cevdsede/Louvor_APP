create policy "Usuarios autenticados podem atualizar aviso_geral"
on public.aviso_geral
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "Usuarios autenticados podem deletar aviso_geral"
on public.aviso_geral
for delete
using (auth.role() = 'authenticated');
