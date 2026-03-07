-- =====================================================
-- CONFIGURAÇÃO COMPLETA DE RLS PARA TABELAS DE ESCALAS
-- =====================================================

-- 1. Habilitar RLS nas tabelas (se ainda não estiver)
ALTER TABLE cultos ENABLE ROW LEVEL SECURITY;
ALTER TABLE nome_cultos ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE repertorio ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas existentes (se houver) para evitar conflitos
DROP POLICY IF EXISTS "Users can view cultos" ON cultos;
DROP POLICY IF EXISTS "Users can insert cultos" ON cultos;
DROP POLICY IF EXISTS "Users can update cultos" ON cultos;
DROP POLICY IF EXISTS "Users can delete cultos" ON cultos;

DROP POLICY IF EXISTS "Users can view nome_cultos" ON nome_cultos;
DROP POLICY IF EXISTS "Users can insert nome_cultos" ON nome_cultos;
DROP POLICY IF EXISTS "Users can update nome_cultos" ON nome_cultos;
DROP POLICY IF EXISTS "Users can delete nome_cultos" ON nome_cultos;

DROP POLICY IF EXISTS "Users can view escalas" ON escalas;
DROP POLICY IF EXISTS "Users can insert escalas" ON escalas;
DROP POLICY IF EXISTS "Users can update escalas" ON escalas;
DROP POLICY IF EXISTS "Users can delete escalas" ON escalas;

DROP POLICY IF EXISTS "Users can view repertorio" ON repertorio;
DROP POLICY IF EXISTS "Users can insert repertorio" ON repertorio;
DROP POLICY IF EXISTS "Users can update repertorio" ON repertorio;
DROP POLICY IF EXISTS "Users can delete repertorio" ON repertorio;

-- 3. Criar políticas para tabela cultos
CREATE POLICY "Users can view cultos" ON cultos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert cultos" ON cultos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update cultos" ON cultos
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete cultos" ON cultos
    FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Criar políticas para tabela nome_cultos
CREATE POLICY "Users can view nome_cultos" ON nome_cultos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert nome_cultos" ON nome_cultos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update nome_cultos" ON nome_cultos
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete nome_cultos" ON nome_cultos
    FOR DELETE USING (auth.role() = 'authenticated');

-- 5. Criar políticas para tabela escalas
CREATE POLICY "Users can view escalas" ON escalas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert escalas" ON escalas
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update escalas" ON escalas
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete escalas" ON escalas
    FOR DELETE USING (auth.role() = 'authenticated');

-- 6. Criar políticas para tabela repertorio
CREATE POLICY "Users can view repertorio" ON repertorio
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert repertorio" ON repertorio
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update repertorio" ON repertorio
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete repertorio" ON repertorio
    FOR DELETE USING (auth.role() = 'authenticated');

-- 7. Verificar configuração final
SELECT 
    'cultos' as table_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'cultos'

UNION ALL

SELECT 
    'nome_cultos' as table_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'nome_cultos'

UNION ALL

SELECT 
    'escalas' as table_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'escalas'

UNION ALL

SELECT 
    'repertorio' as table_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'repertorio'

ORDER BY table_name, policyname;

-- 8. Verificar se RLS está ativo
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('cultos', 'nome_cultos', 'escalas', 'repertorio')
ORDER BY tablename;
