import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ScheduleEvent, Member, Notice } from '../../types';
import { sortMembersByRole, getRoleIcon } from '../../utils/teamUtils';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import EventCard from './EventCard';

const CalendarView: React.FC = () => {
  const [selectedDateEvents, setSelectedDateEvents] = useState<ScheduleEvent[] | null>(null);
  const [currentBaseDate, setCurrentBaseDate] = useState(new Date());

  // Estados para cards colapsáveis (igual ListView)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, 'team' | 'repertoire' | 'notices'>>({});

  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [eventNotices, setEventNotices] = useState<Record<string, Notice[]>>({});

  // Estados para os componentes (igual ListView)
  const [allRegisteredMembers, setAllRegisteredMembers] = useState<Member[]>([]);
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const [tones, setTones] = useState<any[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string, name: string } | null>(null);

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

  // Usar localStorage-first para todos os dados
  const { data: cultosRaw } = useLocalStorageFirst<any>({ table: 'cultos' });
  const { data: nomeCultosRaw } = useLocalStorageFirst<any>({ table: 'nome_cultos' });
  const { data: membrosRaw } = useLocalStorageFirst<any>({ table: 'membros' });
  const { data: escalasRaw } = useLocalStorageFirst<any>({ table: 'escalas' });
  const { data: repertorioRaw } = useLocalStorageFirst<any>({ table: 'repertorio' });
  const { data: musicasRaw } = useLocalStorageFirst<any>({ table: 'musicas' });
  const { data: tonsRaw } = useLocalStorageFirst<any>({ table: 'tons' });
  const { data: avisosRaw } = useLocalStorageFirst<any>({ table: 'avisos_cultos' });
  const { data: funcoesRaw } = useLocalStorageFirst<any>({ table: 'funcao' });

  // JOIN LOCAL DOS DADOS
  useEffect(() => {
    if (!cultosRaw || !membrosRaw || !escalasRaw) return;

    // 1. Membros Ativos
    const mappedMembers: Member[] = membrosRaw.filter((m: any) => m.ativo).map((m: any) => ({
      id: m.id,
      name: m.nome,
      role: 'Membro',
      gender: m.genero === 'Homem' ? 'M' : 'F',
      avatar: m.foto || `https://ui-avatars.com/api/?name=${m.nome}&background=random`,
      status: 'confirmed',
      upcomingScales: [],
      songHistory: []
    }));
    setAllRegisteredMembers(mappedMembers);

    // 2. Músicas e Tons
    setAllSongs(musicasRaw);
    setTones(tonsRaw);

    // 3. Avisos por Evento
    const noticesByEvent: Record<string, Notice[]> = {};
    avisosRaw.forEach((n: any) => {
      if (!n.id_cultos) return;
      if (!noticesByEvent[n.id_cultos]) noticesByEvent[n.id_cultos] = [];
      const membro = membrosRaw.find((m: any) => m.id === n.id_membros);
      noticesByEvent[n.id_cultos].push({
        id: n.id_lembrete,
        text: n.info,
        sender: membro?.nome || 'Admin',
        time: n.created_at ? new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''
      });
    });
    setEventNotices(noticesByEvent);

    // 4. Eventos e Escalas (O Join Principal)
    const mapped: ScheduleEvent[] = cultosRaw.map((c: any) => {
      const date = new Date(c.data_culto + 'T12:00:00');
      const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      // Local Join: Escalas
      const cEscalas = escalasRaw.filter((e: any) => e.id_culto === c.id);
      const eventMembrosRaw = cEscalas.map((e: any) => ({
        membros: membrosRaw.find((m: any) => m.id === e.id_membros),
        funcao: funcoesRaw.find((f: any) => f.id === e.id_funcao)
      }));

      const groupedMembers = groupMembersByPerson(eventMembrosRaw);

      // Local Join: Repertório
      const cRepertorio = (repertorioRaw || [])
        .filter((r: any) => r.id_culto === c.id)
        .map((r: any) => {
          const musica = musicasRaw.find((m: any) => m.id === r.id_musicas);
          const tom = tonsRaw.find((t: any) => t.id === r.id_tons);
          const membro = membrosRaw.find((m: any) => m.id === r.id_membros);
          return {
            id: r.id,
            musica: musica?.musica || 'Sem música',
            cantor: musica?.cantor || 'Sem cantor',
            key: tom?.nome_tons || 'Ñ',
            minister: membro?.nome || ''
          };
        });

      return {
        id: c.id,
        title: nomeCultosRaw.find((n: any) => n.id === c.id_nome_cultos)?.nome_culto || 'CULTO',
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        dayOfWeek: daysOfWeek[date.getDay()],
        time: c.horario,
        members: sortMembersByRole(groupedMembers),
        repertoire: cRepertorio
      };
    });
    setEvents(mapped);
  }, [cultosRaw, membrosRaw, escalasRaw, repertorioRaw, musicasRaw, tonsRaw, nomeCultosRaw, avisosRaw, funcoesRaw]);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      if (!navigator.onLine) {
        console.log('📶 Offline: Pulando check de auth.');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        const member = membrosRaw?.find((m: any) => m.email?.toLowerCase() === user.email?.toLowerCase());
        if (member) {
          setCurrentUser({ id: member.id, name: member.nome });
          setIsMember(true);
        }
      }
    };
    checkAuth();
  }, [membrosRaw]);

  // Funções mockadas para não quebrar referências no JSX se houver
  const fetchEvents = async () => {};
  const fetchEventNotices = async (eventId: string) => {};
  const fetchAdditionalData = async () => {};

  // Buscar avisos quando abrir o modal
  useEffect(() => {
    if (selectedDateEvents) {
      selectedDateEvents.forEach(event => {
        fetchEventNotices(event.id);
      });
    }
  }, [selectedDateEvents]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    if (!activeSubTabs[id]) {
      setActiveSubTabs(prev => ({ ...prev, [id]: 'team' }));
    }
  };

  const setSubTab = (eventId: string, tab: 'team' | 'repertoire' | 'notices') => {
    setActiveSubTabs(prev => ({ ...prev, [eventId]: tab }));
  };

  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const handlePrevMonth = () => {
    setCurrentBaseDate(new Date(currentBaseDate.getFullYear(), currentBaseDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentBaseDate(new Date(currentBaseDate.getFullYear(), currentBaseDate.getMonth() + 1, 1));
  };

  const renderMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
    const monthDates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const getEventsForDate = (day: number) => {
      const dateStr = day.toString().padStart(2, '0') + '/' + (month + 1).toString().padStart(2, '0');
      return events.filter(e => e.date === dateStr);
    };

    return (
      <div className="flex-1 min-w-[300px]">
        <div className="mb-4 text-center">
          <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">
            {monthNames[month]} <span className="text-brand">{year}</span>
          </h3>
        </div>
        <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
          {days.map(day => (
            <div key={day} className="bg-slate-50 dark:bg-slate-900/50 py-2 text-center text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {day}
            </div>
          ))}
          {blanks.map(i => (
            <div key={`blank-${i}`} className="bg-white dark:bg-slate-900/20 h-16 md:h-24"></div>
          ))}
          {monthDates.map(day => {
            const dayEvents = getEventsForDate(day);
            const hasEvent = dayEvents.length > 0;
            return (
              <div
                key={day}
                onClick={() => hasEvent && setSelectedDateEvents(dayEvents)}
                className={`bg-white dark:bg-slate-900 p-2 h-16 md:h-24 border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group relative cursor-pointer overflow-hidden ${hasEvent ? 'ring-1 ring-inset ring-brand/20' : ''}`}
              >
                <span className={`text-[10px] font-black transition-colors ${hasEvent ? 'text-brand' : 'text-slate-300 dark:text-slate-700'}`}>
                  {day.toString().padStart(2, '0')}
                </span>
                {hasEvent && (
                  <div className="mt-1 space-y-0.5">
                    {dayEvents[0].members.slice(0, 3).map((m, idx) => (
                      <p key={`${day}-member-${idx}`} className="text-[7px] font-black text-brand uppercase truncate leading-none">
                        {m.name.split(' ')[0]}
                      </p>
                    ))}
                    {dayEvents[0].members.length > 3 && (
                      <p className="text-[6px] font-bold text-slate-400 uppercase">+{dayEvents[0].members.length - 3} mais</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const nextMonthDate = new Date(currentBaseDate.getFullYear(), currentBaseDate.getMonth() + 1, 1);

  return (
    <div className="fade-in max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header Compacto */}
      <div className="flex items-center justify-between px-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Cronograma <span className="text-brand">Bimensal</span></h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[9px] mt-1">Visão Geral da Equipe</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="bg-white dark:bg-slate-800 text-slate-400 w-10 h-10 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 hover:text-brand transition-all">
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
          <button onClick={handleNextMonth} className="bg-white dark:bg-slate-800 text-slate-400 w-10 h-10 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 hover:text-brand transition-all">
            <i className="fas fa-chevron-right text-xs"></i>
          </button>
        </div>
      </div>

      {/* Calendários Lado a Lado */}
      <div className="flex flex-col xl:flex-row gap-8">
        {renderMonth(currentBaseDate)}
        {renderMonth(nextMonthDate)}
      </div>

      {/* Modal com EventCards (Dentro do container) */}
      {selectedDateEvents && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 lg:pl-[312px] antialiased">
          <div className="absolute inset-0 bg-slate-900/80" onClick={() => setSelectedDateEvents(null)}></div>
          <div className="relative w-full max-w-4xl max-h-[85vh] lg:max-h-[90vh] bg-[#f4f7fa] dark:bg-[#0b1120] rounded-[2rem] lg:rounded-[3rem] shadow-2xl overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800">
            <div className="p-6 lg:p-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase leading-none">
                  Cultos do Dia
                </h3>
                <button onClick={() => setSelectedDateEvents(null)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-all border border-slate-100 dark:border-slate-700 shadow-sm">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="space-y-6">
                {selectedDateEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isExpanded={expandedId === event.id}
                    onToggle={() => toggleExpand(event.id)}
                    activeSubTab={activeSubTabs[event.id] || 'team'}
                    onSubTabChange={(tab) => setSubTab(event.id, tab)}
                  >
                    {activeSubTabs[event.id] === 'team' && (
                      <div className="p-6">
                        <div className={`grid gap-4 ${
                          event.members.some(m => m.roles && m.roles.length > 2) 
                            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                            : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                        }`}>
                          {event.members.map((member, index) => (
                            <div key={`${member.id}-${index}`} className={`bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700 ${
                              member.roles && member.roles.length > 2 ? 'md:col-span-1' : ''
                            }`}>
                              <div className="flex flex-col items-center text-center">
                                <div className="relative mb-3">
                                  <div className="w-16 h-16 bg-gradient-to-br from-brand to-brand-gold rounded-full flex items-center justify-center shadow-lg">
                                    {member.avatar ? (
                                      <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                      <i className={`fas ${getRoleIcon(member.roles && member.roles.length > 0 ? member.roles[0] : member.role)} text-white text-xl`}></i>
                                    )}
                                  </div>
                                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md border-2 border-brand">
                                    <i className={`fas ${getRoleIcon(member.roles && member.roles.length > 0 ? member.roles[0] : member.role)} text-brand text-[8px]`}></i>
                                  </div>
                                </div>
                                <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate w-full">{member.name}</h5>
                                <div className="flex flex-col items-center gap-1 mt-2">
                                  {member.roles && member.roles.length > 1 ? (
                                    <div className="text-center">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight">
                                        {member.roles.map((role, idx) => (
                                          <span key={idx}>
                                            {role}
                                            {idx < member.roles.length - 1 && (
                                              <span className="text-slate-300 mx-1">/</span>
                                            )}
                                          </span>
                                        ))}
                                      </p>
                                      {member.roles.length > 2 && (
                                        <span className="text-[7px] font-bold text-brand">
                                          +{member.roles.length - 1} funções
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-[9px] font-bold text-slate-400 uppercase truncate w-full">{member.role}</p>
                                  )}
                                  <div className="flex items-center gap-1 mt-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="text-[7px] font-bold text-slate-500 uppercase">Presente</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {event.members.length === 0 && (
                          <div className="text-center py-8">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                              <i className="fas fa-users-slash text-slate-400 text-lg"></i>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum membro escalado</p>
                          </div>
                        )}
                      </div>
                    )}
                    {activeSubTabs[event.id] === 'repertoire' && (
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {event.repertoire.map((song) => (
                            <div key={song.id} className="group bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                                <div className="w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center font-black text-[8px] shrink-0">
                                  {song.key || 'Ñ'}
                                </div>
                                <div className="flex-1 px-4">
                                  <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate">{song.musica} - {song.cantor}</h5>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                                    Ministro: <span className="text-brand">{song.minister || 'Sem ministro'}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="p-4">
                                <div className="grid grid-cols-4 gap-1">
                                  <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.musica} ${song.cantor}`)}`} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-red-600 hover:bg-red-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Youtube"><i className="fab fa-youtube text-[10px]"></i></a>
                                  <a href={`https://open.spotify.com/search/${encodeURIComponent(`${song.musica} ${song.cantor}`)}`} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-green-600 hover:bg-green-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Spotify"><i className="fab fa-spotify text-[10px]"></i></a>
                                  <a href={`https://www.google.com/search?q=${encodeURIComponent(`${song.musica} ${song.cantor} cifra`)}`} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Cifra"><i className="fas fa-guitar text-[10px]"></i></a>
                                  <a href={`https://www.google.com/search?q=${encodeURIComponent(`${song.musica} ${song.cantor} letra`)}`} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-purple-600 hover:bg-purple-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Letra"><i className="fas fa-microphone-alt text-[10px]"></i></a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {event.repertoire.length === 0 && (
                          <div className="text-center py-8">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                              <i className="fas fa-music-slash text-slate-400 text-lg"></i>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhuma música no repertório</p>
                          </div>
                        )}
                      </div>
                    )}
                    {activeSubTabs[event.id] === 'notices' && (
                      <div className="p-6">
                        <div className="space-y-3">
                          {(eventNotices[event.id] || []).map((notice) => (
                            <div key={notice.id} className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[8px] font-black text-brand uppercase tracking-widest">{notice.sender}</span>
                                <span className="text-[7px] font-bold text-slate-400 uppercase">{notice.time}</span>
                              </div>
                              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{notice.text}</p>
                            </div>
                          ))}
                        </div>
                        {(eventNotices[event.id] || []).length === 0 && (
                          <div className="text-center py-8">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                              <i className="fas fa-bell-slash text-slate-400 text-lg"></i>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum aviso</p>
                          </div>
                        )}
                      </div>
                    )}
                  </EventCard>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;