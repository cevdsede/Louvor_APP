// CONFIGURAÇÃO DO SUPABASE - EXEMPLO
// 
// INSTRUÇÕES:
// 1. Copie este arquivo para 'config.js' (substituindo o existente)
// 2. Substitua os valores abaixo com suas credenciais reais
// 3. NUNCA commit este arquivo com credenciais reais!

// Configuração Central do Sistema - Louvor CEVD SPA
window.APP_CONFIG = {
    // Configurações da Aplicação
    APP: {
        NAME: 'Louvor CEVD',
        VERSION: '2.0.0',
        DESCRIPTION: 'Sistema de Gestão do Ministério de Louvor',
        AUTHOR: 'CEVD'
    },

    // Configurações do Supabase
    SUPABASE: {
        // URL: https://SEU-PROJETO.supabase.co
        // ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        URL: 'https://SEU-PROJETO.supabase.co',
        ANON_KEY: 'SUA-CHAVE-ANON-AQUI'
    },

    // Configurações da API (Google Apps Script - legado)
    API: {
        BASE_URL: 'https://script.google.com/macros/s/AKfycbzdG9W3b6Z7h8J9dK2L4m5P6n7q8r9s0t1u2v3w4x5y6z7/exec',
        ENDPOINTS: {
            ESCALAS: '?sheet=Transformar',
            REPERTORIO: '?sheet=Repertório_PWA',
            LEMBRETES: '?sheet=Lembretes',
            CULTOS: '?sheet=Cultos'
        },
        TIMEOUT: 30000, // 30 segundos
        RETRY_ATTEMPTS: 3
    },

    // Rotas do SPA
    ROUTES: {
        HOME: '/',
        DASHBOARD: '/dashboard',
        ESCALAS: '/escalas',
        MUSICAS: '/musicas',
        EQUIPE: '/equipe',
        UTILITARIOS: '/utilitarios',
        LOGIN: '/login'
    },

    // Chaves de Storage
    STORAGE: {
        PREFIX: 'louvor_',
        KEYS: {
            TOKEN: 'token',
            USER: 'user',
            THEME: 'theme',
            CACHE: 'cache',
            OFFLINE_ESCALAS: 'offline_escalas',
            OFFLINE_REPERTORIO: 'offline_repertorio',
            OFFLINE_LEMBRETES: 'offline_lembretes',
            AUTH_USER: 'auth_user',
            AUTH_SESSION: 'auth_session',
            USER_PROFILE: 'user_profile'
        }
    },

    // Configurações de Cache
    CACHE: {
        TTL: {
            ESCALAS: 5 * 60 * 1000, // 5 minutos
            REPERTORIO: 10 * 60 * 1000, // 10 minutos
            LEMBRETES: 15 * 60 * 1000, // 15 minutos
            STATIC: 24 * 60 * 60 * 1000 // 24 horas
        }
    },

    // Configurações de UI
    UI: {
        DEFAULT_THEME: 'light',
        ANIMATION_DURATION: 300,
        TOAST_DURATION: 5000,
        LOADING_TIMEOUT: 10000,
        MOBILE_BREAKPOINT: 768
    },

    // Configurações de Temas
    THEME: {
        AVAILABLE: ['light', 'dark', 'blue', 'green', 'purple'],
        DEFAULT: 'light'
    },

    // Configurações de Autenticação
    AUTH: {
        SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 horas
        AUTO_REFRESH: true,
        REFRESH_THRESHOLD: 5 * 60 * 1000 // 5 minutos antes de expirar
    },

    // Configurações de Sincronização
    SYNC: {
        AUTO_SYNC: true,
        SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutos
        OFFLINE_MODE: true,
        CONFLICT_RESOLUTION: 'server_wins'
    },

    // Configurações de Performance
    PERFORMANCE: {
        LAZY_LOADING: true,
        CODE_SPLITTING: true,
        MINIFICATION: true,
        COMPRESSION: true
    },

    // Configurações de Desenvolvimento
    DEV: {
        DEBUG_MODE: false,
        CONSOLE_LOGS: true,
        ERROR_REPORTING: true,
        ANALYTICS: false
    },

    // Configurações de Produção
    PROD: {
        DEBUG_MODE: false,
        CONSOLE_LOGS: false,
        ERROR_REPORTING: true,
        ANALYTICS: true
    },

    // Configurações de Módulos
    MODULES: {
        DASHBOARD: true,
        ESCALAS: true,
        MUSICAS: true,
        EQUIPE: true,
        UTILITARIOS: true,
        REPORTS: true,
        NOTIFICATIONS: true
    },

    // Configurações de Notificações
    NOTIFICATIONS: {
        ENABLED: true,
        PERMISSION: 'default',
        SOUND: true,
        VIBRATION: true
    },

    // Configurações de Responsividade
    RESPONSIVE: {
        MOBILE: true,
        TABLET: true,
        DESKTOP: true,
        BREAKPOINTS: {
            MOBILE: 768,
            TABLET: 1024,
            DESKTOP: 1200
        }
    },

    // Configurações de Acessibilidade
    ACCESSIBILITY: {
        KEYBOARD_NAVIGATION: true,
        SCREEN_READER: true,
        HIGH_CONTRAST: true,
        FONT_SIZE_ADJUSTMENT: true
    },

    // Configurações de Internacionalização
    I18N: {
        DEFAULT_LANGUAGE: 'pt-BR',
        AVAILABLE_LANGUAGES: ['pt-BR', 'en-US'],
        FALLBACK_LANGUAGE: 'pt-BR'
    },

    // Configurações de Monitoramento
    MONITORING: {
        PERFORMANCE: true,
        ERRORS: true,
        USER_BEHAVIOR: false,
        NETWORK_REQUESTS: false
    },

    // Configurações de Segurança
    SECURITY: {
        XSS_PROTECTION: true,
        CSRF_PROTECTION: true,
        CONTENT_SECURITY_POLICY: true,
        HTTPS_ONLY: false
    },

    // Feature Flags
    FEATURES: {
        OFFLINE_MODE: true,
        PUSH_NOTIFICATIONS: false,
        REAL_TIME_SYNC: false,
        ADVANCED_REPORTS: false,
        MULTI_LANGUAGE: false,
        DARK_MODE: true,
        EXPORT_PDF: false,
        IMPORT_CSV: true
    },

    // Configurações de Integrações
    INTEGRATIONS: {
        GOOGLE_ANALYTICS: false,
        FACEBOOK_PIXEL: false,
        GOOGLE_ADS: false,
        EMAIL_SERVICE: false,
        SMS_SERVICE: false
    }
};

// Funções utilitárias para configuração
window.Config = {
    get: (path, defaultValue = null) => {
        const keys = path.split('.');
        let current = window.APP_CONFIG;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }
        
        return current;
    },

    set: (path, value) => {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = window.APP_CONFIG;
        
        for (const key of keys) {
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[lastKey] = value;
    },

    isDevelopment: () => {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname.includes('.test');
    },

    isProduction: () => {
        return !window.Config.isDevelopment();
    }
};

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.APP_CONFIG;
}
