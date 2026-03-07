-- =====================================================
-- VERIFICAÇÃO DE RLS ATUAL DAS TABELAS DE ESCALAS
-- =====================================================

-- 1. Verificar se as tabelas existem
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('cultos', 'nome_cultos', 'escala')
ORDER BY table_name;

-- 2. Verificar se RLS está ativo nas tabelas
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('cultos', 'nome_cultos', 'escala')
ORDER BY tablename;

-- 3. Verificar políticas existentes para cada tabela
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('cultos', 'nome_cultos', 'escala')
ORDER BY tablename, policyname;

-- 4. Verificar se usuário atual tem permissão
SELECT 
    current_user as "Usuário atual",
    auth.role() as "Role atual",
    auth.uid() as "UID atual";
