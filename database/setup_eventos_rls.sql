-- Habilitar RLS na tabela eventos
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

-- Política para leitura (usuários autenticados podem ver eventos)
CREATE POLICY "Users can view eventos" ON eventos
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para inserção (usuários autenticados podem criar eventos)
CREATE POLICY "Users can insert eventos" ON eventos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para atualização (usuários autenticados podem atualizar eventos)
CREATE POLICY "Users can update eventos" ON eventos
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para deleção (usuários autenticados podem deletar eventos)
CREATE POLICY "Users can delete eventos" ON eventos
    FOR DELETE USING (auth.role() = 'authenticated');

-- Verificar se as políticas foram criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'eventos';
