-- =====================================================
-- CONFIGURAÇÃO COMPLETA DE RLS PARA TABELAS DE EVENTOS
-- =====================================================

-- 1. Habilitar RLS na tabela eventos (se ainda não estiver)
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas existentes (se houver) para evitar conflitos
DROP POLICY IF EXISTS "Users can view eventos" ON eventos;
DROP POLICY IF EXISTS "Users can insert eventos" ON eventos;
DROP POLICY IF EXISTS "Users can update eventos" ON eventos;
DROP POLICY IF EXISTS "Users can delete eventos" ON eventos;

-- 3. Criar políticas para tabela eventos
CREATE POLICY "Users can view eventos" ON eventos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert eventos" ON eventos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update eventos" ON eventos
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete eventos" ON eventos
    FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Habilitar RLS na tabela presenca_evento (se ainda não estiver)
ALTER TABLE presenca_evento ENABLE ROW LEVEL SECURITY;

-- 5. Remover políticas existentes (se houver) para evitar conflitos
DROP POLICY IF EXISTS "Users can view presencas" ON presenca_evento;
DROP POLICY IF EXISTS "Users can insert presencas" ON presenca_evento;
DROP POLICY IF EXISTS "Users can update presencas" ON presenca_evento;
DROP POLICY IF EXISTS "Users can delete presencas" ON presenca_evento;

-- 6. Criar políticas para tabela presenca_evento
CREATE POLICY "Users can view presencas" ON presenca_evento
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert presencas" ON presenca_evento
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update presencas" ON presenca_evento
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete presencas" ON presenca_evento
    FOR DELETE USING (auth.role() = 'authenticated');

-- 7. Verificar configuração final
SELECT 
    'eventos' as table_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'eventos'

UNION ALL

SELECT 
    'presenca_evento' as table_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'presenca_evento'

ORDER BY table_name, policyname;

-- 8. Verificar se RLS está ativo
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('eventos', 'presenca_evento')
ORDER BY tablename;
