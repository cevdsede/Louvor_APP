-- Criar tabela presenca_evento (versão atualizada de presenca_consagracao)
CREATE TABLE IF NOT EXISTS presenca_evento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_evento TEXT NOT NULL REFERENCES eventos(id_evento),
  id_membro UUID NOT NULL REFERENCES membros(id),
  presenca TEXT NOT NULL CHECK (presenca IN ('presente', 'ausente', 'justificado')),
  justificativa TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_presenca_evento_id_evento ON presenca_evento(id_evento);
CREATE INDEX IF NOT EXISTS idx_presenca_evento_id_membro ON presenca_evento(id_membro);
CREATE INDEX IF NOT EXISTS idx_presenca_evento_presenca ON presenca_evento(presenca);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_presenca_evento_updated_at 
    BEFORE UPDATE ON presenca_evento 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas de RLS (Row Level Security)
ALTER TABLE presenca_evento ENABLE ROW LEVEL SECURITY;

-- Política para leitura (usuários autenticados podem ver presenças)
CREATE POLICY "Users can view presencas" ON presenca_evento
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para inserção (usuários autenticados podem criar presenças)
CREATE POLICY "Users can insert presencas" ON presenca_evento
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para atualização (usuários autenticados podem atualizar presenças)
CREATE POLICY "Users can update presencas" ON presenca_evento
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para deleção (usuários autenticados podem deletar presenças)
CREATE POLICY "Users can delete presencas" ON presenca_evento
    FOR DELETE USING (auth.role() = 'authenticated');

-- Opcional: Migrar dados da tabela antiga presenca_consagracao se existir
-- Descomente as linhas abaixo se precisar migrar dados existentes
/*
INSERT INTO presenca_evento (id_evento, id_membro, presenca, justificativa, created_at)
SELECT 
    id_evento, 
    id_membro, 
    CASE 
        WHEN presenca ILIKE '%presente%' THEN 'presente'
        WHEN presenca ILIKE '%ausente%' THEN 'ausente'
        ELSE 'justificado'
    END as presenca,
    justificativa,
    created_at
FROM presenca_consagracao
WHERE NOT EXISTS (
    SELECT 1 FROM presenca_evento pe 
    WHERE pe.id_evento = presenca_consagracao.id_evento 
    AND pe.id_membro = presenca_consagracao.id_membro
);
*/
