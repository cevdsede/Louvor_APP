import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ScheduleEvent, Notice } from '../types';

const CalendarView: React.FC = () => {
  const [selectedDateEvents, setSelectedDateEvents] = useState<ScheduleEvent[] | null>(null);
  const [currentBaseDate, setCurrentBaseDate] = useState(new Date());

  // Estados para cards colapsáveis (igual ListView)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, 'team' | 'repertoire' | 'notices'>>({});

  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [eventNotices, setEventNotices] = useState<Record<string, Notice[]>>({});

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
        console.error('Erro na query de cultos:', error);
        return;
      }

      if (cultosData) {
        const mapped: ScheduleEvent[] = cultosData.map((c: any) => {
          const date = new Date(c.data_culto + 'T00:00:00');
          const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

          return {
            id: c.id,
            title: c.nome_cultos?.nome_culto || 'Culto',
            date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            dayOfWeek: daysOfWeek[date.getDay()],
            time: c.horario,
            members: c.escalas?.map((e: any) => ({
              id: e.membros?.id,
              name: e.membros?.nome || 'Sem nome',
              gender: e.membros?.genero === 'Homem' ? 'M' : 'F',
              role: e.funcao?.nome_funcao || 'Sem função',
              photo: e.membros?.foto,
              avatar: e.membros?.foto || `https://ui-avatars.com/api/?name=${e.membros?.nome}&background=random`,
              status: 'confirmed',
              upcomingScales: [],
              songHistory: []
            })) || [],
            repertoire: c.repertorio?.map((r: any) => ({
              id: r.id,
              song: r.musicas?.musica || 'Sem música',
              singer: r.musicas?.cantor || 'Sem cantor',
              key: r.tons?.nome_tons || 'Ñ',
              minister: r.membros?.nome || ''
            })) || []
          };
        });
        setEvents(mapped);
        console.log('Eventos carregados:', mapped.length, 'cultos');
      }
    } catch (e) {
      console.error('Erro ao buscar eventos:', e);
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
          sender: notice.membros?.nome || 'Admin',
          time: new Date(notice.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }));

        setEventNotices(prev => ({
          ...prev,
          [eventId]: notices
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar avisos:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
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
          <button className="bg-brand text-white px-5 h-10 rounded-xl flex items-center gap-2 shadow-lg shadow-brand/20 font-black text-[9px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ml-2">
            <i className="fas fa-download"></i> PDF
          </button>
        </div>
      </div>

      {/* Calendários Lado a Lado */}
      <div className="flex flex-col xl:flex-row gap-8">
        {renderMonth(currentBaseDate)}
        {renderMonth(nextMonthDate)}
      </div>

      {/* Modal com Cards Colapsáveis (Dentro do container) */}
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
                {selectedDateEvents.map(event => {
                  const currentSubTab = activeSubTabs[event.id] || 'team';
                  const isExpanded = expandedId === event.id;
                  const notices = eventNotices[event.id] || [];

                  return (
                    <div
                      key={event.id}
                      className={`bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border ${isExpanded ? 'border-brand/40 ring-4 ring-brand/5' : 'border-slate-100 dark:border-slate-800'} overflow-hidden transition-all duration-300 h-fit transform-gpu`}
                    >
                      <div
                        onClick={() => toggleExpand(event.id)}
                        className="px-8 py-6 cursor-pointer flex justify-between items-center group hover:bg-slate-50 dark:hover:bg-slate-800/20"
                      >
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all ${isExpanded ? 'bg-brand text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                            <span className="text-[9px] font-black uppercase leading-none">{event.dayOfWeek}</span>
                            <span className="text-lg font-black leading-none mt-1">{event.date.split('/')[0]}</span>
                          </div>
                          <div>
                            <h3 className={`text-lg font-black tracking-tight uppercase leading-none ${isExpanded ? 'text-brand' : 'text-slate-800 dark:text-white'}`}>{event.title}</h3>
                            <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 font-bold text-[10px] mt-2 uppercase tracking-widest">
                              <span><i className="far fa-clock text-brand mr-1 opacity-70"></i> {event.time}</span>
                              <span className="w-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></span>
                              <span>{event.members.length} MEMBROS</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 transition-all ${isExpanded ? 'rotate-180 bg-brand/10 text-brand' : 'group-hover:text-brand'}`}>
                            <i className="fas fa-chevron-down text-[10px]"></i>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-50 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/10">
                          <div className="px-6 pt-6 pb-4">
                            <div className="bg-white dark:bg-slate-800 p-1 rounded-2xl flex items-center shadow-sm border border-slate-100 dark:border-slate-700 w-full overflow-hidden">
                              <button onClick={() => setSubTab(event.id, 'team')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentSubTab === 'team' ? 'bg-brand text-white shadow-md' : 'text-slate-400 hover:text-brand'}`}>Equipe</button>
                              <button onClick={() => setSubTab(event.id, 'repertoire')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentSubTab === 'repertoire' ? 'bg-brand text-white shadow-md' : 'text-slate-400 hover:text-brand'}`}>Músicas</button>
                              <button onClick={() => setSubTab(event.id, 'notices')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentSubTab === 'notices' ? 'bg-brand text-white shadow-md' : 'text-slate-400 hover:text-brand'}`}>Avisos</button>
                            </div>
                          </div>

                          <div className="px-6 lg:px-8 pb-6 lg:pb-10 max-h-[35vh] lg:max-h-[45vh] overflow-y-auto custom-scrollbar">
                            {currentSubTab === 'team' && (
                              <div className="space-y-2 pt-4">
                                <div className="flex justify-end mb-3 sticky top-0 bg-[#f4f7fa] dark:bg-[#0b1120] py-2 z-10">
                                  <button className="text-[9px] font-black text-slate-400 hover:text-brand uppercase tracking-widest flex items-center gap-2 py-1 px-3 rounded-lg hover:bg-brand/5 transition-all">
                                    <i className="fas fa-plus-circle text-[8px]"></i> Escalar Membro
                                  </button>
                                </div>
                                {event.members.map((member, index) => (
                                  <div key={`${event.id}-mem-${index}`} className="bg-slate-50/50 dark:bg-slate-800/30 p-2 lg:p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between group/member hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-all duration-300">
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <img
                                          src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=random`}
                                          alt={member.name}
                                          className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm group-hover/member:scale-110 transition-transform duration-300"
                                        />
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-brand rounded-full border border-white dark:border-slate-700 flex items-center justify-center">
                                          <i className={`fas ${roleIcons.find(r => member.role.includes(r.label))?.icon || 'fa-user'} text-[6px] text-white`}></i>
                                        </div>
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-black text-slate-800 dark:text-white leading-none truncate">{member.name}</span>
                                        <span className="text-[8px] font-bold text-brand uppercase tracking-widest mt-0.5 truncate">{member.role}</span>
                                      </div>
                                    </div>
                                    <button className="w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 dark:text-red-400 opacity-0 group-hover/member:opacity-100 transition-all duration-300 hover:bg-red-100 dark:hover:bg-red-900/40">
                                      <i className="fas fa-trash-alt text-[7px] lg:text-[8px]"></i>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {currentSubTab === 'repertoire' && (
                              <div className="space-y-3 pt-4">
                                <div className="flex justify-end mb-4 sticky top-0 bg-[#f4f7fa] dark:bg-[#0b1120] py-2 z-10">
                                  <button className="text-[9px] font-black text-slate-400 hover:text-brand uppercase tracking-widest flex items-center gap-2 py-1 px-3 rounded-lg hover:bg-brand/5 transition-all">
                                    <i className="fas fa-plus text-[8px]"></i> Nova Música
                                  </button>
                                </div>
                                {event.repertoire.map((item, index) => (
                                  <div key={`${event.id}-rep-${index}`} className="p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700 relative group">
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center font-black text-[8px] shrink-0">
                                        {item.key || 'Ñ'}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate">{item.song} - {item.singer}</h5>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase truncate">
                                          MINISTRO: <span className="text-brand">{item.minister || 'Sem ministro'}</span>
                                        </p>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1 mb-3">
                                      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.song} ${item.singer}`)}`} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-red-600 hover:bg-red-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Youtube"><i className="fab fa-youtube text-[10px]"></i></a>
                                      <a href={`https://open.spotify.com/search/${encodeURIComponent(`${item.song} ${item.singer}`)}`} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-emerald-500 hover:bg-emerald-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Spotify"><i className="fab fa-spotify text-[10px]"></i></a>
                                      <a href={`https://www.letras.mus.br/?q=${encodeURIComponent(`${item.song} ${item.singer}`)}`} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-blue-500 hover:bg-blue-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Letra"><i className="fas fa-align-left text-[9px]"></i></a>
                                      <a href={`https://www.cifraclub.com.br/?q=${encodeURIComponent(`${item.song} ${item.singer}`)}`} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-amber-500 hover:bg-amber-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Cifra"><i className="fas fa-guitar text-[10px]"></i></a>
                                    </div>
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                      <button className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-400 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-300">
                                        <i className="fas fa-edit text-[8px]"></i>
                                      </button>
                                      <button className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-300">
                                        <i className="fas fa-trash-alt text-[8px]"></i>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {currentSubTab === 'notices' && (
                              <div className="pt-4 space-y-3">
                                <div className="flex justify-end mb-2 sticky top-0 bg-[#f4f7fa] dark:bg-[#0b1120] py-2 z-10">
                                  <button className="text-[9px] font-black text-slate-400 hover:text-brand uppercase tracking-widest flex items-center gap-2 py-1 px-3 rounded-lg hover:bg-brand/5 transition-all">
                                    <i className="fas fa-plus text-[8px]"></i> Novo Aviso
                                  </button>
                                </div>
                                <div className="space-y-3">
                                  {notices.length === 0 ? (
                                    <div className="text-center py-8">
                                      <i className="fas fa-bell text-3xl text-slate-200 dark:text-slate-700 mb-3"></i>
                                      <p className="text-sm font-bold text-slate-400 dark:text-slate-500">Nenhum aviso para este culto</p>
                                    </div>
                                  ) : (
                                    notices.map((notice, index) => (
                                      <div key={`${event.id}-not-${index}`} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 relative animate-fade-in group">
                                        <div className="flex justify-between items-center mb-1.5">
                                          <span className="text-[8px] font-black text-brand uppercase tracking-widest">{notice.sender}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[7px] font-bold text-slate-400 uppercase">{notice.time}</span>
                                            <button className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-400 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-blue-100 dark:hover:bg-blue-900/40" title="Editar aviso">
                                              <i className="fas fa-edit text-[8px]"></i>
                                            </button>
                                            <button className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-100 dark:hover:bg-red-900/40" title="Deletar aviso">
                                              <i className="fas fa-trash-alt text-[8px]"></i>
                                            </button>
                                          </div>
                                        </div>
                                        <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{notice.text}</p>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;