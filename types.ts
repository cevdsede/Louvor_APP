
export type ViewType =
  | 'dashboard'
  | 'list' | 'calendar' | 'cleaning'
  | 'team' | 'attendance'
  | 'music-stats' | 'music-list' | 'music-repertoire' | 'music-create' | 'music-history' | 'music-escalas'
  | 'tools-admin' | 'tools-users' | 'tools-approvals' | 'tools-performance';

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
  role: string;
  roles?: string[];
  roleIds?: number[];
  gender: 'M' | 'F';
  status: 'confirmed' | 'pending' | 'absent';
  avatar: string;
  telefone?: string;
  email?: string;
  data_nasc?: string;
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
  dayOfWeek: string;
  time: string;
  members: Member[];
  repertoire: RepertoireItem[];
}

