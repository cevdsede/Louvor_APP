// Common types and interfaces used across the application

export type ViewType =
  | 'dashboard'
  | 'list' | 'calendar' | 'cleaning'
  | 'team' | 'attendance' | 'approvals'
  | 'music-stats' | 'music-list' | 'music-repertoire' | 'music-create' | 'music-history' | 'music-escalas';

export type AttendanceStatus = 'present' | 'absent' | 'justified';

export type Gender = 'M' | 'F' | 'Masculino' | 'Feminino' | 'Homem' | 'Mulher';

export type Status = 'confirmed' | 'pending' | 'absent' | 'active' | 'inactive';

export type AnimationType = 'fade' | 'slide' | 'scale';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export type ModalMode = 'create' | 'edit' | 'view';

// Base interfaces
export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Timestamps {
  created_at: string;
  updated_at?: string;
}

// API Response types
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

// Form types
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

// UI State types
export interface ModalState<T = any> {
  isOpen: boolean;
  mode: ModalMode;
  data?: T;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  timestamp?: string;
}

// Chart types
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

// Error types
export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

// Loading states
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

// Filter and search types
export interface FilterOptions {
  search?: string;
  status?: Status[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}
