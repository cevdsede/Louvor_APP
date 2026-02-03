import { BaseEntity, Gender, Status } from './common';

// Member domain model
export interface Member extends BaseEntity {
  nome: string;
  email?: string;
  telefone?: string;
  data_nasc?: string;
  genero?: Gender;
  perfil?: string;
  ativo?: boolean;
  foto?: string;
  avatar?: string;
  role?: string;
  status?: Status;
  upcomingScales?: MemberScale[];
  songHistory?: SongHistoryItem[];
}

export interface MemberScale {
  id: string;
  date: string;
  event: string;
  role: string;
  eventId?: string;
}

export interface SongHistoryItem {
  song: string;
  key: string;
  date?: string;
  minister?: string;
}

export interface MemberFunction {
  id: string;
  id_membro: string;
  id_funcao: string;
  funcao?: Function;
  membro?: Member;
}

export interface Function extends BaseEntity {
  nome_funcao: string;
  descricao?: string;
}

export interface MemberStats {
  total: number;
  ativos: number;
  inativos: number;
  por_funcao: Array<{
    funcao: string;
    quantidade: number;
  }>;
}

// Member creation and update types
export interface CreateMemberData {
  nome: string;
  email?: string;
  telefone?: string;
  data_nasc?: string;
  genero?: Gender;
  perfil?: string;
  ativo?: boolean;
  foto?: string;
}

export interface UpdateMemberData extends Partial<CreateMemberData> {
  id: string;
}
