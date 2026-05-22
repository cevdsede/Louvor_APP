import { supabase } from '../supabaseClient';

type ChurchAuditInput = {
  action: string;
  entity: string;
  description: string;
  userId?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown>;
};

export async function recordChurchAudit({
  action,
  entity,
  description,
  userId,
  entityId,
  payload = {}
}: ChurchAuditInput) {
  const { error } = await supabase.from('auditoria_igreja').insert({
    acao: action,
    entidade: entity,
    entidade_id: entityId || null,
    descricao: description,
    payload,
    created_by: userId || null
  });

  if (error) {
    console.error('Erro ao registrar auditoria da igreja:', error);
  }
}
