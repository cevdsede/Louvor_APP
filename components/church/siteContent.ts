import { supabase } from '../../supabaseClient';
import { SupabaseConfiguracaoSiteIgreja } from '../../types-supabase';

export interface SiteEvent {
  date: string;
  title: string;
  location: string;
  category: string;
  image: string;
}

export interface SiteMinistry {
  name: string;
  icon: string;
  image?: string;
}

export interface InstagramPost {
  title: string;
  image: string;
  url: string;
}

export interface SiteHighlight {
  title: string;
  description: string;
  icon: string;
}

export interface ChurchSiteContent {
  churchName: string;
  logoText: string;
  logoImage: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  aboutTitle: string;
  aboutBody: string;
  highlights: SiteHighlight[];
  serviceInfo: string;
  whatsapp: string;
  address: string;
  mapUrl: string;
  instagram: string;
  instagramUrl: string;
  instagramPosts: InstagramPost[];
  prayerTitle: string;
  prayerSubtitle: string;
  pixKey: string;
  pixQrImage: string;
  givingTitle: string;
  givingSubtitle: string;
  footerText: string;
  primaryColor: string;
  goldColor: string;
  events: SiteEvent[];
  ministries: SiteMinistry[];
}

export const SITE_CONTENT_STORAGE_KEY = 'church_site_content_v1';
const SITE_CONTENT_DB_KEY = 'principal';

export const defaultSiteContent: ChurchSiteContent = {
  churchName: 'Comunidade Evangelica Valentes de Davi',
  logoText: 'CV',
  logoImage: '',
  heroTitle: 'Uma igreja para viver fe, familia e proposito.',
  heroSubtitle:
    'Cultos inspiradores, comunhao verdadeira e uma casa preparada para receber voce e sua familia.',
  heroImage:
    'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1800&q=85',
  aboutTitle: 'Uma casa organizada para servir pessoas.',
  aboutBody:
    'Acolhemos familias, discipulamos pessoas e criamos ambientes onde fe, comunidade e excelencia caminham juntos.',
  highlights: [
    { title: 'Comunidade', description: 'Relacoes saudaveis e uma igreja presente na vida real das pessoas.', icon: 'fa-people-group' },
    { title: 'Louvor', description: 'Cultos preparados com excelencia, sensibilidade e reverencia.', icon: 'fa-music' },
    { title: 'Cuidado', description: 'Acompanhamento pastoral e consolidacao para quem chega e para quem caminha.', icon: 'fa-hand-holding-heart' }
  ],
  serviceInfo: 'Domingo 18h30 | Quarta 19h30',
  whatsapp: '(68) 99999-9999',
  address: 'Rua Mamed Saad, 210 - Wanderley Dantas',
  mapUrl: 'https://maps.app.goo.gl/HWcfFfHUZ3xukKsL9',
  instagram: '@cevdsedeoficial',
  instagramUrl: 'https://www.instagram.com/cevdsedeoficial/',
  instagramPosts: [
    {
      title: 'Culto de celebracao',
      image: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=900&q=80',
      url: 'https://www.instagram.com/cevdsedeoficial/'
    },
    {
      title: 'Comunhao e familia',
      image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=80',
      url: 'https://www.instagram.com/cevdsedeoficial/'
    },
    {
      title: 'Noite de louvor',
      image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80',
      url: 'https://www.instagram.com/cevdsedeoficial/'
    }
  ],
  prayerTitle: 'Queremos orar por voce.',
  prayerSubtitle: 'Envie seu pedido e nossa equipe pastoral vai receber sua mensagem.',
  pixKey: '23604144000152',
  pixQrImage: '',
  givingTitle: 'Contribua com seguranca via PIX.',
  givingSubtitle: 'Use a chave abaixo ou aponte a camera para o QR Code.',
  footerText: 'Fe, comunidade e proposito em uma experiencia acolhedora e organizada.',
  primaryColor: '#09090b',
  goldColor: '#d6a84f',
  events: [
    {
      date: 'Dom 18h30',
      title: 'Culto de Celebracao',
      location: 'Templo principal',
      category: 'Cultos',
      image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=80'
    },
    {
      date: 'Sex 20h',
      title: 'Noite dos Jovens',
      location: 'Auditorio',
      category: 'Jovens',
      image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80'
    },
    {
      date: 'Sab 16h',
      title: 'Encontro de Familias',
      location: 'Sala multiuso',
      category: 'Familia',
      image: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=900&q=80'
    }
  ],
  ministries: [
    { name: 'Jovens', icon: 'fa-bolt' },
    { name: 'Infantil', icon: 'fa-child-reaching' },
    { name: 'Louvor', icon: 'fa-music' },
    { name: 'Mulheres', icon: 'fa-heart' },
    { name: 'Homens', icon: 'fa-shield-halved' },
    { name: 'Casais', icon: 'fa-ring' },
    { name: 'Missoes', icon: 'fa-globe' }
  ]
};

