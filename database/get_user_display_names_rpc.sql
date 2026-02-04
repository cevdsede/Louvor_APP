-- Função RPC para obter display names dos usuários
-- Esta função busca os metadados dos usuários na tabela auth.users
-- e retorna os display names formatados

CREATE OR REPLACE FUNCTION get_user_display_names()
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  full_name TEXT,
  name TEXT,
  email TEXT,
  nome TEXT -- fallback da tabela membros
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Buscar usuários da tabela auth.users que têm correspondência na tabela membros
  RETURN QUERY
  SELECT 
    u.id as user_id,
    COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') as display_name,
    u.raw_user_meta_data->>'full_name' as full_name,
    u.raw_user_meta_data->>'name' as name,
    u.email,
    m.nome
  FROM auth.users u
  INNER JOIN membros m ON u.id = m.id
  WHERE u.id IS NOT NULL
  ORDER BY u.email;
END;
$$;

-- Garantir que a função tenha permissões adequadas
-- A função usa SECURITY DEFINER, então será executada com permissões do dono
-- Não precisa de políticas RLS específicas para esta função

-- Testar a função (opcional, pode ser removido depois)
-- SELECT * FROM get_user_display_names();
