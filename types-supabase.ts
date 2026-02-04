/**
 * Tipos específicos do Supabase para substituir 'any'
 */

// Tipos para tabelas do Supabase
export interface SupabaseCulto {
  id: string;
  nome_culto: string;
  data_culto: string;
  horario: string;
  created_at: string;
}

export interface SupabaseMembro {
  id: string;
  nome: string;
  email: string;
  genero: 'Homem' | 'Mulher';
  foto?: string;
  perfil?: string;
  created_at: string;
}

export interface SupabaseFuncao {
  id: string;
  nome_funcao: string;
  created_at: string;
}

export interface SupabaseEscala {
  id: string;
  id_culto: string;
  id_membros: string;
  id_funcao: string;
  created_at: string;
  cultos?: SupabaseCulto;
  membros?: SupabaseMembro;
  funcao?: SupabaseFuncao;
}

export interface SupabaseMusica {
  id: string;
  musica: string;
  cantor?: string;
  tema?: string;
  estilo?: string;
  created_at: string;
}

export interface SupabaseTom {
  id: string;
  nome_tons: string;
  created_at: string;
}

export interface SupabaseRepertorio {
  id: string;
  id_culto: string;
  id_musicas: string;
  id_tons?: string;
  id_membros?: string;
  created_at: string;
  cultos?: SupabaseCulto;
  musicas?: SupabaseMusica;
  tons?: SupabaseTom;
  membros?: SupabaseMembro;
}

export interface SupabaseAviso {
  id_lembrete: string;
  id_cultos: string;
  info: string;
  created_at: string;
  membros?: { nome: string }[]; // O Supabase retorna como array
}

// Tipos para músicas (usado no ListView)
export interface Song {
  id: string;
  song: string;
  singer?: string;
  theme?: string;
  style?: string;
}

// Tipos para tons musicais
export interface Tone {
  id: string;
  name: string;
}

// Tipo para o resultado da query de cultos com joins
export interface CultoComRelacionamentos {
  id: string;
  data_culto: string;
  horario: string;
  nome_cultos: { id: string; nome_culto: string }[];
  escalas: {
    id: string;
    membros: { id: string; nome: string; foto?: string; genero: string }[];
    funcao: { nome_funcao: string }[];
  }[];
  repertorio: {
    id: string;
    musicas: { musica: string; cantor?: string }[];
    tons: { nome_tons: string }[];
    membros: { nome: string }[];
  }[];
}

// Tipos para Chart.js (biblioteca externa)
export interface ChartInstance {
  destroy(): void;
  update(): void;
  // Outros métodos do Chart.js...
}

// Tipo para o construtor Chart (biblioteca externa)
declare global {
  interface Window {
    Chart: new (element: HTMLCanvasElement, config: Record<string, unknown>) => ChartInstance;
  }
}

// Tipos para instâncias de charts múltiplos
export interface ChartInstances {
  styles?: ChartInstance;
  themes?: ChartInstance;
  ranking?: ChartInstance;
}

// Tipos para escalas no MusicView
export interface EscalaMusicView {
  id: string;
  id_culto: string;
  id_funcao: string;
  cultos: {
    data_culto: string;
    nome_cultos: { nome_culto: string }[];
  }[];
  membros: { id: string; nome: string }[];
}

// Tipos para eventos de escalas
export interface EscalaEvent {
  id: string;
  date: string;
  title: string;
  time?: string;
  items: EscalaItem[];
}

export interface EscalaItem {
  id: string;
  memberName: string;
  role: string;
  time?: string;
  membros?: { nome: string }[];
  funcao?: { nome_funcao: string }[];
}

// Tipos para repertório com relacionamentos (formato retornado pelo Supabase)
export interface RepertorioMusicView {
  id: string;
  id_culto: string;
  id_musicas: string;
  id_tons?: string;
  id_membros?: string;
  cultos: {
    data_culto: string;
    nome_cultos: { nome_culto: string }[];
  }[];
  musicas: { musica: string; cantor?: string; estilo?: string }[];
  membros?: { nome: string }[];
  tons?: { nome_tons: string }[];
}

// Tipos para aprovações de membros
export interface SolicitacaoAprovacao {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  requestedRole: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
}

// Tipos para funções/cargos
export interface Funcao {
  id: string;
  nome_funcao: string;
  created_at: string;
}

// Tipos para escalas com relacionamentos (formato retornado pelo Supabase)
export interface EscalaComRelacionamentos {
  id: string;
  id_culto: string;
  id_funcao: string;
  cultos: {
    id: string;
    data_culto: string;
    horario: string;
    nome_cultos: { nome_culto: string }[];
  }[];
  funcao: { nome_funcao: string }[];
}

// Tipos para repertório com relacionamentos (formato retornado pelo Supabase)
export interface RepertorioComRelacionamentos {
  id: string;
  id_culto: string;
  id_musicas: string;
  id_tons?: string;
  cultos: {
    data_culto: string;
    nome_cultos: { nome_culto: string }[];
  }[];
  musicas: { musica: string; cantor?: string }[];
  tons: { nome_tons: string }[];
}

// Tipos para Dashboard
export interface MemberStat {
  name: string;
  count: number;
}

// Tipos para CalendarView
export interface CalendarCulto {
  id: string;
  data_culto: string;
  horario: string;
  id_nome_cultos: string;
  nome_cultos: { nome_culto: string }[];
  escalas: {
    id: string;
    id_membros: string;
    id_funcao: string;
    membros: {
      id: string;
      nome: string;
      foto?: string;
      genero: 'Homem' | 'Mulher';
    }[];
    funcao: { nome_funcao: string }[];
  }[];
  repertorio: {
    id: string;
    id_culto: string;
    id_musicas: string;
    id_tons?: string;
    musicas: {
      id: string;
      musica: string;
      cantor?: string;
    }[];
    tons: { nome_tons: string }[];
    membros: { nome: string }[];
  }[];
}

// Tipo para o resultado da query do CalendarView (formato real do Supabase)
export interface CalendarCultoQuery {
  id: string;
  data_culto: string;
  horario: string;
  id_nome_cultos: string;
  nome_cultos: { nome_culto: string }[];
  escalas: {
    id: string;
    id_membros: string;
    id_funcao: string;
    membros: {
      id: string;
      nome: string;
      foto?: string;
      genero: 'Homem' | 'Mulher';
    }[];
    funcao: { nome_funcao: string }[];
  }[];
  repertorio: {
    id: string;
    id_culto: string;
    id_musicas: string;
    id_tons?: string;
    musicas: {
      id: string;
      musica: string;
      cantor?: string;
    }[];
    tons: { nome_tons: string }[];
    membros: { nome: string }[];
  }[];
}

export interface CalendarEscala {
  id: string;
  membros?: {
    id: string;
    nome: string;
    genero: 'Homem' | 'Mulher';
  };
}

export interface CalendarRepertorio {
  id: string;
  musicas?: {
    musica: string;
    cantor?: string;
  };
}

export interface CalendarNotice {
  id_lembrete: string;
  info: string;
  created_at: string;
  membros: { nome: string }[];
}

export interface ProcessedEscala {
  id: string;
  date: string;
  event: string;
  role: string;
  memberName: string;
  memberPhoto?: string;
}

export interface ProcessedRepertorio {
  id: string;
  song: string;
  singer: string;
  key: string;
  minister?: string;
  cultDate: string;
  cultName: string;
}

export interface SolicitacaoAprovacao {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  requestedRole: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
}
