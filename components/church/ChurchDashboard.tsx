import React, { useEffect, useMemo, useState } from 'react';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { supabase } from '../../supabaseClient';
import { SupabaseEventoIgreja, SupabaseMembro, SupabaseNovoConvertidoIgreja, SupabaseVisitanteIgreja } from '../../types-supabase';
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

const formatGroupedDates = (event: any) => {
  const occurrences = Array.isArray(event.weekOccurrences) ? event.weekOccurrences : [];
  if (occurrences.length <= 1) return formatDate(event.startsAt);

  const formatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
  const groups = occurrences.map((occurrence: any) => {
    const date = new Date(occurrence.startsAt);
    const day = formatter.format(date).replace('.', '');
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${day} ${time}`;
  });

  return groups.join(' e ');
};

const normalize = (value?: string | null) =>
  (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const OperationalMetric: React.FC<{ label: string; value: number; detail: string }> = ({ label, value, detail }) => (
  <div className="app-panel rounded-2xl px-4 py-4">
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-muted">{label}</p>
    <p className="mt-2 text-3xl font-black leading-none text-slate-900 dark:text-white">{value}</p>
    <p className="mt-2 text-xs font-medium leading-relaxed text-app-muted">{detail}</p>
  </div>
);

const alertToneClasses: Record<'warning' | 'info' | 'success', string> = {
  warning: 'border-amber-200/80 bg-amber-50/90 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200',
  info: 'border-sky-200/80 bg-sky-50/90 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200',
  success: 'border-emerald-200/80 bg-emerald-50/90 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
};

const alertToneIcons: Record<'warning' | 'info' | 'success', string> = {
  warning: 'fas fa-triangle-exclamation',
  info: 'fas fa-circle-info',
  success: 'fas fa-circle-check'
};

const ChurchAlertCard: React.FC<{
  tone: 'warning' | 'info' | 'success';
  title: string;
  detail: string;
}> = ({ tone, title, detail }) => (
  <div className={`rounded-2xl border px-4 py-4 ${alertToneClasses[tone]}`}>
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 dark:bg-slate-950/30">
        <i className={`${alertToneIcons[tone]} text-sm`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-black leading-tight">{title}</p>
        <p className="mt-1 text-xs font-medium leading-relaxed opacity-90">{detail}</p>
      </div>
    </div>
  </div>
);

type PublicStats = {
  total_membros: number;
  aniversariantes_mes: number;
  total_servos: number;
};

interface ChurchDashboardProps {
  currentMember?: SupabaseMembro | null;
  publicMode?: boolean;
}

const ChurchDashboard: React.FC<ChurchDashboardProps> = ({ currentMember = null, publicMode = false }) => {
  const { data: eventsRaw, loading } = useLocalStorageFirst<SupabaseEventoIgreja>({
    table: 'eventos_igreja',
    enableBackgroundSync: !publicMode,
    autoRefresh: !publicMode
  });
  const { data: membersRaw } = useLocalStorageFirst<SupabaseMembro>({
    table: 'membros',
    enableBackgroundSync: !publicMode,
    autoRefresh: !publicMode
  });
  const { data: visitorsRaw } = useLocalStorageFirst<SupabaseVisitanteIgreja>({
    table: 'visitantes_igreja',
    enableBackgroundSync: !publicMode,
    autoRefresh: !publicMode
  });
  const { data: convertsRaw } = useLocalStorageFirst<SupabaseNovoConvertidoIgreja>({
    table: 'novos_convertidos_igreja',
    enableBackgroundSync: !publicMode,
    autoRefresh: !publicMode
  });
  const { start, end } = useMemo(getWeekRange, []);
  const [activeSlide, setActiveSlide] = useState(0);
  const [expandedEvent, setExpandedEvent] = useState<any | null>(null);
  const [dailyVerse, setDailyVerse] = useState('');
  const [publicEvents, setPublicEvents] = useState<SupabaseEventoIgreja[]>([]);
  const [publicBirthdays, setPublicBirthdays] = useState<SupabaseMembro[]>([]);
  const [publicServants, setPublicServants] = useState<SupabaseMembro[]>([]);
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);
  const [publicLoading, setPublicLoading] = useState(false);
  const [kpiModal, setKpiModal] = useState<'birthdays' | 'servants' | null>(null);

  useEffect(() => {
    if (!publicMode) return;

    let mounted = true;
    const loadPublicData = async () => {
      setPublicLoading(true);
      const [eventsResponse, statsResponse, birthdaysResponse, servantsResponse] = await Promise.all([
        supabase.rpc('get_eventos_igreja_publicos'),
        supabase.rpc('get_inicio_igreja_public_stats'),
        supabase.rpc('get_aniversariantes_mes_publicos'),
        supabase.rpc('get_servos_igreja_publicos')
      ]);

      if (!mounted) return;
      setPublicEvents((eventsResponse.data || []) as SupabaseEventoIgreja[]);
      setPublicStats(((statsResponse.data || [])[0] || null) as PublicStats | null);
      setPublicBirthdays((birthdaysResponse.data || []) as SupabaseMembro[]);
      setPublicServants((servantsResponse.data || []) as SupabaseMembro[]);
      setPublicLoading(false);
    };

    loadPublicData().catch((error) => {
      console.error('Erro ao carregar inicio publico da igreja:', error);
      if (mounted) setPublicLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [publicMode]);

  const dashboardEvents = publicMode ? publicEvents : eventsRaw || [];

  const weekEvents = useMemo(
    () => {
      type ChurchDashboardEvent = ReturnType<typeof generateChurchEventOccurrences>[number] & {
        weekOccurrences?: ReturnType<typeof generateChurchEventOccurrences>;
      };
      const grouped = new Map<string, ChurchDashboardEvent>();

      generateChurchEventOccurrences(dashboardEvents, start, end, { dashboardOnly: true }).forEach((event) => {
        const existing = grouped.get(event.eventId);
        if (!existing) {
          grouped.set(event.eventId, { ...event, weekOccurrences: [event] });
          return;
        }

        const weekOccurrences = [...(existing.weekOccurrences || []), event].sort(
          (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
        );
        const firstOccurrence = weekOccurrences[0];
        grouped.set(event.eventId, { ...firstOccurrence, weekOccurrences });
      });

      return Array.from(grouped.values())
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() || b.prioridade - a.prioridade)
        .slice(0, 8);
    },
    [dashboardEvents, end, start]
  );

  const members = publicMode ? [] : membersRaw || [];
  const visitors = publicMode ? [] : visitorsRaw || [];
  const converts = publicMode ? [] : convertsRaw || [];
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

  const servants = useMemo(
    () => members.filter((member) => normalize(member.posicao_igreja || 'membro') !== 'membro'),
    [members]
  );
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentMonthVisitors = useMemo(
    () =>
      visitors.filter((item) => {
        if (!item.data_ficha) return false;
        const date = new Date(`${item.data_ficha}T12:00:00`);
        return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
      }),
    [currentMonth, currentYear, visitors]
  );
  const currentMonthConverts = useMemo(
    () =>
      converts.filter((item) => {
        if (!item.data_conversao) return false;
        const date = new Date(`${item.data_conversao}T12:00:00`);
        return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
      }),
    [converts, currentMonth, currentYear]
  );
  const followUpSummary = useMemo(
    () => ({
      visitorsThisMonth: currentMonthVisitors.length,
      convertsThisMonth: currentMonthConverts.length,
      prayerRequests: currentMonthVisitors.filter((item) => item.deseja_oracao_lar).length,
      counselingRequests: currentMonthVisitors.filter((item) => item.deseja_aconselhamento).length,
      infoRequests: currentMonthVisitors.filter((item) => item.deseja_informacoes_igreja).length,
      eventsThisWeek: weekEvents.length
    }),
    [currentMonthConverts.length, currentMonthVisitors, weekEvents.length]
  );
  const churchAlerts = useMemo(() => {
    if (publicMode) return [];

    const alerts: Array<{ id: string; tone: 'warning' | 'info' | 'success'; title: string; detail: string }> = [];

    if (followUpSummary.prayerRequests > 0) {
      alerts.push({
        id: 'prayer-requests',
        tone: 'warning',
        title: `${followUpSummary.prayerRequests} pedido(s) de oracao no lar`,
        detail: 'Ha visitantes aguardando retorno pastoral ou contato da equipe.'
      });
    }

    if (followUpSummary.counselingRequests > 0) {
      alerts.push({
        id: 'counseling-requests',
        tone: 'warning',
        title: `${followUpSummary.counselingRequests} pedido(s) de aconselhamento`,
        detail: 'Vale conferir quem pediu apoio espiritual neste mes.'
      });
    }

    if (followUpSummary.convertsThisMonth > 0) {
      alerts.push({
        id: 'new-converts',
        tone: 'success',
        title: `${followUpSummary.convertsThisMonth} novo(s) convertido(s) neste mes`,
        detail: 'Ha registros novos para acompanhamento e consolidacao.'
      });
    }

    if (followUpSummary.eventsThisWeek === 0) {
      alerts.push({
        id: 'no-week-events',
        tone: 'info',
        title: 'Nenhum evento ativo nesta semana',
        detail: 'A agenda desta semana esta vazia. Revise Cadastros > Eventos se isso nao era esperado.'
      });
    }

    if (followUpSummary.visitorsThisMonth > 0 && !followUpSummary.prayerRequests && !followUpSummary.counselingRequests) {
      alerts.push({
        id: 'visitors-month',
        tone: 'info',
        title: `${followUpSummary.visitorsThisMonth} visitante(s) registrados neste mes`,
        detail: 'Os visitantes deste periodo podem ser revisados para acompanhamento da equipe.'
      });
    }

    return alerts.slice(0, 4);
  }, [followUpSummary, publicMode]);

  const totalMembersCount = publicMode ? publicStats?.total_membros || 0 : members.length;
  const birthdaysCount = publicMode ? publicStats?.aniversariantes_mes || 0 : birthdays.length;
  const servantsCount = publicMode ? publicServants.length || publicStats?.total_servos || 0 : servants.length;
  const birthdayMembers = publicMode ? publicBirthdays : birthdays;
  const servantMembers = publicMode ? publicServants : servants;

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
  const firstName = publicMode ? 'Visitante' : getDisplayName(currentMember).split(' ')[0] || 'Membro';

  const renderEventMedia = (event: any, index: number, className = '') => {
    const desktopUrl = event.imagem_url_desktop || event.imagem_url || event.imagem_url_mobile;
    const mobileUrl = event.imagem_url_mobile || event.imagem_url || event.imagem_url_desktop;

    if (desktopUrl || mobileUrl) {
      return (
        <>
          <ImageCache
            src={mobileUrl || ''}
            alt={event.titulo}
            className={`h-full w-full object-cover lg:hidden ${className}`}
            disableCompression
          />
          <ImageCache
            src={desktopUrl || ''}
            alt={event.titulo}
            className={`hidden h-full w-full object-cover lg:block ${className}`}
            disableCompression
          />
        </>
      );
    }

    return <div className={`h-full w-full ${className}`} style={{ background: fallbackImages[index % fallbackImages.length] }} />;
  };

  const kpiCards = [
    {
      label: 'Total de membros',
      value: totalMembersCount,
      detail: 'Cadastros da igreja',
      icon: 'fas fa-users',
      className: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
    },
    {
      label: 'Aniversariantes',
      value: birthdaysCount,
      detail: publicMode
        ? 'Aniversariantes do mes'
        : birthdays.length
          ? birthdays.slice(0, 3).map((member) => getDisplayName(member).split(' ')[0]).join(', ')
          : 'Nenhum este mes',
      icon: 'fas fa-birthday-cake',
      className: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
      onClick: () => setKpiModal('birthdays')
    },
    {
      label: 'Servos',
      value: servantsCount,
      detail: 'Pastores, levitas e liderancas',
      icon: 'fas fa-hands-praying',
      className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      onClick: () => setKpiModal('servants')
    },
    {
      label: 'Visitantes do mes',
      value: publicMode ? 0 : followUpSummary.visitorsThisMonth,
      detail: publicMode ? 'Acompanhamento interno' : `${followUpSummary.prayerRequests} com pedido de oracao`,
      icon: 'fas fa-user-plus',
      className: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
    },
    {
      label: 'Novos convertidos',
      value: publicMode ? 0 : followUpSummary.convertsThisMonth,
      detail: publicMode ? 'Acompanhamento interno' : 'Registros do mes atual',
      icon: 'fas fa-seedling',
      className: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
    }
  ];

  const modalMembers = kpiModal === 'birthdays' ? birthdayMembers : servantMembers;
  const modalTitle = kpiModal === 'birthdays' ? 'Aniversariantes do mes' : 'Servos';
  const modalIcon = kpiModal === 'birthdays' ? 'fas fa-birthday-cake' : 'fas fa-hands-praying';

  const renderKpiCard = (card: typeof kpiCards[number]) => (
    <button
      type="button"
      key={card.label}
      onClick={card.onClick}
      className="app-card group rounded-[1.35rem] border border-sky-100/90 bg-white/94 p-3 text-left shadow-[0_28px_70px_-42px_rgba(14,116,144,0.28)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/10 dark:border-white/10 dark:bg-slate-900/88 sm:rounded-[1.65rem] sm:p-4"
    >
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div className={`order-1 flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110 sm:order-2 sm:h-12 sm:w-12 sm:rounded-2xl ${card.className}`}>
          <i className={`${card.icon} text-sm sm:text-lg`} />
        </div>
        <div className="order-2 min-w-0 sm:order-1">
          <p className="text-[9px] font-semibold uppercase leading-tight text-slate-600 dark:text-slate-400 sm:text-xs sm:tracking-wider">{card.label}</p>
          <p className="mt-1 text-lg font-black leading-tight text-slate-800 transition-colors group-hover:text-brand dark:text-white sm:text-2xl">{card.value}</p>
          <p className="mt-1 hidden truncate text-[10px] font-bold text-slate-400 sm:block">{card.detail}</p>
        </div>
      </div>
    </button>
  );

  const verseCard = (
    <div className="relative min-h-[320px] overflow-hidden rounded-[1.8rem] border border-sky-100/90 bg-white/94 p-5 shadow-[0_28px_70px_-42px_rgba(14,116,144,0.28)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/88 sm:p-6 lg:h-full">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-sky-200/40 blur-3xl dark:bg-brand/30" />
      <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-brand-accent/20 blur-3xl dark:bg-brand-accent/30" />
      <div className="relative flex h-full flex-col justify-center text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-sky-100 bg-white shadow-lg backdrop-blur dark:border-brand/30 dark:bg-gray-800">
          <i className="fas fa-dove text-2xl text-brand" />
        </div>
        <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Edificacao do Dia</h3>
        <div className="relative rounded-[1.5rem] border border-sky-100 bg-white/96 p-5 shadow-lg backdrop-blur-sm dark:border-brand/20 dark:bg-gray-800/88">
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
          <div className="h-px w-10 bg-sky-200 dark:bg-brand/20" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-100 bg-sky-50 dark:border-brand/20 dark:bg-brand/10">
            <i className="fas fa-cross text-sm text-brand" />
          </div>
          <div className="h-px w-10 bg-sky-200 dark:bg-brand/20" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] shadow-xl">
        <div className="relative overflow-hidden bg-brand dark:bg-brand">
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-[90px]" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand-accent/20 blur-[90px]" />

          <div className="relative px-4 py-6 text-center sm:px-6 sm:py-8 lg:px-8">
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl">
              Bem-Vindo ao <span className="relative inline-block">
                <span className="relative z-10 text-brand-accent">Valentes Connected</span>
                <span className="absolute inset-0 scale-110 bg-brand-accent/20 blur-xl" />
                <span className="absolute inset-0 scale-125 bg-brand-accent/10 blur-2xl" />
              </span>
            </h1>
            <p className="mt-2 text-sm font-black text-white/80 sm:text-base">{firstName}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)] lg:items-stretch">
        <div className="order-1 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:col-span-2 xl:grid-cols-5">
          {kpiCards.map(renderKpiCard)}
        </div>

        <div className="order-2 flex min-w-0 flex-col items-center lg:col-start-1 lg:items-stretch">
          {loading || publicLoading ? (
            <div className="flex aspect-[9/16] w-full max-w-[360px] items-center justify-center rounded-[1.75rem] border border-sky-100/90 bg-white/94 shadow-[0_28px_70px_-42px_rgba(14,116,144,0.28)] dark:border-white/10 dark:bg-slate-900/88 lg:aspect-video lg:max-w-none">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
            </div>
          ) : weekEvents.length === 0 ? (
            <div className="flex aspect-[9/16] w-full max-w-[360px] items-center justify-center rounded-[1.75rem] border border-dashed border-sky-100 bg-white/94 p-8 text-center shadow-[0_28px_70px_-42px_rgba(14,116,144,0.28)] dark:border-slate-700 dark:bg-slate-900/88 lg:aspect-video lg:max-w-none">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Nenhum evento ativo para esta semana.</p>
            </div>
          ) : (
            <div className="w-full max-w-[360px] space-y-3 lg:max-w-none">
              <div className="relative aspect-[9/16] overflow-hidden rounded-[1.75rem] border border-sky-100/80 bg-slate-900 shadow-[0_28px_70px_-42px_rgba(14,116,144,0.28)] dark:border-white/10 lg:aspect-video">
                {activeEvent && (
                  <button type="button" onClick={() => setExpandedEvent(activeEvent)} className="block h-full w-full text-left">
                    <div className="absolute inset-0">{renderEventMedia(activeEvent, activeSlide)}</div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/70">{formatGroupedDates(activeEvent)}</p>
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

        <div className="order-3 lg:col-start-2 lg:row-start-2 lg:self-stretch">
          {verseCard}
        </div>

      </section>

      {!publicMode && (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="app-card rounded-[1.75rem] border border-sky-100/90 bg-white/94 p-5 shadow-[0_28px_70px_-42px_rgba(14,116,144,0.28)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/88 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand">Consolidacao</p>
                <h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white">Indicadores do mes</h2>
              </div>
              <span className="rounded-full bg-brand/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand">
                {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date())}
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <OperationalMetric label="Visitantes registrados" value={followUpSummary.visitorsThisMonth} detail="Cadastros feitos neste mes" />
              <OperationalMetric label="Pedidos de oracao" value={followUpSummary.prayerRequests} detail="Visitantes pedindo oracao no lar" />
              <OperationalMetric label="Aconselhamentos" value={followUpSummary.counselingRequests} detail="Solicitacoes de apoio espiritual" />
              <OperationalMetric label="Busca por informacoes" value={followUpSummary.infoRequests} detail="Interessados em conhecer a igreja" />
              <OperationalMetric label="Novos convertidos" value={followUpSummary.convertsThisMonth} detail="Registros com data de conversao neste mes" />
              <OperationalMetric label="Eventos nesta semana" value={followUpSummary.eventsThisWeek} detail="Eventos ativos visiveis no inicio da igreja" />
            </div>
          </div>

          <div className="app-card rounded-[1.75rem] border border-sky-100/90 bg-white/94 p-5 shadow-[0_28px_70px_-42px_rgba(14,116,144,0.28)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/88 sm:p-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand">Alertas</p>
              <h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white">Pontos que pedem atencao</h2>
            </div>
            <div className="mt-5 space-y-3">
              {churchAlerts.length === 0 ? (
                <div className="app-panel-muted rounded-2xl border border-dashed border-app px-5 py-8 text-center">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Nenhum alerta relevante agora</p>
                  <p className="mt-1 text-xs font-medium text-app-muted">
                    O painel nao encontrou pendencias criticas com base em visitantes, convertidos e agenda.
                  </p>
                </div>
              ) : (
                churchAlerts.map((alert) => <ChurchAlertCard key={alert.id} {...alert} />)
              )}
            </div>
          </div>
        </section>
      )}

      {expandedEvent && (
        <div className="fixed inset-0 z-[760] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
          <div className="relative aspect-[9/16] h-[92vh] max-h-[920px] max-w-[92vw] overflow-hidden rounded-[1.75rem] bg-slate-900 shadow-2xl lg:aspect-video lg:h-auto lg:w-[92vw] lg:max-w-6xl">
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
                  {formatGroupedDates(expandedEvent)}
                </p>
                <h2 className="text-3xl font-black tracking-tight sm:text-5xl">{expandedEvent.titulo}</h2>
                {expandedEvent.local && <p className="mt-3 text-sm font-semibold text-white/80">{expandedEvent.local}</p>}
                {expandedEvent.descricao && <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-white/80">{expandedEvent.descricao}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {kpiModal && (
        <div className="fixed inset-0 z-[760] overflow-y-auto bg-slate-950/70 px-3 py-4 pb-24 backdrop-blur-sm sm:px-4 sm:py-6">
          <div className="mx-auto max-w-2xl rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <i className={modalIcon} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand">Inicio da Igreja</p>
                  <h2 className="truncate text-xl font-black text-slate-900 dark:text-white">{modalTitle}</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setKpiModal(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 hover:text-red-500 dark:bg-slate-800"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {modalMembers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Nenhum membro encontrado.
                </div>
              ) : (
                modalMembers.map((member) => {
                  const name = getDisplayName(member);
                  const photo = sanitizeImageUrl(member.foto) || buildLocalAvatar(name);
                  const birthday = member.data_nasc
                    ? new Date(`${member.data_nasc}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                    : null;
                  const detail =
                    kpiModal === 'birthdays'
                      ? birthday || 'Aniversario'
                      : [member.posicao_igreja, member.ministerio_levita].filter(Boolean).join(' - ') || 'Servo';

                  return (
                    <div key={member.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                      <ImageCache src={photo} fallbackSrc={buildLocalAvatar(name)} alt={name} className="h-12 w-12 rounded-2xl object-cover" disableCompression />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-black text-slate-900 dark:text-white">{name}</h3>
                        <p className="truncate text-xs font-bold text-brand">{detail}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChurchDashboard;
