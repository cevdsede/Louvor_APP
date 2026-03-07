-- =====================================================
-- CORREÇÃO IMEDIATA DO RLS PARA TABELA CULTOS
-- =====================================================

-- PROBLEMA: 403 Forbidden ao tentar INSERT na tabela cultos
-- SOLUÇÃO: Habilitar RLS e criar políticas básicas

-- 1. Verificar se RLS está habilitado na tabela cultos
-- Se não estiver, habilitar
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'cultos' AND rowsecurity = false) THEN
        ALTER TABLE cultos ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS habilitado para tabela cultos';
    END IF;
END $$;

-- 2. Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON cultos;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON cultos;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON cultos;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON cultos;

-- 3. Criar políticas simples e diretas
-- Política para SELECT (leitura)
CREATE POLICY "Enable select for authenticated users" ON cultos
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para INSERT (criação) - ESTA É A POLÍCIA ESSENCIAL
CREATE POLICY "Enable insert for authenticated users" ON cultos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para UPDATE (atualização)
CREATE POLICY "Enable update for authenticated users" ON cultos
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para DELETE (exclusão)
CREATE POLICY "Enable delete for authenticated users" ON cultos
    FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Verificação final
SELECT 
    'cultos' as tabela,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'cultos'
ORDER BY policyname;

-- 5. Status final do RLS
SELECT 
    tablename,
    rowsecurity as rls_ativo
FROM pg_tables 
WHERE tablename = 'cultos';
