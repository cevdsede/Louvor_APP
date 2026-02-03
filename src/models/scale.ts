import { BaseEntity } from './common';

// Scale domain model - specialized for worship team scheduling
export interface Scale extends BaseEntity {
  id_cultos: string;
  id_membros: string;
  id_funcao: string;
  confirmado?: boolean;
  observacoes?: string;
  membro?: Member;
  funcao?: Function;
  culto?: Event;
}

export interface ScaleAssignment {
  id: string;
  id_culto: string;
  id_membro: string;
  id_funcao: string;
  data_escala: string;
  status: 'confirmed' | 'pending' | 'declined' | 'absent';
  membro?: Member;
  funcao?: Function;
  culto?: Event;
}

export interface ScaleTemplate extends BaseEntity {
  nome: string;
  descricao?: string;
  funcoes_necessarias: ScaleTemplateFunction[];
  ativo?: boolean;
}

export interface ScaleTemplateFunction extends BaseEntity {
  id_template: string;
  id_funcao: string;
  quantidade: number;
  obrigatorio?: boolean;
  funcao?: Function;
}

export interface ScaleConflict {
  id_membro: string;
  conflitos: Array<{
    id_culto: string;
    data: string;
    motivo: string;
  }>;
  membro?: Member;
}

// Scale statistics
export interface ScaleStats {
  total_escala: number;
  este_mes: number;
  taxa_confirmacao: number;
  funcoes_mais_escaladas: Array<{
    funcao: string;
    quantidade: number;
  }>;
  membros_mais_ativos: Array<{
    nome: string;
    escalas: number;
  }>;
}

// Scale creation and update types
export interface CreateScaleData {
  id_cultos: string;
  id_membros: string;
  id_funcao: string;
  confirmado?: boolean;
  observacoes?: string;
}

export interface UpdateScaleData extends Partial<CreateScaleData> {
  id: string;
}

export interface BulkScaleAssignment {
  id_culto: string;
  atribuicoes: Array<{
    id_membro: string;
    id_funcao: string;
  }>;
}

// Import types to avoid circular dependencies
import { Member } from './member';
import { Function } from './member';
import { Event } from './event';
