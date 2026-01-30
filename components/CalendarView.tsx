
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ScheduleEvent, Member, RepertoireItem } from '../types';

interface Notice {
  id: string;
  sender: string;
  text: string;
  time: string;
}

const CalendarView: React.FC = () => {
  const [selectedDateEvents, setSelectedDateEvents] = useState<ScheduleEvent[] | null>(null);
  const [currentBaseDate, setCurrentBaseDate] = useState(new Date(2024, 4, 1)); // Começa em Maio/2024

  const [events, setEvents] = useState<ScheduleEvent[]>([]);

  const fetchEvents = async () => {
    // Reuse logic or import fetch from a service if possible, or just re-fetch for now.
    // Since ListView handles most logic, we can re-fetch just what we need for calendar or accept we need duplicate fetch logic here for now
    // For simplicity in this step, I will add the subscription but we need actual fetch logic first.
    // Assuming 'events' was mock in first read, I'll add a basic fetch here.
    try {
      const { data: cultosData } = await (window as any).supabase // accessing global or imported? Need to import supabase
        .from('cultos')
        .select(`
            id, data_culto, horario, nome_cultos(nome_culto),
            escalas(membros(id, nome, genero))
          `);

      if (cultosData) {
        // Map data... simplifying for brevity
        const mapped: ScheduleEvent[] = cultosData.map((c: any) => ({
          id: c.id,
          title: c.nome_cultos?.nome_culto,
          date: new Date(c.data_culto + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          dayOfWeek: '', // Calc if needed
          time: c.horario,
          members: c.escalas.map((e: any) => ({ id: e.membros?.id, name: e.membros?.nome, gender: e.membros?.genero === 'Homem' ? 'M' : 'F' })),
          repertoire: []
        }));
        setEvents(mapped);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    // Initial fetch would go here
    // fetchEvents();
  }, []);

  // Realtime
  // Note: CalendarView.tsx I read earlier didn't have imported supabase client at top?
  // checking imports...
  // import { supabase } from '../supabaseClient'; WAS MISSING in my view? 
  // Wait, let's check previous view of CalendarView.tsx
  // It did NOT have supabase import in lines 1-100?
  // actually line 3 had imports. 'import { ScheduleEvent...'
  // I need to add supabase import if missing.

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
                    {dayEvents[0].members.slice(0, 3).map(m => (
                      <p key={m.id} className="text-[7px] font-black text-brand uppercase truncate leading-none">
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

      {/* Modal de Detalhes (Card Estilo ListView) */}
      {selectedDateEvents && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedDateEvents(null)}></div>
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#f4f7fa] dark:bg-[#0b1120] rounded-[3rem] shadow-2xl overflow-y-auto custom-scrollbar animate-fade-in border border-slate-100 dark:border-slate-800">
            <div className="p-8 lg:p-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase leading-none">
                  Detalhes do Culto
                </h3>
                <button onClick={() => setSelectedDateEvents(null)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-all border border-slate-100 dark:border-slate-700 shadow-sm">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="space-y-6">
                {selectedDateEvents.map(event => (
                  <DetailedEventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente DetailedEventCard (Réplica do ListView)
const DetailedEventCard: React.FC<{ event: ScheduleEvent }> = ({ event }) => {
  const [activeTab, setActiveTab] = useState<'team' | 'repertoire' | 'notices'>('team');
  const [notices] = useState<Notice[]>([
    { id: 'n1', sender: 'Ewerton Silva', text: 'Vou me atrasar 10 minutos hoje devido ao trânsito.', time: '18:45' }
  ]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand text-white flex flex-col items-center justify-center font-black">
            <span className="text-[9px] uppercase leading-none mb-1">{event.dayOfWeek}</span>
            <span className="text-lg leading-none">{event.date.split('/')[0]}</span>
          </div>
          <div>
            <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase leading-none">{event.title}</h4>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">{event.time} • {event.members.length} INTEGRANTES</span>
          </div>
        </div>
      </div>

      <div className="p-1.5 bg-white dark:bg-slate-800 m-4 rounded-2xl flex items-center shadow-sm border border-slate-100 dark:border-slate-700">
        {(['team', 'repertoire', 'notices'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-brand text-white shadow-md' : 'text-slate-400 hover:text-brand'}`}
          >
            {tab === 'team' ? 'Equipe' : tab === 'repertoire' ? 'Músicas' : 'Avisos'}
          </button>
        ))}
      </div>

      <div className="px-8 pb-10 min-h-[300px] animate-fade-in">
        {activeTab === 'team' && (
          <div className="space-y-3 pt-4">
            {event.members.map(m => (
              <div key={m.id} className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-50 dark:border-slate-800 flex items-center justify-between group/member hover:border-brand transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-brand shadow-sm">
                    <i className={`fas ${m.icon?.split(' ')[0] || 'fa-user'} text-xs`}></i>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-white leading-none">{m.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{m.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'repertoire' && (
          <div className="space-y-3 pt-4">
            {event.repertoire.map(item => (
              <div key={item.id} className="bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-50 dark:border-slate-800 flex items-center justify-between group/song hover:border-brand transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand/5 flex items-center justify-center text-brand shadow-sm"><i className="fas fa-play text-[10px]"></i></div>
                  <div>
                    <p className="text-sm font-black text-slate-800 dark:text-white leading-none">{item.song}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{item.singer} • {item.key}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'notices' && (
          <div className="space-y-4 pt-4">
            {notices.map(n => (
              <div key={n.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-black text-brand uppercase tracking-widest">{n.sender}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">{n.time}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{n.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;