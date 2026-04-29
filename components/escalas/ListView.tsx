import React, { useEffect, useMemo, useState } from 'react';
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
import { getMemberIdsForMinisterio } from '../../utils/memberMinistry';
import { getDisplayName } from '../../utils/displayName';
import { buildLocalAvatar } from '../../utils/avatar';

interface ListViewProps {
  onReportAbsence: (id: string) => void;
}

type SubTab = 'team' | 'repertoire' | 'notices';

interface Notice {
  id: string;
  sender: string;
  senderId: string;
  text: string;
  time: string;
}

interface NomeCulto {
  id: string;
  nome_culto: string;
}

const normalizeSearchText = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();


const ListView: React.FC<ListViewProps> = ({ onReportAbsence }) => {
  const {
    activeMinisterio,
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
  const linkedMemberIdsInMinisterio = useMemo(
    () =>
      getMemberIdsForMinisterio(membrosMinisteriosRaw, activeMinisterioId, true),
    [activeMinisterioId, membrosMinisteriosRaw]
  );
  const activeMemberIdsInMinisterio = useMemo(
    () => getMemberIdsForMinisterio(membrosMinisteriosRaw, activeMinisterioId, false),
    [activeMinisterioId, membrosMinisteriosRaw]
  );
  const scopedMembros = useMemo(
    () =>
      activeMinisterioId
        ? (membrosRaw || []).filter((member: any) => linkedMemberIdsInMinisterio.has(member.id))
        : membrosRaw,
    [activeMinisterioId, linkedMemberIdsInMinisterio, membrosRaw]
  );
  const scopedActiveMembros = useMemo(
    () =>
      activeMinisterioId
        ? (membrosRaw || []).filter(
            (member: any) => activeMemberIdsInMinisterio.has(member.id) && member.ativo !== false
          )
        : (membrosRaw || []).filter((member: any) => member.ativo !== false),
    [activeMemberIdsInMinisterio, activeMinisterioId, membrosRaw]
  );
  const scopedEscalas = useMemo(
    () =>
      activeMinisterioId
        ? (escalasRaw || []).filter((escala: any) => escala.ministerio_id === activeMinisterioId)
        : escalasRaw,
    [activeMinisterioId, escalasRaw]
  );
  const scopedAvisos = useMemo(
    () =>
      activeMinisterioId
        ? (avisosRaw || []).filter((aviso: any) => aviso.ministerio_id === activeMinisterioId)
        : avisosRaw,
    [activeMinisterioId, avisosRaw]
  );
  const scopedFuncoes = useMemo(
    () =>
      activeMinisterioId
        ? (funcoesRaw || []).filter((funcao: any) => funcao.ministerio_id === activeMinisterioId)
        : funcoesRaw,
    [activeMinisterioId, funcoesRaw]
  );

  // Data states
  const [allRegisteredMembers, setAllRegisteredMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [eventNotices, setEventNotices] = useState<Record<string, Notice[]>>({});
  const [cultoTypes, setCultoTypes] = useState<NomeCulto[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [tones, setTones] = useState<string[]>([]);
  const [scaleFormData, setScaleFormData] = useState({ title: '', date: '', time: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const canManageRepertoire = activeModules.includes('music');
  const activeMinisterioSlug = activeMinisterio?.slug
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const normalizedProfile = (currentMember?.perfil || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const activeMembership = memberships.find((membership) => membership.ministerio_id === activeMinisterioId) || null;
  const normalizedRole = (activeMembership?.papel || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const isAdminProfile = normalizedProfile.includes('admin');
  const isLeaderProfile =
    !isAdminProfile &&
    (normalizedProfile.includes('lider') ||
      ['lider', 'coordenador', 'administrador'].some((item) => normalizedRole.includes(item)));
  const canViewRepertoire = canManageRepertoire || activeMinisterioSlug === 'midia' || activeMinisterioSlug === 'media';
  const canCreateScale = isAdminOrLeader || isGlobalAdminOrLeader || canManageCurrentMinisterio;

  // Trava scroll quando o modal de escala está aberto
  useEffect(() => {
    if (showScaleModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [showScaleModal]);

  const filteredEvents = useMemo(() => {
    if (!searchTerm.trim()) {
      return events;
    }

    const searchLower = searchTerm.toLowerCase();
    return events.filter((event) => {
      return (
        event.title.toLowerCase().includes(searchLower) ||
        event.date.toLowerCase().includes(searchLower) ||
        event.dayOfWeek.toLowerCase().includes(searchLower) ||
        event.time.toLowerCase().includes(searchLower) ||
        event.members.some(
          (member) =>
            member.name.toLowerCase().includes(searchLower) || member.role.toLowerCase().includes(searchLower)
        ) ||
        event.repertoire.some(
          (song) =>
            song.musica?.toLowerCase().includes(searchLower) || song.cantor?.toLowerCase().includes(searchLower)
        )
      );
    });
  }, [events, searchTerm]);

  const visibleEvents = useMemo(
    () => filteredEvents.filter((event) => event.members.length > 0),
    [filteredEvents]
  );

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
            setCurrentUser({ id: memberData.id, name: getDisplayName(memberData) });
            const isAdmin = memberData.perfil && (
              memberData.perfil.toLowerCase().includes('admin') || 
              memberData.perfil.toLowerCase().includes('líder') ||
              memberData.perfil.toLowerCase().includes('lider')
            );
            setIsAdminOrLeader(isAdmin);
            setIsMember(true);
          } else {
            setCurrentUser(null);
            setIsMember(false);
            setIsAdminOrLeader(false);
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
      setCurrentUser({ id: currentMember.id, name: getDisplayName(currentMember) });
    } else {
      setCurrentUser(null);
    }

    setIsMember(canAccessCurrentMinisterio);
    setIsAdminOrLeader(isGlobalAdminOrLeader || canManageCurrentMinisterio);
  }, [activeMinisterioId, canManageCurrentMinisterio, currentMember, isGlobalAdminOrLeader, memberships]);

  const canManageTeamForEvent = (_event: ScheduleEvent) => isAdminProfile || isLeaderProfile;
  const isCurrentUserInEvent = (event: ScheduleEvent) =>
    Boolean(currentUser?.id) && event.members.some((member) => member.id === currentUser?.id);
  const canManageNoticesForEvent = (event: ScheduleEvent) =>
    isAdminProfile || (isMember && isCurrentUserInEvent(event));
  const canManageRepertoireForEvent = (event: ScheduleEvent) => {
    if (activeMinisterioSlug === 'midia' || activeMinisterioSlug === 'media') {
      return false;
    }

    return isAdminProfile || (isMember && isCurrentUserInEvent(event) && canManageRepertoire);
  };
  const canDeleteEventForCurrentMinisterio = isAdminProfile;

  // Processamento e Join Local dos dados
  // Função para agrupar membros com múltiplas funções
  const groupMembersByPerson = (escalas: any[]) => {
    const memberMap = new Map();
    
    escalas.forEach(escala => {
      const memberId = escala.membros?.id;
      const memberName = getDisplayName(escala.membros);
      const memberRole = escala.funcao?.nome_funcao;
      const roleId = escala.funcao?.id;
      const scaleId = escala.escalaId;
      
      if (memberId && memberName) {
        if (!memberMap.has(memberId)) {
          memberMap.set(memberId, {
            id: memberId,
            name: memberName,
            gender: escala.membros?.genero === 'Homem' ? 'M' : 'F',
            avatar: escala.membros?.foto || buildLocalAvatar(memberName),
            status: 'confirmed',
            upcomingScales: [],
            songHistory: [],
            roles: [],
            roleIds: [],
            scaleIds: []
          });
        }
        
        const member = memberMap.get(memberId);
        if (memberRole && !member.roles.includes(memberRole)) {
          member.roles.push(memberRole);
          member.roleIds.push(roleId);
          member.scaleIds.push(scaleId);
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
        roleIds: member.roleIds,
        scaleIds: member.scaleIds
      };
    });
  };
  useEffect(() => {
    if (!cultosRaw || !membrosRaw || !escalasRaw) return;
    
    setLoading(true);

    // 1. Membros
    const mappedMembers: Member[] = (scopedActiveMembros || []).map((m: any) => ({
      id: m.id,
      name: getDisplayName(m),
      role: 'Membro',
      gender: m.genero === 'Homem' ? 'M' : 'F',
      status: 'confirmed',
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
        sender: getDisplayName(membro, 'Admin'),
        senderId: n.id_membros,
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
            escalaId: e.id,
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
          dateIso: c.data_culto,
          dayOfWeek: dayOfWeek,
          time: c.horario ? c.horario.substring(0, 5) : '19:00',
          members: groupedMembers,
          repertoire: [] // Will pull from repertorioRaw
        };
      })
      .filter((event) => event.members.length > 0);

    // We need repertorioRaw for the join
    setEvents(mappedEvents);
    setLoading(false);
  }, [activeModules, cultosRaw, scopedActiveMembros, scopedAvisos, scopedEscalas, scopedFuncoes, scopedMembros, musicasRaw, nomeCultosRaw, tonsRaw, activeMinisterioId]);

  // Adicionando Repertório ao Join
  const { data: repertorioRaw } = useLocalStorageFirst<any>({ table: 'repertorio' });

  useEffect(() => {
    if (!repertorioRaw) return;

    setEvents((currentEvents) =>
      currentEvents.map((event) => {
        if (!canViewRepertoire) {
          return { ...event, repertoire: [] };
        }

        const cRep = repertorioRaw
          .filter((r: any) => r.id_culto === event.id)
          .map((r: any) => {
            const musica = musicasRaw.find((m: any) => m.id === r.id_musicas);
            const membro = (membrosRaw || []).find((m: any) => m.id === r.id_membros);
            const tom = tonsRaw.find((t: any) => t.id === r.id_tons);
            return {
              id: r.id,
              musica: musica?.musica,
              cantor: musica?.cantor,
              key: tom?.nome_tons || '',
              minister: getDisplayName(membro)
            };
          });

        return { ...event, repertoire: cRep };
      })
    );
  }, [canViewRepertoire, membrosRaw, musicasRaw, repertorioRaw, tonsRaw, activeMinisterioId]);

  // Função para salvar escala usando o service
  const handleSaveScale = async () => {
    if (!scaleFormData.title || !scaleFormData.date) return;

    try {
      const normalizedTitle = normalizeSearchText(scaleFormData.title);
      let nomeCultoId = cultoTypes.find(c => normalizeSearchText(c.nome_culto) === normalizedTitle)?.id;

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
    return;
  };
  const fetchEvents = async () => {
    return;
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
      const { default: html2canvas } = await import('html2canvas');

      const exportElement = document.createElement('div');
      exportElement.style.position = 'fixed';
      exportElement.style.left = '-9999px';
      exportElement.style.top = '0';
      exportElement.style.width = '1200px';
      exportElement.style.background = 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)';
      exportElement.style.padding = '40px';
      exportElement.style.fontFamily = 'Inter, Arial, sans-serif';
      exportElement.style.color = '#0f172a';
      exportElement.style.borderRadius = '32px';
      exportElement.style.boxShadow = '0 24px 80px rgba(15,23,42,0.18)';

      const totalMembers = visibleEvents.reduce((sum, event) => sum + event.members.length, 0);
      const exportDate = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const header = document.createElement('div');
      header.style.marginBottom = '24px';
      header.style.padding = '28px';
      header.style.borderRadius = '28px';
      header.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 52%, #334155 100%)';
      header.style.color = '#ffffff';
      header.innerHTML = `
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:20px;">
          <div>
            <p style="margin:0 0 8px 0; font-size:11px; font-weight:800; letter-spacing:0.32em; text-transform:uppercase; color:rgba(255,255,255,0.68);">
              Escalas do ministerio
            </p>
            <h1 style="margin:0; font-size:34px; font-weight:900; letter-spacing:0; text-transform:uppercase;">
              ${activeMinisterio?.nome || 'Escala de Cultos'}
            </h1>
            <p style="margin:10px 0 0 0; font-size:14px; color:rgba(255,255,255,0.78);">
              ${visibleEvents.length} culto(s) com equipes montadas
            </p>
          </div>
          <div style="text-align:right;">
            <div style="display:inline-flex; align-items:center; justify-content:center; min-width:120px; padding:10px 16px; border-radius:999px; background:rgba(255,255,255,0.12); font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.16em;">
              ${exportDate}
            </div>
            ${searchTerm.trim() ? `
              <div style="margin-top:10px; display:inline-flex; align-items:center; justify-content:center; max-width:260px; padding:10px 16px; border-radius:18px; background:rgba(255,255,255,0.08); font-size:12px; font-weight:700; color:rgba(255,255,255,0.92);">
                Filtro: "${searchTerm}"
              </div>
            ` : ''}
          </div>
        </div>
      `;
      exportElement.appendChild(header);

      const summaryGrid = document.createElement('div');
      summaryGrid.style.display = 'grid';
      summaryGrid.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
      summaryGrid.style.gap = '16px';
      summaryGrid.style.marginBottom = '24px';

      [
        { label: 'Cultos visiveis', value: String(visibleEvents.length) },
        { label: 'Membros escalados', value: String(totalMembers) },
        { label: 'Busca ativa', value: searchTerm.trim() ? 'Sim' : 'Nao' }
      ].forEach((item) => {
        const card = document.createElement('div');
        card.style.padding = '20px 22px';
        card.style.borderRadius = '22px';
        card.style.background = 'rgba(255,255,255,0.88)';
        card.style.border = '1px solid rgba(148,163,184,0.2)';
        card.innerHTML = `
          <p style="margin:0 0 8px 0; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.2em; color:#64748b;">
            ${item.label}
          </p>
          <div style="font-size:28px; font-weight:900; color:#0f172a;">${item.value}</div>
        `;
        summaryGrid.appendChild(card);
      });
      exportElement.appendChild(summaryGrid);

      const mainContainer = document.createElement('div');
      mainContainer.style.display = 'grid';
      mainContainer.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
      mainContainer.style.gap = '18px';

      visibleEvents.forEach((event, index) => {
        const filteredMembers = event.members.filter(member => {
          if (!searchTerm.trim()) return true;
          const searchLower = searchTerm.toLowerCase();
          return member.name.toLowerCase().includes(searchLower) || member.role.toLowerCase().includes(searchLower);
        });

        const groupedMembers = filteredMembers.reduce((acc: Record<string, { name: string; roles: string[] }>, member) => {
          if (!acc[member.name]) {
            acc[member.name] = { name: member.name, roles: [] };
          }
          acc[member.name].roles.push(member.role);
          return acc;
        }, {});

        const membersArray = Object.values(groupedMembers);
        const cultoCard = document.createElement('div');
        cultoCard.style.background = 'rgba(255,255,255,0.94)';
        cultoCard.style.borderRadius = '26px';
        cultoCard.style.padding = '24px';
        cultoCard.style.border = '1px solid rgba(148,163,184,0.24)';
        cultoCard.style.boxShadow = '0 18px 44px rgba(15,23,42,0.09)';

        cultoCard.innerHTML = `
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:18px;">
            <div>
              <div style="display:inline-flex; align-items:center; justify-content:center; min-width:38px; height:38px; padding:0 14px; border-radius:999px; background:#e2e8f0; color:#0f172a; font-size:12px; font-weight:900;">
                ${String(index + 1).padStart(2, '0')}
              </div>
              <h2 style="margin:14px 0 8px 0; font-size:22px; line-height:1.08; font-weight:900; color:#0f172a; text-transform:uppercase;">
                ${event.title}
              </h2>
              <p style="margin:0; font-size:13px; font-weight:700; color:#475569;">
                ${event.dayOfWeek} � ${event.date} � ${event.time}
              </p>
            </div>
            <div style="min-width:92px; padding:12px 14px; border-radius:20px; background:#eff6ff; text-align:center;">
              <div style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.18em; color:#64748b;">Equipe</div>
              <div style="margin-top:6px; font-size:24px; font-weight:900; color:#1d4ed8;">${membersArray.length}</div>
            </div>
          </div>

          <div style="display:grid; gap:10px;">
            ${membersArray.length > 0 ? (membersArray as { name: string; roles: string[] }[]).map(member => `
              <div style="display:flex; align-items:flex-start; gap:12px; padding:14px 16px; border-radius:18px; background:#f8fafc; border:1px solid #e2e8f0;">
                <div style="width:36px; height:36px; border-radius:14px; background:#dbeafe; color:#1d4ed8; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:900; flex-shrink:0;">
                  ${member.roles.length}
                </div>
                <div style="flex:1; min-width:0;">
                  <div style="font-size:14px; font-weight:800; color:#0f172a; margin-bottom:4px; line-height:1.25; word-wrap:break-word;">
                    ${member.name}
                  </div>
                  <div style="font-size:11px; color:#475569; font-weight:700; line-height:1.35; word-wrap:break-word;">
                    ${member.roles.join(' � ')}
                  </div>
                </div>
              </div>
            `).join('') : `
              <div style="text-align:center; padding:24px; border-radius:18px; background:#f8fafc; border:1px dashed #cbd5e1;">
                <p style="margin:0; font-size:13px; font-weight:700; color:#64748b;">Sem membros neste ministerio</p>
              </div>
            `}
          </div>
        `;

        mainContainer.appendChild(cultoCard);
      });

      exportElement.appendChild(mainContainer);
      document.body.appendChild(exportElement);

      const canvas = await html2canvas(exportElement, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true
      });

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
            {canCreateScale && (
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
        {visibleEvents.length > 0 ? (
          visibleEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isExpanded={expandedId === event.id}
              onToggle={() => toggleExpand(event.id)}
              activeSubTab={activeSubTabs[event.id] || 'team'}
              onSubTabChange={(tab) => setSubTab(event.id, tab)}
              onDelete={handleDeleteScaleByMinisterio}
              canDeleteEvent={canDeleteEventForCurrentMinisterio}
              showRepertoire={canViewRepertoire}
            >
              {activeSubTabs[event.id] === 'team' && (
                <TeamManager
                  eventId={event.id}
                  members={event.members}
                  allRegisteredMembers={allRegisteredMembers}
                  canManageTeam={canManageTeamForEvent(event)}
                  ministerioId={activeMinisterioId}
                  eventDate={event.dateIso}
                  onTeamUpdated={fetchEvents}
                />
              )}
              
              {canViewRepertoire && activeSubTabs[event.id] === 'repertoire' && (
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
                  canManageRepertoire={canManageRepertoireForEvent(event)}
                  currentUser={currentUser}
                  ministerioId={activeMinisterioId}
                  onSongAdded={fetchEvents}
                />
              )}
              
              {activeSubTabs[event.id] === 'notices' && (
                <NoticeManager
                  eventId={event.id}
                  notices={eventNotices[event.id] || []}
                  currentUser={currentUser}
                  canManageNotices={canManageNoticesForEvent(event)}
                  isAdmin={isAdminProfile}
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

