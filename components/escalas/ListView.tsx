import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ScheduleEvent, Member, RepertoireItem } from '../../types';
import { Song, SupabaseCulto, SupabaseEscala, SupabaseRepertorio, SupabaseAviso, CultoComRelacionamentos } from '../../types-supabase';
import { showSuccess, showError, showWarning } from '../../utils/toast';
import { logger } from '../../utils/logger';

// Import new components
import EventCard from './EventCard';
import RepertoireManager from './RepertoireManager';
import NoticeManager from './NoticeManager';
import TeamManager from './TeamManager';

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, SubTab>>({});
  const [showScaleModal, setShowScaleModal] = useState<{ mode: 'add' | 'edit', eventId?: string } | null>(null);

  // User logged state - exige membro válido
  const [currentUser, setCurrentUser] = useState<{ id: string, name: string } | null>(null);
  const [isMember, setIsMember] = useState(false);

  // Data states
  const [allRegisteredMembers, setAllRegisteredMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ScheduleEvent[]>([]);
  const [eventNotices, setEventNotices] = useState<Record<string, Notice[]>>({});
  const [cultoTypes, setCultoTypes] = useState<NomeCulto[]>([]);
  const [singers, setSingers] = useState<Member[]>([]);
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
            song.song?.toLowerCase().includes(searchLower) ||
            song.singer?.toLowerCase().includes(searchLower)
          )
        );
      });
      setFilteredEvents(filtered);
    }
  }, [events, searchTerm]);

  // Buscar usuário logado do Supabase Auth e verificar se é membro
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
          // Verificar se é membro válido usando email (case-insensitive)
          const { data: memberData, error: memberError } = await supabase
            .from('membros')
            .select('id, nome, perfil')
            .ilike('email', user.email)
            .limit(1)
            .single();
          
          if (memberData && !memberError) {
            setCurrentUser({ id: memberData.id, name: memberData.nome });
            
            // Verificar se é admin ou líder baseado no perfil
            const isAdmin = memberData.perfil && (
              memberData.perfil.toLowerCase().includes('admin') || 
              memberData.perfil.toLowerCase().includes('líder') ||
              memberData.perfil.toLowerCase().includes('lider')
            );
            
            setIsMember(true);
            
            logger.auth('ListView - Usuário autenticado:', { email: user.email, perfil: memberData.perfil, isMember: true });
          } else {
            // Não é membro - limpa estado
            setCurrentUser(null);
            setIsMember(false);
            logger.auth('ListView - Membro não encontrado pelo email:', { email: user.email });
          }
        } else {
          setCurrentUser(null);
          setIsMember(false);
        }
      } catch (error) {
        logger.error('Erro ao buscar usuário:', error, 'auth');
        setCurrentUser(null);
        setIsMember(false);
      }
    };

    getCurrentUser();

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        getCurrentUser();
      } else {
        setCurrentUser(null);
        setIsMember(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch Culto Types (Names)
      const { data: cultoTypesData } = await supabase.from('nome_cultos').select('*');
      if (cultoTypesData) setCultoTypes(cultoTypesData);

      // 2. Fetch Members (apenas ativos)
      const { data: membersData } = await supabase.from('membros').select('*').eq('ativo', true).order('nome');
      if (membersData) {
        const mappedMembers: Member[] = membersData.map(m => ({
          id: m.id,
          name: m.nome,
          role: 'Membro', // Será atualizado posteriormente se necessário
          gender: m.genero === 'Homem' ? 'M' : 'F',
          status: m.ativo ? 'confirmed' : 'absent',
          avatar: m.foto,
          upcomingScales: [],
          songHistory: []
        }));
        setAllRegisteredMembers(mappedMembers);
        setSingers([]); // Será preenchido dinamicamente baseado nas escalas de cada evento
      }

      // 3. Fetch Events (Cultos) and Notices
      fetchEvents();
      fetchNotices();
      
      // 4. Fetch all songs for repertoire selection
      const { data: songsData } = await supabase.from('musicas').select('*').order('musica');
      if (songsData) setAllSongs(songsData);
      
      // 5. Fetch all tones for selection
      const { data: tonesData } = await supabase.from('tons').select('*').order('nome_tons');
      if (tonesData) {
        setTones(tonesData.map(t => t.nome_tons).filter(Boolean));
      }

    } catch (error) {
      logger.error('Error fetching initial data:', error, 'database');
    }
  };

  const fetchNotices = async () => {
    try {
      // Agora com a estrutura correta: id_lembrete, id_cultos, info, id_membros
      const { data: noticesData, error: noticesError } = await supabase
        .from('avisos_cultos')
        .select(`
          id_lembrete,
          id_cultos,
          id_membros,
          info,
          created_at,
          membros ( nome )
        `)
        .order('created_at', { ascending: false });

      if (noticesError) {
        logger.error('Error fetching notices:', noticesError, 'database');
        setEventNotices({});
        return;
      }

      if (noticesData && noticesData.length > 0) {
        const noticesByEvent: Record<string, Notice[]> = {};

        noticesData.forEach((n: any) => {
          if (n.id_cultos && !noticesByEvent[n.id_cultos]) {
            noticesByEvent[n.id_cultos] = [];
          }
          if (n.id_cultos) {
            noticesByEvent[n.id_cultos].push({
              id: n.id_lembrete,
              sender: n.membros?.nome || 'Admin',
              text: n.info || 'Sem texto',
              time: n.created_at ? new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            });
          }
        });

        setEventNotices(noticesByEvent);
      } else {
        setEventNotices({});
      }
    } catch (error) {
      logger.error('Error fetching notices:', error, 'database');
      setEventNotices({});
    }
  };

  // Realtime Subscription
  useEffect(() => {
    const channels = supabase.channel('list-view-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'escalas' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'avisos_cultos' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'repertorio' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channels);
    };
  }, []);

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
        .sort((a, b) => a.id - b.id)
        .map(item => item.role);
      
      return {
        ...member,
        role: sortedRoles.join(' / '), // Usar " / " como separador
        roles: sortedRoles,
        roleIds: member.roleIds
      };
    });
  };

  const fetchEvents = async () => {
    try {
      const { data: cultosData, error } = await supabase
        .from('cultos')
        .select(`
                id,
                data_culto,
                horario,
                nome_cultos ( id, nome_culto ),
                escalas (
                    id,
                    id_membros,
                    id_funcao,
                    membros ( id, nome, foto, genero ),
                    funcao ( id, nome_funcao )
                ),
                repertorio (
                    id,
                    id_musicas,
                    id_tons,
                    id_membros,
                    musicas ( id, musica, cantor ),
                    tons ( id, nome_tons ),
                    membros ( id, nome )
                )
            `)
        .gte('data_culto', new Date().toISOString().split('T')[0]) // Filtra cultos de hoje para frente - COMENTADO PARA TESTE
        .order('data_culto', { ascending: true });

      if (error) throw error;

      const mappedEvents: ScheduleEvent[] = (cultosData || []).map((c: any) => {
        const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
        const dateObj = new Date(c.data_culto + 'T00:00:00');
        const dayOfWeek = weekDays[dateObj.getUTCDay()];
        const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        // Agrupar membros com múltiplas funções
        const groupedMembers = groupMembersByPerson(c.escalas || []);

        return {
          id: c.id,
          title: c.nome_cultos?.nome_culto || 'CULTO',
          date: formattedDate,
          dayOfWeek: dayOfWeek,
          time: c.horario ? c.horario.substring(0, 5) : '19:00',
          members: groupedMembers,
          repertoire: (c.repertorio || []).map((r: any) => ({
            id: r.id,
            song: r.musicas?.musica,
            singer: r.musicas?.cantor,
            key: r.tons?.nome_tons || '',
            minister: r.membros?.nome || ''
          }))
        };
      });
      
      setEvents(mappedEvents);
      setFilteredEvents(mappedEvents); // ← Inicializa filteredEvents com todos os eventos
    } catch (err) {
      logger.error('Error fetching events:', err, 'database');
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

  const handleSaveScale = async () => {
    if (!scaleFormData.title || !scaleFormData.date) return;

    try {
      // Find Nome Culto ID or create? For now assume valid selection or text match existing
      // We'll try to find an existing name
      let nomeCultoId = cultoTypes.find(c => c.nome_culto.toUpperCase() === scaleFormData.title.toUpperCase())?.id;

      if (!nomeCultoId) {
        // Basic fallback: if user typed something new, maybe we need to insert into nome_cultos first
        // For simplicity, let's insert new type
        const { data: newType } = await supabase.from('nome_cultos').insert({ nome_culto: scaleFormData.title.toUpperCase() }).select().single();
        if (newType) nomeCultoId = newType.id;
      }

      if (showScaleModal?.mode === 'add') {
        await supabase.from('cultos').insert({
          data_culto: scaleFormData.date,
          horario: scaleFormData.time || '19:00:00',
          id_nome_cultos: nomeCultoId
        });
      } else if (showScaleModal?.mode === 'edit' && showScaleModal.eventId) {
        await supabase.from('cultos').update({
          data_culto: scaleFormData.date,
          horario: scaleFormData.time,
          id_nome_cultos: nomeCultoId
        }).eq('id', showScaleModal.eventId);
      }

      setShowScaleModal(null);
      setScaleFormData({ title: '', date: '', time: '' });
      fetchEvents();
    } catch (err) {
      logger.error('Error saving scale:', err, 'database');
      showError('Erro ao salvar escala.');
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
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">Lista de <span className="text-brand">Cultos</span></h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[11px] mt-1">Próximos eventos e escalas</p>
        </div>
        
        {/* Campo de pesquisa e botões na mesma linha - centralizado no desktop */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {/* Campo de pesquisa */}
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar cultos, membros, músicas..."
              className="w-full sm:w-64 md:w-80 px-4 py-2.5 pl-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm"></i>
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
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Botão de exportação */}
            <button
              onClick={() => exportFilteredData()}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-brand hover:border-brand transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
              title="Exportar lista filtrada"
            >
              <i className="fas fa-camera text-[8px]"></i>
              Exportar
            </button>
            
            {/* Botão Nova Escala */}
            <button
              onClick={() => setShowScaleModal({ mode: 'add' })}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-brand hover:border-brand transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
            >
              <i className="fas fa-plus text-[8px]"></i>
              Nova Escala
            </button>
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
            >
              {activeSubTabs[event.id] === 'team' && (
                <TeamManager
                  eventId={event.id}
                  members={event.members}
                  allRegisteredMembers={allRegisteredMembers}
                  isMember={isMember}
                  onTeamUpdated={fetchEvents}
                />
              )}
              
              {activeSubTabs[event.id] === 'repertoire' && (
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
                  onRepertoireUpdated={fetchEvents}
                />
              )}
              
              {activeSubTabs[event.id] === 'notices' && (
                <NoticeManager
                  eventId={event.id}
                  notices={eventNotices[event.id] || []}
                  currentUser={currentUser}
                  isMember={isMember}
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md" onClick={() => setShowScaleModal(null)}></div>
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
