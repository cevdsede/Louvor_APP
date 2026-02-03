
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
  style?: string;
}

export interface MemberScale {
  id: string;
  date: string;
  event: string;
  role: string;
  eventId?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'justified';

export interface AttendanceRecord {
  memberId: string;
  status: AttendanceStatus;
  justification?: string;
  timestamp?: string;
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

export interface SongHistoryItem {
  song: string;
  key: string;
  date?: string;
  minister?: string;
}

export interface Member {
  id: string;
  name: string;
  role: string;
  gender: 'M' | 'F';
  status: 'confirmed' | 'pending' | 'absent';
  avatar: string;
  telefone?: string;
  email?: string;
  data_nasc?: string;
  perfil?: string;
  ativo?: boolean;
  icon?: string;
  upcomingScales?: MemberScale[];
  songHistory?: SongHistoryItem[];
  foto?: string;
  genero?: 'Homem' | 'Mulher';
}

export interface Notice {
  id: string;
  text: string;
  sender: string;
  time: string;
  eventId?: string;
  created_at?: string;
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

// Interfaces para autenticação
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

// Interfaces para formulários
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  telefone?: string;
  data_nasc?: string;
}

// Interfaces para modais
export interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  data?: any;
}

// Interfaces para notificações
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp?: string;
}

// Interfaces para gráficos
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

// Interfaces para API
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

