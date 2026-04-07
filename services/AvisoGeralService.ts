import { supabase } from '../supabaseClient';
import LocalStorageFirstService from './LocalStorageFirstService';

export interface AvisoGeral {
  id: string | number;
  created_at: string;
  id_membro: string | null;
  texto: string | null;
}

class AvisoGeralService {
  // Buscar avisos gerais com controle de acesso
  static async getAvisosGerais(): Promise<AvisoGeral[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Buscar dados necessários do cache local
    const membros = LocalStorageFirstService.get<any>('membros');
    const avisos = LocalStorageFirstService.get<AvisoGeral>('aviso_geral');

    // 1. Verificar o perfil do usuário atual no cache
    const currentUser = membros.find((m: any) => m.id === user.id);
    const userProfile = currentUser?.perfil?.toLowerCase() || '';
    const isAdminOrLeader = userProfile.includes('admin') || userProfile.includes('lider');

    // 2. Filtrar avisos baseado no perfil
    let result = [...avisos].sort((a, b) => 
      (b.created_at || '').localeCompare(a.created_at || '')
    );

    if (!isAdminOrLeader) {
      // Se não for admin ou líder, só pode ver seus próprios avisos
      result = result.filter(a => a.id_membro === user.id);
    }

    return result;
  }

  // Buscar avisos de um membro específico (com verificação de permissão)
  static async getAvisosByMembro(id_membro: string): Promise<AvisoGeral[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const membros = LocalStorageFirstService.get<any>('membros');
    const avisos = LocalStorageFirstService.get<AvisoGeral>('aviso_geral');

    // Verificar permissão
    const currentUser = membros.find((m: any) => m.id === user.id);
    const userProfile = currentUser?.perfil?.toLowerCase() || '';
    const isAdminOrLeader = userProfile.includes('admin') || userProfile.includes('leader') || userProfile.includes('lider');
    const isOwner = user.id === id_membro;

    if (!isOwner && !isAdminOrLeader) {
      throw new Error('Sem permissão para visualizar estes avisos');
    }

    return avisos
      .filter(a => a.id_membro === id_membro)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  // Criar novo aviso geral
  static async createAvisoGeral(aviso: Omit<AvisoGeral, 'id' | 'created_at'>): Promise<AvisoGeral> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const novoAviso: AvisoGeral = {
      ...aviso,
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString(),
      id_membro: user.id
    };

    // Salvar via LocalStorageFirstService
    LocalStorageFirstService.add('aviso_geral', novoAviso);
    
    return novoAviso;
  }

  // Atualizar aviso geral (só o criador, admin ou líder)
  static async updateAvisoGeral(id: string | number, aviso: Partial<AvisoGeral>): Promise<AvisoGeral | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const membros = LocalStorageFirstService.get<any>('membros');
    const avisos = LocalStorageFirstService.get<AvisoGeral>('aviso_geral');
    
    const existingAviso = avisos.find(a => String(a.id) === String(id));
    if (!existingAviso) throw new Error('Aviso não encontrado');

    // Verificar permissão
    const currentUser = membros.find((m: any) => m.id === user.id);
    const userProfile = currentUser?.perfil?.toLowerCase() || '';
    const isAdminOrLeader = userProfile.includes('admin') || userProfile.includes('lider');
    const isOwner = existingAviso.id_membro === user.id;

    if (!isOwner && !isAdminOrLeader) {
      throw new Error('Sem permissão para editar este aviso');
    }

    return LocalStorageFirstService.update<AvisoGeral>('aviso_geral', String(id), aviso);
  }

  // Deletar aviso geral (só o criador, admin ou líder)
  static async deleteAvisoGeral(id: string | number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const membros = LocalStorageFirstService.get<any>('membros');
    const avisos = LocalStorageFirstService.get<AvisoGeral>('aviso_geral');
    
    const existingAviso = avisos.find(a => String(a.id) === String(id));
    if (!existingAviso) throw new Error('Aviso não encontrado');

    // Verificar permissão
    const currentUser = membros.find((m: any) => m.id === user.id);
    const userProfile = currentUser?.perfil?.toLowerCase() || '';
    const isAdminOrLeader = userProfile.includes('admin') || userProfile.includes('lider');
    const isOwner = existingAviso.id_membro === user.id;

    if (!isOwner && !isAdminOrLeader) {
      throw new Error('Sem permissão para deletar este aviso');
    }

    LocalStorageFirstService.remove('aviso_geral', String(id));
  }
}

export default AvisoGeralService;
