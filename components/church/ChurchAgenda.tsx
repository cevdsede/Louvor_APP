import React, { useEffect, useState, useMemo } from 'react';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { supabase } from '../../supabaseClient';
import { SupabaseEventoIgreja } from '../../types-supabase';
import { generateChurchEventOccurrences } from '../../utils/churchEvents';

const ChurchAgenda: React.FC<{ publicMode?: boolean }> = ({ publicMode = false }) => {
  const { data: eventsRaw, loading } = useLocalStorageFirst<SupabaseEventoIgreja>({
    table: 'eventos_igreja',
    enableBackgroundSync: !publicMode,
    autoRefresh: !publicMode
  });
  const [currentBaseDate, setCurrentBaseDate] = useState(new Date());
  const [selectedDateEvents, setSelectedDateEvents] = useState<any[] | null>(null);
  const [publicEvents, setPublicEvents] = useState<SupabaseEventoIgreja[]>([]);
  const [publicLoading, setPublicLoading] = useState(false);

  useEffect(() => {
    if (!publicMode) return;

    let mounted = true;
    const loadPublicEvents = async () => {
      setPublicLoading(true);
      const { data, error } = await supabase.rpc('get_eventos_igreja_publicos');
      if (error) throw error;
      if (mounted) {
        setPublicEvents((data || []) as SupabaseEventoIgreja[]);
        setPublicLoading(false);
      }
    };

    loadPublicEvents().catch((error) => {
      console.error('Erro ao carregar agenda publica:', error);
      if (mounted) setPublicLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [publicMode]);

  const getMonthRange = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  };

  const { start, end } = useMemo(() => getMonthRange(currentBaseDate), [currentBaseDate]);

  const monthEvents = useMemo(
    () => generateChurchEventOccurrences(publicMode ? publicEvents : eventsRaw || [], start, end, { agendaOnly: true }),
    [end, eventsRaw, publicEvents, publicMode, start]
  );

  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const handlePrevMonth = () => {
    setCurrentBaseDate(new Date(currentBaseDate.getFullYear(), currentBaseDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentBaseDate(new Date(currentBaseDate.getFullYear(), currentBaseDate.getMonth() + 1, 1));
  };

  const getEventsForDate = (day: number) => {
    return monthEvents.filter(e => {
      const eventDate = new Date(e.startsAt);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentBaseDate.getMonth() &&
        eventDate.getFullYear() === currentBaseDate.getFullYear()
      );
    });
  };

  const formatTime = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) {
        return 'Horário inválido';
      }
      return new Intl.DateTimeFormat('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }).format(date);
    } catch (error) {
      console.error('Erro ao formatar horário:', error, isoDate);
      return 'Erro';
    }
  };

  const renderMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
    const monthDates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

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
                    {dayEvents.slice(0, 2).map((event, idx) => (
                      <p key={`${day}-event-${idx}`} className="text-[6px] font-black text-brand uppercase truncate leading-none">
                        {event.titulo}
                      </p>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-[6px] font-bold text-slate-400 uppercase">+{dayEvents.length - 2}</p>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 px-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">Agenda</p>
          <h1 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Calendário de Eventos
          </h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button onClick={handlePrevMonth} className="bg-white dark:bg-slate-800 text-slate-400 h-10 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 hover:text-brand transition-all sm:w-10">
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
          <button onClick={handleNextMonth} className="bg-white dark:bg-slate-800 text-slate-400 h-10 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 hover:text-brand transition-all sm:w-10">
            <i className="fas fa-chevron-right text-xs"></i>
          </button>
        </div>
      </div>

      <div className="px-4">
        {loading || publicLoading ? (
          <div className="flex h-56 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ) : (
          <div className="flex justify-center">
            {renderMonth(currentBaseDate)}
          </div>
        )}
      </div>

      {/* Modal com detalhes dos eventos */}
      {selectedDateEvents && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 antialiased">
          <div className="absolute inset-0 bg-slate-900/80" onClick={() => setSelectedDateEvents(null)}></div>
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#f4f7fa] dark:bg-[#0b1120] rounded-[2rem] shadow-2xl overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800">
            <div className="p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter uppercase leading-none">
                  Eventos do Dia
                </h3>
                <button onClick={() => setSelectedDateEvents(null)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-all border border-slate-100 dark:border-slate-700 shadow-sm">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="space-y-4">
                {selectedDateEvents.map((event) => (
                  <div key={event.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                    <div className="flex gap-3">
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand/10 text-brand">
                        <span className="text-xs font-black uppercase">
                          {new Date(event.startsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                        <span className="text-[10px] font-bold">{formatTime(event.startsAt)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">{event.titulo}</h4>
                        {event.local && (
                          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                            <i className="fas fa-map-marker-alt mr-1"></i>
                            {event.local}
                          </p>
                        )}
                        {event.descricao && (
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-3">
                            {event.descricao}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChurchAgenda;
