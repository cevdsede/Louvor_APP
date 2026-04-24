import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { supabase } from '../../supabaseClient';
import { useMinistryContext } from '../../contexts/MinistryContext';
import { showError } from '../../utils/toast';
import { logger } from '../../utils/logger';
import { ChartInstances, EscalaMusicView, RepertorioMusicView, EscalaEvent, EscalaItem } from '../../types-supabase';
import { getMemberIdsForMinisterio } from '../../utils/memberMinistry';
import { getDisplayName } from '../../utils/displayName';

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

import LocalStorageFirstService from '../../services/LocalStorageFirstService';

const MusicView: React.FC<{ subView: string }> = ({ subView }) => {
  const { activeMinisterioId, activeModules } = useMinistryContext();
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEscalaDeleteModalOpen, setIsEscalaDeleteModalOpen] = useState(false);
  const [editingRepertoire, setEditingRepertoire] = useState<RepertoireItem | null>(null);
  const [deletingRepertoire, setDeletingRepertoire] = useState<RepertoireItem | null>(null);
  const [editingEscala, setEditingEscala] = useState<any>(null);
  const [deletingEscala, setDeletingEscala] = useState<any>(null);
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
  const [loadingMinisters, setLoadingMinisters] = useState(false);
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
  }, [activeMinisterioId, subView]);

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
      // Buscar membros escalados para este culto com funções "ministro" e "back"
      const fetchMinistrosForCulto = async () => {
        setLoadingMinisters(true);
        try {
          let escalaQuery = supabase
            .from('escalas')
            .select(`
              id_membros,
              funcao (
                id,
                nome_funcao
              ),
              membros (
                id,
                nome
              )
            `)
            .eq('id_culto', newRepertoire.id_culto);

          if (activeMinisterioId) {
            escalaQuery = escalaQuery.eq('ministerio_id', activeMinisterioId);
          }

          const { data: escalaData, error: escalaError } = await escalaQuery;

          if (escalaError) throw escalaError;

          // Filtrar apenas membros com funções "ministro" ou "vocal"
          const ministrosAndVocals = (escalaData || [])
            .filter(item => {
              const funcaoNome = (item.funcao as any)?.nome_funcao?.toLowerCase() || '';
              return funcaoNome.includes('ministro') || funcaoNome.includes('vocal');
            })
            .map(item => item.membros as any)
            .filter((member: any, index: number, arr: any[]) => 
              arr.findIndex(m => m.id === member.id) === index // Remove duplicados
            );

          setFilteredMembers(ministrosAndVocals);
        } catch (error) {
          logger.error('Erro ao buscar ministros para o culto:', error, 'database');
          setFilteredMembers([]);
        } finally {
          setLoadingMinisters(false);
        }
      };

      fetchMinistrosForCulto();
    } else {
      setFilteredMembers([]);
      setLoadingMinisters(false);
    }
  }, [activeMinisterioId, newRepertoire.id_culto]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // OBTER TUDO DO LOCAL STORAGE (LocalStorage-First)
      const musicasData = LocalStorageFirstService.get<any>('musicas');
      const temasData = LocalStorageFirstService.get<any>('temas');
      const repData = LocalStorageFirstService.get<any>('repertorio');
      const cultosData = LocalStorageFirstService.get<any>('cultos');
      const nomeCultosData = LocalStorageFirstService.get<any>('nome_cultos');
      const membrosData = LocalStorageFirstService.get<any>('membros');
      const membrosMinisteriosData = LocalStorageFirstService.get<any>('membros_ministerios');
      const tonsData = LocalStorageFirstService.get<any>('tons');
      const historicoData = LocalStorageFirstService.get<any>('historico_musicas');
      const escalasData = LocalStorageFirstService.get<any>('escalas');
      const funcoesData = LocalStorageFirstService.get<any>('funcao');
      const linkedMemberIdsInMinisterio = getMemberIdsForMinisterio(
        membrosMinisteriosData,
        activeMinisterioId,
        true
      );
      const activeMemberIdsInMinisterio = getMemberIdsForMinisterio(
        membrosMinisteriosData,
        activeMinisterioId,
        false
      );
      const scopedMembersData = activeMinisterioId
        ? (membrosData || []).filter((member: any) => linkedMemberIdsInMinisterio.has(member.id))
        : membrosData;
      const scopedActiveMembersData = activeMinisterioId
        ? (membrosData || []).filter(
            (member: any) => activeMemberIdsInMinisterio.has(member.id) && member.ativo !== false
          )
        : (membrosData || []).filter((member: any) => member.ativo !== false);
      const scopedEscalasData = activeMinisterioId
        ? (escalasData || []).filter((escala: any) => escala.ministerio_id === activeMinisterioId)
        : escalasData;
      const scopedCultoIds = new Set((scopedEscalasData || []).map((escala: any) => escala.id_culto));

      // 1. Format Songs
      const formattedSongs: Music[] = musicasData.map((s: any) => {
        const tema = temasData.find((t: any) => t.id === s.id_temas);
        return {
          id: s.id,
          song: s.musica,
          singer: s.cantor,
          minister: '', 
          theme: tema?.nome_tema || 'Geral',
          style: s.estilo
        };
      });
      setSongs(formattedSongs);
      setAvailableSongs(formattedSongs);

      const themes = Array.from(new Set(formattedSongs.map(s => s.theme)));
      setAvailableThemes(themes);

      // 2. Format Repertoire
      const groupedRepertoire = (activeModules.includes('music')
        ? (repData || []).filter((item: any) => scopedCultoIds.size === 0 || scopedCultoIds.has(item.id_culto))
        : []
      ).reduce((acc: any, item: any) => {
        const culto = cultosData.find((c: any) => c.id === item.id_culto);
        const musica = musicasData.find((m: any) => m.id === item.id_musicas);
        const membro = scopedMembersData.find((m: any) => m.id === item.id_membros);
        const tom = tonsData.find((t: any) => t.id === item.id_tons);
        const nomeCultoObj = nomeCultosData.find((n: any) => n.id === culto?.id_nome_cultos);
        
        const cultName = nomeCultoObj?.nome_culto || 'Culto Sem Nome';
        const cultDate = culto?.data_culto ? new Date(culto.data_culto + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem Data';
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
          song: musica?.musica || 'Sem música',
          singer: musica?.cantor || 'Sem cantor',
          minister: getDisplayName(membro, 'Sem ministro'),
          key: tom?.nome_tons || 'Ñ',
          style: musica?.estilo || 'Adoração'
        });
        
        return acc;
      }, {});
      setRepertoires(Object.values(groupedRepertoire));

      // 3. Format History
      const historyWithMusicDetails = (activeModules.includes('music') ? historicoData : [])
        .filter((h: any) => linkedMemberIdsInMinisterio.size === 0 || linkedMemberIdsInMinisterio.has(h.id_membros))
        .sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''))
        .slice(0, 50)
        .map((h: any) => {
          const musica = musicasData.find((m: any) => m.id === h.id_musica || m.musica === h.musica);
          const tema = temasData.find((t: any) => t.id === musica?.id_temas);
          const membro = scopedMembersData.find((m: any) => m.id === h.id_membros);
          const tom = tonsData.find((t: any) => t.id === h.id_tons);

          return {
            id: h.id,
            date: h.created_at ? new Date(h.created_at).toLocaleDateString('pt-BR') : 'Sem data',
            song: musica?.musica || h.musica || 'Desconhecida',
            singer: musica?.cantor || '',
            key: tom?.nome_tons || '',
            minister: getDisplayName(membro, 'Sem ministro'),
            theme: tema?.nome_tema || 'Geral',
            style: musica?.estilo || '',
            keys: []
          };
        });
      setHistory(historyWithMusicDetails);

      // 4. Format Escalas
      const formattedEscalas = (scopedEscalasData || []).map((e: any) => {
        const culto = cultosData.find((c: any) => c.id === e.id_culto);
        const nomeCultoObj = nomeCultosData.find((n: any) => n.id === culto?.id_nome_cultos);
        const membro = scopedMembersData.find((m: any) => m.id === e.id_membros);
        const funcao = funcoesData.find((f: any) => f.id === e.id_funcao);

        return {
          id: e.id,
          id_culto: e.id_culto,
          id_membros: e.id_membros,
          id_funcao: e.id_funcao,
          cultos: [{
            id: culto?.id,
            data_culto: culto?.data_culto,
            horario: culto?.horario,
            nome_cultos: [{ nome_culto: nomeCultoObj?.nome_culto }]
          }],
          membros: [{ id: membro?.id, nome: getDisplayName(membro), foto: membro?.foto, genero: membro?.genero }],
          funcao: [{ nome_funcao: funcao?.nome_funcao }]
        };
      });
      setEscalas(formattedEscalas);

      // Setup additional form data
      setAvailableMembers(scopedActiveMembersData);
      setAvailableTones(tonsData);
      setAvailableCults(cultosData.map((c: any) => ({
        ...c,
        nome_cultos: { nome_culto: nomeCultosData.find((n: any) => n.id === c.id_nome_cultos)?.nome_culto }
      })));

      // Trigger background sync
      LocalStorageFirstService.forceSync().catch(() => {});

    } catch (error) {
      logger.error('Error processing music data from cache:', error, 'database');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSong = async () => {
    if (!newSong.song || !newSong.singer || !newSong.theme) return;

    try {
      // Find theme ID in cache
      const temasData = LocalStorageFirstService.get<any>('temas');
      const tema = temasData.find((t: any) => t.nome_tema === newSong.theme);
      let themeId = tema?.id;

      if (themeId) {
        LocalStorageFirstService.add('musicas', {
          musica: newSong.song,
          cantor: newSong.singer,
          estilo: newSong.style,
          id_temas: themeId
        });

        setIsSongModalOpen(false);
        setNewSong({ song: '', singer: '', theme: '', style: 'Adoração' });
        fetchData(); // Reload list from local cache
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

      LocalStorageFirstService.add('repertorio', {
        id_culto: newRepertoire.id_culto,
        id_musicas: newRepertoire.id_musicas,
        id_membros: newRepertoire.id_membros,
        id_tons: newRepertoire.id_tons
      });

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

      LocalStorageFirstService.update('repertorio', item.id, {
        id_culto: item.id_culto,
        id_musicas: item.id_musicas,
        id_membros: item.id_membros,
        id_tons: item.id_tons
      });

      setEditingRepertoire(null);
      fetchData();
    } catch (err) {
      logger.error('Error editing repertoire:', err, 'database');
      showError('Erro ao editar repertório.');
    }
  };

  const handleDeleteRepertoire = (item: RepertoireItem) => {
    setDeletingRepertoire(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteRepertoire = async () => {
    if (!deletingRepertoire) return;

    try {
      LocalStorageFirstService.remove('repertorio', deletingRepertoire.id);
      setIsDeleteModalOpen(false);
      setDeletingRepertoire(null);
      fetchData();
    } catch (err) {
      logger.error('Error deleting repertoire:', err, 'database');
      showError('Erro ao excluir repertório.');
    }
  };

  // Funções para escalas
  const openEditEscalaModal = (item: any) => {
    setEditingEscala(item);
    // TODO: Implementar modal de edição de escala
    console.log('Editar escala:', item);
  };

  const handleDeleteEscala = (item: any) => {
    setDeletingEscala(item);
    setIsEscalaDeleteModalOpen(true);
  };

  const confirmDeleteEscala = async () => {
    if (!deletingEscala) return;

    try {
      let query = supabase
        .from('escalas')
        .delete()
        .eq('id', deletingEscala.id);

      if (activeMinisterioId) {
        query = query.eq('ministerio_id', activeMinisterioId);
      }

      const { error } = await query;

      if (error) throw error;

      setIsEscalaDeleteModalOpen(false);
      setDeletingEscala(null);
      fetchData();
    } catch (err) {
      logger.error('Error deleting escala:', err, 'database');
      showError('Erro ao excluir escala.');
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

  if (!activeModules.includes('music')) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <i className="fas fa-music-slash text-slate-400" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Este ministerio nao possui o modulo de musicas ativo
        </p>
      </div>
    );
  }

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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ left: '256px' }}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" style={{ left: '-256px' }} onClick={() => setIsSongModalOpen(false)}></div>
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
                className="px-4 sm:px-8 py-4 sm:py-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 cursor-pointer group hover:bg-brand/5 dark:hover:bg-brand/10 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
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
                <div className="px-8 pb-8 space-y-6 pt-6 animate-fade-in bg-slate-50/30 dark:bg-slate-800/20">
                  {Object.entries(styles).map(([style, sList]: [string, Music[]]) => {
                    const styleKey = `${theme}-${style}`;
                    return (
                      <div key={styleKey} className="bg-white dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
                        {/* Nível Estilo - Melhorado */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full shadow-lg ${style === 'Adoração' ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
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
                    <div key={item.id} className="p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700 relative">
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="w-6 h-6 bg-blue-500 text-white rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                          title="Editar"
                        >
                          <i className="fas fa-edit text-[10px]"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteRepertoire(item)}
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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ left: '256px' }}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" style={{ left: '-256px' }} onClick={() => setIsRepertoireModalOpen(false)}></div>
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
                    <div className="relative">
                      <select 
                        value={newRepertoire.id_membros} 
                        onChange={e => setNewRepertoire({ ...newRepertoire, id_membros: e.target.value, minister: getDisplayName(filteredMembers.find(m => m.id === e.target.value)) })} 
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand appearance-none"
                        disabled={!newRepertoire.id_culto || loadingMinisters}
                      >
                        <option value="">
                          {loadingMinisters ? 'Buscando ministros...' : 
                           newRepertoire.id_culto ? 'Selecione um ministro...' : 'Selecione um culto primeiro...'}
                        </option>
                        {filteredMembers.map(member => (
                          <option key={member.id} value={member.id}>
                            {getDisplayName(member)}
                          </option>
                        ))}
                      </select>
                      {loadingMinisters && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      {!loadingMinisters && newRepertoire.id_culto && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <i className="fas fa-chevron-down text-slate-400 text-xs"></i>
                        </div>
                      )}
                    </div>
                    {newRepertoire.id_culto && !loadingMinisters && filteredMembers.length === 0 && (
                      <p className="text-[9px] text-amber-600 mt-1">Nenhum ministro/vocal encontrado para este culto</p>
                    )}
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

        {/* Modal de Confirmação de Exclusão */}
        {isDeleteModalOpen && deletingRepertoire && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ left: '256px' }}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" style={{ left: '-256px' }} onClick={() => setIsDeleteModalOpen(false)}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl animate-fade-in border border-slate-100 dark:border-slate-800">
              {/* Ícone de Alerta */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-2xl"></i>
                </div>
              </div>
              
              {/* Título e Descrição */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-3">
                  Excluir Item do Repertório
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Tem certeza que deseja excluir permanentemente esta música do repertório?
                </p>
                
                {/* Card com informações da música */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center font-black text-[8px] shrink-0">
                      {deletingRepertoire.key || 'Ñ'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase truncate">
                        {deletingRepertoire.song} - {deletingRepertoire.singer}
                      </h4>
                      {deletingRepertoire.minister && (
                        <p className="text-[9px] font-bold text-slate-400 uppercase">
                          Ministro: <span className="text-brand">{deletingRepertoire.minister}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Botões de Ação */}
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingRepertoire(null);
                  }} 
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <i className="fas fa-times mr-2"></i>
                  Cancelar
                </button>
                <button 
                  onClick={confirmDeleteRepertoire}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg hover:bg-red-700 transition-colors"
                >
                  <i className="fas fa-trash mr-2"></i>
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão de Escala */}
        {isEscalaDeleteModalOpen && deletingEscala && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ left: '256px' }}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" style={{ left: '-256px' }} onClick={() => setIsEscalaDeleteModalOpen(false)}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl animate-fade-in border border-slate-100 dark:border-slate-800">
              {/* Ícone de Alerta */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-2xl"></i>
                </div>
              </div>
              
              {/* Título e Descrição */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-3">
                  Excluir Membro da Escala
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Tem certeza que deseja excluir permanentemente este membro da escala?
                </p>
                
                {/* Card com informações do membro */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center font-black text-[8px] shrink-0">
                      {getDisplayName(deletingEscala.membros?.[0], 'M').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase truncate">
                        {getDisplayName(deletingEscala.membros?.[0], 'Sem Nome')}
                      </h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">
                        Função: <span className="text-brand">{deletingEscala.funcao?.[0]?.nome_funcao || 'Membro'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Botões de Ação */}
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setIsEscalaDeleteModalOpen(false);
                    setDeletingEscala(null);
                  }} 
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <i className="fas fa-times mr-2"></i>
                  Cancelar
                </button>
                <button 
                  onClick={confirmDeleteEscala}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg hover:bg-red-700 transition-colors"
                >
                  <i className="fas fa-trash mr-2"></i>
                  Excluir
                </button>
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
        memberName: getDisplayName(escala.membros?.[0], 'Sem Nome'),
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
                      <div key={item.id} className="p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700 relative">
                        <div className="absolute top-2 right-2 flex gap-1 z-50">
                          <button
                            onClick={() => openEditEscalaModal(item)}
                            className="w-6 h-6 bg-blue-500/90 text-white rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors shadow-md backdrop-blur-sm"
                            title="Editar"
                          >
                            <i className="fas fa-edit text-[10px]"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteEscala(item)}
                            className="w-6 h-6 bg-red-500/90 text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors shadow-md backdrop-blur-sm"
                            title="Excluir"
                          >
                            <i className="fas fa-trash text-[10px]"></i>
                          </button>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center font-black text-[8px] shrink-0">
                            {getDisplayName(item.membros?.[0], 'M').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate mb-1">{getDisplayName(item.membros?.[0], 'Sem Nome')}</h5>
                            <p className="text-[9px] font-bold text-slate-400 uppercase truncate">
                              FUNÇÃO: <span className="text-brand">{item.funcao?.[0]?.nome_funcao || 'Membro'}</span>
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          <a href={getLink('youtube', getDisplayName(item.membros?.[0]), item.funcao?.[0]?.nome_funcao || '')} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-red-600 hover:bg-red-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Youtube"><i className="fab fa-youtube text-[10px]"></i></a>
                          <a href={getLink('spotify', getDisplayName(item.membros?.[0]), item.funcao?.[0]?.nome_funcao || '')} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-emerald-500 hover:bg-emerald-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Spotify"><i className="fab fa-spotify text-[10px]"></i></a>
                          <a href={getLink('lyrics', getDisplayName(item.membros?.[0]), item.funcao?.[0]?.nome_funcao || '')} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-blue-500 hover:bg-blue-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Letra"><i className="fas fa-align-left text-[9px]"></i></a>
                          <a href={getLink('chords', getDisplayName(item.membros?.[0]), item.funcao?.[0]?.nome_funcao || '')} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-amber-500 hover:bg-amber-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Cifra"><i className="fas fa-guitar text-[9px]"></i></a>
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
