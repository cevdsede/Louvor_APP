import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { logger } from '../../../utils/logger';
import { Music, RepertoireSet, HistoryItem } from '../../../models/music';
import { Tables } from '../../../types-supabase-generated';

interface MusicData {
  songs: Music[];
  repertoires: RepertoireSet[];
  history: HistoryItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface MusicStats {
  totalSongs: number;
  totalRepertoires: number;
  totalHistory: number;
  stylesDistribution: Record<string, number>;
  themesDistribution: Record<string, number>;
  topSongs: Array<{ song: string; count: number }>;
}

export const useMusicData = (subView: string): MusicData => {
  const [songs, setSongs] = useState<Music[]>([]);
  const [repertoires, setRepertoires] = useState<RepertoireSet[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Fetch Songs with themes
      const { data: songsData, error: songsError } = await supabase
        .from('musicas')
        .select(`
          *,
          temas (
            nome_tema
          )
        `);

      if (songsError) throw songsError;

      const formattedSongs: Music[] = (songsData || []).map((s: Tables<'musicas'>) => ({
        id: s.id,
        musica: s.musica || '',
        cantor: s.cantor || '',
        estilo: s.estilo || 'Adoração',
        temas: s.temas || []
      }));

      setSongs(formattedSongs);

      // 2. Fetch Repertoire with cult information
      const { data: repData, error: repError } = await supabase
        .from('repertorio')
        .select(`
          *,
          cultos (
            data_culto,
            nome_cultos (
              nome_culto
            )
          ),
          musicas (
            musica,
            cantor,
            estilo
          ),
          membros (
            nome
          ),
          tons (
            nome_tons
          )
        `)
        .order('created_at', { ascending: false });

      if (repError) throw repError;

      // Group repertoire by cult
      const groupedRepertoire = (repData || []).reduce((acc, item: any) => {
        const cultName = item.cultos?.[0]?.nome_cultos?.[0]?.nome_culto || 'Culto Sem Nome';
        const cultDate = item.cultos?.[0]?.data_culto ? new Date(item.cultos[0].data_culto).toLocaleDateString('pt-BR') : 'Sem Data';
        const eventKey = `${cultName}-${cultDate}`;
        
        if (!acc[eventKey]) {
          acc[eventKey] = {
            id: eventKey,
            title: `${cultName.toUpperCase()} - ${cultDate}`,
            date: cultDate,
            cultName: cultName,
            cultDate: cultDate,
            items: []
          };
        }
        
        acc[eventKey].items.push({
          id: item.id,
          song: item.musicas?.[0]?.musica || 'Sem música',
          singer: item.musicas?.[0]?.cantor || 'Sem cantor',
          key: item.tons?.[0]?.nome_tons || '',
          minister: item.membros?.[0]?.nome || '',
          style: item.musicas?.[0]?.estilo || ''
        });
        
        return acc;
      }, {} as Record<string, RepertoireSet>);

      setRepertoires(Object.values(groupedRepertoire));

      // 3. Fetch History
      const { data: historyData, error: histError } = await supabase
        .from('historico_musicas')
        .select(`
          *,
          membros ( nome ),
          tons ( nome_tons )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (histError) {
        logger.warn('Error fetching history:', histError, 'database');
        setHistory([]);
      } else if (historyData && historyData.length > 0) {
        const historyWithMusicDetails = await Promise.all(
          historyData.map(async (h: any) => {
            let musicDetails = null;

            if (h.id_musica) {
              const { data: musicData } = await supabase
                .from('musicas')
                .select(`
                  musica,
                  cantor,
                  estilo,
                  temas (
                    nome_tema
                  )
                `)
                .eq('id', h.id_musica)
                .single();

              musicDetails = musicData;
            } else if (h.musica) {
              const { data: musicData } = await supabase
                .from('musicas')
                .select(`
                  musica,
                  cantor,
                  estilo,
                  temas (
                    nome_tema
                  )
                `)
                .eq('musica', h.musica)
                .single();

              musicDetails = musicData;
            }

            return {
              id: h.id,
              date: new Date(h.created_at).toLocaleDateString('pt-BR'),
              song: musicDetails?.musica || h.musica || 'Desconhecida',
              singer: musicDetails?.cantor || '',
              key: (Array.isArray(h.tons) ? h.tons[0]?.nome_tons : h.tons?.nome_tons) || '',
              minister: h.membros?.nome || 'Sem ministro',
              theme: musicDetails?.temas?.[0]?.nome_tema || 'Geral',
              style: musicDetails?.estilo || ''
            };
          })
        );

        setHistory(historyWithMusicDetails);
      } else {
        setHistory([]);
      }

    } catch (error) {
      logger.error('Error fetching music data:', error, 'database');
      setError('Falha ao carregar dados de músicas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subView]);

  return {
    songs,
    repertoires,
    history,
    loading,
    error,
    refetch: fetchData
  };
};

export const useMusicStats = (songs: Music[], repertoires: RepertoireSet[], history: HistoryItem[]): MusicStats => {
  return {
    totalSongs: songs.length,
    totalRepertoires: repertoires.length,
    totalHistory: history.length,
    stylesDistribution: songs.reduce((acc, song) => {
      const style = song.estilo || 'Outro';
      acc[style] = (acc[style] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    themesDistribution: songs.reduce((acc, song) => {
      if (song.temas) {
        song.temas.forEach(theme => {
          const themeName = theme.nome_tema || 'Geral';
          acc[themeName] = (acc[themeName] || 0) + 1;
        });
      }
      return acc;
    }, {} as Record<string, number>),
    topSongs: history.reduce((acc, item) => {
      const existing = acc.find(s => s.song === item.song);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ song: item.song, count: 1 });
      }
      return acc;
    }, [] as Array<{ song: string; count: number }>)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  };
};
