import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { supabase } from '../../supabaseClient';
import { showError } from '../../utils/toast';
import { logger } from '../../utils/logger';
import { ChartInstances, EscalaMusicView, RepertorioMusicView, EscalaEvent, EscalaItem } from '../../types-supabase';

interface Music {
  id: string;
  song: string;
  singer: string;
  minister: string;
  theme: string;
  style: 'Adoração' | 'Celebração';
  link_youtube?: string;
  link_spotify?: string;
  link_letra?: string;
  link_cifra?: string;
}

interface RepertoireItem {
  id: string;
  id_culto: string;
  id_musicas: string;
  id_membros: string;
  id_tons: string;
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

const MusicView: React.FC<{ subView: string }> = ({ subView }) => {
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
  const [isRepertoireModalOpen, setIsRepertoireModalOpen] = useState(false);
  const [editingRepertoire, setEditingRepertoire] = useState<RepertoireItem | null>(null);
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});
  const [expandedStyles, setExpandedStyles] = useState<Record<string, boolean>>({});
  const [expandedMinisters, setExpandedMinisters] = useState<Record<string, boolean>>({});
  const [expandedHistThemes, setExpandedHistThemes] = useState<Record<string, boolean>>({});
  const [expandedHistMinisters, setExpandedHistMinisters] = useState<Record<string, boolean>>({});
  const [expandedHistStyles, setExpandedHistStyles] = useState<Record<string, boolean>>({});

  // Form states
  const [newSong, setNewSong] = useState({ song: '', singer: '', theme: '', style: 'Adoração' });
  const [newRepertoire, setNewRepertoire] = useState({ 
    song: '', 
    singer: '', 
    minister: '', 
    key: '', 
    style: 'Adoração',
    id_culto: '',
    id_musicas: '',
    id_membros: '',
    id_tons: ''
  });
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [availableSongs, setAvailableSongs] = useState<Music[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Music[]>([]);
  const [musicSearch, setMusicSearch] = useState('');
  const [songListSearch, setSongListSearch] = useState('');
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<any[]>([]);
  const [availableTones, setAvailableTones] = useState<any[]>([]);
  const [availableCults, setAvailableCults] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [subView]);

  // Filtrar músicas baseado na busca
  useEffect(() => {
    if (musicSearch) {
      const filtered = availableSongs.filter(song => 
        song.song.toLowerCase().includes(musicSearch.toLowerCase()) ||
        song.singer.toLowerCase().includes(musicSearch.toLowerCase())
      );
      setFilteredSongs(filtered);
    } else {
      setFilteredSongs(availableSongs);
    }
  }, [musicSearch, availableSongs]);

  // Filtrar ministros baseado no culto selecionado
  useEffect(() => {
    if (newRepertoire.id_culto) {
      // Buscar ministros e vocais que já participaram deste culto
      const cultMinisters = repertoires
        .filter(rep => rep.cultName === availableCults.find(c => c.id === newRepertoire.id_culto)?.nome_cultos?.nome_culto)
        .flatMap(rep => rep.items)
        .map(item => item.minister)
        .filter((minister, index, arr) => arr.indexOf(minister) === index); // Remove duplicados
      
      // Adicionar membros que são ministros/vocais
      const ministersAndVocals = availableMembers.filter(member => 
        member.nome.toLowerCase().includes('ministro') || 
        member.nome.toLowerCase().includes('vocal') ||
        cultMinisters.includes(member.nome)
      );
      
      setFilteredMembers(ministersAndVocals);
    } else {
      setFilteredMembers([]);
    }
  }, [newRepertoire.id_culto, availableMembers, repertoires, availableCults]);

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
          id_temas,
          temas (
            id,
            nome_tema
          )
        `);

      if (songsError) throw songsError;

      const formattedSongs: Music[] = (songsData || []).map((s: any) => ({
        id: s.id,
        song: s.musica,
        singer: s.cantor,
        minister: s.membros?.nome || '',
        theme: s.temas?.nome_tema || 'Geral',
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
            id,
            data_culto,
            nome_cultos (
              id,
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
            id,
            nome
          ),
          tons (
            id,
            nome_tons
          )
        `)
        .order('created_at', { ascending: false });

      if (repError) throw repError;

      // Group repertoire by cult (nome_culto - data_culto)
      const groupedRepertoire = (repData || []).reduce((acc, item: any) => {
        const cultName = item.cultos?.nome_cultos?.nome_culto || 'Culto Sem Nome';
        const cultDate = item.cultos?.data_culto ? new Date(item.cultos.data_culto).toLocaleDateString('pt-BR') : 'Sem Data';
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
          id_culto: item.id_culto,
          id_musicas: item.id_musicas,
          id_membros: item.id_membros,
          id_tons: item.id_tons,
          song: item.musicas?.musica || 'Sem música',
          singer: item.musicas?.cantor || 'Sem cantor',
          minister: item.membros?.nome || 'Sem ministro',
          key: item.tons?.nome_tons || 'Ñ',
          style: item.musicas?.estilo || 'Adoração'
        });
        
        return acc;
      }, {} as Record<string, RepertoireSet>);

      setRepertoires(Object.values(groupedRepertoire));

      // 4. Fetch additional data for repertoire forms
      const { data: membersData } = await supabase.from('membros').select('id, nome').order('nome');
      const { data: tonesData } = await supabase.from('tons').select('id, nome_tons').order('nome_tons');
      const { data: cultsData } = await supabase.from('cultos').select(`
        id, 
        data_culto, 
        nome_cultos (
          id,
          nome_culto
        )
      `).order('data_culto', { ascending: false });

      setAvailableMembers(membersData || []);
      setAvailableTones(tonesData || []);
      setAvailableCults(cultsData || []);
      setAvailableSongs(formattedSongs);


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
              style: musicDetails?.estilo || '',
              keys: [] // Adicionar propriedade keys obrigatória
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

  // Repertoire functions
  const handleAddRepertoire = async () => {
    try {
      if (!newRepertoire.id_culto || !newRepertoire.id_musicas || !newRepertoire.id_membros || !newRepertoire.id_tons) {
        showError('Preencha todos os campos obrigatórios.');
        return;
      }

      const { error } = await supabase.from('repertorio').insert({
        id_culto: newRepertoire.id_culto,
        id_musicas: newRepertoire.id_musicas,
        id_membros: newRepertoire.id_membros,
        id_tons: newRepertoire.id_tons
      });

      if (error) throw error;

      setIsRepertoireModalOpen(false);
      setEditingRepertoire(null);
      setNewRepertoire({ 
        song: '', 
        singer: '', 
        minister: '', 
        key: '', 
        style: 'Adoração',
        id_culto: '',
        id_musicas: '',
        id_membros: '',
        id_tons: ''
      });
      fetchData();
    } catch (err) {
      logger.error('Error adding repertoire:', err, 'database');
      showError('Erro ao adicionar repertório.');
    }
  };

  const handleEditRepertoire = async (item: RepertoireItem) => {
    try {
      if (!item.id_culto || !item.id_musicas || !item.id_membros || !item.id_tons) {
        showError('Preencha todos os campos obrigatórios.');
        return;
      }

      const { error } = await supabase
        .from('repertorio')
        .update({
          id_culto: item.id_culto,
          id_musicas: item.id_musicas,
          id_membros: item.id_membros,
          id_tons: item.id_tons
        })
        .eq('id', item.id);

      if (error) throw error;

      setEditingRepertoire(null);
      fetchData();
    } catch (err) {
      logger.error('Error editing repertoire:', err, 'database');
      showError('Erro ao editar repertório.');
    }
  };

  const handleDeleteRepertoire = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item do repertório?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('repertorio')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchData();
    } catch (err) {
      logger.error('Error deleting repertoire:', err, 'database');
      showError('Erro ao excluir repertório.');
    }
  };

  const openEditModal = (item: RepertoireItem) => {
    setEditingRepertoire(item);
    setNewRepertoire({
      song: item.song,
      singer: item.singer,
      minister: item.minister,
      key: item.key,
      style: item.style,
      id_culto: item.id_culto,
      id_musicas: item.id_musicas,
      id_membros: item.id_membros,
      id_tons: item.id_tons
    });
    setIsRepertoireModalOpen(true);
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
    if (!loading && (subView === 'music-list' || subView === 'music-repertoire')) {
      // ... (Chart logic - same as before but using real 'songs' state)
      // Re-use the existing chart logic inside setTimeout
      const timer = setTimeout(() => {
        // Gráficos Estilos e Temas para aba Lista
        if (subView === 'music-list') {
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
        }
        
        // Gráfico Ranking Músicas para aba Repertório
        if (subView === 'music-repertoire') {
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

  if (subView === 'music-list') {
    // Filtrar músicas baseado na busca
    const filteredSongsList = songListSearch 
      ? songs.filter(song => 
          song.song.toLowerCase().includes(songListSearch.toLowerCase()) ||
          song.singer.toLowerCase().includes(songListSearch.toLowerCase())
        )
      : songs;

    // Reorganizar: tema -> estilo -> música
    const grouped = filteredSongsList.reduce((acc, s) => {
      if (!acc[s.theme]) acc[s.theme] = {};
      if (!acc[s.theme][s.style]) acc[s.theme][s.style] = [];
      acc[s.theme][s.style].push(s);
      return acc;
    }, {} as Record<string, Record<string, Music[]>>);

    return (
      <div className="pb-20 fade-in max-w-7xl mx-auto">
        {/* Gráficos Estilos e Temas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
        </div>

        <div className="flex justify-center mb-6">
          <button onClick={() => setIsSongModalOpen(true)} className="px-6 py-2.5 bg-brand text-white rounded-full font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform">
            <i className="fas fa-plus mr-2"></i> Adicionar Música
          </button>
        </div>

        {/* Campo de Busca de Músicas com React-Select */}
        <div className="mb-8 px-4">
          <div className="max-w-md mx-auto">
            <Select
              options={songs.map(song => ({
                value: song.id,
                label: `${song.song} - ${song.singer}`
              }))}
              placeholder="Pesquisar música..."
              isClearable={true}
              isSearchable={true}
              noOptionsMessage={() => "Nenhuma música encontrada"}
              onChange={(selectedOption) => {
                if (selectedOption) {
                  // Implementar lógica para destacar a música selecionada
                  console.log('Música selecionada:', selectedOption);
                }
              }}
              className="w-full"
              styles={{
                control: (baseStyles, state) => ({
                  ...baseStyles,
                  backgroundColor: state.isFocused ? '#1e3a8a' : '#f8fafc',
                  borderColor: state.isFocused ? '#1e3a8a' : '#e2e8f0',
                  borderRadius: '0.75rem',
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  '&:hover': {
                    borderColor: '#1e3a8a',
                  }
                }),
                option: (baseStyles, state) => ({
                  ...baseStyles,
                  backgroundColor: state.isSelected ? '#1e3a8a' : '#ffffff',
                  color: state.isSelected ? '#ffffff' : '#1f2937',
                  '&:hover': {
                    backgroundColor: '#f1f5f9',
                  }
                }),
                menu: (baseStyles) => ({
                  ...baseStyles,
                  borderRadius: '0.75rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                }),
                input: (baseStyles) => ({
                  ...baseStyles,
                  color: '#1f2937',
                })
              }}
            />
          </div>
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

        <div className="space-y-6">
          {Object.entries(grouped).map(([theme, styles]: [string, Record<string, Music[]>]) => (
            <div key={theme} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
              {/* Nível Tema - Header Melhorado */}
              <div 
                onClick={() => setExpandedThemes(p => ({ ...p, [theme]: !p[theme] }))} 
                className="px-4 sm:px-8 py-4 sm:py-6 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 border-b border-slate-100 dark:border-slate-700 cursor-pointer group hover:from-brand/5 hover:to-brand/10 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-brand to-brand/80 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <i className="fas fa-folder text-sm sm:text-lg"></i>
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight mb-1">{theme}</h3>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-[10px] sm:text-xs font-bold text-brand uppercase tracking-widest bg-brand/10 px-2 sm:px-3 py-1 rounded-full border border-brand/20">
                          {Object.values(styles).reduce((total, styleList) => total + styleList.length, 0)} músicas
                        </span>
                        <span className="text-[9px] sm:text-xs text-slate-400 uppercase tracking-widest">
                          {Object.keys(styles).length} estilos
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 dark:bg-slate-800 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 ${expandedThemes[theme] ? 'bg-brand text-white rotate-180' : 'text-slate-400 group-hover:bg-brand group-hover:text-white'}`}>
                      <i className="fas fa-chevron-down text-xs sm:text-sm"></i>
                    </div>
                  </div>
                </div>
              </div>
              
              {expandedThemes[theme] && (
                <div className="px-8 pb-8 space-y-6 pt-6 animate-fade-in bg-gradient-to-b from-slate-50/30 to-white dark:from-slate-800/20 dark:to-slate-900">
                  {Object.entries(styles).map(([style, sList]: [string, Music[]]) => {
                    const styleKey = `${theme}-${style}`;
                    return (
                      <div key={style} className="space-y-4">
                        {/* Nível Estilo - Melhorado */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full shadow-lg ${style === 'Adoração' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-amber-400 to-amber-600'}`}></div>
                            <div>
                              <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                {style}
                              </h4>
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                                {sList.length} música{sList.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setExpandedStyles(p => ({ ...p, [styleKey]: !p[styleKey] }))} 
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${expandedStyles[styleKey] ? 'bg-brand text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 hover:bg-brand hover:text-white'}`}
                          >
                            <i className={`fas fa-chevron-${expandedStyles[styleKey] ? 'up' : 'down'} text-xs`}></i>
                          </button>
                        </div>
                        
                        {/* Nível Músicas - Formato Cartões */}
                        {expandedStyles[styleKey] && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-6 animate-fade-in">
                            {sList.sort((a: Music, b: Music) => a.song.localeCompare(b.song)).map((s: Music, index: number) => (
                              <div key={s.id} className="group relative">
                                {/* Cartão da Música */}
                                <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                                  {/* Header com Tom e Informações */}
                                  <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                                    <div className="w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center font-black text-[8px] shrink-0">
                                      {/* Aqui poderíamos adicionar o tom da música se disponível */}
                                      <i className="fas fa-music text-sm"></i>
                                    </div>
                                    <div className="flex-1 px-4">
                                      <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate">{s.song} - {s.singer}</h5>
                                    </div>
                                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">
                                        {String(index + 1).padStart(2, '0')}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Botões de Links */}
                                  <div className="p-4">
                                    <div className="grid grid-cols-4 gap-1">
                                      <a href={getLink('youtube', s.song, s.singer)} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-red-600 hover:bg-red-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Youtube">
                                        <i className="fab fa-youtube text-[10px]"></i>
                                      </a>
                                      <a href={getLink('spotify', s.song, s.singer)} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-green-600 hover:bg-green-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Spotify">
                                        <i className="fab fa-spotify text-[10px]"></i>
                                      </a>
                                      <a href={getLink('lyrics', s.song, s.singer)} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Letra">
                                        <i className="fas fa-microphone-alt text-[10px]"></i>
                                      </a>
                                      <a href={getLink('chords', s.song, s.singer)} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-purple-600 hover:bg-purple-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Cifra">
                                        <i className="fas fa-guitar text-[10px]"></i>
                                      </a>
                                    </div>
                                  </div>
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
        {/* Gráfico Ranking Músicas */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-50 dark:border-slate-800 flex flex-col">
          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Ranking Músicas</h3>
          <div className="h-40 w-full">
            <canvas ref={rankingChartRef}></canvas>
          </div>
        </div>

        <div className="flex justify-between items-center px-4 mb-4">
          <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Repertório</h2>
          <button 
            onClick={() => {
              setEditingRepertoire(null);
              setNewRepertoire({ 
                song: '', 
                singer: '', 
                minister: '', 
                key: '', 
                style: 'Adoração',
                id_culto: '',
                id_musicas: '',
                id_membros: '',
                id_tons: ''
              });
              setIsRepertoireModalOpen(true);
            }} 
            className="px-4 py-2 bg-brand text-white rounded-full font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
          >
            <i className="fas fa-plus mr-2"></i> Adicionar Repertório
          </button>
        </div>
        
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
                className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-50 dark:border-slate-800"
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
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">MÚSICAS</span>
                    <button 
                      onClick={() => {
                        setEditingRepertoire(null);
                        // Encontrar o ID do culto baseado no nome
                        const cultoId = availableCults.find(c => c.nome_cultos?.nome_culto === event.cultName)?.id || '';
                        setNewRepertoire({ 
                          song: '', 
                          singer: '', 
                          minister: '', 
                          key: '', 
                          style: 'Adoração',
                          id_culto: cultoId, // Pré-selecionar culto atual
                          id_musicas: '',
                          id_membros: '',
                          id_tons: ''
                        });
                        setIsRepertoireModalOpen(true);
                      }}
                      className="px-3 py-1 bg-brand text-white rounded-lg text-xs font-bold hover:bg-brand/90 transition-colors"
                    >
                      <i className="fas fa-plus mr-1"></i> Adicionar
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {event.items.map((item: RepertoireItem, index: number) => (
                    <div key={item.id} className="p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700 relative group">
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(item)}
                          className="w-6 h-6 bg-blue-500 text-white rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                          title="Editar"
                        >
                          <i className="fas fa-edit text-[10px]"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteRepertoire(item.id)}
                          className="w-6 h-6 bg-red-500 text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors"
                          title="Excluir"
                        >
                          <i className="fas fa-trash text-[10px]"></i>
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center font-black text-[8px] shrink-0">
                          {item.key || 'Ñ'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate mb-1">{item.song} - {item.singer}</h5>
                          {item.minister && (
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Ministro: <span className="text-brand">{item.minister}</span></p>
                          )}
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
                </div>
              )}
            </div>
          ))
        )}

        {/* Modal Adicionar/Editar Repertório */}
        {isRepertoireModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsRepertoireModalOpen(false)}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl animate-fade-in border border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6">
                {editingRepertoire ? 'Editar Repertório' : 'Novo Repertório'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">Culto</label>
                  <select 
                    value={newRepertoire.id_culto} 
                    onChange={e => setNewRepertoire({ ...newRepertoire, id_culto: e.target.value })} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand"
                  >
                    <option value="">Selecione um culto...</option>
                    {availableCults.map(cult => (
                      <option key={cult.id} value={cult.id}>
                        {cult.nome_cultos?.nome_culto || 'Culto Sem Nome'} - {cult.data_culto ? new Date(cult.data_culto).toLocaleDateString('pt-BR') : 'Sem data'}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">Música</label>
                  <div className="ts-control relative mb-2">
                    <Select
                      options={filteredSongs.map(song => ({
                        value: song.id,
                        label: `${song.song} - ${song.singer}`
                      }))}
                      placeholder="Pesquisar música..."
                      isClearable={true}
                      isSearchable={true}
                      noOptionsMessage={() => "Nenhuma música encontrada"}
                      onChange={(selectedOption) => {
                        if (selectedOption) {
                          setNewRepertoire({ 
                            ...newRepertoire, 
                            id_musicas: selectedOption.value,
                            song: filteredSongs.find(s => s.id === selectedOption.value)?.song || '',
                            singer: filteredSongs.find(s => s.id === selectedOption.value)?.singer || ''
                          });
                        }
                      }}
                      value={filteredSongs.find(s => s.id === newRepertoire.id_musicas) ? {
                        value: newRepertoire.id_musicas,
                        label: `${newRepertoire.song} - ${newRepertoire.singer}`
                      } : null}
                      className="w-full"
                      styles={{
                        control: (baseStyles, state) => ({
                          ...baseStyles,
                          backgroundColor: state.isFocused ? '#1e3a8a' : '#f8fafc',
                          borderColor: state.isFocused ? '#1e3a8a' : '#e2e8f0',
                          borderRadius: '0.75rem',
                          padding: '0.75rem',
                          fontSize: '0.875rem',
                          '&:hover': {
                            borderColor: '#1e3a8a',
                          }
                        }),
                        option: (baseStyles, state) => ({
                          ...baseStyles,
                          backgroundColor: state.isSelected ? '#1e3a8a' : '#ffffff',
                          color: state.isSelected ? '#ffffff' : '#1f2937',
                          '&:hover': {
                            backgroundColor: '#f1f5f9',
                          }
                        }),
                        menu: (baseStyles) => ({
                          ...baseStyles,
                          borderRadius: '0.75rem',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        }),
                        input: (baseStyles) => ({
                          ...baseStyles,
                          color: '#1f2937',
                        })
                      }}
                    />
                  </div>
                </div>
                
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">Ministro</label>
                    <select 
                      value={newRepertoire.id_membros} 
                      onChange={e => setNewRepertoire({ ...newRepertoire, id_membros: e.target.value, minister: filteredMembers.find(m => m.id === e.target.value)?.nome || '' })} 
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand"
                    >
                      <option value="">Selecione um ministro...</option>
                      {filteredMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">Tom</label>
                    <select 
                      value={newRepertoire.id_tons} 
                      onChange={e => setNewRepertoire({ ...newRepertoire, id_tons: e.target.value, key: availableTones.find(t => t.id === e.target.value)?.nome_tons || '' })} 
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand"
                    >
                      <option value="">Selecione um tom...</option>
                      {availableTones.map(tone => (
                        <option key={tone.id} value={tone.id}>
                          {tone.nome_tons}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsRepertoireModalOpen(false)} 
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-xl text-xs uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={editingRepertoire ? () => handleEditRepertoire(editingRepertoire) : handleAddRepertoire} 
                    className="flex-1 py-3 bg-brand text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg"
                  >
                    {editingRepertoire ? 'Salvar' : 'Adicionar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
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
    const groupedHistory: GroupedHistory = Array.isArray(history) ? history.reduce((acc, item) => {

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
    }, {} as GroupedHistory) : {};

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
      const cultName = escala.cultos?.[0]?.nome_cultos?.[0]?.nome_culto || 'Culto Sem Nome';
      const cultDate = escala.cultos?.[0]?.data_culto ? new Date(escala.cultos[0].data_culto).toLocaleDateString('pt-BR') : 'Sem Data';
      const eventKey = `${cultName}-${cultDate}`;
      
      if (!acc[eventKey]) {
        acc[eventKey] = {
          id: eventKey,
          title: cultName,
          date: cultDate,
          time: 'Sem Horário', // Remover acesso à propriedade inexistente
          items: []
        };
      }
      acc[eventKey].items.push({
        id: escala.id,
        memberName: escala.membros?.[0]?.nome || 'Sem Nome',
        role: 'Músico' // Valor padrão já que a propriedade não existe
      });
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {event.items.map((item: any, index: number) => (
                      <div key={item.id} className="p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700 relative group">
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => console.log('Editar escala:', item)}
                            className="w-6 h-6 bg-blue-500 text-white rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                            title="Editar"
                          >
                            <i className="fas fa-edit text-[10px]"></i>
                          </button>
                          <button
                            onClick={() => console.log('Excluir escala:', item.id)}
                            className="w-6 h-6 bg-red-500 text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors"
                            title="Excluir"
                          >
                            <i className="fas fa-trash text-[10px]"></i>
                          </button>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center font-black text-[8px] shrink-0">
                            {item.membros?.[0]?.nome?.charAt(0)?.toUpperCase() || 'M'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate mb-1">{item.membros?.[0]?.nome || 'Sem Nome'}</h5>
                            <p className="text-[9px] font-bold text-slate-400 uppercase truncate">
                              FUNÇÃO: <span className="text-brand">{item.funcao?.[0]?.nome_funcao || 'Membro'}</span>
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          <a href={getLink('youtube', item.membros?.[0]?.nome || '', item.funcao?.[0]?.nome_funcao || '')} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-red-600 hover:bg-red-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Youtube"><i className="fab fa-youtube text-[10px]"></i></a>
                          <a href={getLink('spotify', item.membros?.[0]?.nome || '', item.funcao?.[0]?.nome_funcao || '')} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-emerald-500 hover:bg-emerald-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Spotify"><i className="fab fa-spotify text-[10px]"></i></a>
                          <a href={getLink('lyrics', item.membros?.[0]?.nome || '', item.funcao?.[0]?.nome_funcao || '')} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-blue-500 hover:bg-blue-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Letra"><i className="fas fa-align-left text-[9px]"></i></a>
                          <a href={getLink('chords', item.membros?.[0]?.nome || '', item.funcao?.[0]?.nome_funcao || '')} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-amber-500 hover:bg-amber-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Cifra"><i className="fas fa-guitar text-[9px]"></i></a>
                        </div>
                      </div>
                    ))}
                  </div>
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
