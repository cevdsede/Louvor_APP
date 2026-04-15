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
  id?: string | number;
  membros?: {
    id: string;
    nome: string;
    foto?: string;
  };
}

const generateUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

class EventService {
  static async getEventos(): Promise<Evento[]> {
    return LocalStorageFirstService.get<Evento>('eventos');
  }

  static async createEvento(evento: Omit<Evento, 'id_evento' | 'created_at'>): Promise<Evento> {
    const id_evento = generateUuid();
    const eventoData = {
      ...evento,
      id_evento,
      id: id_evento,
      created_at: new Date().toISOString()
    };

    const result = await LocalStorageFirstService.add<Evento>('eventos', eventoData);
    await this.criarListaPresenca(id_evento);
    return result;
  }

  static async updateEvento(id_evento: string | number, evento: Partial<Evento>): Promise<Evento | null> {
    return LocalStorageFirstService.update<Evento>('eventos', String(id_evento), {
      ...evento,
      updated_at: new Date().toISOString()
    } as Partial<Evento>);
  }

  static async deleteEvento(id_evento: string | number): Promise<void> {
    LocalStorageFirstService.remove('eventos', String(id_evento));

    const presencas = LocalStorageFirstService.get<PresencaEvento>('presenca_evento');
    presencas
      .filter((presenca) => String(presenca.id_evento) === String(id_evento))
      .forEach((presenca) => {
        LocalStorageFirstService.remove('presenca_evento', String(presenca.id_chamada));
      });
  }

  static async getPresencasByEvento(id_evento: string | number): Promise<PresencaEvento[]> {
    const presencas = LocalStorageFirstService.get<PresencaEvento>('presenca_evento');
    const membros = LocalStorageFirstService.get<any>('membros');

    return presencas
      .filter((presenca) => String(presenca.id_evento) === String(id_evento))
      .map((presenca) => ({
        ...presenca,
        membros:
          membros.find((membro: any) => membro.id === presenca.id_membro) || {
            id: presenca.id_membro,
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
    const existing = presencas.find(
      (item) => String(item.id_evento) === String(id_evento) && item.id_membro === id_membro
    );

    const updateData = {
      id_evento,
      id_membro,
      presenca,
      justificativa: presenca === 'justificado' ? justificativa : null,
      updated_at: new Date().toISOString()
    };

    if (existing) {
      return LocalStorageFirstService.update<PresencaEvento>(
        'presenca_evento',
        String(existing.id_chamada),
        updateData as Partial<PresencaEvento>
      );
    }

    const id_chamada = generateUuid();
    return LocalStorageFirstService.add<PresencaEvento>('presenca_evento', {
      ...updateData,
      id_chamada,
      id: id_chamada,
      created_at: new Date().toISOString()
    });
  }

  private static async criarListaPresenca(id_evento: string | number): Promise<void> {
    const membros = LocalStorageFirstService.get<any>('membros');
    const ativos = membros.filter(
      (membro: any) => membro.ativo === true && !(membro.nome || '').toLowerCase().includes('convidado')
    );

    ativos.forEach((membro: any) => {
      const id_chamada = generateUuid();
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

  static async addMembroToEvento(id_evento: string | number, id_membro: string): Promise<PresencaEvento> {
    const presencas = LocalStorageFirstService.get<PresencaEvento>('presenca_evento');
    const existing = presencas.find(
      (presenca) => String(presenca.id_evento) === String(id_evento) && presenca.id_membro === id_membro
    );

    if (existing) {
      throw new Error('Este membro ja esta na lista de presenca deste evento');
    }

    const id_chamada = generateUuid();
    return LocalStorageFirstService.add<PresencaEvento>('presenca_evento', {
      id_chamada,
      id: id_chamada,
      id_evento,
      id_membro,
      presenca: 'ausente',
      created_at: new Date().toISOString()
    });
  }

  static async removeMembroFromEvento(id_chamada: string | number): Promise<void> {
    LocalStorageFirstService.remove('presenca_evento', String(id_chamada));
  }

  static async getAllMembros(): Promise<Array<{ id: string; nome: string; foto?: string; ativo: boolean }>> {
    const membros = LocalStorageFirstService.get<any>('membros');
    return membros.map((membro: any) => ({
      id: membro.id,
      nome: membro.nome,
      foto: membro.foto,
      ativo: membro.ativo
    }));
  }
}

export default EventService;
