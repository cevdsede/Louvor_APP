import React, { useMemo } from 'react';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { SupabaseEventoIgreja } from '../../types-supabase';
import { generateChurchEventOccurrences } from '../../utils/churchEvents';

const fallbackImages = [
  'linear-gradient(135deg, #0f766e, #2563eb)',
  'linear-gradient(135deg, #7c3aed, #db2777)',
  'linear-gradient(135deg, #b45309, #dc2626)'
];

const getWeekRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const formatDate = (isoDate: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(isoDate));

const ChurchDashboard: React.FC = () => {
  const { data: eventsRaw, loading } = useLocalStorageFirst<SupabaseEventoIgreja>({ table: 'eventos_igreja' });
  const { start, end } = useMemo(getWeekRange, []);

  const weekEvents = useMemo(
    () => generateChurchEventOccurrences(eventsRaw || [], start, end, { dashboardOnly: true }).slice(0, 8),
    [end, eventsRaw, start]
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">Igreja</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Eventos da semana
        </h1>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        </div>
      ) : weekEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Nenhum evento ativo para esta semana.
          </p>
        </div>
      ) : (
        <div className="flex snap-x gap-4 overflow-x-auto pb-2">
          {weekEvents.map((event, index) => (
            <article
              key={event.id}
              className="relative h-72 min-w-[280px] snap-start overflow-hidden rounded-2xl bg-slate-900 shadow-xl sm:min-w-[360px]"
            >
              {event.imagem_url ? (
                <img src={event.imagem_url} alt={event.titulo} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0" style={{ background: fallbackImages[index % fallbackImages.length] }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/70">
                  {formatDate(event.startsAt)}
                </p>
                <h2 className="text-2xl font-black tracking-tight">{event.titulo}</h2>
                {event.local && <p className="mt-2 text-sm font-semibold text-white/80">{event.local}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChurchDashboard;
