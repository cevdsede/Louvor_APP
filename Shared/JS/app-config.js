// Configuração Central da Aplicação
window.APP_CONFIG = {
    // Informações da aplicação
    name: 'Louvor CEVD',
    version: '2.0.0',
    description: 'Sistema de Gerenciamento de Louvor',
    
    // URLs e Endpoints
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzdG9W3b6Z7h8J9dK2L4m5P6n7q8r9s0t1u2v3w4x5y6z7/exec',
    API_BASE: '/api',
    
    // Configurações de UI
    ui: {
        theme: {
            default: 'light',
            available: ['light', 'dark', 'blue', 'green']
        },
        layout: {
            sidebarWidth: 280,
            sidebarCollapsedWidth: 85,
            headerHeight: 64,
            footerHeight: 60
        },
        animations: {
            duration: 300,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        }
    },
    
    // Configurações de Cache
    cache: {
        enabled: true,
        ttl: 5 * 60 * 1000, // 5 minutos
        maxSize: 50, // máximo de itens no cache
        storage: 'localStorage' // 'localStorage' ou 'memory'
    },
    
    // Configurações de Sync
    sync: {
        enabled: true,
        interval: 30 * 1000, // 30 segundos
        retryAttempts: 3,
        retryDelay: 1000
    },
    
    // Configurações de Performance
    performance: {
        preloadRoutes: true,
        lazyLoadImages: true,
        enableServiceWorker: true,
        enableCompression: true
    },
    
    // Configurações de Desenvolvimento
    development: {
        debug: false,
        enableConsole: true,
        mockData: false,
        hotReload: false
    },
    
    // Configurações de Produção
    production: {
        minifyAssets: true,
        enableCaching: true,
        enableAnalytics: false,
        enableErrorReporting: false
    },
    
    // Módulos da Aplicação
    modules: {
        escalas: {
            name: 'Escalas',
            path: 'Escalas/HTML/Escalas-main.html',
            spaPath: 'Escalas/HTML/Escalas-SPA.html',
            icon: 'fa-calendar-check',
            color: '#3b82f6',
            enabled: true,
            requiresAuth: true
        },
        musicas: {
            name: 'Músicas',
            path: 'Musicas/HTML/MenuMusicas-main.html',
            spaPath: 'Musicas/HTML/MenuMusicas-SPA.html',
            icon: 'fa-music',
            color: '#10b981',
            enabled: true,
            requiresAuth: true
        },
        componentes: {
            name: 'Equipe',
            path: 'Componentes/HTML/Componentes.html',
            spaPath: 'Componentes/HTML/Componentes.html',
            icon: 'fa-users-gear',
            color: '#8b5cf6',
            enabled: true,
            requiresAuth: true
        },
        utilitarios: {
            name: 'Utilitários',
            path: 'Utilitarios/HTML/MenuUtilitarios.html',
            spaPath: 'Utilitarios/HTML/MenuUtilitarios.html',
            icon: 'fa-tools',
            color: '#f59e0b',
            enabled: true,
            requiresAuth: true
        }
    },
    
    // Configurações de Autenticação
    auth: {
        required: true,
        tokenKey: 'user_token',
        refreshTokenKey: 'refresh_token',
        loginUrl: '/Login.html',
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas
        autoRefresh: true
    },
    
    // Configurações de Notificações
    notifications: {
        enabled: true,
        position: 'top-right',
        duration: 4000,
        maxVisible: 5,
        sound: false,
        vibration: true
    },
    
    // Configurações de Responsividade
    responsive: {
        breakpoints: {
            mobile: 768,
            tablet: 1024,
            desktop: 1280
        },
        mobileMenu: {
            enabled: true,
            overlay: true,
            swipeToClose: true
        }
    },
    
    // Configurações de Acessibilidade
    accessibility: {
        enableKeyboardNavigation: true,
        enableScreenReader: true,
        highContrast: false,
        fontSize: {
            min: 12,
            max: 24,
            default: 16,
            step: 2
        }
    },
    
    // Configurações de Internacionalização
    i18n: {
        default: 'pt-BR',
        available: ['pt-BR', 'en-US'],
        fallback: 'pt-BR',
        storageKey: 'app_language'
    },
    
    // Configurações de Monitoramento
    monitoring: {
        enabled: false,
        analyticsId: null,
        errorReporting: false,
        performanceMonitoring: false
    },
    
    // Configurações de Segurança
    security: {
        enableCSRF: true,
        enableXSS: true,
        enableCSP: false,
        secureCookies: true,
        httpsOnly: false
    },
    
    // Configurações de Features (Feature Flags)
    features: {
        spaNavigation: true,
        offlineMode: true,
        realTimeSync: true,
        pushNotifications: false,
        darkMode: true,
        exportPDF: true,
        advancedCharts: true,
        aiAssistance: false
    },
    
    // Configurações de Integrações
    integrations: {
        googleSheets: {
            enabled: true,
            spreadsheetId: null
        },
        supabase: {
            enabled: false,
            url: null,
            anonKey: null
        },
        firebase: {
            enabled: false,
            config: null
        }
    }
};

// Detectar ambiente
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('.test');

const isProduction = !isDevelopment;

// Aplicar configurações específicas do ambiente
if (isDevelopment) {
    window.APP_CONFIG.development.debug = true;
    window.APP_CONFIG.development.mockData = true;
    window.APP_CONFIG.cache.enabled = false;
    window.APP_CONFIG.sync.interval = 10 * 1000; // 10 segundos em dev
} else {
    window.APP_CONFIG.production.enableCaching = true;
    window.APP_CONFIG.production.minifyAssets = true;
    window.APP_CONFIG.monitoring.enabled = true;
}

// Funções utilitárias de configuração
window.getConfig = (path, defaultValue = null) => {
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
};

window.setConfig = (path, value) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = window.APP_CONFIG;
    
    for (const key of keys) {
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[lastKey] = value;
};

window.isFeatureEnabled = (feature) => {
    return window.getConfig(`features.${feature}`, false);
};

window.getModuleConfig = (moduleName) => {
    return window.getConfig(`modules.${moduleName}`, null);
};

window.isModuleEnabled = (moduleName) => {
    const module = window.getModuleConfig(moduleName);
    return module && module.enabled;
};

// Configurações de CSS custom properties
function applyCSSConfig() {
    const root = document.documentElement;
    const ui = window.APP_CONFIG.ui;
    
    if (ui) {
        root.style.setProperty('--sidebar-width', `${ui.layout.sidebarWidth}px`);
        root.style.setProperty('--sidebar-collapsed-width', `${ui.layout.sidebarCollapsedWidth}px`);
        root.style.setProperty('--header-height', `${ui.layout.headerHeight}px`);
        root.style.setProperty('--footer-height', `${ui.layout.footerHeight}px`);
        root.style.setProperty('--animation-duration', `${ui.animations.duration}ms`);
        root.style.setProperty('--animation-easing', ui.animations.easing);
    }
}

// Aplicar configurações ao carregar
document.addEventListener('DOMContentLoaded', () => {
    applyCSSConfig();
    
    // Aplicar tema salvo
    const savedTheme = localStorage.getItem('app_theme') || window.APP_CONFIG.ui.theme.default;
    document.body.setAttribute('data-theme', savedTheme);
    
    // Aplicar configurações de acessibilidade
    const fontSize = localStorage.getItem('app_font_size');
    if (fontSize) {
        document.documentElement.style.fontSize = `${fontSize}px`;
    }
});

// Exportar configurações
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.APP_CONFIG;
}
