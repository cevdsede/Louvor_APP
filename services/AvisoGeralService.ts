import { supabase } from '../supabaseClient';

export interface AvisoGeral {
  id: bigint;
  created_at: string;
  id_membro: string | null;
  texto: string | null;
}

class AvisoGeralService {
  // Buscar avisos gerais com controle de acesso
  static async getAvisosGerais(): Promise<AvisoGeral[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Primeiro, verificar o perfil do usuário atual
    const { data: currentUser, error: userError } = await supabase
      .from('membros')
      .select('perfil')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    const userProfile = currentUser?.perfil?.toLowerCase() || '';
    const isAdminOrLeader = userProfile.includes('admin') || userProfile.includes('lider');

    let query = supabase
      .from('aviso_geral')
      .select('*')
      .order('created_at', { ascending: false });

    // Aplicar filtro de acesso baseado no perfil
    if (!isAdminOrLeader) {
      // Se não for admin ou líder, só pode ver seus próprios avisos
      query = query.eq('id_membro', user.id);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  // Buscar avisos de um membro específico (com verificação de permissão)
  static async getAvisosByMembro(id_membro: string): Promise<AvisoGeral[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Verificar se o usuário tem permissão para ver os avisos deste membro
    const { data: currentUser, error: userError } = await supabase
      .from('membros')
      .select('perfil')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    const userProfile = currentUser?.perfil?.toLowerCase() || '';
    const isAdminOrLeader = userProfile.includes('admin') || userProfile.includes('leader');
    const isOwner = user.id === id_membro;

    // Só permite ver os avisos se for o próprio membro, admin ou líder
    if (!isOwner && !isAdminOrLeader) {
      throw new Error('Sem permissão para visualizar estes avisos');
    }

    const { data, error } = await supabase
      .from('aviso_geral')
      .select('*')
      .eq('id_membro', id_membro)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Criar novo aviso geral
  static async createAvisoGeral(aviso: Omit<AvisoGeral, 'id' | 'created_at'>): Promise<AvisoGeral> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('aviso_geral')
      .insert([{
        ...aviso,
        id_membro: user.id // Sempre associa ao usuário que está criando
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Atualizar aviso geral (só o criador, admin ou líder)
  static async updateAvisoGeral(id: bigint, aviso: Partial<AvisoGeral>): Promise<AvisoGeral> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Primeiro, buscar o aviso para verificar permissões
    const { data: existingAviso, error: fetchError } = await supabase
      .from('aviso_geral')
      .select('id_membro')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!existingAviso) throw new Error('Aviso não encontrado');

    // Verificar se o usuário tem permissão para editar
    const { data: currentUser, error: userError } = await supabase
      .from('membros')
      .select('perfil')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    const userProfile = currentUser?.perfil?.toLowerCase() || '';
    const isAdminOrLeader = userProfile.includes('admin') || userProfile.includes('lider');
    const isOwner = existingAviso.id_membro === user.id;

    if (!isOwner && !isAdminOrLeader) {
      throw new Error('Sem permissão para editar este aviso');
    }

    const { data, error } = await supabase
      .from('aviso_geral')
      .update(aviso)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Deletar aviso geral (só o criador, admin ou líder)
  static async deleteAvisoGeral(id: bigint): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Primeiro, buscar o aviso para verificar permissões
    const { data: existingAviso, error: fetchError } = await supabase
      .from('aviso_geral')
      .select('id_membro')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!existingAviso) throw new Error('Aviso não encontrado');

    // Verificar se o usuário tem permissão para deletar
    const { data: currentUser, error: userError } = await supabase
      .from('membros')
      .select('perfil')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    const userProfile = currentUser?.perfil?.toLowerCase() || '';
    const isAdminOrLeader = userProfile.includes('admin') || userProfile.includes('lider');
    const isOwner = existingAviso.id_membro === user.id;

    if (!isOwner && !isAdminOrLeader) {
      throw new Error('Sem permissão para deletar este aviso');
    }

    const { error } = await supabase
      .from('aviso_geral')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export default AvisoGeralService;
