import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { showError } from '../../utils/toast';
import { logger } from '../../utils/logger';
import { ChartInstances, EscalaMusicView, RepertorioMusicView, EscalaEvent, EscalaItem } from '../../types-supabase';

interface Music {
  id: string;
  song: string;
  singer: string;
  theme: string;
  style: 'Adoração' | 'Celebração';
  link_youtube?: string;
  link_spotify?: string;
  link_letra?: string;
  link_cifra?: string;
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
  minister: string;
  theme: string;
  style: string;
  song: string;
  singer: string;
  key: string;
  keys: string[];
  date: string;
}

interface GroupedHistory {
  [minister: string]: {
    [theme: string]: {
      [style: string]: HistoryItem[];
    };
  };
}

export const MusicView: React.FC<{ subView: string }> = ({ subView }) => {
  const stylesChartRef = useRef<HTMLCanvasElement>(null);
  const themesChartRef = useRef<HTMLCanvasElement>(null);
  const rankingChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<ChartInstances>({});

  // Paleta de cores solicitada
  const themeColorsPalette = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#ec4899'];

  // --- STATES ---
  const [songs, setSongs] = useState<Music[]>([]);
  const [repertoires, setRepertoires] = useState<RepertoireSet[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [escalas, setEscalas] = useState<EscalaMusicView[]>([]);

  // UI Controls
  const [isSongModalOpen, setIsSongModalOpen] = useState(false);
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});
  const [expandedStyles, setExpandedStyles] = useState<Record<string, boolean>>({});
  const [expandedMinisters, setExpandedMinisters] = useState<Record<string, boolean>>({});
  const [expandedHistThemes, setExpandedHistThemes] = useState<Record<string, boolean>>({});
  const [expandedHistMinisters, setExpandedHistMinisters] = useState<Record<string, boolean>>({});
  const [expandedHistStyles, setExpandedHistStyles] = useState<Record<string, boolean>>({});

  // Role icons mapping
  const roleIcons = [
    { label: 'Ministro', role: 'Ministro', icon: 'fa-crown' },
    { label: 'Vocal', role: 'Vocal', icon: 'fa-microphone-lines' },
    { label: 'Violão', role: 'Violão', icon: 'fa-guitar' },
    { label: 'Teclado', role: 'Teclado', icon: 'fa-keyboard' },
    { label: 'Guitarra', role: 'Guitarra', icon: 'fa-bolt' },
    { label: 'Baixo', role: 'Baixo', icon: 'fa-music' },
    { label: 'Bateria', role: 'Bateria', icon: 'fa-drum' },
  ];

  // Form states
  const [newSong, setNewSong] = useState({ song: '', singer: '', theme: '', style: 'Adoração' });
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [subView]);

  const fetchData = async () => {
    setLoading(true);
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

      // Extract unique themes for dropdown
      const themes = Array.from(new Set(formattedSongs.map(s => s.theme)));
      setAvailableThemes(themes);

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

      // Group repertoire by cult (nome_culto - data_culto)
      const groupedRepertoire = (repData || []).reduce((acc, item: RepertorioMusicView) => {
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


      // 3. Fetch History from 'historico_musicas' with complete music info
      const { data: historyData, error: histError } = await supabase
        .from('historico_musicas')
        .select(`
          *,
          membros ( nome ),
          tons ( nome_tons )
        `)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to reduce processing

      if (histError) {
        logger.warn('Error fetching history:', histError, 'database');
        setHistory([]);
      } else if (historyData && historyData.length > 0) {

        // For each history item, try to find the corresponding music
        const historyWithMusicDetails = await Promise.all(
          historyData.map(async (h) => {
            let musicDetails = null;

            // Try to find music by song name if id_musica exists
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
              // Try to find by song name as fallback
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

      // 4. Fetch Escalas
      const { data: escalasData, error: escalasError } = await supabase
        .from('escalas')
        .select(`
          id,
          id_culto,
          id_membros,
          id_funcao,
          cultos (
            id,
            data_culto,
            horario,
            nome_cultos (nome_culto)
          ),
          membros (id, nome, foto, genero),
          funcao (nome_funcao)
        `)
        .order('cultos(data_culto)', { ascending: false });

      if (escalasError) {
        logger.error('Error fetching escalas:', escalasError, 'database');
        setEscalas([]);
      } else {
        setEscalas(escalasData || []);
      }

    } catch (error) {
      logger.error('Error fetching music data:', error, 'database');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSong = async () => {
    if (!newSong.song || !newSong.singer || !newSong.theme) return;

    try {
      // First find theme ID
      const { data: themeData } = await supabase
        .from('temas')
        .select('id')
        .eq('nome_tema', newSong.theme)
        .single();

      let themeId = themeData?.id;

      // If theme doesn't exist, create it (optional, or force selection)
      if (!themeId) {
        // Create new theme logic here if allowed
      }

      if (themeId) {
        const { error } = await supabase.from('musicas').insert({
          musica: newSong.song,
          cantor: newSong.singer,
          estilo: newSong.style,
          id_temas: themeId
        });

        if (error) throw error;

        setIsSongModalOpen(false);
        setNewSong({ song: '', singer: '', theme: '', style: 'Adoração' });
        fetchData(); // Reload list
      } else {
        showError('Tema não encontrado. Por favor selecione um tema válido.');
      }
    } catch (err) {
      logger.error('Error adding song:', err, 'database');
      showError('Erro ao adicionar música.');
    }
  };

  // Ranking calculation
  const getRanking = () => {
    const counts: Record<string, number> = {};

    // Calculate from repertoires (now with proper structure)
    const allRepertoireItems = repertoires.flatMap(r => r.items);

    allRepertoireItems.forEach(item => {
      if (item.song) {
        counts[item.song] = (counts[item.song] || 0) + 1;
      }
    });

    // If no repertoire data yet, fall back to showing top songs from list alphabetically or empty
    if (Object.keys(counts).length === 0) {
      return [];
    }

    return Object.entries(counts)
      .map(([song, count]) => ({ song, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  // Realtime subscription
  useEffect(() => {
    const channels = supabase.channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'musicas' },
        (payload) => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'repertorio' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'escalas' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channels);
    };
  }, []);

  useEffect(() => {
    if (subView === 'music-stats' && !loading) {
      // ... (Chart logic - same as before but using real 'songs' state)
      // Re-use the existing chart logic inside setTimeout
      const timer = setTimeout(() => {
        if (stylesChartRef.current) {
          if (chartInstances.current.styles) chartInstances.current.styles.destroy();
          chartInstances.current.styles = new window.Chart(stylesChartRef.current, {
            type: 'doughnut',
            data: {
              labels: ['Adoração', 'Celebração'],
              datasets: [{
                data: [songs.filter(s => s.style === 'Adoração').length, songs.filter(s => s.style === 'Celebração').length],
                backgroundColor: ['#3b82f6', '#f59e0b'],
                borderWidth: 0
              }]
            },
            options: { plugins: { legend: { display: false } }, cutout: '70%', maintainAspectRatio: false }
          });
        }
        if (themesChartRef.current) {
          const uniqueThemes = Array.from(new Set(songs.map(s => s.theme)));
          if (chartInstances.current.themes) chartInstances.current.themes.destroy();
          chartInstances.current.themes = new window.Chart(themesChartRef.current, {
            type: 'doughnut',
            data: {
              labels: uniqueThemes,
              datasets: [{
                data: uniqueThemes.map(t => songs.filter(s => s.theme === t).length),
                backgroundColor: themeColorsPalette,
                borderWidth: 0
              }]
            },
            options: { plugins: { legend: { display: false } }, cutout: '70%', maintainAspectRatio: false }
          });
        }
        if (rankingChartRef.current) {
          const ranking = getRanking();
          if (chartInstances.current.ranking) chartInstances.current.ranking.destroy();
          chartInstances.current.ranking = new window.Chart(rankingChartRef.current, {
            type: 'bar',
            data: {
              labels: ranking.map(r => r.song.length > 15 ? r.song.substring(0, 12) + '...' : r.song),
              datasets: [{
                label: 'Execuções',
                data: ranking.map(r => r.count),
                backgroundColor: '#1e3a8a',
                borderRadius: 6
              }]
            },
            options: {
              indexAxis: 'y',
              plugins: { legend: { display: false } },
              maintainAspectRatio: false,
              scales: {
                x: { grid: { display: false } },
                y: { grid: { display: false } }
              }
            }
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [subView, songs, repertoires, loading]);

  const getLink = (type: string, song: string, singer: string) => {
    const query = encodeURIComponent(`${song} ${singer}`);
    if (type === 'youtube') return `https://www.youtube.com/results?search_query=${query}`;
    if (type === 'spotify') return `https://open.spotify.com/search/${query}`;
    if (type === 'lyrics') return `https://www.letras.mus.br/?q=${query}`;
    if (type === 'chords') return `https://www.cifraclub.com.br/?q=${query}`;
    return '#';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[9px]">Carregando Músicas...</p>
      </div>
    );
  }

  if (subView === 'music-stats') {
    return (
      <div className="space-y-6 animate-fade-in pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-50 dark:border-slate-800 flex flex-col items-center">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Estilos</h3>
            <div className="h-40 w-full relative">
              <canvas ref={stylesChartRef}></canvas>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-50 dark:border-slate-800 flex flex-col items-center">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Temas (Paleta)</h3>
            <div className="h-40 w-full relative">
              <canvas ref={themesChartRef}></canvas>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-50 dark:border-slate-800 flex flex-col">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Ranking Músicas</h3>
            <div className="h-40 w-full">
              <canvas ref={rankingChartRef}></canvas>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subView === 'music-list') {
    const grouped = songs.reduce((acc, s) => {
      if (!acc[s.theme]) acc[s.theme] = {};
      if (!acc[s.theme][s.style]) acc[s.theme][s.style] = [];
      acc[s.theme][s.style].push(s);
      return acc;
    }, {} as GroupedHistory);

    return (
      <div className="pb-20 fade-in max-w-7xl mx-auto">
        <div className="flex justify-center mb-10">
          <button onClick={() => setIsSongModalOpen(true)} className="px-6 py-2.5 bg-brand text-white rounded-full font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform">
            <i className="fas fa-plus mr-2"></i> Adicionar Música
          </button>
        </div>

        {/* Modal Adicionar Música */}
        {isSongModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSongModalOpen(false)}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl animate-fade-in border border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6">Nova Música</h3>
              <div className="space-y-4">
                <input value={newSong.song} onChange={e => setNewSong({ ...newSong, song: e.target.value })} placeholder="Nome da Música" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand" />
                <input value={newSong.singer} onChange={e => setNewSong({ ...newSong, singer: e.target.value })} placeholder="Cantor / Banda" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand" />
                <div className="grid grid-cols-2 gap-4">
                  <select value={newSong.theme} onChange={e => setNewSong({ ...newSong, theme: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand">
                    <option value="">Tema...</option>
                    {availableThemes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={newSong.style} onChange={e => setNewSong({ ...newSong, style: e.target.value as 'Adoração' | 'Celebração' })} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand">
                    <option value="Adoração">Adoração</option>
                    <option value="Celebração">Celebração</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setIsSongModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-xl text-xs uppercase tracking-widest">Cancelar</button>
                  <button onClick={handleAddSong} className="flex-1 py-3 bg-brand text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg">Salvar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {Object.entries(grouped).map(([theme, styles]: [string, Record<string, Music[]>]) => (
            <div key={theme} className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-50 dark:border-slate-800 overflow-hidden shadow-sm">
              <div onClick={() => setExpandedThemes(p => ({ ...p, [theme]: !p[theme] }))} className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-brand/5 text-brand rounded-lg flex items-center justify-center"><i className="fas fa-tags text-[10px]"></i></div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{theme}</h3>
                </div>
                <i className={`fas fa-chevron-down text-slate-300 transition-transform ${expandedThemes[theme] ? 'rotate-180' : ''}`}></i>
              </div>
              {expandedThemes[theme] && (
                <div className="px-6 pb-6 space-y-6 pt-2 animate-fade-in bg-slate-50/10 dark:bg-slate-800/10">
                  {Object.entries(styles).map(([style, sList]: [string, Music[]]) => {
                    const styleKey = `${theme}-${style}`;
                    return (
                      <div key={style} className="space-y-3">
                        <div onClick={() => setExpandedStyles(p => ({ ...p, [styleKey]: !p[styleKey] }))} className="flex items-center gap-2 cursor-pointer group w-fit">
                          <div className={`w-1.5 h-1.5 rounded-full ${style === 'Adoração' ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                          <h4 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{style} ({sList.length})</h4>
                        </div>
                        {expandedStyles[styleKey] && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sList.sort((a: Music, b: Music) => a.song.localeCompare(b.song)).map((s: Music) => (
                              <div key={s.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-brand/40 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-lg">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex-1 pr-2 min-w-0">
                                    <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate">{s.song}</h5>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">{s.singer}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-4 gap-1">
                                  <a href={getLink('youtube', s.song, s.singer)} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-red-600 hover:bg-red-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Youtube"><i className="fab fa-youtube text-[10px]"></i></a>
                                  <a href={getLink('spotify', s.song, s.singer)} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-emerald-500 hover:bg-emerald-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Spotify"><i className="fab fa-spotify text-[10px]"></i></a>
                                  <a href={getLink('lyrics', s.song, s.singer)} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-blue-500 hover:bg-blue-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Letra"><i className="fas fa-align-left text-[9px]"></i></a>
                                  <a href={getLink('chords', s.song, s.singer)} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-amber-500 hover:bg-amber-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Cifra"><i className="fas fa-guitar text-[9px]"></i></a>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Repertoire View
  if (subView === 'music-repertoire') {
    return (
      <div className="pb-20 fade-in max-w-7xl mx-auto space-y-6">
        <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-4 mb-4">Repertório</h2>
        
        {repertoires.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <i className="fas fa-music text-4xl text-slate-300 mb-4"></i>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Nenhum repertório encontrado</p>
            <p className="text-xs text-slate-500">Verifique se há registros na tabela 'repertorio'</p>
          </div>
        ) : (
          repertoires.map((event: RepertoireSet) => (
            <div key={event.id} className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-50 dark:border-slate-800 overflow-hidden shadow-sm">
              <div 
                onClick={() => setExpandedThemes(p => ({ ...p, [event.id]: !p[event.id] }))}
                className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    {event.title}
                  </h4>
                  <p className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest">
                    {event.items.length} MÚSICAS
                  </p>
                </div>
                <button className="w-8 h-8 bg-emerald-500 text-white rounded-lg shadow-md flex items-center justify-center">
                  <i className={`fas fa-chevron-${expandedThemes[event.id] ? 'up' : 'down'} text-[10px]`}></i>
                </button>
              </div>
              
              {expandedThemes[event.id] && (
                <div className="p-4 space-y-3 animate-fade-in">
                  {event.items.map((item: RepertoireItem, index: number) => (
                    <div key={item.id} className="p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center font-black text-[8px] shrink-0">
                          {item.key || 'Ñ'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate">{item.song} - {item.singer}</h5>
                          <p className="text-[9px] font-bold text-slate-400 uppercase truncate">
                            MINISTRO: <span className="text-brand">{item.minister}</span>
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        <a href={getLink('youtube', item.song, item.singer)} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-red-600 hover:bg-red-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Youtube"><i className="fab fa-youtube text-[10px]"></i></a>
                        <a href={getLink('spotify', item.song, item.singer)} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-emerald-500 hover:bg-emerald-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Spotify"><i className="fab fa-spotify text-[10px]"></i></a>
                        <a href={getLink('lyrics', item.song, item.singer)} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-blue-500 hover:bg-blue-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Letra"><i className="fas fa-align-left text-[9px]"></i></a>
                        <a href={getLink('chords', item.song, item.singer)} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-amber-500 hover:bg-amber-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Cifra"><i className="fas fa-guitar text-[9px]"></i></a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  // Placeholder for other subViews as they are waiting for real data derived from 'escalas' in ListView or similar
  if (subView === 'music-history') {

    // If no history data, show a message with option to create test data
    if (history.length === 0) {
      return (
        <div className="pb-20 fade-in max-w-4xl mx-auto">
          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-4 mb-4">Histórico de Músicas</h2>

            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <i className="fas fa-history text-4xl text-slate-300 mb-4"></i>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Nenhum histórico encontrado</p>
              <p className="text-xs text-slate-500 mb-6">Verifique se há registros na tabela 'historico_musicas'</p>

              <button
                onClick={async () => {
                  // Create some test data
                  try {
                    const { data: members } = await supabase.from('membros').select('id, nome').limit(3);
                    const { data: songs } = await supabase.from('musicas').select('id, musica').limit(5);
                    const { data: tones } = await supabase.from('tons').select('id, nome_tom').limit(3);

                    if (members && songs && tones && members.length > 0 && songs.length > 0 && tones.length > 0) {
                      for (let i = 0; i < 5; i++) {
                        await supabase.from('historico_musicas').insert({
                          id_membros: members[i % members.length].id,
                          id_musicas: songs[i % songs.length].id,
                          id_tons: tones[i % tones.length].id,
                          musica: songs[i % songs.length].musica
                        });
                      }
                      fetchData(); // Reload data
                    }
                  } catch (error) {
                    logger.error('Error creating test data:', error, 'database');
                  }
                }}
                className="px-4 py-2 bg-brand text-white rounded-full text-xs font-black uppercase tracking-widest"
              >
                Criar Dados de Teste
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Group history by minister -> theme -> style -> songs (aggregated by song+singer)
    const groupedHistory: GroupedHistory = history.reduce((acc, item) => {

      if (!item.minister || item.minister === 'Sem ministro') {
        return acc;
      }

      if (!acc[item.minister]) {
        acc[item.minister] = {};
      }

      if (!acc[item.minister][item.theme]) {
        acc[item.minister][item.theme] = {};
      }

      if (!acc[item.minister][item.theme][item.style]) {
        acc[item.minister][item.theme][item.style] = [];
      }

      // Check if song+singer already exists in this style
      const existingSongIndex = acc[item.minister][item.theme][item.style].findIndex(
        existing => existing.song === item.song && existing.singer === item.singer
      );

      if (existingSongIndex >= 0) {
        // Song exists, add the key if different
        const existingSong = acc[item.minister][item.theme][item.style][existingSongIndex];
        if (item.key && !existingSong.keys.includes(item.key)) {
          existingSong.keys.push(item.key);
        }
        // Update dates to show the most recent
        if (item.date > existingSong.date) {
          existingSong.date = item.date;
        }
      } else {
        // New song, initialize with keys array
        acc[item.minister][item.theme][item.style].push({
          ...item,
          keys: item.key ? [item.key] : []
        });
      }

      return acc;
    }, {} as GroupedHistory);

    return (
      <div className="pb-20 fade-in max-w-7xl mx-auto space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-4 mb-4">Histórico de Músicas</h2>

          {Object.entries(groupedHistory).map(([minister, themes]) => (
            <div key={minister} className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-50 dark:border-slate-800 overflow-hidden shadow-sm">
              {/* Minister Level */}
              <div
                onClick={() => setExpandedHistMinisters(p => ({ ...p, [minister]: !p[minister] }))}
                className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-50 dark:border-slate-800"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center font-black text-sm">
                    {minister.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{minister}</h3>
                    <p className="text-[8px] font-black text-brand uppercase mt-1 tracking-widest">MINISTRO</p>
                  </div>
                </div>
                <i className={`fas fa-chevron-down text-slate-300 transition-transform ${expandedHistMinisters[minister] ? 'rotate-180' : ''}`}></i>
              </div>

              {expandedHistMinisters[minister] && (
                <div className="px-6 pb-6 space-y-6 pt-4 animate-fade-in bg-slate-50/5 dark:bg-slate-800/5">
                  {Object.entries(themes).map(([theme, styles]) => (
                    <div key={theme} className="space-y-4">
                      {/* Theme Level */}
                      <div
                        onClick={() => setExpandedHistThemes(p => ({ ...p, [`${minister}-${theme}`]: !p[`${minister}-${theme}`] }))}
                        className="flex items-center gap-2 cursor-pointer group w-fit"
                      >
                        <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-brand transition-colors">{theme}</h4>
                        <i className={`fas fa-chevron-right text-[8px] text-slate-200 transition-transform ${expandedHistThemes[`${minister}-${theme}`] ? 'rotate-90' : ''}`}></i>
                      </div>

                      {expandedHistThemes[`${minister}-${theme}`] && (
                        <div className="space-y-6 animate-fade-in pl-4 border-l-2 border-slate-100 dark:border-slate-800">
                          {Object.entries(styles).map(([style, songs]) => (
                            <div key={style} className="space-y-3">
                              {/* Style Level */}
                              <div
                                onClick={() => setExpandedHistStyles(p => ({ ...p, [`${minister}-${theme}-${style}`]: !p[`${minister}-${theme}-${style}`] }))}
                                className="flex items-center gap-3 cursor-pointer group"
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${style === 'Adoração' ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                                <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest group-hover:text-brand transition-colors">{style}</span>
                                <i className={`fas fa-chevron-right text-[8px] text-slate-200 transition-transform ${expandedHistStyles[`${minister}-${theme}-${style}`] ? 'rotate-90' : ''}`}></i>
                              </div>

                              {expandedHistStyles[`${minister}-${theme}-${style}`] && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                                  {songs.map((song) => (
                                    <div key={song.id} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                      <div className="flex-1 min-w-0 mb-3">
                                        <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate leading-tight">{song.song}</p>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1 truncate">
                                          {song.singer || 'Desconhecido'}{song.keys && song.keys.length > 0 && (
                                            <> • <span className="text-brand">{song.keys.join(' / ')}</span></>
                                          )}
                                        </p>
                                      </div>
                                      <div className="grid grid-cols-4 gap-1">
                                        <a href={getLink('youtube', song.song, song.singer)} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-red-600 hover:bg-red-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Youtube"><i className="fab fa-youtube text-[10px]"></i></a>
                                        <a href={getLink('spotify', song.song, song.singer)} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-emerald-500 hover:bg-emerald-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Spotify"><i className="fab fa-spotify text-[10px]"></i></a>
                                        <a href={getLink('lyrics', song.song, song.singer)} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-blue-500 hover:bg-blue-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Letra"><i className="fas fa-align-left text-[9px]"></i></a>
                                        <a href={getLink('chords', song.song, song.singer)} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-amber-500 hover:bg-amber-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Cifra"><i className="fas fa-guitar text-[9px]"></i></a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Escalas View
  if (subView === 'music-escalas') {
    // Group escalas by cult/event
    const groupedEscalas = escalas.reduce((acc, escala) => {
      const cultName = escala.cultos?.nome_cultos?.nome_culto || 'Culto Sem Nome';
      const cultDate = escala.cultos?.data_culto ? new Date(escala.cultos.data_culto).toLocaleDateString('pt-BR') : 'Sem Data';
      const eventKey = `${cultName}-${cultDate}`;
      
      if (!acc[eventKey]) {
        acc[eventKey] = {
          id: eventKey,
          title: cultName,
          date: cultDate,
          time: escala.cultos?.horario || 'Sem Horário',
          items: []
        };
      }
      acc[eventKey].items.push(escala);
      return acc;
    }, {} as Record<string, EscalaEvent>);

    const events = Object.values(groupedEscalas);

    return (
      <div className="pb-20 fade-in max-w-7xl mx-auto space-y-6">
        <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-4 mb-4">Escalas de Música</h2>
        
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <i className="fas fa-calendar-alt text-4xl text-slate-300 mb-4"></i>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Nenhuma escala encontrada</p>
            <p className="text-xs text-slate-500">Verifique se há registros na tabela 'escalas'</p>
          </div>
        ) : (
          events.map((event: EscalaEvent) => (
            <div key={event.id} className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-50 dark:border-slate-800 overflow-hidden shadow-sm">
              <div 
                onClick={() => setExpandedThemes(p => ({ ...p, [event.id]: !p[event.id] }))}
                className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    {event.title}
                  </h4>
                  <p className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest">
                    {event.date} • {event.time}
                  </p>
                </div>
                <button className="w-8 h-8 bg-emerald-500 text-white rounded-lg shadow-md flex items-center justify-center">
                  <i className={`fas fa-chevron-${expandedThemes[event.id] ? 'up' : 'down'} text-[10px]`}></i>
                </button>
              </div>
              
              {expandedThemes[event.id] && (
                <div className="p-4 space-y-3 animate-fade-in">
                  {event.items.map((item: EscalaItem, index: number) => (
                    <div key={item.id} className="p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center font-black text-[8px] shrink-0">
                          {item.membros?.[0]?.nome?.charAt(0)?.toUpperCase() || 'M'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate">{item.membros?.[0]?.nome || 'Sem Nome'}</h5>
                          <p className="text-[9px] font-bold text-slate-400 uppercase truncate">
                            FUNÇÃO: <span className="text-brand">{item.funcao?.[0]?.nome_funcao || 'Membro'}</span>
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        <a href={getLink('youtube', item.membros?.[0]?.nome || '', item.funcao?.[0]?.nome_funcao || '')} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-red-600 hover:bg-red-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Youtube"><i className="fab fa-youtube text-[10px]"></i></a>
                        <a href={getLink('spotify', item.membros?.[0]?.nome || '', item.funcao?.[0]?.nome_funcao || '')} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-emerald-500 hover:bg-emerald-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Spotify"><i className="fab fa-spotify text-[10px]"></i></a>
                        <a href={getLink('lyrics', item.membros?.[0]?.nome || '', item.funcao?.[0]?.nome_funcao || '')} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-blue-500 hover:bg-blue-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Letra"><i className="fas fa-align-left text-[9px]"></i></a>
                        <a href={getLink('chords', item.membros?.[0]?.nome || '', item.funcao?.[0]?.nome_funcao || '')} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-amber-500 hover:bg-amber-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Cifra"><i className="fas fa-guitar text-[10px]"></i></a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  return null;
};

export default MusicView;
