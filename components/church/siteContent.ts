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

export interface ChurchSiteContent {
  churchName: string;
  logoText: string;
  logoImage: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  serviceInfo: string;
  whatsapp: string;
  address: string;
  mapUrl: string;
  instagram: string;
  instagramUrl: string;
  instagramPosts: InstagramPost[];
  pixKey: string;
  pixQrImage: string;
  primaryColor: string;
  goldColor: string;
  events: SiteEvent[];
  ministries: SiteMinistry[];
}

export const SITE_CONTENT_STORAGE_KEY = 'church_site_content_v1';

export const defaultSiteContent: ChurchSiteContent = {
  churchName: 'Comunidade Evangelica Valentes de Davi',
  logoText: 'CV',
  logoImage: '',
  heroTitle: 'Uma igreja para viver fe, familia e proposito.',
  heroSubtitle:
    'Cultos inspiradores, comunhao verdadeira e uma casa preparada para receber voce e sua familia.',
  heroImage:
    'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1800&q=85',
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
  pixKey: '23604144000152',
  pixQrImage: '',
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
    return { ...defaultSiteContent, ...JSON.parse(saved) };
  } catch {
    return defaultSiteContent;
  }
};

export const saveSiteContent = (content: ChurchSiteContent) => {
  localStorage.setItem(SITE_CONTENT_STORAGE_KEY, JSON.stringify(content));
  window.dispatchEvent(new CustomEvent('church-site-content-updated', { detail: content }));
};
