
export type ViewType =
  | 'dashboard'
  | 'list' | 'calendar' | 'cleaning'
  | 'team' | 'attendance'
  | 'music-stats' | 'music-list' | 'music-repertoire' | 'music-create' | 'music-history' | 'music-escalas'
  | 'tools-admin' | 'tools-users' | 'tools-approvals' | 'tools-performance';

export interface MinistrySummary {
  id: string;
  nome: string;
  slug: string;
}

export interface RepertoireItem {
  id: string;
  musica: string;
  cantor: string;
  key: string;
  minister?: string;
}


export interface MemberScale {
  id: string;
  date: string;
  event: string;
  role: string;
  time?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'justified';

export interface AttendanceRecord {
  memberId: string;
  status: AttendanceStatus;
  justification?: string;
}

export interface AttendanceEvent {
  id: string;
  theme: string;
  date: string;
  status: 'open' | 'closed';
  records: AttendanceRecord[];
}

export interface SongHistoryItem {
  song: string;
  key: string;
  date: string;
  event: string;
}

export interface Member {
  id: string;
  name: string;
  nome?: string;
  displayName?: string;
  display_name?: string;
  nome_planilha?: string;
  role: string;
  roles?: string[];
  roleIds?: number[];
  scaleIds?: string[];
  confirmationStatus?: 'pendente' | 'confirmado' | 'recusado';
  funcaoIds?: string[];
  activeMinisterioMembershipId?: string;
  activeMinisterioStatus?: boolean;
  perfil?: string;
  ministryIds?: string[];
  ministries?: MinistrySummary[];
  gender: 'M' | 'F';
  status: 'confirmed' | 'pending' | 'absent';
  avatar: string;
  telefone?: string;
  telefone_celular?: string;
  telefone_recados?: string;
  email?: string;
  data_nasc?: string;
  endereco?: string;
  numero_casa?: string;
  cep?: string;
  bairro?: string;
  nome_pai?: string;
  nome_mae?: string;
  data_batismo?: string;
  igreja_batismo?: string;
  estado_civil?: 'Solteiro(a)' | 'Casado(a)' | 'Viúvo(a)' | 'Divorciado(a)' | 'Concubinato';
  nome_conjuge?: string;
  profissao?: string;
  escolaridade?:
    | 'Nenhuma'
    | 'Ensino Fundamental'
    | 'Ensino Fundamental Incompleto'
    | 'Ensino Médio'
    | 'Ensino Médio Incompleto'
    | 'Superior'
    | 'Superior Incompleto';
  posicao_igreja?: 'Pastor(a)' | 'Levita' | 'Membro' | 'Secretario(a)' | 'Tesoureiro(a)' | 'Missionário';
  nome_discipulador?: string;
  esta_em_celula?: boolean;
  qual_celula?: string;
  foto?: string;
  icon?: string;
  upcomingScales?: MemberScale[];
  songHistory?: SongHistoryItem[];
}

export interface Notice {
  id: string;
  text: string;
  sender: string;
  time: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  dateIso?: string;
  dayOfWeek: string;
  time: string;
  members: Member[];
  repertoire: RepertoireItem[];
  ministryId?: string;
  ministryName?: string;
}

