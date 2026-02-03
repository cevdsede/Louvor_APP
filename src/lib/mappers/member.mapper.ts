import { Tables } from '../../types-supabase-generated';
import { Member } from '../../models/member';

export class MemberMapper {
  static fromSupabase(data: Tables<'membros'>): Member {
    return {
      id: data.id,
      nome: data.nome || '',
      email: data.email || undefined,
      telefone: data.telefone || undefined,
      data_nasc: data.data_nasc || undefined,
      genero: data.genero || undefined,
      perfil: data.perfil || undefined,
      ativo: data.ativo ?? true,
      foto: data.foto as string | undefined,
      avatar: data.foto as string | undefined,
      role: data.perfil || 'member',
      status: data.ativo ? 'active' : 'inactive',
      upcomingScales: [],
      songHistory: []
    };
  }

  static toSupabase(member: Partial<Member>): Partial<Tables<'membros'>> {
    return {
      id: member.id,
      nome: member.nome,
      email: member.email || null,
      telefone: member.telefone || null,
      data_nasc: member.data_nasc || null,
      genero: member.genero || null,
      perfil: member.perfil || null,
      ativo: member.ativo ?? true,
      foto: member.foto || null
    };
  }

  static fromSupabaseWithRelations(data: any): Member {
    const baseMember = this.fromSupabase(data);
    
    // Map related data
    if (data.membros_funcoes) {
      baseMember.role = data.membros_funcoes[0]?.funcao?.nome_funcao || 'member';
    }

    return baseMember;
  }
}
