import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ScheduleEvent, Member, RepertoireItem } from '../../types';
import { Song, SupabaseCulto, SupabaseEscala, SupabaseRepertorio, SupabaseAviso, CultoComRelacionamentos } from '../../types-supabase';
import { showSuccess, showError, showWarning } from '../../utils/toast';
import { logger } from '../../utils/logger';
import { useMinistryContext } from '../../contexts/MinistryContext';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import ModalUtils from '../../utils/modalUtils';

// Import new components
import EventCard from './EventCard';
import RepertoireManager from './RepertoireManager';
import NoticeManager from './NoticeManager';
import TeamManager from './TeamManager';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';

interface ListViewProps {
  onReportAbsence: (id: string) => void;
}

type SubTab = 'team' | 'repertoire' | 'notices';

interface Notice {
  id: string;
  sender: string;
  text: string;
  time: string;
}

interface NomeCulto {
  id: string;
  nome_culto: string;
}


const ListView: React.FC<ListViewProps> = ({ onReportAbsence }) => {
  const {
    activeMinisterioId,
    activeModules,
    canManageCurrentMinisterio,
    currentMember,
    isGlobalAdminOrLeader,
    memberships
  } = useMinistryContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, SubTab>>({});
  const [showScaleModal, setShowScaleModal] = useState<{ mode: 'add' | 'edit', eventId?: string } | null>(null);

  // User logged state - exige membro válido
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMember, setIsMember] = useState<boolean>(false);
  const [isAdminOrLeader, setIsAdminOrLeader] = useState<boolean>(false);

  // Usar localStorage-first para todos os dados
  const { data: cultosRaw } = useLocalStorageFirst<any>({ table: 'cultos' });
  const { data: membrosRaw } = useLocalStorageFirst<any>({ table: 'membros' });
  const { data: membrosMinisteriosRaw } = useLocalStorageFirst<any>({ table: 'membros_ministerios' });
  const { data: escalasRaw } = useLocalStorageFirst<any>({ table: 'escalas' });
  const { data: musicasRaw } = useLocalStorageFirst<any>({ table: 'musicas' });
  const { data: tonsRaw } = useLocalStorageFirst<any>({ table: 'tons' });
  const { data: nomeCultosRaw } = useLocalStorageFirst<any>({ table: 'nome_cultos' });
  const { data: avisosRaw } = useLocalStorageFirst<any>({ table: 'avisos_cultos' });
  const { data: funcoesRaw } = useLocalStorageFirst<any>({ table: 'funcao' });
  const [loading, setLoading] = useState(true);
  const memberIdsInMinisterio = new Set(
    (membrosMinisteriosRaw || [])
      .filter((membership: any) => membership.ministerio_id === activeMinisterioId && membership.ativo !== false)
      .map((membership: any) => membership.membro_id)
  );
  const scopedMembros = activeMinisterioId
    ? (membrosRaw || []).filter((member: any) => memberIdsInMinisterio.has(member.id))
    : membrosRaw;
  const scopedEscalas = activeMinisterioId
    ? (escalasRaw || []).filter((escala: any) => escala.ministerio_id === activeMinisterioId)
    : escalasRaw;
  const scopedAvisos = activeMinisterioId
    ? (avisosRaw || []).filter((aviso: any) => aviso.ministerio_id === activeMinisterioId)
    : avisosRaw;
  const scopedFuncoes = activeMinisterioId
    ? (funcoesRaw || []).filter((funcao: any) => funcao.ministerio_id === activeMinisterioId)
    : funcoesRaw;

  // Data states
  const [allRegisteredMembers, setAllRegisteredMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ScheduleEvent[]>([]);
  const [eventNotices, setEventNotices] = useState<Record<string, Notice[]>>({});
  const [cultoTypes, setCultoTypes] = useState<NomeCulto[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [tones, setTones] = useState<string[]>([]);
  const [scaleFormData, setScaleFormData] = useState({ title: '', date: '', time: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // Trava scroll quando o modal de escala está aberto
  useEffect(() => {
    if (showScaleModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [showScaleModal]);

  // Filtrar eventos baseado no termo de pesquisa
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEvents(events);
    } else {
      const filtered = events.filter(event => {
        const searchLower = searchTerm.toLowerCase();
        return (
          event.title.toLowerCase().includes(searchLower) ||
          event.date.toLowerCase().includes(searchLower) ||
          event.dayOfWeek.toLowerCase().includes(searchLower) ||
          event.time.toLowerCase().includes(searchLower) ||
          event.members.some(member => 
            member.name.toLowerCase().includes(searchLower) ||
            member.role.toLowerCase().includes(searchLower)
          ) ||
          event.repertoire.some(song => 
            song.musica?.toLowerCase().includes(searchLower) ||
            song.cantor?.toLowerCase().includes(searchLower)
          )
        );
      });
      setFilteredEvents(filtered);
    }
  }, [events, searchTerm]);

  // Buscar usuário logado de forma resiliente (Offline-First)
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        let userEmail: string | undefined;

        // 1. Tentar pegar email do cache primeiro (rápido e offline-safe)
        const savedSession = localStorage.getItem('supabase_session_cache');
        if (savedSession) {
          const session = JSON.parse(savedSession);
          userEmail = session.user?.email;
        }

        // 2. Se estiver online e não tiver email, tentar Supabase
        if (!userEmail && navigator.onLine) {
          const { data: { user } } = await supabase.auth.getUser();
          userEmail = user?.email;
        }

        if (userEmail && membrosRaw) {
          // Verificar se é membro válido usando o cache local de membros
          const memberData = membrosRaw.find((m: any) => m.email?.toLowerCase() === userEmail?.toLowerCase());
          
          if (memberData) {
            setCurrentUser({ id: memberData.id, name: memberData.nome });
            const isAdmin = memberData.perfil && (
              memberData.perfil.toLowerCase().includes('admin') || 
              memberData.perfil.toLowerCase().includes('líder') ||
              memberData.perfil.toLowerCase().includes('lider')
            );
            setIsAdminOrLeader(isAdmin);
            setIsMember(true);
            logger.auth('ListView - Usuário autenticado:', { email: userEmail, perfil: memberData.perfil, isMember: true, isAdminOrLeader: isAdmin });
          } else {
            setCurrentUser(null);
            setIsMember(false);
            setIsAdminOrLeader(false);
            logger.auth('ListView - Membro não encontrado pelo email:', { email: userEmail });
          }
        } else if (!userEmail) {
          setCurrentUser(null);
          setIsMember(false);
          setIsAdminOrLeader(false);
        }
      } catch (error) {
        logger.error('Erro ao buscar usuário:', error, 'auth');
        setCurrentUser(null);
        setIsMember(false);
        setIsAdminOrLeader(false);
      }
    };

    getCurrentUser();

    // Escutar mudanças na autenticação apenas se online
    if (!navigator.onLine) {
      console.log('📶 Offline: Pulando listener de auth em ListView.');
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        getCurrentUser();
      } else {
        setCurrentUser(null);
        setIsMember(false);
        setIsAdminOrLeader(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const canAccessCurrentMinisterio =
      Boolean(currentMember) &&
      (isGlobalAdminOrLeader || memberships.some((membership) => membership.ministerio_id === activeMinisterioId));

    if (currentMember) {
      setCurrentUser({ id: currentMember.id, name: currentMember.nome });
    } else {
      setCurrentUser(null);
    }

    setIsMember(canAccessCurrentMinisterio);
    setIsAdminOrLeader(isGlobalAdminOrLeader || canManageCurrentMinisterio);
  }, [activeMinisterioId, canManageCurrentMinisterio, currentMember, isGlobalAdminOrLeader, memberships]);

  // Processamento e Join Local dos dados
  // Função para agrupar membros com múltiplas funções
  const groupMembersByPerson = (escalas: any[]) => {
    const memberMap = new Map();
    
    escalas.forEach(escala => {
      const memberId = escala.membros?.id;
      const memberName = escala.membros?.nome;
      const memberRole = escala.funcao?.nome_funcao;
      const roleId = escala.funcao?.id;
      
      if (memberId && memberName) {
        if (!memberMap.has(memberId)) {
          memberMap.set(memberId, {
            id: memberId,
            name: memberName,
            gender: escala.membros?.genero === 'Homem' ? 'M' : 'F',
            avatar: escala.membros?.foto || `https://ui-avatars.com/api/?name=${memberName}&background=random`,
            status: 'confirmed',
            upcomingScales: [],
            songHistory: [],
            roles: [],
            roleIds: []
          });
        }
        
        const member = memberMap.get(memberId);
        if (memberRole && !member.roles.includes(memberRole)) {
          member.roles.push(memberRole);
          member.roleIds.push(roleId);
        }
      }
    });
    
    // Ordenar funções por ID e criar string de funções
    return Array.from(memberMap.values()).map(member => {
      // Ordenar roles pelos IDs correspondentes
      const sortedRoles = member.roleIds
        .map((id: number, index: number) => ({ id, role: member.roles[index] }))
        .sort((a: any, b: any) => a.id - b.id)
        .map((item: any) => item.role);
      
      return {
        ...member,
        role: sortedRoles.join(' / '), // Usar " / " como separador
        roles: sortedRoles,
        roleIds: member.roleIds
      };
    });
  };
  useEffect(() => {
    if (!cultosRaw || !membrosRaw || !escalasRaw) return;
    
    setLoading(true);

    // 1. Membros
    const mappedMembers: Member[] = (scopedMembros || []).filter((m: any) => m.ativo).map((m: any) => ({
      id: m.id,
      name: m.nome,
      role: 'Membro',
      gender: m.genero === 'Homem' ? 'M' : 'F',
      status: m.ativo ? 'confirmed' : 'absent',
      avatar: m.foto,
      upcomingScales: [],
      songHistory: []
    }));
    setAllRegisteredMembers(mappedMembers);

    // 2. Tipos de Culto
    setCultoTypes(nomeCultosRaw);

    // 3. Músicas e Tons
    setAllSongs(activeModules.includes('music') ? musicasRaw : []);
    setTones(tonsRaw.map((t: any) => t.nome_tons).filter(Boolean));

    // 4. Avisos (Notices)
    const noticesByEvent: Record<string, Notice[]> = {};
    (scopedAvisos || []).forEach((n: any) => {
      if (!n.id_cultos) return;
      if (!noticesByEvent[n.id_cultos]) noticesByEvent[n.id_cultos] = [];
      
      const membro = (scopedMembros || []).find((m: any) => m.id === n.id_membros);
      
      noticesByEvent[n.id_cultos].push({
        id: n.id_lembrete,
        sender: membro?.nome || 'Admin',
        text: n.info || 'Sem texto',
        time: n.created_at ? new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''
      });
    });
    setEventNotices(noticesByEvent);

    // 5. Eventos e Escalas (O Join Principal)
    const today = new Date().toISOString().split('T')[0];
    const mappedEvents: ScheduleEvent[] = cultosRaw
      .filter((c: any) => c.data_culto >= today)
      .sort((a: any, b: any) => a.data_culto.localeCompare(b.data_culto))
      .map((c: any) => {
        const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
        const dateObj = new Date(c.data_culto + 'T12:00:00');
        const dayOfWeek = weekDays[dateObj.getUTCDay()];
        const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        // Local Join: Escalas
        const cEscalas = (scopedEscalas || []).filter((e: any) => e.id_culto === c.id);
        const eventMembrosRaw = cEscalas.map((e: any) => {
          const membro = (scopedMembros || []).find((m: any) => m.id === e.id_membros);
          const funcao = (scopedFuncoes || []).find((f: any) => f.id === e.id_funcao);
          return {
            membros: membro,
            funcao: funcao
          };
        });

        // Agrupar membros com múltiplas funções (usando a função existente)
        const groupedMembers = groupMembersByPerson(eventMembrosRaw);

        // Local Join: Repertório
        const cRepertorio = musicasRaw.filter((m: any) => false); // Placeholder logic if repertorio is separate
        // Wait, repertorio has its own table. Let's get it too.
        // I'll add repertorioRaw below.

        return {
          id: c.id,
          title: nomeCultosRaw.find((n: any) => n.id === c.id_nome_cultos)?.nome_culto || 'CULTO',
          date: formattedDate,
          dayOfWeek: dayOfWeek,
          time: c.horario ? c.horario.substring(0, 5) : '19:00',
          members: groupedMembers,
          repertoire: [] // Will pull from repertorioRaw
        };
      });

    // We need repertorioRaw for the join
    setEvents(mappedEvents);
    setLoading(false);
  }, [activeModules, cultosRaw, scopedAvisos, scopedEscalas, scopedFuncoes, scopedMembros, musicasRaw, nomeCultosRaw, tonsRaw, activeMinisterioId]);

  // Adicionando Repertório ao Join
  const { data: repertorioRaw } = useLocalStorageFirst<any>({ table: 'repertorio' });

  useEffect(() => {
    if (!repertorioRaw) return;

    setEvents((currentEvents) =>
      currentEvents.map((event) => {
        if (!activeModules.includes('music')) {
          return { ...event, repertoire: [] };
        }

        const cRep = repertorioRaw
          .filter((r: any) => r.id_culto === event.id)
          .map((r: any) => {
            const musica = musicasRaw.find((m: any) => m.id === r.id_musicas);
            const membro = (scopedMembros || []).find((m: any) => m.id === r.id_membros);
            const tom = tonsRaw.find((t: any) => t.id === r.id_tons);
            return {
              id: r.id,
              musica: musica?.musica,
              cantor: musica?.cantor,
              key: tom?.nome_tons || '',
              minister: membro?.nome || ''
            };
          });

        return { ...event, repertoire: cRep };
      })
    );
  }, [activeModules, musicasRaw, repertorioRaw, scopedMembros, tonsRaw, activeMinisterioId]);

  // Função para salvar escala usando o service
  const handleSaveScale = async () => {
    if (!scaleFormData.title || !scaleFormData.date) return;

    try {
      let nomeCultoId = cultoTypes.find(c => c.nome_culto.toUpperCase() === scaleFormData.title.toUpperCase())?.id;

      if (!nomeCultoId) {
        // No offline-first complexo, criaríamos o nome_culto localmente também.
        // Por simplicidade, vamos apenas usar o ID existente se houver.
        showWarning("Tipo de culto novo. Conecte-se para criar novos tipos.");
        if (!nomeCultoId) return;
      }

      if (showScaleModal?.mode === 'add') {
        LocalStorageFirstService.add('cultos', {
          data_culto: scaleFormData.date,
          horario: scaleFormData.time || '19:00:00',
          id_nome_cultos: nomeCultoId
        });
      } else if (showScaleModal?.mode === 'edit' && showScaleModal.eventId) {
        LocalStorageFirstService.update('cultos', showScaleModal.eventId, {
          data_culto: scaleFormData.date,
          horario: scaleFormData.time,
          id_nome_cultos: nomeCultoId
        });
      }

      setShowScaleModal(null);
      setScaleFormData({ title: '', date: '', time: '' });
      showSuccess("Escala salva localmente! Sincronizando...");
    } catch (err) {
      logger.error('Error saving scale:', err, 'database');
      showError('Erro ao salvar escala.');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    if (!activeSubTabs[id]) {
      setActiveSubTabs(prev => ({ ...prev, [id]: 'team' }));
    }
  };

  const setSubTab = (eventId: string, tab: SubTab) => {
    setActiveSubTabs(prev => ({ ...prev, [eventId]: tab }));
  };

  // Mocked for compatibility (these are now handled by useEffect)
  const fetchData = async () => {
    await LocalStorageFirstService.forceSync();
  };
  const fetchNotices = async () => {
    await LocalStorageFirstService.forceSync('avisos_cultos');
  };
  const fetchEvents = async () => {
    await LocalStorageFirstService.forceSync();
  };

  const handleDeleteScale = async (eventId: string, eventTitle: string) => {
    const userWantsToDelete = await ModalUtils.confirmDelete(
      eventTitle,
      'Esta ação irá excluir:\n• O culto\n• Todos os membros escalados\n• Todas as músicas do repertório\n\nEsta ação não pode ser desfeita.'
    );

    if (!userWantsToDelete) {
      return;
    }

    try {
      // 1. Excluir repertório do culto
      const { error: repertorioError } = await supabase
        .from('repertorio')
        .delete()
        .eq('id_culto', eventId);

      if (repertorioError) {
        logger.error('Erro ao excluir repertório:', repertorioError, 'database');
        throw repertorioError;
      }

      // 2. Excluir escalas dos membros
      const { error: escalaError } = await supabase
        .from('escalas')
        .delete()
        .eq('id_culto', eventId);

      if (escalaError) {
        logger.error('Erro ao excluir escalas:', escalaError, 'database');
        throw escalaError;
      }

      // 3. Excluir o culto
      const { error: cultoError } = await supabase
        .from('cultos')
        .delete()
        .eq('id', eventId);

      if (cultoError) {
        logger.error('Erro ao excluir culto:', cultoError, 'database');
        throw cultoError;
      }

      showSuccess(`Escala "${eventTitle}" excluída com sucesso!`);
      fetchEvents(); // Recarregar a lista
    } catch (err) {
      logger.error('Error deleting scale:', err, 'database');
      showError('Erro ao excluir escala. Tente novamente.');
    }
  };

  const handleDeleteScaleByMinisterio = async (eventId: string, eventTitle: string) => {
    const confirmed = await ModalUtils.confirmDelete(
      eventTitle,
      'Esta acao ira limpar apenas os dados deste ministerio neste culto. Os outros ministerios nao serao afetados.'
    );

    if (!confirmed) {
      return;
    }

    try {
      if (activeModules.includes('music')) {
        const { error: repertorioError } = await supabase
          .from('repertorio')
          .delete()
          .eq('id_culto', eventId);

        if (repertorioError) {
          throw repertorioError;
        }
      }

      let escalaDelete = supabase.from('escalas').delete().eq('id_culto', eventId);
      if (activeMinisterioId) {
        escalaDelete = escalaDelete.eq('ministerio_id', activeMinisterioId);
      }

      const { error: escalaError } = await escalaDelete;
      if (escalaError) {
        throw escalaError;
      }

      let avisoDelete = supabase.from('avisos_cultos').delete().eq('id_cultos', eventId);
      if (activeMinisterioId) {
        avisoDelete = avisoDelete.eq('ministerio_id', activeMinisterioId);
      }

      const { error: avisoError } = await avisoDelete;
      if (avisoError) {
        throw avisoError;
      }

      showSuccess(`Escala do ministerio em "${eventTitle}" excluida com sucesso!`);
      fetchEvents();
    } catch (error) {
      logger.error('Error deleting ministry scale:', error, 'database');
      showError('Erro ao excluir a escala deste ministerio.');
    }
  };

  const exportFilteredData = async () => {
    try {
      // Importar html2canvas dinamicamente
      const { default: html2canvas } = await import('html2canvas');
      
      // Criar elemento HTML para renderização
      const exportElement = document.createElement('div');
      exportElement.style.position = 'fixed';
      exportElement.style.left = '-9999px';
      exportElement.style.top = '0';
      exportElement.style.width = '1000px';  // Reduzido de 1200px para 1000px
      exportElement.style.background = '#1a1a2e';
      exportElement.style.padding = '25px';
      exportElement.style.fontFamily = 'Arial, sans-serif';
      exportElement.style.color = '#ffffff';
      exportElement.style.borderRadius = '15px';
      exportElement.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
      
      // Header estilizado como na referência
      const header = document.createElement('div');
      header.style.textAlign = 'center';
      header.style.marginBottom = '20px';
      header.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      header.style.padding = '18px';
      header.style.borderRadius = '10px';
      header.innerHTML = `
        <h1 style="font-size: 22px; font-weight: bold; margin: 0; color: #fff;">
          📸 ESCALA DE CULTOS
        </h1>
        ${searchTerm.trim() ? `
          <div style="background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 12px; margin: 8px auto; display: inline-block;">
            <span style="font-size: 11px; font-weight: bold; color: #fff;">
              🔍 "${searchTerm}"
            </span>
          </div>
        ` : ''}
        <p style="font-size: 11px; margin: 6px 0 0 0; opacity: 0.9;">
          ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </p>
      `;
      exportElement.appendChild(header);
      
      // Container principal - 4 colunas para cards mais curtos
      const mainContainer = document.createElement('div');
      mainContainer.style.display = 'grid';
      mainContainer.style.gridTemplateColumns = 'repeat(4, 1fr)';  // Mudado de 3 para 4 colunas
      mainContainer.style.gap = '10px';  // Reduzido de 12px
      
      filteredEvents.forEach((event, index) => {
        // Filtrar e agrupar membros
        const filteredMembers = event.members.filter(member => {
          if (!searchTerm.trim()) return true;
          const searchLower = searchTerm.toLowerCase();
          return member.name.toLowerCase().includes(searchLower) || 
                 member.role.toLowerCase().includes(searchLower);
        });
        
        const groupedMembers = filteredMembers.reduce((acc: Record<string, { name: string; roles: string[] }>, member) => {
          if (!acc[member.name]) {
            acc[member.name] = { name: member.name, roles: [] };
          }
          acc[member.name].roles.push(member.role);
          return acc;
        }, {});
        
        const membersArray = Object.values(groupedMembers);
        
        // Card do culto - menor para 4 colunas
        const cultoCard = document.createElement('div');
        cultoCard.style.background = '#16213e';
        cultoCard.style.borderRadius = '8px';
        cultoCard.style.padding = '10px';
        cultoCard.style.border = '2px solid #0f3460';
        cultoCard.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        
        cultoCard.innerHTML = `
          <!-- Header do Card - ultra compacto -->
          <div style="text-align: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #0f3460;">
            <div style="background: linear-gradient(135deg, #e94560, #ff6b6b); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 4px; font-weight: bold; font-size: 12px;">
              ${index + 1}
            </div>
            <h2 style="font-size: 11px; font-weight: bold; margin: 0; color: #fff; text-transform: uppercase; line-height: 1.1; word-wrap: break-word;">
              ${event.title}
            </h2>
            <p style="font-size: 8px; margin: 2px 0 0 0; color: #a8a8a8; line-height: 1.1;">
              ${event.dayOfWeek} • ${event.date}
            </p>
          </div>
          
          <!-- Lista de Membros - ultra compacta -->
          <div style="min-height: 80px;">
            ${membersArray.length > 0 ? (membersArray as { name: string; roles: string[] }[]).map(member => `
              <div style="display: flex; align-items: flex-start; margin-bottom: 4px; padding: 3px; background: rgba(255,255,255,0.05); border-radius: 4px; border-left: 2px solid #e94560;">
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 8px; font-weight: bold; color: #fff; margin-bottom: 1px; line-height: 1.1; word-wrap: break-word;">
                    ${member.name}
                  </div>
                  <div style="font-size: 7px; color: #e94560; font-weight: 600; line-height: 1.1; word-wrap: break-word;">
                    ${member.roles.join(' • ')}
                  </div>
                </div>
                <div style="background: #e94560; color: #fff; padding: 1px 3px; border-radius: 4px; font-size: 6px; font-weight: bold; margin-left: 4px; flex-shrink: 0; margin-top: 2px;">
                  ${member.roles.length}
                </div>
              </div>
            `).join('') : `
              <div style="text-align: center; padding: 12px; opacity: 0.5;">
                <div style="font-size: 14px; margin-bottom: 2px;">🚫</div>
                <p style="font-size: 8px; color: #a8a8a8;">Sem membros</p>
              </div>
            `}
          </div>
        `;
        
        mainContainer.appendChild(cultoCard);
      });
      
      exportElement.appendChild(mainContainer);
      document.body.appendChild(exportElement);
      
      // Gerar imagem
      const canvas = await html2canvas(exportElement, {
        backgroundColor: '#1a1a2e',
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      // Converter para blob e fazer download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        link.setAttribute('href', url);
        link.setAttribute('download', `escala_cultos_${timestamp}.jpg`);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Limpar elemento
        document.body.removeChild(exportElement);
        
        showSuccess('Imagem exportada com sucesso!');
      }, 'image/jpeg', 0.95);
      
    } catch (error) {
      logger.error('Erro ao exportar imagem:', error, 'database');
      showError('Erro ao exportar imagem. Tente novamente.');
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-20">
      {/* Header com campo de pesquisa */}
      <div className="flex flex-col gap-4 mb-10">
        <div className="text-center sm:text-left">
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">Lista de <span className="text-brand">Cultos</span></h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[11px] mt-1">Próximos eventos e escalas</p>
        </div>
        
        {/* Campo de pesquisa e botões na mesma linha - centralizado no desktop */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {/* Campo de pesquisa */}
          <div className="relative w-full max-w-[240px] sm:max-w-none sm:w-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar cultos, membros, músicas..."
              className="w-full sm:w-64 md:w-80 px-3 py-2 pl-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs sm:text-sm"></i>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            )}
          </div>
          
          {/* Botões */}
          <div className="contents sm:flex sm:items-center sm:gap-3 sm:w-auto">
            {/* Botão de exportação */}
            <button
              onClick={() => exportFilteredData()}
              className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-brand hover:border-brand transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
              title="Exportar lista filtrada"
            >
              <i className="fas fa-camera text-[8px]"></i>
              Exportar
            </button>
            
            {/* Botão Nova Escala - apenas para admin/líder */}
            {isAdminOrLeader && (
              <button
                onClick={() => setShowScaleModal({ mode: 'add' })}
                className="w-full max-w-sm sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-brand hover:border-brand transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
              >
                <i className="fas fa-plus text-[8px]"></i>
                Nova Escala
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isExpanded={expandedId === event.id}
              onToggle={() => toggleExpand(event.id)}
              activeSubTab={activeSubTabs[event.id] || 'team'}
              onSubTabChange={(tab) => setSubTab(event.id, tab)}
              onDelete={handleDeleteScaleByMinisterio}
              isAdminOrLeader={isAdminOrLeader}
              showRepertoire={activeModules.includes('music')}
            >
              {activeSubTabs[event.id] === 'team' && (
                <TeamManager
                  eventId={event.id}
                  members={event.members}
                  allRegisteredMembers={allRegisteredMembers}
                  isMember={isAdminOrLeader}
                  ministerioId={activeMinisterioId}
                  onTeamUpdated={fetchEvents}
                />
              )}
              
              {activeModules.includes('music') && activeSubTabs[event.id] === 'repertoire' && (
                <RepertoireManager
                  eventId={event.id}
                  repertoire={event.repertoire}
                  allSongs={allSongs}
                  tones={tones}
                  singersInEvent={event.members.filter(m => 
                    m.role.toLowerCase().includes('ministro') || 
                    m.role.toLowerCase().includes('vocal') ||
                    m.role.toLowerCase().includes('cantor')
                  )}
                  isMember={isMember}
                  onSongAdded={fetchEvents}
                />
              )}
              
              {activeSubTabs[event.id] === 'notices' && (
                <NoticeManager
                  eventId={event.id}
                  notices={eventNotices[event.id] || []}
                  currentUser={currentUser}
                  isMember={isMember}
                  ministerioId={activeMinisterioId}
                  onNoticesUpdated={fetchNotices}
                />
              )}
            </EventCard>
          ))
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-search text-slate-300 text-2xl"></i>
            </div>
            <h3 className="text-xl font-black text-slate-600 dark:text-slate-400 mb-2">
              {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum culto agendado'}
            </h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 max-w-md mx-auto">
              {searchTerm 
                ? `Tente pesquisar por outros termos como "Culto", "Domingo" ou nomes de membros` 
                : 'Todos os cultos já passaram. Crie novas escalas para os próximos eventos.'
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 px-6 py-2 bg-brand text-white rounded-full text-sm font-bold hover:bg-brand/90 transition-colors"
              >
                Limpar pesquisa
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de Escala */}
      {showScaleModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ left: '256px' }}>
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md" style={{ left: '-256px' }} onClick={() => setShowScaleModal(null)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl animate-fade-in border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Escala</h3>
              <button onClick={() => setShowScaleModal(null)} className="text-slate-400 hover:text-red-500"><i className="fas fa-times"></i></button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Culto</label>
                <input value={scaleFormData.title} onChange={(e) => setScaleFormData({ ...scaleFormData, title: e.target.value })} type="text" placeholder="Ex: SANTA CEIA" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-1 focus:ring-brand" list="culto-options" />
                <datalist id="culto-options">
                  {cultoTypes.map(c => <option key={c.id} value={c.nome_culto} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Data</label>
                  <input value={scaleFormData.date} onChange={(e) => setScaleFormData({ ...scaleFormData, date: e.target.value })} type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-1 focus:ring-brand" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Hora</label>
                  <input value={scaleFormData.time} onChange={(e) => setScaleFormData({ ...scaleFormData, time: e.target.value })} type="time" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-1 focus:ring-brand" />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowScaleModal(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancelar</button>
              <button onClick={handleSaveScale} className="flex-1 py-3 bg-brand text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-brand/90 transition-colors">
                {showScaleModal.mode === 'add' ? 'Criar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListView;
