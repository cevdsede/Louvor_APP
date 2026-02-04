import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export interface Evento {
  id_evento: string;
  tema: string;
  data_evento: string;
  horario_evento: string;
  created_at: string;
}

export interface PresencaEvento {
  id_chamada: string;
  id_evento: string;
  id_membro: string;
  presenca: 'presente' | 'ausente' | 'justificado';
  justificativa?: string;
  created_at: string;
  membros?: {
    id: string;
    nome: string;
    foto?: string;
  };
}

class EventService {
  // Eventos
  static async getEventos(): Promise<Evento[]> {
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .order('data_evento', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createEvento(evento: Omit<Evento, 'id_evento' | 'created_at'>): Promise<Evento> {
    const id_evento = uuidv4(); // Gerar UUID válido
    const { data, error } = await supabase
      .from('eventos')
      .insert([{ ...evento, id_evento }])
      .select()
      .single();

    if (error) throw error;
    
    // Automaticamente criar lista de presença para todos os membros ativos
    await this.criarListaPresenca(id_evento);
    
    return data;
  }

  static async updateEvento(id_evento: string, evento: Partial<Evento>): Promise<Evento> {
    const { data, error } = await supabase
      .from('eventos')
      .update(evento)
      .eq('id_evento', id_evento)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteEvento(id_evento: string): Promise<void> {
    // Primeiro deletar presenças relacionadas
    await supabase
      .from('presenca_evento')
      .delete()
      .eq('id_evento', id_evento);

    // Depois deletar o evento
    const { error } = await supabase
      .from('eventos')
      .delete()
      .eq('id_evento', id_evento);

    if (error) throw error;
  }

  // Presenças
  static async getPresencasByEvento(id_evento: string): Promise<PresencaEvento[]> {
    const { data, error } = await supabase
      .from('presenca_evento')
      .select(`
        id_chamada,
        id_evento,
        id_membro,
        presenca,
        justificativa,
        created_at,
        membros (
          id,
          nome,
          foto
        )
      `)
      .eq('id_evento', id_evento)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async updatePresenca(
    id_evento: string,
    id_membro: string,
    presenca: 'presente' | 'ausente' | 'justificado',
    justificativa?: string
  ): Promise<PresencaEvento> {
    const { data, error } = await supabase
      .from('presenca_evento')
      .upsert({
        id_evento,
        id_membro,
        presenca,
        justificativa: presenca === 'justificado' ? justificativa : null,
      })
      .select(`
        id_chamada,
        id_evento,
        id_membro,
        presenca,
        justificativa,
        created_at,
        membros (
          id,
          nome,
          foto
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Criar lista de presença automaticamente para todos os membros ativos
  private static async criarListaPresenca(id_evento: string): Promise<void> {
    // Buscar todos os membros ativos (excluindo convidados)
    const { data: membros, error: errorMembros } = await supabase
      .from('membros')
      .select('id')
      .eq('ativo', true) // Apenas membros ativos
      .not('nome', 'ilike', '%convidado%') // Excluir convidados
      .not('nome', 'ilike', '%Convidado%') // Excluir Convidado (maiúsculo)
      ;

    if (errorMembros) throw errorMembros;

    // Criar registros de presença para todos os membros ativos
    if (membros && membros.length > 0) {
      const presencas = membros.map(membro => ({
        id_evento,
        id_membro: membro.id,
        presenca: 'ausente' as const,
      }));

      const { error: errorPresencas } = await supabase
        .from('presenca_evento')
        .insert(presencas);

      if (errorPresencas) throw errorPresencas;
    }
  }

  // Adicionar membro à lista de presença
  static async addMembroToEvento(id_evento: string, id_membro: string): Promise<PresencaEvento> {
    // Verificar se o membro já está no evento
    const { data: existingPresenca } = await supabase
      .from('presenca_evento')
      .select('id_chamada')
      .eq('id_evento', id_evento)
      .eq('id_membro', id_membro)
      .single();

    if (existingPresenca) {
      throw new Error('Este membro já está na lista de presença deste evento');
    }

    const { data, error } = await supabase
      .from('presenca_evento')
      .insert({
        id_evento,
        id_membro,
        presenca: 'ausente',
      })
      .select(`
        id_chamada,
        id_evento,
        id_membro,
        presenca,
        justificativa,
        created_at,
        membros (
          id,
          nome,
          foto
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Remover membro da lista de presença
  static async removeMembroFromEvento(id_chamada: string): Promise<void> {
    const { error } = await supabase
      .from('presenca_evento')
      .delete()
      .eq('id_chamada', id_chamada);

    if (error) throw error;
  }

  // Buscar todos os membros (ativos e inativos) para adicionar à chamada
  static async getAllMembros(): Promise<Array<{ id: string; nome: string; foto?: string; ativo: boolean }>> {
    const { data, error } = await supabase
      .from('membros')
      .select('id, nome, foto, ativo')
      .eq('ativo', true) // Apenas membros ativos
      .not('nome', 'ilike', '%convidado%') // Excluir convidados
      .not('nome', 'ilike', '%Convidado%') // Excluir Convidado (maiúsculo)
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}

export default EventService;