export const loadSiteContent = (): ChurchSiteContent => {
  if (typeof window === 'undefined') return defaultSiteContent;

  try {
    const saved = localStorage.getItem(SITE_CONTENT_STORAGE_KEY);
    if (!saved) return defaultSiteContent;
    return normalizeSiteContent(JSON.parse(saved));
  } catch {
    return defaultSiteContent;
  }
};

export const normalizeSiteContent = (content?: Partial<ChurchSiteContent> | null): ChurchSiteContent => {
  const next = { ...defaultSiteContent, ...(content || {}) };

  return {
    ...next,
    churchName: String(next.churchName || defaultSiteContent.churchName),
    logoText: String(next.logoText || defaultSiteContent.logoText),
    logoImage: String(next.logoImage || ''),
    heroTitle: String(next.heroTitle || defaultSiteContent.heroTitle),
    heroSubtitle: String(next.heroSubtitle || defaultSiteContent.heroSubtitle),
    heroImage: String(next.heroImage || defaultSiteContent.heroImage),
    aboutTitle: String(next.aboutTitle || defaultSiteContent.aboutTitle),
    aboutBody: String(next.aboutBody || defaultSiteContent.aboutBody),
    highlights: Array.isArray(next.highlights) ? next.highlights : defaultSiteContent.highlights,
    serviceInfo: String(next.serviceInfo || defaultSiteContent.serviceInfo),
    whatsapp: String(next.whatsapp || defaultSiteContent.whatsapp),
    address: String(next.address || defaultSiteContent.address),
    mapUrl: String(next.mapUrl || defaultSiteContent.mapUrl),
    instagram: String(next.instagram || defaultSiteContent.instagram),
    instagramUrl: String(next.instagramUrl || defaultSiteContent.instagramUrl),
    prayerTitle: String(next.prayerTitle || defaultSiteContent.prayerTitle),
    prayerSubtitle: String(next.prayerSubtitle || defaultSiteContent.prayerSubtitle),
    pixKey: String(next.pixKey || defaultSiteContent.pixKey),
    pixQrImage: String(next.pixQrImage || ''),
    givingTitle: String(next.givingTitle || defaultSiteContent.givingTitle),
    givingSubtitle: String(next.givingSubtitle || defaultSiteContent.givingSubtitle),
    footerText: String(next.footerText || defaultSiteContent.footerText),
    primaryColor: String(next.primaryColor || defaultSiteContent.primaryColor),
    goldColor: String(next.goldColor || defaultSiteContent.goldColor),
    instagramPosts: Array.isArray(next.instagramPosts) ? next.instagramPosts : defaultSiteContent.instagramPosts,
    events: Array.isArray(next.events) ? next.events : defaultSiteContent.events,
    ministries: Array.isArray(next.ministries) ? next.ministries : defaultSiteContent.ministries
  };
};

