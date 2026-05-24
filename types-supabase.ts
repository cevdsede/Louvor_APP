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
  display_name?: string | null;
  nome_planilha?: string | null;
  email: string;
  genero: 'Homem' | 'Mulher';
  foto?: string;
  perfil?: string;
  endereco?: string | null;
  numero_casa?: string | null;
  cep?: string | null;
  bairro?: string | null;
  data_nasc?: string | null;
  nome_pai?: string | null;
  nome_mae?: string | null;
  data_batismo?: string | null;
  igreja_batismo?: string | null;
  estado_civil?: 'Solteiro(a)' | 'Casado(a)' | 'Viúvo(a)' | 'Divorciado(a)' | 'Concubinato' | null;
  nome_conjuge?: string | null;
  profissao?: string | null;
  escolaridade?:
    | 'Nenhuma'
    | 'Ensino Fundamental'
    | 'Ensino Fundamental Incompleto'
    | 'Ensino Médio'
    | 'Ensino Médio Incompleto'
    | 'Superior'
    | 'Superior Incompleto'
    | null;
  telefone?: string | null;
  telefone_celular?: string | null;
  telefone_recados?: string | null;
  posicao_igreja?: 'Pastor(a)' | 'Levita' | 'Membro' | 'Secretario(a)' | 'Tesoureiro(a)' | 'Missionário' | null;
  ministerio_levita?: string | null;
  nome_discipulador?: string | null;
  esta_em_celula?: boolean | null;
  qual_celula?: string | null;
  dados_atualizados_em?: string | null;
  created_at: string;
}

export interface SupabaseFuncao {
  id: string;
  nome_funcao: string;
  ministerio_id: string;
  created_at: string;
}

export interface SupabaseEscala {
  id: string;
  id_culto: string;
  id_membros: string;
  id_funcao: string;
  ministerio_id: string;
  created_at: string;
  cultos?: SupabaseCulto;
  membros?: SupabaseMembro;
  funcao?: SupabaseFuncao;
}

export interface SupabaseMinisterio {
  id: string;
  nome: string;
  slug: string;
  descricao?: string | null;
  ativo?: boolean;
  modulos?: string[] | Record<string, boolean> | null;
  created_at?: string;
}

export interface SupabaseMembroMinisterio {
  id: string;
  membro_id: string;
  ministerio_id: string;
  principal?: boolean;
  ativo?: boolean;
  papel?: string | null;
  created_at?: string;
}

export type ChurchEventRecurrenceType = 'diaria' | 'semanal' | 'mensal_dia_mes' | 'mensal_ordem_semana';

export interface SupabaseEventoIgreja {
  id: string;
  titulo: string;
  descricao?: string | null;
  local?: string | null;
  imagem_url?: string | null;
  imagem_url_desktop?: string | null;
  imagem_url_mobile?: string | null;
  categoria?: string | null;
  cor?: string | null;
  data_inicio: string;
  data_fim?: string | null;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  ativo: boolean;
  visivel_dashboard: boolean;
  visivel_agenda: boolean;
  recorrente: boolean;
  recorrencia_tipo?: ChurchEventRecurrenceType | null;
  recorrencia_intervalo: number;
  recorrencia_dias_semana?: number[] | null;
  recorrencia_dia_mes?: number | null;
  recorrencia_ordem_semana?: number | null;
  recorrencia_data_fim?: string | null;
  prioridade: number;
  substitui_eventos_menor_prioridade: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabasePermissaoIgreja {
  id: string;
  membro_id: string;
  gerenciar_eventos_igreja: boolean;
  mostrar_pastor_inicio: boolean;
  gerenciar_visitantes_igreja: boolean;
  gerenciar_novos_convertidos_igreja: boolean;
  gerenciar_site_igreja: boolean;
  acessar_relatorios_igreja: boolean;
  exportar_relatorios_igreja: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseVisitanteIgreja {
  id: string;
  data_ficha: string;
  nome: string;
  data_nascimento?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  telefone?: string | null;
  e_cristao?: boolean | null;
  deseja_oracao_lar: boolean;
  deseja_aconselhamento: boolean;
  deseja_informacoes_igreja: boolean;
  convidado_por?: string | null;
  observacoes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseNovoConvertidoIgreja {
  id: string;
  nome: string;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  data_nascimento?: string | null;
  data_conversao?: string | null;
  estado_civil?: 'Solteiro(a)' | 'Casado(a)' | 'Viuvo(a)' | 'Divorciado(a)' | 'Concubinato' | null;
  email?: string | null;
  contato?: string | null;
  contato_recado?: string | null;
  nome_contato_recado?: string | null;
  observacoes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseAuditoriaIgreja {
  id: string;
  acao: string;
  entidade: string;
  entidade_id?: string | null;
  descricao: string;
  payload: Record<string, unknown>;
  created_by?: string | null;
  created_at: string;
}

export interface SupabaseMembroFuncao {
  id: string;
  id_membro: string;
  id_funcao: string | number;
  created_at?: string;
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
  musica: string;
  cantor: string;
  id_temas: string;
  estilo: string;
  created_at: string;
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
  resize?(): void;
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
  nome: string;
  email: string;
  aprovado?: boolean;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  membro?: SupabaseMembro;
}

// Tipos para funções/cargos
export interface Funcao {
  id: string;
  nome_funcao: string;
  ministerio_id?: string;
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
