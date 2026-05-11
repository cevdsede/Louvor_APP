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

  const kpiCards = [
    {
      label: 'Total de membros',
      value: members.length,
      detail: 'Cadastros da igreja',
      icon: 'fas fa-users',
      className: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
    },
    {
      label: 'Aniversariantes',
      value: birthdays.length,
      detail: birthdays.length ? birthdays.slice(0, 3).map((member) => getDisplayName(member).split(' ')[0]).join(', ') : 'Nenhum este mes',
      icon: 'fas fa-birthday-cake',
      className: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'
    },
    {
      label: 'Eventos da semana',
      value: weekEvents.length,
      detail: activeEvent?.titulo || 'Nenhum evento',
      icon: 'fas fa-calendar-week',
      className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
    }
  ];

  const renderKpiCard = (card: typeof kpiCards[number]) => (
    <div key={card.label} className="group rounded-xl border border-slate-200 bg-white p-3 shadow-lg transition-all duration-300 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800/50 sm:rounded-2xl sm:p-4">
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div className={`order-1 flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-110 sm:order-2 sm:h-12 sm:w-12 sm:rounded-xl ${card.className}`}>
          <i className={`${card.icon} text-sm sm:text-lg`} />
        </div>
        <div className="order-2 min-w-0 sm:order-1">
          <p className="text-[9px] font-semibold uppercase leading-tight text-slate-600 dark:text-slate-400 sm:text-xs sm:tracking-wider">{card.label}</p>
          <p className="mt-1 text-lg font-black leading-tight text-slate-800 transition-colors group-hover:text-brand dark:text-white sm:text-2xl">{card.value}</p>
          <p className="mt-1 hidden truncate text-[10px] font-bold text-slate-400 sm:block">{card.detail}</p>
        </div>
      </div>
    </div>
  );

  const verseCard = (
    <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-slate-50 to-white p-5 shadow-xl dark:border-gray-700 dark:from-gray-900 dark:to-gray-800 sm:p-6 lg:h-full">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-brand/20 blur-3xl dark:bg-brand/30" />
      <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-brand-accent/20 blur-3xl dark:bg-brand-accent/30" />
      <div className="relative flex h-full flex-col justify-center text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand/20 bg-white/80 shadow-lg backdrop-blur dark:bg-gray-800">
          <i className="fas fa-dove text-2xl text-brand" />
        </div>
        <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Edificacao do Dia</h3>
        <div className="relative rounded-2xl border border-brand/10 bg-white/60 p-5 shadow-lg backdrop-blur-sm dark:border-brand/20 dark:bg-gray-800/80">
          <p
            className="font-serif italic leading-relaxed text-gray-700 dark:text-gray-200"
            style={{
              fontSize: dailyVerse.length > 150 ? '0.875rem' : dailyVerse.length > 100 ? '1rem' : '1.125rem',
              lineHeight: dailyVerse.length > 150 ? '1.4' : '1.5'
            }}
          >
            "{dailyVerse || 'Carregando...'}"
          </p>
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="h-px w-10 bg-brand/20" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-brand/20 bg-brand/10">
            <i className="fas fa-cross text-sm text-brand" />
          </div>
          <div className="h-px w-10 bg-brand/20" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">Igreja</p>
        <h1 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Inicio
        </h1>
      </div>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(260px,360px)_minmax(320px,440px)] lg:grid-rows-[auto_1fr] lg:items-center lg:justify-center xl:grid-cols-[minmax(300px,400px)_minmax(360px,460px)]">
        <div className="order-1 grid grid-cols-3 gap-2 sm:gap-3 lg:col-start-1 lg:row-start-1 lg:grid-cols-1">
          {kpiCards.map(renderKpiCard)}
        </div>

        <div className="order-2 flex min-w-0 flex-col items-center lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {loading ? (
            <div className="flex aspect-[9/16] w-full max-w-[360px] items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
            </div>
          ) : weekEvents.length === 0 ? (
            <div className="flex aspect-[9/16] w-full max-w-[360px] items-center justify-center rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Nenhum evento ativo para esta semana.</p>
            </div>
          ) : (
            <div className="w-full max-w-[360px] space-y-3 xl:max-w-[400px]">
              <div className="relative aspect-[9/16] overflow-hidden rounded-[1.75rem] bg-slate-900 shadow-xl">
                {activeEvent && (
                  <button type="button" onClick={() => setExpandedEvent(activeEvent)} className="block h-full w-full text-left">
                    <div className="absolute inset-0">{renderEventMedia(activeEvent, activeSlide)}</div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/70">{formatDate(activeEvent.startsAt)}</p>
                      <h2 className="text-2xl font-black tracking-tight">{activeEvent.titulo}</h2>
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
            </div>
          )}
        </div>

        <div className="order-3 lg:col-start-1 lg:row-start-2 lg:self-stretch">{verseCard}</div>
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
          <div className="relative aspect-[9/16] h-[92vh] max-h-[920px] max-w-[92vw] overflow-hidden rounded-[1.75rem] bg-slate-900 shadow-2xl">
            <button
              type="button"
              onClick={() => setExpandedEvent(null)}
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
            >
              <i className="fas fa-times" />
            </button>
            <div className="relative h-full w-full">
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
