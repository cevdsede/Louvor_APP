import React, { useEffect, useMemo, useState } from 'react';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { SupabaseEventoIgreja, SupabaseMembro } from '../../types-supabase';
import { generateChurchEventOccurrences } from '../../utils/churchEvents';
import DashboardService from '../../services/DashboardService';
import { buildLocalAvatar } from '../../utils/avatar';
import { getDisplayName } from '../../utils/displayName';
import { sanitizeImageUrl } from '../../utils/imageUrl';
import { ImageCache } from '../ui/ImageCache';

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

const normalize = (value?: string | null) =>
  (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const ChurchDashboard: React.FC = () => {
  const { data: eventsRaw, loading } = useLocalStorageFirst<SupabaseEventoIgreja>({ table: 'eventos_igreja' });
  const { data: membersRaw } = useLocalStorageFirst<SupabaseMembro>({ table: 'membros' });
  const { start, end } = useMemo(getWeekRange, []);
  const [activeSlide, setActiveSlide] = useState(0);
  const [expandedEvent, setExpandedEvent] = useState<any | null>(null);
  const [dailyVerse, setDailyVerse] = useState('');

  const weekEvents = useMemo(
    () => generateChurchEventOccurrences(eventsRaw || [], start, end, { dashboardOnly: true }).slice(0, 8),
    [end, eventsRaw, start]
  );

  const members = membersRaw || [];
  const birthdays = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    return members
      .filter((member) => {
        if (!member.data_nasc) return false;
        return new Date(`${member.data_nasc}T12:00:00`).getMonth() + 1 === currentMonth;
      })
      .sort((a, b) => {
        const dayA = new Date(`${a.data_nasc}T12:00:00`).getDate();
        const dayB = new Date(`${b.data_nasc}T12:00:00`).getDate();
        return dayA - dayB;
      });
  }, [members]);

  const pastors = useMemo(
    () =>
      members
        .filter((member) => normalize(member.posicao_igreja).includes('pastor'))
        .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b))),
    [members]
  );

  useEffect(() => {
    DashboardService.getVersiculoDiario().then(setDailyVerse).catch(() => setDailyVerse(''));
  }, []);

  useEffect(() => {
    if (weekEvents.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % weekEvents.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [weekEvents.length]);

  useEffect(() => {
    if (activeSlide >= weekEvents.length) {
      setActiveSlide(0);
    }
  }, [activeSlide, weekEvents.length]);

  const activeEvent = weekEvents[activeSlide];

  const renderEventMedia = (event: any, index: number, className = '') => {
    if (event.imagem_url) {
      return (
        <ImageCache
          src={event.imagem_url}
          alt={event.titulo}
          className={`h-full w-full object-cover ${className}`}
          disableCompression
        />
      );
    }

    return <div className={`h-full w-full ${className}`} style={{ background: fallbackImages[index % fallbackImages.length] }} />;
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">Igreja</p>
        <h1 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Inicio
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
        <section className="space-y-3">
          <div className="relative h-[22rem] overflow-hidden rounded-2xl bg-slate-900 shadow-xl sm:h-[26rem]">
            {activeEvent && (
              <button type="button" onClick={() => setExpandedEvent(activeEvent)} className="block h-full w-full text-left">
                <div className="absolute inset-0">{renderEventMedia(activeEvent, activeSlide)}</div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/70">
                    {formatDate(activeEvent.startsAt)}
                  </p>
                  <h2 className="max-w-3xl text-2xl font-black tracking-tight sm:text-4xl">{activeEvent.titulo}</h2>
                  {activeEvent.local && <p className="mt-2 text-sm font-semibold text-white/80">{activeEvent.local}</p>}
                  <span className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest backdrop-blur">
                    <i className="fas fa-expand" />
                    Ver card
                  </span>
                </div>
              </button>
            )}
            {weekEvents.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSlide((activeSlide - 1 + weekEvents.length) % weekEvents.length)}
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
                >
                  <i className="fas fa-chevron-left text-xs" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSlide((activeSlide + 1) % weekEvents.length)}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
                >
                  <i className="fas fa-chevron-right text-xs" />
                </button>
              </>
            )}
          </div>
          {weekEvents.length > 1 && (
            <div className="flex justify-center gap-2">
              {weekEvents.map((event, index) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  className={`h-2 rounded-full transition-all ${index === activeSlide ? 'w-8 bg-brand' : 'w-2 bg-slate-300 dark:bg-slate-700'}`}
                  aria-label={`Ir para ${event.titulo}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total de membros</p>
          <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{members.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aniversariantes</p>
          <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{birthdays.length}</p>
          <p className="mt-1 truncate text-xs font-bold text-slate-500 dark:text-slate-400">
            {birthdays.length ? birthdays.slice(0, 3).map((member) => getDisplayName(member).split(' ')[0]).join(', ') : 'Nenhum este mes'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Versiculo do dia</p>
          <p className="mt-2 line-clamp-3 text-sm font-bold leading-relaxed text-slate-700 dark:text-slate-200">{dailyVerse || 'Carregando...'}</p>
        </div>
      </section>

      {pastors.length > 0 && (
        <section className="space-y-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">Lideranca</p>
            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">Pastores presidentes</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pastors.map((pastor) => {
              const name = getDisplayName(pastor);
              const photo = sanitizeImageUrl(pastor.foto) || buildLocalAvatar(name);
              return (
                <article key={pastor.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <ImageCache src={photo} fallbackSrc={buildLocalAvatar(name)} alt={name} className="h-16 w-16 rounded-2xl object-cover" disableCompression />
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-black text-slate-900 dark:text-white">{name}</h3>
                    <p className="text-xs font-bold text-brand">{pastor.posicao_igreja || 'Pastor(a)'}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {expandedEvent && (
        <div className="fixed inset-0 z-[760] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
          <div className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-slate-900 shadow-2xl">
            <button
              type="button"
              onClick={() => setExpandedEvent(null)}
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
            >
              <i className="fas fa-times" />
            </button>
            <div className="relative h-[78vh] min-h-[28rem]">
              {renderEventMedia(expandedEvent, activeSlide)}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/70">
                  {formatDate(expandedEvent.startsAt)}
                </p>
                <h2 className="text-3xl font-black tracking-tight sm:text-5xl">{expandedEvent.titulo}</h2>
                {expandedEvent.local && <p className="mt-3 text-sm font-semibold text-white/80">{expandedEvent.local}</p>}
                {expandedEvent.descricao && <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-white/80">{expandedEvent.descricao}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChurchDashboard;
