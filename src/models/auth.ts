import { BaseEntity } from './common';

// Authentication domain model
export interface AuthUser extends BaseEntity {
  email: string;
  name?: string;
  avatar?: string;
  preferences?: UserPreferences;
}

export interface UserSession {
  user: AuthUser;
  session: {
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
    expires_in?: number;
  };
}

export interface UserPreferences extends BaseEntity {
  id_usuario: string;
  tema: 'light' | 'dark' | 'system';
  cor_marca?: string;
  notificacoes: {
    email: boolean;
    push: boolean;
    escalas: boolean;
    lembretes: boolean;
  };
  idioma: string;
  fuso_horario: string;
}

export interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

export interface AuthResponse {
  user: AuthUser;
  session: any;
  error?: AuthError;
}

// Authentication states
export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthContextType {
  user: AuthUser | null;
  session: any;
  loading: boolean;
  appState: 'splash' | 'login' | 'main';
  setAppState: (state: 'splash' | 'login' | 'main') => void;
  signIn: (email: string, password: string) => Promise<{ error: any; success: boolean }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any; success: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any; success: boolean }>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<{ error: any; success: boolean }>;
}

// Registration and profile types
export interface RegistrationData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  birth_date?: string;
}

export interface ProfileUpdateData {
  name?: string;
  phone?: string;
  birth_date?: string;
  avatar?: string;
}

// Permission and role types
export interface UserRole {
  id: string;
  nome: string;
  permissoes: Permission[];
}

export interface Permission {
  id: string;
  nome: string;
  recurso: string;
  acao: string;
}

export interface UserPermission {
  id_usuario: string;
  id_role: string;
  role?: UserRole;
}
