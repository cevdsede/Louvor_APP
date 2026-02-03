import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { showSuccess, showError, showWarning } from '../../utils/toast';
import { logger } from '../../utils/logger';
import { ScheduleEvent, Member, RepertoireItem, Notice } from '../../types';
import { CalendarCultoQuery, CalendarEscala, CalendarRepertorio, CalendarNotice } from '../../types-supabase';
import { sortMembersByRole, getRoleIcon } from '../../utils/teamUtils';

// Importar componentes do ListView
import EventCard from './EventCard';

export const CalendarView: React.FC = () => {
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
        logger.error('Erro na query de cultos:', error, 'database');
        return;
      }

      if (cultosData) {
        const mapped: ScheduleEvent[] = cultosData.map((c: CalendarCultoQuery) => {
          const date = new Date(c.data_culto + 'T00:00:00');
          const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

          return {
            id: c.id,
            title: c.nome_cultos?.[0]?.nome_culto || 'Culto',
            date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            dayOfWeek: daysOfWeek[date.getDay()],
            time: c.horario,
            members: sortMembersByRole(c.escalas?.map((e) => ({
              id: e.membros?.[0]?.id || '',
              name: e.membros?.[0]?.nome || 'Sem nome',
              gender: e.membros?.[0]?.genero === 'Homem' ? 'M' : 'F',
              role: e.funcao?.[0]?.nome_funcao || 'Sem função',
              photo: e.membros?.[0]?.foto,
              avatar: e.membros?.[0]?.foto || `https://ui-avatars.com/api/?name=${e.membros?.[0]?.nome || 'Sem nome'}&background=random`,
              status: 'confirmed',
              upcomingScales: [],
              songHistory: []
            })) || []),
            repertoire: c.repertorio?.map((r) => ({
              id: r.id,
              song: r.musicas?.[0]?.musica || 'Sem música',
              singer: r.musicas?.[0]?.cantor || 'Sem cantor',
              key: r.tons?.[0]?.nome_tons || 'Ñ',
              minister: r.membros?.[0]?.nome || ''
            })) || []
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
        const notices: Notice[] = data.map((notice: CalendarNotice) => ({
          id: notice.id_lembrete,
          text: notice.info,
          sender: notice.membros?.[0]?.nome || 'Admin',
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
                      <div className="p-4 text-center text-slate-400 dark:text-slate-500">
                        <i className="fas fa-users text-2xl mb-2"></i>
                        <p className="text-sm font-bold">Em desenvolvimento</p>
                      </div>
                    )}
                    
                    {activeSubTabs[event.id] === 'repertoire' && (
                      <div className="p-4 text-center text-slate-400 dark:text-slate-500">
                        <i className="fas fa-music text-2xl mb-2"></i>
                        <p className="text-sm font-bold">Em desenvolvimento</p>
                      </div>
                    )}
                    
                    {activeSubTabs[event.id] === 'notices' && (
                      <div className="p-4 text-center text-slate-400 dark:text-slate-500">
                        <i className="fas fa-bell text-2xl mb-2"></i>
                        <p className="text-sm font-bold">Em desenvolvimento</p>
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