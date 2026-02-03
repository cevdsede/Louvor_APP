// Auto-generated types from Supabase - DO NOT EDIT MANUALLY
// Generated on: 2026-02-03

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      aviso_geral: {
        Row: {
          created_at: string
          id: number
          id_membro: string | null
          texto: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          id_membro?: string | null
          texto?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          id_membro?: string | null
          texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aviso_geral_id_membro_fkey"
            columns: ["id_membro"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos_cultos: {
        Row: {
          created_at: string | null
          id_cultos: string | null
          id_lembrete: string
          id_membros: string | null
          info: string | null
        }
        Insert: {
          created_at?: string | null
          id_cultos?: string | null
          id_lembrete?: string
          id_membros?: string | null
          info?: string | null
        }
        Update: {
          created_at?: string | null
          id_cultos?: string | null
          id_lembrete?: string
          id_membros?: string | null
          info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avisos_cultos_id_cultos_fkey"
            columns: ["id_cultos"]
            isOneToOne: false
            referencedRelation: "cultos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_cultos_id_membros_fkey"
            columns: ["id_membros"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
        ]
      }
      cultos: {
        Row: {
          data_culto: string
          horario: string | null
          id: string
          id_nome_cultos: string | null
        }
        Insert: {
          data_culto: string
          horario?: string | null
          id?: string
          id_nome_cultos?: string | null
        }
        Update: {
          data_culto?: string
          horario?: string | null
          id?: string
          id_nome_cultos?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cultos_id_nome_cultos_fkey"
            columns: ["id_nome_cultos"]
            isOneToOne: false
            referencedRelation: "nome_cultos"
            referencedColumns: ["id"]
          },
        ]
      }
      escalas: {
        Row: {
          created_at: string | null
          data_ensaio: string | null
          horario_ensaio: string | null
          id: string
          id_culto: string | null
          id_funcao: number | null
          id_membros: string | null
        }
        Insert: {
          created_at?: string | null
          data_ensaio?: string | null
          horario_ensaio?: string | null
          id?: string
          id_culto?: string | null
          id_funcao?: number | null
          id_membros?: string | null
        }
        Update: {
          created_at?: string | null
          data_ensaio?: string | null
          horario_ensaio?: string | null
          id?: string
          id_culto?: string | null
          id_funcao?: number | null
          id_membros?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalas_id_evento_fkey"
            columns: ["id_culto"]
            isOneToOne: false
            referencedRelation: "cultos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_id_funcao_fkey"
            columns: ["id_funcao"]
            isOneToOne: false
            referencedRelation: "funcao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_id_membros_fkey"
            columns: ["id_membros"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          created_at: string | null
          data_evento: string | null
          horario_evento: string | null
          id: string
          id_evento: string | null
          tema: string | null
        }
        Insert: {
          created_at?: string | null
          data_evento?: string | null
          horario_evento?: string | null
          id?: string
          id_evento?: string | null
          tema?: string | null
        }
        Update: {
          created_at?: string | null
          data_evento?: string | null
          horario_evento?: string | null
          id?: string
          id_evento?: string | null
          tema?: string | null
        }
        Relationships: []
      }
      funcao: {
        Row: {
          created_at: string
          id: number
          nome_funcao: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          nome_funcao?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          nome_funcao?: string | null
        }
        Relationships: []
      }
      historico_musicas: {
        Row: {
          created_at: string | null
          id: string
          id_membros: string | null
          id_musica: string | null
          id_tons: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          id_membros?: string | null
          id_musica?: string | null
          id_tons?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          id_membros?: string | null
          id_musica?: string | null
          id_tons?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_musicas_id_membros_fkey"
            columns: ["id_membros"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_musicas_id_musica_fkey"
            columns: ["id_musica"]
            isOneToOne: false
            referencedRelation: "musicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_musicas_id_tons_fkey"
            columns: ["id_tons"]
            isOneToOne: false
            referencedRelation: "tons"
            referencedColumns: ["id"]
          },
        ]
      }
      limpeza: {
        Row: {
          created_at: string
          foto: string | null
          id: number
        }
        Insert: {
          created_at?: string
          foto?: string | null
          id?: number
        }
        Update: {
          created_at?: string
          foto?: string | null
          id?: number
        }
        Relationships: []
      }
      membros: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          data_nasc: string | null
          email: string | null
          foto: Json | null
          genero: Database["public"]["Enums"]["genero_membros"] | null
          id: string
          nome: string | null
          perfil: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          data_nasc?: string | null
          email?: string | null
          foto?: Json | null
          genero?: Database["public"]["Enums"]["genero_membros"] | null
          id?: string
          nome?: string | null
          perfil?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          data_nasc?: string | null
          email?: string | null
          foto?: Json | null
          genero?: Database["public"]["Enums"]["genero_membros"] | null
          id?: string
          nome?: string | null
          perfil?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      membros_funcoes: {
        Row: {
          created_at: string | null
          id: string
          id_funcao: number | null
          id_membro: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          id_funcao?: number | null
          id_membro?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          id_funcao?: number | null
          id_membro?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membros_funcoes_id_funcao_fkey"
            columns: ["id_funcao"]
            isOneToOne: false
            referencedRelation: "funcao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membros_funcoes_id_membro_fkey"
            columns: ["id_membro"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
        ]
      }
      musicas: {
        Row: {
          cantor: string | null
          created_at: string | null
          estilo: Database["public"]["Enums"]["estilo_musica"] | null
          id: string
          id_tema: string | null
          musica: string | null
        }
        Insert: {
          cantor?: string | null
          created_at?: string | null
          estilo?: Database["public"]["Enums"]["estilo_musica"] | null
          id?: string
          id_tema?: string | null
          musica?: string | null
        }
        Update: {
          cantor?: string | null
          created_at?: string | null
          estilo?: Database["public"]["Enums"]["estilo_musica"] | null
          id?: string
          id_tema?: string | null
          musica?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "musicas_id_tema_fkey"
            columns: ["id_tema"]
            isOneToOne: false
            referencedRelation: "temas"
            referencedColumns: ["id"]
          },
        ]
      }
      nome_cultos: {
        Row: {
          created_at: string | null
          id: string
          nome_culto: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome_culto?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome_culto?: string | null
        }
        Relationships: []
      }
      presenca_consagracao: {
        Row: {
          created_at: string | null
          id: string
          id_evento: string | null
          id_membro: string | null
          justificativa: string | null
          presenca: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          id_evento?: string | null
          id_membro?: string | null
          justificativa?: string | null
          presenca?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          id_evento?: string | null
          id_membro?: string | null
          justificativa?: string | null
          presenca?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_presenca_membros"
            columns: ["id_membro"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presenca_consagracao_id_aula_fkey"
            columns: ["id_evento"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id_evento"]
          },
        ]
      }
      repertorio: {
        Row: {
          created_at: string | null
          id: string
          id_culto: string | null
          id_membros: string | null
          id_musicas: string | null
          id_tons: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          id_culto?: string | null
          id_membros?: string | null
          id_musicas?: string | null
          id_tons?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          id_culto?: string | null
          id_membros?: string | null
          id_musicas?: string | null
          id_tons?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "repertorio_id_evento_fkey"
            columns: ["id_culto"]
            isOneToOne: false
            referencedRelation: "cultos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repertorio_id_membros_fkey"
            columns: ["id_membros"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repertorio_id_musicas_fkey"
            columns: ["id_musicas"]
            isOneToOne: false
            referencedRelation: "musicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repertorio_id_tons_fkey"
            columns: ["id_tons"]
            isOneToOne: false
            referencedRelation: "tons"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_membro: {
        Row: {
          aprovado: boolean | null
          created_at: string | null
          email: string
          id: string
          nome: string | null
        }
        Insert: {
          aprovado?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          nome?: string | null
        }
        Update: {
          aprovado?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string | null
        }
        Relationships: []
      }
      temas: {
        Row: {
          created_at: string | null
          id: string
          nome_tema: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome_tema?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome_tema?: string | null
        }
        Relationships: []
      }
      tons: {
        Row: {
          created_at: string
          descricao_tons: string | null
          id: number
          nome_tons: string | null
        }
        Insert: {
          created_at?: string
          descricao_tons?: string | null
          id?: number
          nome_tons?: string | null
        }
        Update: {
          created_at?: string
          descricao_tons?: string | null
          id?: number
          nome_tons?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aprovar_membro:
        | { Args: { user_id: string }; Returns: undefined }
        | {
            Args: { lista_funcao_ids: number[]; user_id: string }
            Returns: undefined
          }
    }
    Enums: {
      estilo_musica: "Adoração" | "Celebração"
      genero_membros: "Homem" | "Mulher"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Tables<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Row"]

export type TablesInsert<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Insert"]

export type TablesUpdate<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Update"]

export type Enums<
  EnumName extends keyof Database["public"]["Enums"],
> = Database["public"]["Enums"][EnumName]
