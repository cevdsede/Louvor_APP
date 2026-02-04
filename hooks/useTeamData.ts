import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { logger } from '../utils/logger';
import { Member, ViewType, ScheduleEvent, SongHistoryItem } from '../types';
import { ChartInstance, SolicitacaoAprovacao, Funcao } from '../types-supabase';

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

  // Estados para Aprovações
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAprovacao[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [loadingAprovacoes, setLoadingAprovacoes] = useState(false);
  const [funcoesSelecionadas, setFuncoesSelecionadas] = useState<Record<string, string[]>>({});

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
      
      // Primeiro, buscar todos os membros da tabela membros
      const { data: membrosData, error: membrosError } = await supabase
        .from('membros')
        .select(`
          *,
          membros_funcoes(
            funcao(id, nome_funcao)
          )
        `)
        .order('nome');

      if (membrosError) throw membrosError;

      if (membrosData) {
        // Buscar o usuário logado para ter acesso aos metadados
        const { data: { user } } = await supabase.auth.getUser();
        
        // Criar mapa de user_id para display_name
        const userDisplayNames = new Map();
        
        // Para cada membro, vamos tentar buscar os metadados individualmente
        // usando uma abordagem mais segura
        for (const m of membrosData) {
          let displayName = m.nome; // fallback padrão
          
          // Se for o usuário logado, podemos usar seus metadados diretamente
          if (user && m.id === user.id) {
            displayName = user.user_metadata?.display_name || 
                        user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        user.email?.split('@')[0] || 
                        m.nome;
          }
          
          userDisplayNames.set(m.id, displayName);
        }

        const mappedMembers: Member[] = await Promise.all(membrosData.map(async (m) => {
          // Extrair funções da tabela relacionada
          const funcoes = m.membros_funcoes?.map((mf: any) => mf.funcao?.nome_funcao).filter(Boolean) || [];
          
          // Buscar próximas escalas do membro
          const upcomingScales = await fetchMemberUpcomingScales(m.id);
          
          // Buscar histórico de músicas do membro
          const songHistory = await fetchMemberSongHistory(m.id);
          
          // Usar display_name (com fallback para nome da tabela)
          const displayName = userDisplayNames.get(m.id) || m.nome;
          
          return {
            id: m.id,
            name: displayName,
            role: funcoes.length > 0 ? funcoes.join(', ') : 'Sem função',
            gender: m.genero === 'Homem' ? 'M' : 'F',
            status: m.ativo ? 'confirmed' : 'absent',
            avatar: m.foto || (m.genero === 'Homem'
              ? 'https://img.freepik.com/fotos-gratis/homem-bonito-sorrindo-no-fundo-branco_23-2148213426.jpg'
              : 'https://img.freepik.com/fotos-gratis/jovem-mulher-bonita-com-exibicao-natural-de-maquiagem_23-2148810238.jpg'),
            telefone: m.telefone,
            email: m.email,
            data_nasc: m.data_nasc,
            upcomingScales: upcomingScales,
            songHistory: songHistory
          };
        }));
        setMembers(mappedMembers);
      }
    } catch (error) {
      logger.error('Erro ao buscar membros:', error, 'database');
    } finally {
      setLoading(false);
    }
  };

  // Funções para Aprovações
  const fetchFuncoes = async () => {
    try {
      const { data, error } = await supabase
        .from('funcao')
        .select('id, nome_funcao')
        .order('nome_funcao');

      if (error) throw error;
      setFuncoes(data || []);
    } catch (error) {
      logger.error('Erro ao buscar funções:', error, 'database');
    }
  };

  const fetchSolicitacoes = async () => {
    try {
      setLoadingAprovacoes(true);
      const { data, error } = await supabase
        .from('solicitacoes_membro')
        .select(`
          id,
          user_id,
          status,
          created_at,
          membros(id, nome, email, foto, genero)
        `)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSolicitacoes(data || []);
      
      // Inicializar funções selecionadas para cada solicitação
      const inicialFuncoes: Record<string, string[]> = {};
      data?.forEach(solicitacao => {
        inicialFuncoes[solicitacao.id] = [];
      });
      setFuncoesSelecionadas(inicialFuncoes);
    } catch (error) {
      logger.error('Erro ao buscar solicitações:', error, 'database');
    } finally {
      setLoadingAprovacoes(false);
    }
  };

  const aprovarMembro = async (userId: string, funcoesIds: string[]) => {
    try {
      const { data, error } = await supabase.rpc('aprovar_membro', {
        user_id: userId,
        ids_selecionados: funcoesIds
      });

      if (error) throw error;

      // Atualizar status da solicitação
      await supabase
        .from('solicitacoes_membro')
        .update({ status: 'aprovado' })
        .eq('user_id', userId);

      // Recarregar solicitações
      await fetchSolicitacoes();
      
      // Recarregar membros para incluir o novo membro
      await fetchMembers();
      
      return { success: true };
    } catch (error) {
      logger.error('Erro ao aprovar membro:', error, 'database');
      return { success: false, error };
    }
  };

  const handleFuncoesChange = (solicitacaoId: string, funcoesIds: string[]) => {
    setFuncoesSelecionadas(prev => ({
      ...prev,
      [solicitacaoId]: funcoesIds
    }));
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
    if (currentView === 'approvals') {
      fetchFuncoes();
      fetchSolicitacoes();
    }
  }, [currentView]);

  return {
    // Estados
    selectedMember,
    editingMember,
    viewingEvent,
    activeFilter,
    members,
    loading,
    solicitacoes,
    funcoes,
    loadingAprovacoes,
    funcoesSelecionadas,
    genderChartRef,
    chartInstance,
    allEvents,
    
    // Funções
    setSelectedMember,
    setEditingMember,
    setViewingEvent,
    setActiveFilter,
    setMembers,
    aprovarMembro,
    handleFuncoesChange,
    
    // Funções de fetch
    fetchMembers,
    fetchFuncoes,
    fetchSolicitacoes,
    fetchMemberUpcomingScales,
    fetchMemberSongHistory
  };
};
