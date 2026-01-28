// SPA Router - Sistema de Roteamento de Página Única
class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.loadingElement = null;
        this.appContent = null;
        this.init();
    }

    init() {
        this.loadingElement = document.getElementById('loading');
        this.appContent = document.getElementById('app-content');
        
        // Configurar eventos de navegação
        window.addEventListener('popstate', (e) => {
            this.handleRoute(e.state?.path || window.location.pathname);
        });

        // Interceptar cliques em links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (link && this.shouldIntercept(link)) {
                e.preventDefault();
                this.navigate(link.getAttribute('href'));
            }
        });
    }

    // Registrar uma rota
    register(path, component) {
        this.routes.set(path, component);
    }

    // Verificar se deve interceptar o link
    shouldIntercept(link) {
        const href = link.getAttribute('href');
        return href && 
               href.startsWith('/') && 
               !href.startsWith('//') && 
               !href.includes('://') &&
               !link.hasAttribute('data-external');
    }

    // Navegar para uma rota
    async navigate(path) {
        if (this.currentRoute === path) return;

        // Mostrar loading
        this.showLoading();

        // Atualizar URL
        history.pushState({ path }, '', path);

        // Carregar rota
        await this.handleRoute(path);
    }

    // Manipular rota atual
    async handleRoute(path) {
        try {
            // Normalizar path
            const normalizedPath = this.normalizePath(path);
            
            // Encontrar rota
            const component = this.findRoute(normalizedPath);
            
            if (!component) {
                console.warn(`Rota não encontrada: ${normalizedPath}`);
                await this.handle404();
                return;
            }

            // Renderizar componente
            await this.renderComponent(component);
            this.currentRoute = normalizedPath;

            // Atualizar estado da UI
            this.updateUIState(normalizedPath);

        } catch (error) {
            console.error('Erro ao carregar rota:', error);
            await this.handleError(error);
        } finally {
            this.hideLoading();
        }
    }

    // Normalizar path
    normalizePath(path) {
        if (path === '/' || path === '') return '/dashboard';
        return path.replace(/\/+$/, '') || '/dashboard';
    }

    // Encontrar rota correspondente
    findRoute(path) {
        // Busca exata primeiro
        if (this.routes.has(path)) {
            return this.routes.get(path);
        }

        // Busca por padrões
        for (const [routePath, component] of this.routes) {
            if (this.matchRoute(routePath, path)) {
                return component;
            }
        }

        return null;
    }

    // Verificar se rota corresponde ao path
    matchRoute(routePath, path) {
        const routeSegments = routePath.split('/').filter(Boolean);
        const pathSegments = path.split('/').filter(Boolean);

        if (routeSegments.length !== pathSegments.length) {
            return false;
        }

        return routeSegments.every((segment, index) => {
            return segment.startsWith(':') || segment === pathSegments[index];
        });
    }

    // Renderizar componente
    async renderComponent(component) {
        if (typeof component === 'function') {
            const html = await component();
            this.appContent.innerHTML = html;
        } else if (typeof component === 'object' && component.render) {
            const html = await component.render();
            this.appContent.innerHTML = html;
        } else if (typeof component === 'string') {
            this.appContent.innerHTML = component;
        } else {
            throw new Error('Componente inválido');
        }

        // Animar entrada
        this.appContent.style.opacity = '0';
        this.appContent.style.transform = 'translateY(20px)';
        
        requestAnimationFrame(() => {
            this.appContent.style.transition = 'all 0.3s ease';
            this.appContent.style.opacity = '1';
            this.appContent.style.transform = 'translateY(0)';
        });
    }

    // Manipular 404
    async handle404() {
        const html = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <div class="text-6xl font-black text-slate-300 mb-4">404</div>
                    <h1 class="text-2xl font-bold text-slate-800 mb-2">Página não encontrada</h1>
                    <p class="text-slate-600 mb-6">A página que você está procurando não existe.</p>
                    <button onclick="router.navigate('/dashboard')" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Voltar ao Dashboard
                    </button>
                </div>
            </div>
        `;
        this.appContent.innerHTML = html;
    }

    // Manipular erro
    async handleError(error) {
        const html = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <div class="text-6xl font-black text-red-300 mb-4">Erro</div>
                    <h1 class="text-2xl font-bold text-slate-800 mb-2">Ocorreu um erro</h1>
                    <p class="text-slate-600 mb-6">${error.message || 'Tente novamente mais tarde.'}</p>
                    <button onclick="router.navigate('/dashboard')" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Voltar ao Dashboard
                    </button>
                </div>
            </div>
        `;
        this.appContent.innerHTML = html;
    }

    // Atualizar estado da UI
    updateUIState(path) {
        // Atualizar menu ativo
        document.querySelectorAll('[data-route]').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-route') === path) {
                link.classList.add('active');
            }
        });

        // Atualizar título da página
        const titles = {
            '/dashboard': 'Dashboard',
            '/escalas': 'Escalas',
            '/musicas': 'Músicas',
            '/equipe': 'Equipe',
            '/utilitarios': 'Utilitários'
        };
        
        document.title = `${titles[path] || 'Louvor CEVD'} - Sistema de Gestão`;
    }

    // Mostrar/Esconder loading
    showLoading() {
        if (this.loadingElement) {
            this.loadingElement.classList.remove('hidden');
        }
    }

    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.classList.add('hidden');
        }
    }

    // Iniciar roteamento
    start() {
        const initialPath = window.location.pathname;
        this.handleRoute(initialPath);
    }
}

// Criar instância global
window.router = new Router();
