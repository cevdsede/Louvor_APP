import React, { useEffect, useMemo, useState } from 'react';
import { ChurchSiteContent, fetchSiteContent, loadSiteContent } from './siteContent';
import { supabase } from '../../supabaseClient';
import { SupabaseEventoIgreja } from '../../types-supabase';
import { generateChurchEventOccurrences } from '../../utils/churchEvents';
import DashboardService from '../../services/DashboardService';
import { buildLocalAvatar } from '../../utils/avatar';
import { getDisplayName } from '../../utils/displayName';
import { sanitizeImageUrl } from '../../utils/imageUrl';

interface PublicChurchShellProps {
  onLoginClick: () => void;
}

const navItems = ['Inicio', 'Sobre', 'Eventos', 'Ministerios', 'Pedido de Oracao', 'Contribua', 'Contato'];

const sectionId = (label: string) =>
  label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replaceAll(' ', '-');

const whatsappUrl = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}`;
};

const eventFallbackImages = [
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=900&q=80'
];

const getCurrentWeekRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const formatEventDate = (isoDate: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
    .format(new Date(isoDate))
    .replace('.', '');

const formatGroupedEventDates = (event: any) => {
  const occurrences = Array.isArray(event.occurrences) ? event.occurrences : [];
  if (occurrences.length <= 1) return formatEventDate(event.startsAt);

  const formatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
  return occurrences
    .map((occurrence: any) => {
      const date = new Date(occurrence.startsAt);
      const day = formatter.format(date).replace('.', '');
      const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `${day} ${time}`;
    })
    .join(' e ');
};

const PublicChurchShell: React.FC<PublicChurchShellProps> = ({ onLoginClick }) => {
  const [content, setContent] = useState<ChurchSiteContent>(() => loadSiteContent());
  const [publicEvents, setPublicEvents] = useState<SupabaseEventoIgreja[]>([]);
  const [publicPastors, setPublicPastors] = useState<any[]>([]);
  const [dailyVerse, setDailyVerse] = useState('');
  const [instagramPosts, setInstagramPosts] = useState(content.instagramPosts);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventSlide, setEventSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { start, end } = useMemo(getCurrentWeekRange, []);
  const siteEvents = useMemo(() => {
    const grouped = new Map<string, any>();

    generateChurchEventOccurrences(publicEvents, start, end, { dashboardOnly: true }).forEach((event) => {
      const existing = grouped.get(event.eventId);
      if (!existing) {
        grouped.set(event.eventId, { ...event, occurrences: [event] });
        return;
      }

      const occurrences = [...(existing.occurrences || []), event].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      );
      grouped.set(event.eventId, { ...occurrences[0], occurrences });
    });

    return Array.from(grouped.values())
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() || b.prioridade - a.prioridade)
      .slice(0, 12);
  }, [end, publicEvents, start]);
  const categories = useMemo(
    () => ['Todos', ...Array.from(new Set(siteEvents.map((event) => event.categoria || 'Cultos')))],
    [siteEvents]
  );
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  useEffect(() => {
    const handleUpdate = (event: Event) => setContent((event as CustomEvent<ChurchSiteContent>).detail);
    const handleStorage = () => setContent(loadSiteContent());
    window.addEventListener('church-site-content-updated', handleUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('church-site-content-updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    setInstagramPosts(content.instagramPosts);
  }, [content.instagramPosts]);

  useEffect(() => {
    let mounted = true;

    const loadSiteSettings = async () => {
      try {
        const remoteContent = await fetchSiteContent();
        if (mounted) setContent(remoteContent);
      } catch (error) {
        console.warn('Nao foi possivel carregar configuracoes do site do banco. Usando cache local:', error);
      }
    };

    loadSiteSettings();

    const loadPublicData = async () => {
      setEventsLoading(true);
      const [eventsResponse, pastorsResponse, verse] = await Promise.all([
        supabase.rpc('get_eventos_igreja_publicos'),
        supabase.rpc('get_pastores_inicio_publicos'),
        DashboardService.getVersiculoDiario()
      ]);
      if (eventsResponse.error) throw eventsResponse.error;
      if (pastorsResponse.error) throw pastorsResponse.error;
      if (mounted) {
        setPublicEvents((eventsResponse.data || []) as SupabaseEventoIgreja[]);
        setPublicPastors(pastorsResponse.data || []);
        setDailyVerse(verse);
        setEventsLoading(false);
      }
    };

    loadPublicData().catch((error) => {
      console.error('Erro ao carregar dados publicos do site:', error);
      if (mounted) setEventsLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    document.title = `${content.churchName} | Valentes Connected`;
    const description = content.heroSubtitle || content.aboutBody;

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
  }, [content.aboutBody, content.churchName, content.heroSubtitle]);

  useEffect(() => {
    let mounted = true;
    const loadInstagramPosts = async () => {
      const { data, error } = await supabase.functions.invoke('instagram-feed');
      if (error) throw error;
      if (!mounted) return;
      if (Array.isArray(data?.posts) && data.posts.length > 0) {
        setInstagramPosts(data.posts);
      }
    };

    loadInstagramPosts().catch((error) => {
      console.warn('Instagram automatico indisponivel, usando posts configurados no editor:', error);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredEvents =
    selectedCategory === 'Todos' ? siteEvents : siteEvents.filter((event) => (event.categoria || 'Cultos') === selectedCategory);
  const eventPages = useMemo(() => {
    const pages = [];
    for (let index = 0; index < filteredEvents.length; index += 3) {
      pages.push(filteredEvents.slice(index, index + 3));
    }
    return pages;
  }, [filteredEvents]);

  useEffect(() => {
    setEventSlide(0);
  }, [selectedCategory, filteredEvents.length]);

  useEffect(() => {
    if (eventPages.length <= 1) return;
    const interval = window.setInterval(() => {
      setEventSlide((current) => (current + 1) % eventPages.length);
    }, 5500);
    return () => window.clearInterval(interval);
  }, [eventPages.length]);

  return (
    <div
      className="site-theme min-h-screen text-zinc-950"
      style={{
        ['--site-primary' as string]: content.primaryColor,
        ['--site-brand-primary' as string]: content.primaryColor,
        ['--site-brand-accent' as string]: content.goldColor
      }}
    >
      <header className="site-glass fixed inset-x-0 top-0 z-50 border-b bg-black/45">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <a href="#inicio" className="flex min-w-0 items-center gap-3">
            <div className="site-mark flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-black shadow-lg">
              {content.logoImage ? <img src={content.logoImage} alt={content.churchName} className="h-full w-full object-cover" /> : content.logoText}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black uppercase tracking-wide text-white">{content.churchName}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/55">Igreja Crista</p>
            </div>
          </a>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <a
                key={item}
                href={`#${sectionId(item)}`}
                className="site-nav-link rounded-full px-4 py-2 text-xs font-bold transition"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="site-glass flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-white/20 lg:hidden"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              <i className={`fas ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`} />
            </button>
            <button
              type="button"
              onClick={onLoginClick}
              className="site-button-light flex h-11 items-center gap-2 rounded-full px-4 text-xs font-black uppercase tracking-widest shadow-xl transition"
            >
              <i className="fas fa-right-to-bracket" />
              <span className="hidden sm:inline">Login</span>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="mx-4 mb-4 grid gap-2 rounded-3xl border border-white/10 bg-black/80 p-3 shadow-2xl backdrop-blur-xl lg:hidden">
            {navItems.map((item) => (
              <a
                key={item}
                href={`#${sectionId(item)}`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-widest text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                {item}
                <i className="fas fa-chevron-right text-[10px] text-white/35" />
              </a>
            ))}
          </nav>
        )}
      </header>

      <main>
        <section id="inicio" className="relative min-h-[92vh] overflow-hidden" style={{ backgroundColor: content.primaryColor }}>
          <img src={content.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#faf7ef] to-transparent" />
          <div className="absolute bottom-16 right-[8%] hidden h-72 w-72 rounded-full border border-white/10 lg:block" />
          <div className="absolute bottom-28 right-[14%] hidden h-36 w-36 rounded-full border border-white/15 lg:block" />

          <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-24">
            <div className="max-w-4xl">
              <div className="site-glass mb-6 inline-flex items-center gap-3 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/75">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: content.goldColor }} />
                {content.serviceInfo}
              </div>
              <h1 className="max-w-5xl text-5xl font-black leading-[0.96] text-white sm:text-6xl lg:text-8xl">
                {content.heroTitle}
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-white/75 sm:text-xl">{content.heroSubtitle}</p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href={content.mapUrl}
                  className="inline-flex h-14 items-center justify-center gap-3 rounded-full px-7 text-sm font-black uppercase tracking-widest text-black shadow-2xl transition hover:scale-[1.02]"
                  style={{ backgroundColor: content.goldColor }}
                >
                  <i className="fas fa-location-dot" />
                  Como Chegar
                </a>
                <a
                  href={whatsappUrl(content.whatsapp)}
                  className="site-glass inline-flex h-14 items-center justify-center gap-3 rounded-full px-7 text-sm font-black uppercase tracking-widest text-white transition hover:bg-white/20"
                >
                  <i className="fab fa-whatsapp" />
                  Fale Conosco
                </a>
              </div>
            </div>

            <div className="mt-12 grid gap-3 sm:grid-cols-3 lg:max-w-3xl">
              {[
                { value: 'Família', label: 'ambiente de cuidado e comunhao' },
                { value: 'Palavra', label: 'ensino biblico para a vida real' },
                { value: 'Serviço', label: 'pessoas preparadas para acolher' }
              ].map((item) => (
                <div key={item.value} className="site-glass rounded-2xl p-4 text-white">
                  <p className="text-lg font-black">{item.value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/50">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="sobre" className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="site-card rounded-3xl p-8 shadow-xl shadow-black/5 sm:p-10">
            <p className="site-overline">Sobre a igreja</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{content.aboutTitle}</h2>
            <p className="mt-5 text-base leading-8 text-zinc-600">
              {content.aboutBody}
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {['Acolhimento', 'Discipulado', 'Excelencia', 'Comunidade'].map((item) => (
                <span key={item} className="rounded-full border border-black/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-zinc-500">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {content.highlights.map((item) => (
              <div key={item.title} className="rounded-3xl border border-black/5 p-6 text-white shadow-xl shadow-black/10" style={{ backgroundColor: content.primaryColor }}>
                <i className={`fas ${item.icon || 'fa-sparkles'} mb-8 text-xl`} style={{ color: content.goldColor }} />
                <h3 className="text-2xl font-black">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="eventos" className="py-16 text-white" style={{ backgroundColor: content.primaryColor }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="site-overline">Eventos</p>
                <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Proximos encontros</h2>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition ${
                      selectedCategory === category ? 'site-button-light text-black' : 'site-glass text-white/60 hover:bg-white/15'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-10">
              {eventsLoading && (
                <div className="site-glass flex h-[280px] min-w-[280px] items-center justify-center rounded-[2rem] text-xs font-black uppercase tracking-widest text-white/50">
                  Carregando eventos...
                </div>
              )}
              {!eventsLoading && filteredEvents.length === 0 && (
                <div className="site-glass flex h-[280px] min-w-[280px] items-center justify-center rounded-[2rem] px-8 text-center text-xs font-black uppercase tracking-widest text-white/50">
                  Nenhum evento publico cadastrado
                </div>
              )}
              {!eventsLoading && eventPages.length > 0 && (
                <>
                  <div className="overflow-hidden">
                    <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${eventSlide * 100}%)` }}>
                      {eventPages.map((page, pageIndex) => (
                        <div key={pageIndex} className="grid min-w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
                          {page.map((event, index) => (
                            <article
                              key={event.id}
                              className="group relative h-[380px] overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl shadow-black/40"
                            >
                              <img
                                src={event.imagem_url_desktop || event.imagem_url || eventFallbackImages[(pageIndex * 3 + index) % eventFallbackImages.length]}
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                              <div className="absolute inset-x-0 bottom-0 p-6">
                                <span className="site-glass rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                                  {formatGroupedEventDates(event)}
                                </span>
                                <h3 className="mt-4 text-2xl font-black">{event.titulo}</h3>
                                <p className="mt-2 text-sm text-white/65">
                                  <i className="fas fa-location-dot mr-2" />
                                  {event.local || content.address}
                                </p>
                                <button className="mt-5 rounded-full px-5 py-3 text-xs font-black uppercase tracking-widest text-black" style={{ backgroundColor: content.goldColor }}>
                                  Saiba Mais
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {eventPages.length > 1 && (
                    <div className="mt-6 flex items-center justify-between gap-4">
                      <div className="flex gap-2">
                        {eventPages.map((_, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setEventSlide(index)}
                            className={`h-2.5 rounded-full transition-all ${eventSlide === index ? 'w-9 bg-white' : 'w-2.5 bg-white/25 hover:bg-white/50'}`}
                            aria-label={`Ir para slide ${index + 1}`}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEventSlide((current) => (current - 1 + eventPages.length) % eventPages.length)}
                          className="site-glass flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-white/20"
                          aria-label="Eventos anteriores"
                        >
                          <i className="fas fa-chevron-left" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEventSlide((current) => (current + 1) % eventPages.length)}
                          className="site-glass flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-white/20"
                          aria-label="Proximos eventos"
                        >
                          <i className="fas fa-chevron-right" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        <section id="ministerios" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="site-overline">Ministerios</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Encontre seu lugar</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.ministries.map((ministry) => (
              <div key={ministry.name} className="site-card group overflow-hidden rounded-3xl shadow-lg shadow-black/5 transition hover:-translate-y-1 hover:shadow-2xl">
                {ministry.image && <img src={ministry.image} alt="" className="h-36 w-full object-cover" />}
                <div className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white transition group-hover:scale-110" style={{ backgroundColor: content.primaryColor }}>
                    <i className={`fas ${ministry.icon || 'fa-cross'}`} style={{ color: content.goldColor }} />
                  </div>
                <h3 className="mt-8 text-xl font-black">{ministry.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="site-band py-16">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div className="rounded-3xl p-8 text-white shadow-2xl shadow-black/15" style={{ backgroundColor: content.primaryColor }}>
              <p className="site-overline">Versiculo do dia</p>
              <p className="mt-8 text-2xl font-semibold italic leading-10 text-white/90">"{dailyVerse || 'Carregando...'}"</p>
            </div>

            <div>
              <p className="site-overline">Lideranca</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight">Pastores presidentes</h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {publicPastors.length === 0 && (
                  <div className="site-card rounded-[2rem] border border-dashed border-zinc-200 p-8 text-sm font-bold text-zinc-500">
                    Nenhum pastor selecionado no app.
                  </div>
                )}
                {publicPastors.map((pastor) => {
                  const name = getDisplayName(pastor);
                  const photo = sanitizeImageUrl(pastor.foto) || buildLocalAvatar(name);
                  return (
                    <article key={pastor.id} className="site-card-muted flex items-center gap-4 rounded-3xl p-4 shadow-lg shadow-black/5">
                      <img src={photo} alt={name} className="h-20 w-20 rounded-xl object-cover" />
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black">{name}</h3>
                        <p className="text-sm font-bold" style={{ color: content.goldColor }}>{pastor.posicao_igreja || 'Pastor(a)'}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="site-overline">Instagram</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight">Ultimas postagens</h2>
            </div>
            <a href={content.instagramUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-black px-5 text-xs font-black uppercase tracking-widest text-white">
              <i className="fab fa-instagram" />
              {content.instagram}
            </a>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {instagramPosts.map((post) => (
              <a key={`${post.title}-${post.url}`} href={post.url} target="_blank" rel="noreferrer" className="site-card group overflow-hidden rounded-3xl shadow-xl shadow-black/5">
                {post.image ? (
                  <img src={post.image} alt="" className="h-72 w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-72 w-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-zinc-950 via-zinc-800 to-black p-8 text-center text-white">
                    <div className="site-glass flex h-16 w-16 items-center justify-center rounded-2xl text-3xl">
                      <i className="fab fa-instagram" style={{ color: content.goldColor }} />
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-white/55">Abrir no Instagram</p>
                  </div>
                )}
                <div className="p-5">
                  <p className="text-sm font-black">{post.title || 'Postagem no Instagram'}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section id="pedido-de-oracao" className="site-band py-16">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="site-overline">Pedido de Oracao</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{content.prayerTitle}</h2>
              <p className="mt-5 text-base leading-8 text-zinc-600">{content.prayerSubtitle}</p>
            </div>
            <form className="site-panel-dark rounded-3xl p-6 shadow-2xl shadow-black/15">
              <input className="site-input-glass mb-3 w-full rounded-2xl px-5 py-4 outline-none" placeholder="Seu nome" />
              <input className="site-input-glass mb-3 w-full rounded-2xl px-5 py-4 outline-none" placeholder="WhatsApp" />
              <textarea className="site-input-glass mb-3 min-h-32 w-full rounded-2xl px-5 py-4 outline-none" placeholder="Pedido de oracao" />
              <button type="button" className="w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest text-black" style={{ backgroundColor: content.goldColor }}>
                Enviar Pedido
              </button>
            </form>
          </div>
        </section>

        <section id="contribua" className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="rounded-3xl p-8 text-white shadow-2xl shadow-black/20" style={{ backgroundColor: content.primaryColor }}>
            <p className="site-overline">Dizimos e Ofertas</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">{content.givingTitle}</h2>
            <p className="mt-5 text-sm leading-7 text-white/60">{content.givingSubtitle}</p>
            <div className="site-glass mt-8 rounded-2xl p-4 text-sm font-bold">{content.pixKey}</div>
          </div>
          <div className="site-card flex min-h-80 items-center justify-center rounded-3xl p-8 shadow-xl shadow-black/5">
            {content.pixQrImage ? (
              <img src={content.pixQrImage} alt="QR Code PIX" className="h-64 w-64 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-2xl bg-zinc-100 text-center text-xs font-black uppercase tracking-widest text-zinc-400">
                QR Code PIX
              </div>
            )}
          </div>
        </section>
      </main>

      <footer id="contato" className="px-4 py-12 text-white sm:px-6 lg:px-8" style={{ backgroundColor: content.primaryColor }}>
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <div className="site-mark flex h-12 w-12 items-center justify-center rounded-xl text-sm font-black">
                {content.logoImage ? <img src={content.logoImage} alt={content.churchName} className="h-full w-full rounded-2xl object-cover" /> : content.logoText}
              </div>
              <h2 className="text-xl font-black">{content.churchName}</h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-white/55">{content.footerText}</p>
          </div>
          <div className="space-y-3 text-sm text-white/65">
            <p><i className="fas fa-location-dot mr-2" />{content.address}</p>
            <p><i className="fab fa-whatsapp mr-2" />{content.whatsapp}</p>
            <p><i className="fab fa-instagram mr-2" />{content.instagram}</p>
          </div>
          <div className="site-glass rounded-2xl p-5 text-sm font-bold text-white/70">
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: content.goldColor }}>Como chegar</p>
            <a href={content.mapUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-white">
              Abrir localizacao no Google Maps
              <i className="fas fa-arrow-up-right-from-square text-xs" />
            </a>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-xs font-bold uppercase tracking-widest text-white/35">
          Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default PublicChurchShell;
