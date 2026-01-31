
export type ViewType =
  | 'dashboard'
  | 'list' | 'calendar' | 'cleaning'
  | 'team' | 'attendance' | 'approvals'
  | 'music-stats' | 'music-list' | 'music-repertoire' | 'music-create' | 'music-history' | 'music-escalas';

export interface RepertoireItem {
  id: string;
  song: string;
  singer: string;
  key: string;
  minister?: string;
}


export interface MemberScale {
  id: string;
  date: string;
  event: string;
  role: string;
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
}

export interface Member {
  id: string;
  name: string;
  role: string;
  gender: 'M' | 'F';
  status: 'confirmed' | 'pending' | 'absent';
  avatar: string;
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

