import { supabase } from '../supabaseClient';
import LocalStorageFirstService from './LocalStorageFirstService';

export interface Evento {
  id_evento: string | number;
  tema: string;
  data_evento: string;
  horario_evento: string;
  created_at: string;
}

export interface PresencaEvento {
  id_chamada: string | number;
  id_evento: string | number;
  id_membro: string;
  presenca: 'presente' | 'ausente' | 'justificado';
  justificativa?: string | null;
  created_at: string;
  id?: string | number; // Adicionado para compatibilidade com o serviço de cache
  membros?: {
    id: string;
    nome: string;
    foto?: string;
  };
}

class EventService {
  // Eventos
  static async getEventos(): Promise<Evento[]> {
    return LocalStorageFirstService.get<Evento>('eventos');
  }

  static async createEvento(evento: Omit<Evento, 'id_evento' | 'created_at'>): Promise<Evento> {
    const id_evento = `local-${Date.now()}`;
    const eventoData = { 
      ...evento, 
      id_evento, 
      id: id_evento, // Manter compatibilidade com LocalStorageFirstService que usa 'id'
      created_at: new Date().toISOString() 
    };
    
    // Usar LocalStorageFirstService para suporte offline unificado
    const result = await LocalStorageFirstService.add<Evento>('eventos', eventoData);
    
    // Automaticamente criar lista de presença para todos os membros ativos
    await this.criarListaPresenca(id_evento);
    
    return result;
  }

  static async updateEvento(id_evento: string | number, evento: Partial<Evento>): Promise<Evento | null> {
    const updateData = { ...evento, updated_at: new Date().toISOString() };
    return LocalStorageFirstService.update<Evento>('eventos', String(id_evento), updateData);
  }

  static async deleteEvento(id_evento: string | number): Promise<void> {
    // Deletar o evento
    LocalStorageFirstService.remove('eventos', String(id_evento));
    
    // Deletar presenças relacionadas localmente
    const presencas = LocalStorageFirstService.get<PresencaEvento>('presenca_evento');
    const relacionadas = presencas.filter(p => String(p.id_evento) === String(id_evento));
    
    relacionadas.forEach(p => {
      LocalStorageFirstService.remove('presenca_evento', String(p.id_chamada));
    });
  }

  // Presenças
  static async getPresencasByEvento(id_evento: string | number): Promise<PresencaEvento[]> {
    const presencas = LocalStorageFirstService.get<PresencaEvento>('presenca_evento');
    const membros = LocalStorageFirstService.get<any>('membros');

    return presencas
      .filter(p => String(p.id_evento) === String(id_evento))
      .map(p => ({
        ...p,
        membros: membros.find((m: any) => m.id === p.id_membro) || {
          id: p.id_membro,
          nome: 'Membro Desconhecido'
        }
      }))
      .sort((a, b) => (a.membros?.nome || '').localeCompare(b.membros?.nome || ''));
  }

  static async updatePresenca(
    id_evento: string | number,
    id_membro: string,
    presenca: 'presente' | 'ausente' | 'justificado',
    justificativa?: string | null
  ): Promise<PresencaEvento | null> {
    const presencas = LocalStorageFirstService.get<PresencaEvento>('presenca_evento');
    const existing = presencas.find(p => String(p.id_evento) === String(id_evento) && p.id_membro === id_membro);

    const updateData = {
      id_evento,
      id_membro,
      presenca,
      justificativa: presenca === 'justificado' ? justificativa : null,
      updated_at: new Date().toISOString()
    };

    if (existing) {
      return LocalStorageFirstService.update<PresencaEvento>('presenca_evento', String(existing.id_chamada), updateData);
    } else {
      const id_chamada = `local-ch-${Date.now()}`;
      return LocalStorageFirstService.add<PresencaEvento>('presenca_evento', {
        ...updateData,
        id_chamada,
        id: id_chamada,
        created_at: new Date().toISOString()
      });
    }
  }

  // Criar lista de presença automaticamente para todos os membros ativos
  private static async criarListaPresenca(id_evento: string | number): Promise<void> {
    // Buscar membros do cache
    const membros = LocalStorageFirstService.get<any>('membros');
    
    // Filtrar ativos (excluindo convidados)
    const ativos = membros.filter((m: any) => 
      m.ativo === true && 
      !(m.nome || '').toLowerCase().includes('convidado')
    );

    // Criar registros de presença localmente
    ativos.forEach((membro: any) => {
      const id_chamada = `local-ch-${Date.now()}-${membro.id}`;
      LocalStorageFirstService.add('presenca_evento', {
        id_chamada,
        id: id_chamada,
        id_evento,
        id_membro: membro.id,
        presenca: 'ausente',
        created_at: new Date().toISOString()
      });
    });
  }

  // Adicionar membro à lista de presença
  static async addMembroToEvento(id_evento: string | number, id_membro: string): Promise<PresencaEvento> {
    const presencas = LocalStorageFirstService.get<PresencaEvento>('presenca_evento');
    const existing = presencas.find(p => String(p.id_evento) === String(id_evento) && p.id_membro === id_membro);

    if (existing) {
      throw new Error('Este membro já está na lista de presença deste evento');
    }

    const id_chamada = `local-ch-${Date.now()}`;
    const newPresenca = {
      id_chamada,
      id: id_chamada,
      id_evento,
      id_membro,
      presenca: 'ausente' as const,
      created_at: new Date().toISOString()
    };

    const result = await LocalStorageFirstService.add<PresencaEvento>('presenca_evento', newPresenca);
    return result;
  }

  // Remover membro da lista de presença
  static async removeMembroFromEvento(id_chamada: string | number): Promise<void> {
    LocalStorageFirstService.remove('presenca_evento', String(id_chamada));
  }

  // Buscar todos os membros (ativos e inativos) para adicionar à chamada
  static async getAllMembros(): Promise<Array<{ id: string; nome: string; foto?: string; ativo: boolean }>> {
    const membros = LocalStorageFirstService.get<any>('membros');
    return membros.map((m: any) => ({
      id: m.id,
      nome: m.nome,
      foto: m.foto,
      ativo: m.ativo
    }));
  }
}

export default EventService;
