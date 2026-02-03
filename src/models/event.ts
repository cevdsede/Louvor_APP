import { BaseEntity, AttendanceStatus } from './common';

// Event domain model
export interface Event extends BaseEntity {
  data_culto: string;
  horario?: string;
  id_nome_culto?: string;
  nome_culto?: CultName;
  escalas?: Scale[];
  repertorio?: RepertoireItem[];
  avisos?: Notice[];
}

export interface CultName extends BaseEntity {
  nome_culto: string;
  descricao?: string;
}

export interface Scale extends BaseEntity {
  id_cultos: string;
  id_membros: string;
  id_funcao: string;
  membro?: Member;
  funcao?: Function;
  culto?: Event;
}

export interface RepertoireItem extends BaseEntity {
  id_culto: string;
  id_musicas: string;
  id_membros?: string;
  id_tons?: string;
  music?: Music;
  membro?: Member;
  tom?: Tone;
  culto?: Event;
}

export interface Notice extends BaseEntity {
  id_cultos?: string;
  id_membros?: string;
  info: string;
  membro?: Member;
  culto?: Event;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  dayOfWeek: string;
  time: string;
  members: Member[];
  repertoire: RepertoireItem[];
  expanded?: boolean;
  notices?: Notice[];
}

// Attendance related types
export interface AttendanceRecord {
  id: string;
  id_membro: string;
  id_culto: string;
  status: AttendanceStatus;
  justificativa?: string;
  membro?: Member;
  culto?: Event;
}

export interface AttendanceEvent {
  id: string;
  theme: string;
  date: string;
  status: 'open' | 'closed';
  records: AttendanceRecord[];
  location?: string;
  description?: string;
}

// Event creation and update types
export interface CreateEventData {
  data_culto: string;
  horario?: string;
  id_nome_culto?: string;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string;
}

// Event statistics
export interface EventStats {
  total: number;
  este_mes: number;
  proximos: number;
  concluidos: number;
}

// Import types to avoid circular dependencies
import { Member } from './member';
import { Music } from './music';
import { Tone } from './music';
import { Function } from './member';
