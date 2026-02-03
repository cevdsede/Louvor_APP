import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { logger } from '../utils/logger';

interface Music {
  id: string;
  song: string;
  singer: string;
  theme: string;
  style: 'Adoração' | 'Celebração';
}

interface RepertoireItem {
  id: string;
  song: string;
  singer: string;
  minister: string;
  key: string;
  style: string;
}

interface RepertoireSet {
  id: string;
  title: string;
  date: string;
  cultName: string;
  cultDate: string;
  items: RepertoireItem[];
}

interface HistoryItem {
  id: string;
  date: string;
  song: string;
  singer: string;
  key: string;
  minister: string;
  theme: string;
  style: string;
}

interface MusicData {
  songs: Music[];
  repertoires: RepertoireSet[];
  history: HistoryItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
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
      // 1. Fetch Songs & Themes
      const { data: songsData, error: songsError } = await supabase
        .from('musicas')
        .select(`
          id,
          musica,
          cantor,
          estilo,
          temas (
            nome_tema
          )
        `);

      if (songsError) throw songsError;

      const formattedSongs: Music[] = (songsData || []).map((s) => ({
        id: s.id,
        song: s.musica,
        singer: s.cantor,
        theme: s.temas?.[0]?.nome_tema || 'Geral',
        style: s.estilo
      }));

      setSongs(formattedSongs);

      // 2. Fetch Repertoire with cult information
      const { data: repData, error: repError } = await supabase
        .from('repertorio')
        .select(`
          id,
          id_culto,
          id_musicas,
          id_membros,
          id_tons,
          cultos (
            data_culto,
            nome_cultos (
              nome_culto
            )
          ),
          musicas (
            id,
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
          minister: item.membros?.[0]?.nome || 'Sem ministro',
          key: item.tons?.[0]?.nome_tons || 'Ñ',
          style: item.musicas?.[0]?.estilo || 'Adoração'
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
              theme: musicDetails?.temas?.nome_tema || 'Geral',
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
