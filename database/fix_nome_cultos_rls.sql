-- =====================================================
-- CORREÇÃO DE RLS PARA TABELA nome_cultos
-- =====================================================

-- 1. Verificar se RLS está ativo
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'nome_cultos';

-- 2. Remover políticas existentes para nome_cultos
DROP POLICY IF EXISTS "Users can view nome_cultos" ON nome_cultos;
DROP POLICY IF EXISTS "Users can insert nome_cultos" ON nome_cultos;
DROP POLICY IF EXISTS "Users can update nome_cultos" ON nome_cultos;
DROP POLICY IF EXISTS "Users can delete nome_cultos" ON nome_cultos;

-- 3. Habilitar RLS se não estiver ativo
ALTER TABLE nome_cultos ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas para nome_cultos
CREATE POLICY "Users can view nome_cultos" ON nome_cultos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert nome_cultos" ON nome_cultos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update nome_cultos" ON nome_cultos
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete nome_cultos" ON nome_cultos
    FOR DELETE USING (auth.role() = 'authenticated');

-- 5. Verificar políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'nome_cultos'
ORDER BY policyname;

-- 6. Testar permissão UPDATE (execute manualmente para testar)
-- SELECT auth.uid();
-- UPDATE nome_cultos SET nome_culto = 'TESTE_UPDATE' WHERE id = 'SEU_ID_AQUI';

-- 7. Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'nome_cultos'
ORDER BY ordinal_position;
