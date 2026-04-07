import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { logger } from '../utils/logger';
import { Member, ViewType, ScheduleEvent, SongHistoryItem } from '../types';
import { ChartInstance, SolicitacaoAprovacao, Funcao } from '../types-supabase';

interface UseTeamDataProps {
  currentView: ViewType;
}

import LocalStorageFirstService from '../services/LocalStorageFirstService';

interface UseTeamDataProps {
  currentView: ViewType;
}

export const useTeamData = ({ currentView }: UseTeamDataProps) => {
  // Estados principais
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingEvent, setViewingEvent] = useState<ScheduleEvent | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Refs para gráficos
  const genderChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartInstance | null>(null);

  // Mock de eventos para navegação
  const allEvents: ScheduleEvent[] = [];

  // Monitora modais para travar scroll
  useEffect(() => {
    if (selectedMember || viewingEvent || editingMember) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [selectedMember, viewingEvent, editingMember]);

  // Fetch principal de membros
  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      // OBTER TUDO DO LOCAL STORAGE (LocalStorage-First)
      const membrosData = LocalStorageFirstService.get<any>('membros');
      const mfData = LocalStorageFirstService.get<any>('membros_funcoes');
      const funcoesData = LocalStorageFirstService.get<any>('funcao');
      const escalasData = LocalStorageFirstService.get<any>('escalas');
      const cultosData = LocalStorageFirstService.get<any>('cultos');
      const nomeCultosData = LocalStorageFirstService.get<any>('nome_cultos');
      const historicoData = LocalStorageFirstService.get<any>('historico_musicas');
      const musicasData = LocalStorageFirstService.get<any>('musicas');
      const tonsData = LocalStorageFirstService.get<any>('tons');

      // Buscar o usuário logado para display name
      const { data: { user } } = await supabase.auth.getUser();

      const mappedMembers: Member[] = membrosData.map((m: any) => {
        // Local Join: funções
        const mFuncoesIds = mfData
          .filter((mf: any) => mf.id_membro === m.id)
          .map((mf: any) => mf.id_funcao);
        
        const mFuncoesNomes = funcoesData
          .filter((f: any) => mFuncoesIds.includes(f.id))
          .map((f: any) => f.nome_funcao);

        // Local Join: Próximas Escalas
        const today = new Date().toISOString().split('T')[0];
        const mEscalas = escalasData
          .filter((e: any) => e.id_membros === m.id)
          .map((e: any) => {
            const culto = cultosData.find((c: any) => c.id === e.id_culto);
            if (!culto || culto.data_culto < today) return null;
            
            const nomeCulto = nomeCultosData.find((n: any) => n.id === culto.id_nome_cultos)?.nome_culto || 'Culto';
            const funcao = funcoesData.find((f: any) => f.id === e.id_funcao)?.nome_funcao || 'Sem função';

            return {
              id: e.id_culto,
              date: new Date(culto.data_culto + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
              event: nomeCulto,
              role: funcao,
              time: culto.horario,
              rawDate: culto.data_culto
            };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => a.rawDate.localeCompare(b.rawDate))
          .slice(0, 5);

        // Agrupar por culto (mesma data/evento mas funções diferentes)
        const groupedScales = mEscalas.reduce((acc: any, scale: any) => {
          if (!acc[scale.id]) {
            acc[scale.id] = { ...scale, roles: [scale.role] };
          } else {
            acc[scale.id].roles.push(scale.role);
          }
          return acc;
        }, {});

        const finalScales = Object.values(groupedScales).map((s: any) => ({
          ...s,
          role: s.roles.join(', ')
        }));

        // Local Join: Histórico de Músicas
        const mHistorico = historicoData
          .filter((h: any) => h.id_membros === m.id)
          .sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''))
          .slice(0, 5)
          .map((h: any) => {
            const musica = musicasData.find((mus: any) => mus.id === h.id_musica);
            const tom = tonsData.find((t: any) => t.id === h.id_tons)?.nome_tons || 'Ñ';
            
            return {
              id: h.id,
              song: musica ? `${musica.musica} - ${musica.cantor}` : (h.musica || 'Sem música'),
              singer: musica?.cantor || '',
              key: tom,
              date: h.created_at ? new Date(h.created_at).toLocaleDateString('pt-BR') : 'Sem data',
              event: 'Culto'
            };
          });

        let displayName = m.nome;
        if (user && m.id === user.id) {
          displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || m.nome;
        }

        return {
          id: m.id,
          name: displayName,
          role: mFuncoesNomes.length > 0 ? mFuncoesNomes.join(', ') : 'Sem função',
          gender: m.genero === 'Homem' ? 'M' : 'F',
          status: m.ativo ? 'confirmed' : 'absent',
          avatar: m.foto || (m.genero === 'Homem'
            ? 'https://img.freepik.com/fotos-gratis/homem-bonito-sorrindo-no-fundo-branco_23-2148213426.jpg'
            : 'https://img.freepik.com/fotos-gratis/jovem-mulher-bonita-com-exibicao-natural-de-maquiagem_23-2148810238.jpg'),
          telefone: m.telefone,
          email: m.email,
          data_nasc: m.data_nasc,
          upcomingScales: finalScales as any[],
          songHistory: mHistorico
        };
      });

      setMembers(mappedMembers);
      
      // Iniciar sincronização em background se necessário
      LocalStorageFirstService.forceSync('membros').catch(() => {});
      
    } catch (error) {
      logger.error('Erro ao buscar membros no cache/local:', error, 'database');
    } finally {
      setLoading(false);
    }
  };

  // Buscar próximas escalas do membro
  const fetchMemberUpcomingScales = async (memberId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: escalasData, error: escalasError } = await supabase
        .from('escalas')
        .select(`
          id,
          id_culto,
          id_funcao,
          cultos!inner(
            id,
            data_culto,
            horario,
            nome_cultos(nome_culto)
          ),
          funcao(nome_funcao)
        `)
        .eq('id_membros', memberId)
        .gte('cultos.data_culto', today)
        .limit(5);

      if (escalasError) throw escalasError;

      const sortedData = escalasData?.sort((a: any, b: any) => 
        new Date(a.cultos?.data_culto).getTime() - new Date(b.cultos?.data_culto).getTime()
      ) || [];

      const mappedData = sortedData.map((scale: any) => ({
        id_culto: scale.id_culto,
        date: new Date(scale.cultos?.data_culto).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        event: scale.cultos?.nome_cultos?.nome_culto || 'Culto',
        role: scale.funcao?.nome_funcao || 'Sem função',
        time: scale.cultos?.horario
      }));

      const groupedScales = mappedData.reduce((acc: any, scale: any) => {
        const key = scale.id_culto;
        if (!acc[key]) {
          acc[key] = {
            id: scale.id_culto,
            date: scale.date,
            event: scale.event,
            time: scale.time,
            roles: []
          };
        }
        acc[key].roles.push(scale.role);
        return acc;
      }, {});

      return Object.values(groupedScales).map((scale: any) => ({
        id: scale.id,
        date: scale.date,
        event: scale.event,
        role: scale.roles.join(', '),
        time: scale.time
      }));
    } catch (error) {
      logger.error('Erro ao buscar escalas do membro:', error, 'database');
      return [];
    }
  };

  // Buscar histórico de músicas do membro
  const fetchMemberSongHistory = async (memberId: string) => {
    try {
      const { data: musicasData, error: musicasError } = await supabase
        .from('historico_musicas')
        .select(`
          id,
          id_musica,
          id_tons,
          created_at,
          musicas(musica, cantor),
          tons(nome_tons)
        `)
        .eq('id_membros', memberId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (musicasError) throw musicasError;

      return (musicasData || []).map((song: any) => {
        const musica = song.musicas?.musica || 'Sem música';
        const cantor = song.musicas?.cantor || 'Sem cantor';
        const songDisplay = cantor !== 'Sem cantor' ? `${musica} - ${cantor}` : musica;
        
        return {
          id: song.id,
          song: songDisplay,
          singer: cantor,
          key: song.tons?.nome_tons || 'Ñ',
          date: new Date(song.created_at).toLocaleDateString('pt-BR'),
          event: 'Culto'
        };
      });
    } catch (error) {
      logger.error('Erro ao buscar histórico de músicas:', error, 'database');
      return [];
    }
  };

  // Realtime Subscription
  useEffect(() => {
    const channels = supabase.channel('team-view-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'membros' },
        () => fetchMembers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channels);
    };
  }, []);

  // useEffect principal
  useEffect(() => {
    fetchMembers();
  }, [currentView]);

  return {
    // Estados
    selectedMember,
    editingMember,
    viewingEvent,
    activeFilter,
    members,
    loading,
    genderChartRef,
    chartInstance,
    allEvents,
    
    // Funções
    setSelectedMember,
    setEditingMember,
    setViewingEvent,
    setActiveFilter,
    setMembers,
    
    // Funções de fetch
    fetchMembers,
    fetchMemberUpcomingScales,
    fetchMemberSongHistory
  };
};
