import { BaseEntity } from './common';

// Music domain model
export interface Music extends BaseEntity {
  musica: string;
  cantor?: string;
  estilo?: MusicStyle;
  temas?: Theme[];
}

export interface MusicStyle {
  id: string;
  nome_estilo: string;
}

export interface Theme extends BaseEntity {
  nome_tema: string;
  descricao?: string;
}

export interface Tone extends BaseEntity {
  nome_tons: string;
}

// Repertoire related types
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

export interface RepertoireSet {
  id: string;
  title: string;
  date: string;
  cultName: string;
  cultDate: string;
  items: RepertoireItem[];
}

// Music history
export interface MusicHistory extends BaseEntity {
  id_musica?: string;
  musica?: string;
  id_membros?: string;
  id_tons?: string;
  minister?: string;
  music?: Music;
  membro?: Member;
  tom?: Tone;
}

export interface HistoryItem {
  id: string;
  date: string;
  song: string;
  singer: string;
  key: string;
  minister: string;
  theme: string;
  style: string;
}

// Music creation and update types
export interface CreateMusicData {
  musica: string;
  cantor?: string;
  estilo?: string;
  id_tema?: string;
}

export interface UpdateMusicData extends Partial<CreateMusicData> {
  id: string;
}

// Music statistics
export interface MusicStats {
  total: number;
  por_estilo: Array<{
    estilo: string;
    quantidade: number;
  }>;
  mais_tocadas: Array<{
    musica: string;
    cantor: string;
    vezes: number;
  }>;
}

// Import types to avoid circular dependencies
import { Member } from './member';
import { Event } from './event';
