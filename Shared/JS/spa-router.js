// SPA Router - Sistema de Roteamento Inteligente
class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.cache = new Map();
        this.loadingElement = null;
        this.contentElement = null;
        this.init();
    }

    init() {
        // Esperar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.contentElement = document.querySelector('.main-wrapper');
        this.loadingElement = document.getElementById('loader');
        
        if (!this.contentElement) {
            console.error('Element .main-wrapper not found');
            return;
        }

        // Configurar rotas
        this.setupRoutes();
        
        // Configurar navegação
        this.setupNavigation();
        
        // Configurar histórico
        this.setupHistory();
        
        // Carregar rota inicial
        this.loadInitialRoute();
        
        // Preload rotas críticas (desabilitado durante desenvolvimento)
        // this.preloadCriticalRoutes();
    }

    setupRoutes() {
        // Definir rotas com metadados e caminhos absolutos
        this.routes.set('dashboard', {
            path: '/index.html',
            title: 'Dashboard - Louvor CEVD',
            component: 'dashboard',
            auth: true,
            preload: true,
            extractMain: true
        });

        this.routes.set('escalas', {
            path: '/Escalas/escalas-spa.html',
            title: 'Escalas - Louvor CEVD',
            component: 'escalas',
            auth: true,
            preload: true,
            extractMain: false
        });

        this.routes.set('musicas', {
            path: '/Musicas/HTML/MenuMusicas-main.html',
            title: 'Músicas - Louvor CEVD',
            component: 'musicas',
            auth: true,
            preload: true,
            extractMain: false
        });

        this.routes.set('componentes', {
            path: '/Componentes/HTML/Componentes.html',
            title: 'Equipe - Louvor CEVD',
            component: 'componentes',
            auth: true,
            preload: false,
            extractMain: false
        });

        this.routes.set('utilitarios', {
            path: '/Utilitarios/HTML/MenuUtilitarios.html',
            title: 'Utilitários - Louvor CEVD',
            component: 'utilitarios',
            auth: true,
            preload: false,
            extractMain: false
        });
    }

    setupNavigation() {
        // Configurar cliques nos links do menu
        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-page]');
            if (link) {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigate(page);
            }
        });
    }

    setupHistory() {
        // Configurar navegação pelo browser usando hashchange
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash && hash !== this.currentRoute) {
                this.navigate(hash, false);
            }
        });
    }

    loadInitialRoute() {
        // Detectar página atual do hash
        const hash = window.location.hash.slice(1); // Remove #
        let currentPage = 'dashboard';

        if (hash) {
            currentPage = hash;
        } else {
            // Se não tiver hash, definir baseado no path atual
            const currentPath = window.location.pathname;
            if (currentPath.includes('Escalas')) currentPage = 'escalas';
            else if (currentPath.includes('Musicas')) currentPage = 'musicas';
            else if (currentPath.includes('Componentes')) currentPage = 'componentes';
            else if (currentPath.includes('Utilitarios')) currentPage = 'utilitarios';
        }

        this.currentRoute = currentPage;
        this.updateActiveState(currentPage);
    }

    async navigate(page, updateHistory = true) {
        if (page === this.currentRoute) return;

        const route = this.routes.get(page);
        if (!route) {
            console.error(`Route ${page} not found`);
            return;
        }

        try {
            // Verificar autenticação
            if (route.auth && !this.isAuthenticated()) {
                this.showMessage('Você precisa estar autenticado', 'error');
                return;
            }

            // Mostrar loading
            this.showLoading();

            // Carregar conteúdo
            const content = await this.loadContent(route);

            // Atualizar conteúdo
            this.updateContent(content);

            // Atualizar estado
            this.currentRoute = page;

            // Atualizar título
            document.title = route.title;

            // Atualizar estado ativo
            this.updateActiveState(page);

            // Atualizar URL com hash
            if (updateHistory) {
                window.location.hash = `#${page}`;
            }

            // Inicializar scripts da página
            this.initializePageScripts(page);

            // Esconder loading
            this.hideLoading();

            // Disparar evento de navegação
            this.dispatchNavigationEvent(page);

        } catch (error) {
            console.error('Navigation error:', error);
            this.hideLoading();
            this.showMessage('Erro ao carregar página', 'error');
        }
    }

    async loadContent(route) {
        // Verificar cache
        if (this.cache.has(route.component)) {
            return this.cache.get(route.component);
        }

        try {
            const response = await fetch(route.path);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();

            // Extrair conteúdo se necessário
            if (route.extractMain) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const mainWrapper = doc.querySelector('.main-wrapper');
                
                if (!mainWrapper) {
                    throw new Error('Main wrapper not found in loaded page');
                }
                
                const content = mainWrapper.innerHTML;
                this.cache.set(route.component, content);
                return content;
            }

            // Cache e retornar conteúdo completo
            this.cache.set(route.component, html);
            return html;

        } catch (error) {
            console.error(`Failed to load ${route.path}:`, error);
            throw error;
        }
    }

    updateContent(content) {
        if (this.contentElement) {
            this.contentElement.innerHTML = content;
            
            // Adicionar animação de entrada
            this.contentElement.style.opacity = '0';
            this.contentElement.style.transform = 'translateY(10px)';
            
            setTimeout(() => {
                this.contentElement.style.transition = 'all 0.3s ease';
                this.contentElement.style.opacity = '1';
                this.contentElement.style.transform = 'translateY(0)';
            }, 50);
        }
    }

    updateActiveState(page) {
        // Atualizar classes ativas no menu
        document.querySelectorAll('[data-page]').forEach(item => {
            const itemPage = item.dataset.page;
            if (itemPage === page) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    getPageUrl(page) {
        const route = this.routes.get(page);
        if (!route) return '/index.html';

        // Retornar URL completa para páginas SPA
        if (page === 'escalas') return '/Escalas/escalas-spa.html';
        if (page === 'musicas') return '/Musicas/HTML/MenuMusicas-SPA.html';
        
        return route.path;
    }

    initializePageScripts(page) {
        // Funções de inicialização específicas
        const initFunctions = {
            dashboard: () => {
                if (typeof initializeDashboard === 'function') {
                    initializeDashboard();
                }
            },
            escalas: () => {
                if (typeof initializeEscalas === 'function') {
                    initializeEscalas();
                }
            },
            musicas: () => {
                if (typeof initializeMusicas === 'function') {
                    initializeMusicas();
                }
            },
            componentes: () => {
                if (typeof initializeComponentes === 'function') {
                    initializeComponentes();
                }
            },
            utilitarios: () => {
                if (typeof initializeUtilitarios === 'function') {
                    initializeUtilitarios();
                }
            }
        };

        // Executar inicialização específica
        if (initFunctions[page]) {
            initFunctions[page]();
        }

        // Inicialização comum
        if (typeof initializeCommon === 'function') {
            initializeCommon();
        }
    }

    async preloadCriticalRoutes() {
        // Preload rotas críticas após 2 segundos
        setTimeout(async () => {
            const criticalRoutes = ['dashboard', 'escalas', 'musicas'];
            
            for (const routeName of criticalRoutes) {
                const route = this.routes.get(routeName);
                if (route && route.preload && !this.cache.has(routeName)) {
                    try {
                        await this.loadContent(route);
                        console.log(`Preloaded: ${routeName}`);
                    } catch (error) {
                        console.warn(`Failed to preload ${routeName}:`, error);
                    }
                }
            }
        }, 2000);
    }

    isAuthenticated() {
        // Verificar autenticação
        return localStorage.getItem('user_token') !== null;
    }

    showLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'flex';
        }
    }

    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
    }

    showMessage(message, type = 'info') {
        // Usar sistema de toast global
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            console.log(`${type}: ${message}`);
        }
    }

    dispatchNavigationEvent(page) {
        const event = new CustomEvent('spa:navigation', {
            detail: { page, route: this.routes.get(page) }
        });
        document.dispatchEvent(event);
    }

    // Métodos públicos
    getCurrentRoute() {
        return this.currentRoute;
    }

    getRoute(page) {
        return this.routes.get(page);
    }

    clearCache() {
        this.cache.clear();
    }
}

// Instanciar router global
window.router = new Router();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
}
