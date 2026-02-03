import { Tables } from '../../types-supabase-generated';
import { Music } from '../../models/music';

export class MusicMapper {
  static fromSupabase(data: Tables<'musicas'>): Music {
    return {
      id: data.id,
      musica: data.musica || '',
      cantor: data.cantor || '',
      estilo: data.estilo || 'Adoração',
      temas: []
    };
  }

  static toSupabase(music: Partial<Music>): Partial<Tables<'musicas'>> {
    return {
      id: music.id,
      musica: music.musica,
      cantor: music.cantor || null,
      estilo: music.estilo || 'Adoração',
      id_tema: music.temas?.[0]?.id || null
    };
  }

  static fromSupabaseWithThemes(data: any): Music {
    const baseMusic = this.fromSupabase(data);
    
    // Map themes
    if (data.temas) {
      baseMusic.temas = Array.isArray(data.temas) ? data.temas : [data.temas];
    }

    return baseMusic;
  }
}