export const cacheSiteContent = (content: ChurchSiteContent) => {
  const normalized = normalizeSiteContent(content);
  localStorage.setItem(SITE_CONTENT_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent('church-site-content-updated', { detail: normalized }));
  return normalized;
};

const fromDatabaseRow = (row?: SupabaseConfiguracaoSiteIgreja | null): ChurchSiteContent => {
  if (!row) return defaultSiteContent;
  return normalizeSiteContent({
    churchName: row.church_name,
    logoText: row.logo_text,
    logoImage: row.logo_image,
    heroTitle: row.hero_title,
    heroSubtitle: row.hero_subtitle,
    heroImage: row.hero_image,
    aboutTitle: row.about_title,
    aboutBody: row.about_body,
    highlights: Array.isArray(row.highlights) ? (row.highlights as SiteHighlight[]) : defaultSiteContent.highlights,
    serviceInfo: row.service_info,
    whatsapp: row.whatsapp,
    address: row.address,
    mapUrl: row.map_url,
    instagram: row.instagram,
    instagramUrl: row.instagram_url,
    instagramPosts: Array.isArray(row.instagram_posts) ? (row.instagram_posts as InstagramPost[]) : defaultSiteContent.instagramPosts,
    prayerTitle: row.prayer_title,
    prayerSubtitle: row.prayer_subtitle,
    pixKey: row.pix_key,
    pixQrImage: row.pix_qr_image,
    givingTitle: row.giving_title,
    givingSubtitle: row.giving_subtitle,
    footerText: row.footer_text,
    primaryColor: row.primary_color,
    goldColor: row.gold_color,
    events: Array.isArray(row.events) ? (row.events as SiteEvent[]) : defaultSiteContent.events,
    ministries: Array.isArray(row.ministries) ? (row.ministries as SiteMinistry[]) : defaultSiteContent.ministries
  });
};

const toDatabasePayload = (content: ChurchSiteContent) => {
  const normalized = normalizeSiteContent(content);
  return {
    key: SITE_CONTENT_DB_KEY,
    church_name: normalized.churchName,
    logo_text: normalized.logoText,
    logo_image: normalized.logoImage,
    hero_title: normalized.heroTitle,
    hero_subtitle: normalized.heroSubtitle,
    hero_image: normalized.heroImage,
    about_title: normalized.aboutTitle,
    about_body: normalized.aboutBody,
    highlights: normalized.highlights,
    service_info: normalized.serviceInfo,
    whatsapp: normalized.whatsapp,
    address: normalized.address,
    map_url: normalized.mapUrl,
    instagram: normalized.instagram,
    instagram_url: normalized.instagramUrl,
    instagram_posts: normalized.instagramPosts,
    prayer_title: normalized.prayerTitle,
    prayer_subtitle: normalized.prayerSubtitle,
    pix_key: normalized.pixKey,
    pix_qr_image: normalized.pixQrImage,
    giving_title: normalized.givingTitle,
    giving_subtitle: normalized.givingSubtitle,
    footer_text: normalized.footerText,
    primary_color: normalized.primaryColor,
    gold_color: normalized.goldColor,
    events: normalized.events,
    ministries: normalized.ministries
  };
};

export const fetchSiteContent = async () => {
  const { data, error } = await supabase
    .from('configuracoes_site_igreja')
    .select('*')
    .eq('key', SITE_CONTENT_DB_KEY)
    .maybeSingle();

  if (error) throw error;
  return cacheSiteContent(fromDatabaseRow((data || null) as SupabaseConfiguracaoSiteIgreja | null));
};

export const saveSiteContent = async (content: ChurchSiteContent) => {
  const { data, error } = await supabase
    .from('configuracoes_site_igreja')
    .upsert(toDatabasePayload(content), { onConflict: 'key' })
    .select('*')
    .single();

  if (error) throw error;
  return cacheSiteContent(fromDatabaseRow(data as SupabaseConfiguracaoSiteIgreja));
};
