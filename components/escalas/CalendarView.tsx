import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { showSuccess, showError, showWarning } from '../../utils/toast';
import { logger } from '../../utils/logger';
import { ScheduleEvent, Member, RepertoireItem, Notice } from '../../types';
import { CalendarCultoQuery, CalendarEscala, CalendarRepertorio, CalendarNotice } from '../../types-supabase';
import { sortMembersByRole, getRoleIcon } from '../../utils/teamUtils';

// Importar componentes do ListView
import EventCard from './EventCard';
import TeamManager from './TeamManager';
import RepertoireManager from './RepertoireManager';
import NoticeManager from './NoticeManager';

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

  // Role icons mapping (igual ListView)
  const roleIcons = [
    { label: 'Ministro', role: 'Ministro', icon: 'fa-crown' },
    { label: 'Vocal', role: 'Vocal', icon: 'fa-microphone-lines' },
    { label: 'Violão', role: 'Violão', icon: 'fa-guitar' },
    { label: 'Teclado', role: 'Teclado', icon: 'fa-keyboard' },
    { label: 'Guitarra', role: 'Guitarra', icon: 'fa-bolt' },
    { label: 'Baixo', role: 'Baixo', icon: 'fa-music' },
    { label: 'Bateria', role: 'Bateria', icon: 'fa-drum' },
  ];

  const fetchEvents = async () => {
    try {
      const { data: cultosData, error } = await supabase
        .from('cultos')
        .select(`
          id, 
          data_culto, 
          horario, 
          id_nome_cultos,
          nome_cultos!cultos_id_nome_cultos_fkey(nome_culto),
          escalas(
            id, 
            id_membros, 
            id_funcao,
            membros(id, nome, foto, genero),
            funcao(nome_funcao)
          ),
          repertorio(
            id, 
            id_culto,
            id_musicas,
            id_tons,
            musicas(id, musica, cantor),
            tons(nome_tons),
            membros(nome)
          )
        `);

      if (error) {
        logger.error('Erro na query de cultos:', error, 'database');
        return;
      }

      if (cultosData) {
        const mapped: ScheduleEvent[] = cultosData.map((c: any) => {
          const date = new Date(c.data_culto + 'T00:00:00');
          const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

          return {
            id: c.id,
            title: (c.nome_cultos as any)?.nome_culto || 'CULTO',
            date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            dayOfWeek: daysOfWeek[date.getDay()],
            time: c.horario,
            members: sortMembersByRole((c.escalas || []).map((e: any) => ({
              id: e.membros?.id || '',
              name: e.membros?.nome || 'Sem nome',
              gender: e.membros?.genero === 'Homem' ? 'M' : 'F',
              role: e.funcao?.nome_funcao || 'Membro',
              photo: e.membros?.foto,
              avatar: e.membros?.foto || `https://ui-avatars.com/api/?name=${e.membros?.nome || 'Sem nome'}&background=random`,
              status: 'confirmed',
              upcomingScales: [],
              songHistory: [],
              roleId: e.id_funcao, // ← Adiciona o ID da função
              escalaId: e.id // ← Adiciona o ID da escala
            }))),
            repertoire: (c.repertorio || []).map((r: any) => ({
              id: r.id,
              song: (r.musicas as any)?.musica || 'Sem música',
              singer: (r.musicas as any)?.cantor || 'Sem cantor',
              key: (r.tons as any)?.nome_tons || 'Ñ',
              minister: (r.membros as any)?.nome || ''
            }))
          };
        });
        setEvents(mapped);
        logger.info('Eventos carregados:', { count: mapped.length, type: 'cultos' }, 'database');
      }
    } catch (e) {
      logger.error('Erro ao buscar eventos:', e, 'database');
    }
  };

  const fetchEventNotices = async (eventId: string) => {
    try {
      const { data } = await supabase
        .from('avisos_cultos')
        .select(`
          id_lembrete,
          info,
          created_at,
          membros(nome)
        `)
        .eq('id_cultos', eventId);

      if (data) {
        const notices: Notice[] = data.map((notice: any) => ({
          id: notice.id_lembrete,
          text: notice.info,
          sender: (notice.membros as any)?.nome || 'Admin',
          time: new Date(notice.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }));

        setEventNotices(prev => ({
          ...prev,
          [eventId]: notices
        }));
      }
    } catch (error) {
      logger.error('Erro ao buscar avisos:', error, 'database');
    }
  };

  // Funções para buscar dados adicionais (igual ListView)
  const fetchAdditionalData = async () => {
    try {
      // 1. Fetch Members
      const { data: membersData } = await supabase.from('membros').select('*').order('nome');
      if (membersData) {
        const mappedMembers: Member[] = membersData.map(m => ({
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
      }

      // 2. Fetch Songs
      const { data: songsData } = await supabase.from('musicas').select('*').order('musica');
      if (songsData) {
        setAllSongs(songsData);
      }

      // 3. Fetch Tones
      const { data: tonesData } = await supabase.from('tons').select('*').order('nome_tons');
      if (tonesData) {
        setTones(tonesData);
      }

      // 4. Check current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: memberData } = await supabase
          .from('membros')
          .select('id, nome')
          .eq('id', user.id)
          .single();
        
        if (memberData) {
          setCurrentUser({ id: memberData.id, name: memberData.nome });
          setIsMember(true);
        }
      }
    } catch (error) {
      logger.error('Erro ao buscar dados adicionais:', error, 'database');
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchAdditionalData();
  }, []);

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
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {event.members.map((member, index) => (
                            <div key={`${member.id}-${member.roleId || index}`} className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                              <div className="flex flex-col items-center text-center">
                                <div className="relative mb-3">
                                  <div className="w-16 h-16 bg-gradient-to-br from-brand to-brand-gold rounded-full flex items-center justify-center shadow-lg">
                                    {member.avatar ? (
                                      <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                      <i className={`fas ${getRoleIcon(member.role)} text-white text-xl`}></i>
                                    )}
                                  </div>
                                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md border-2 border-brand">
                                    <i className={`fas ${getRoleIcon(member.role)} text-brand text-[8px]`}></i>
                                  </div>
                                </div>
                                <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate w-full">{member.name}</h5>
                                <p className="text-[9px] font-bold text-slate-400 uppercase truncate w-full">{member.role}</p>
                                <div className="flex items-center gap-1 mt-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  <span className="text-[7px] font-bold text-slate-500 uppercase">Presente</span>
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
                        <div className="space-y-3">
                          {event.repertoire.map((song) => (
                            <div key={song.id} className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="text-sm font-black text-slate-800 dark:text-white">{song.song}</h4>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{song.singer}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tom</p>
                                    <p className="text-sm font-black text-brand">{song.key}</p>
                                  </div>
                                  {song.minister && (
                                    <div className="text-center">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase">Ministro</p>
                                      <p className="text-xs text-slate-600 dark:text-slate-300">{song.minister}</p>
                                    </div>
                                  )}
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