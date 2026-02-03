import { Tables } from '../../types-supabase-generated';
import { Scale } from '../../models/scale';

export class ScaleMapper {
  static fromSupabase(data: Tables<'escalas'>): Scale {
    return {
      id: data.id,
      id_culto: data.id_culto || '',
      id_membros: data.id_membros || '',
      id_funcao: data.id_funcao?.toString() || '',
      confirmado: true, // Default value
      observacoes: undefined
    };
  }

  static toSupabase(scale: Partial<Scale>): Partial<Tables<'escalas'>> {
    return {
      id: scale.id,
      id_culto: scale.id_culto || null,
      id_membros: scale.id_membros || null,
      id_funcao: scale.id_funcao ? parseInt(scale.id_funcao) : null,
      confirmado: scale.confirmado
    };
  }

  static fromSupabaseWithRelations(data: any): Scale {
    const baseScale = this.fromSupabase(data);
    
    // Map related data
    if (data.membros) {
      baseScale.membro = {
        id: data.membros.id,
        nome: data.membros.nome || '',
        email: data.membros.email || ''
      };
    }

    if (data.funcao) {
      baseScale.funcao = {
        id: data.funcao.id,
        nome_funcao: data.funcao.nome_funcao || ''
      };
    }

    if (data.culto) {
      baseScale.culto = {
        id: data.culto.id,
        data_culto: data.culto.data_culto || '',
        horario: data.culto.horario || ''
      };
    }

    return baseScale;
  }
}
