import React, { useMemo } from 'react';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { SupabaseEventoIgreja } from '../../types-supabase';
import { generateChurchEventOccurrences } from '../../utils/churchEvents';

const getMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

const formatDay = (isoDate: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(isoDate));

const formatTime = (isoDate: string) =>
  new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(isoDate));

const ChurchAgenda: React.FC = () => {
  const { data: eventsRaw, loading } = useLocalStorageFirst<SupabaseEventoIgreja>({ table: 'eventos_igreja' });
  const { start, end } = useMemo(getMonthRange, []);

  const monthEvents = useMemo(
    () => generateChurchEventOccurrences(eventsRaw || [], start, end, { agendaOnly: true }),
    [end, eventsRaw, start]
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">Agenda</p>
        <h1 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Eventos do mês
        </h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex h-56 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ) : monthEvents.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
            Nenhum evento encontrado para este mês.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {monthEvents.map((event) => (
              <div key={event.id} className="flex gap-3 p-3 sm:gap-4 sm:p-5">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand/10 text-brand sm:h-16 sm:w-16">
                  <span className="text-xs font-black uppercase">{formatDay(event.startsAt)}</span>
                  <span className="text-[10px] font-bold">{formatTime(event.startsAt)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-black text-slate-900 dark:text-white sm:text-base">{event.titulo}</h2>
                  {event.local && <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{event.local}</p>}
                  {event.descricao && <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{event.descricao}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChurchAgenda;
