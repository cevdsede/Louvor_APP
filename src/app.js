// Aplicação Principal - Louvor CEVD SPA
class App {
    constructor() {
        this.isInitialized = false;
        this.currentPage = null;
    }

    async init() {
        try {
            console.log('Iniciando aplicação Louvor CEVD SPA...');
            
            // Carregar configuração
            this.loadConfiguration();
            
            // Inicializar componentes
            await this.initializeComponents();
            
            // Configurar roteamento
            this.setupRouting();
            
            // Carregar tema salvo
            this.loadTheme();
            
            // Inicializar componentes globais
            this.initializeGlobalComponents();
            
            // Esconder loading e mostrar conteúdo
            this.hideLoading();
            
            // Iniciar roteamento
            window.router.start();
            
            this.isInitialized = true;
            console.log('Aplicação inicializada com sucesso!');
            
        } catch (error) {
            console.error('Erro ao inicializar aplicação:', error);
            this.showError('Erro ao carregar a aplicação. Tente recarregar a página.');
        }
    }

    loadConfiguration() {
        // Verificar se a configuração foi carregada
        if (!window.APP_CONFIG) {
            throw new Error('Configuração não encontrada');
        }
        
        console.log('Configuração carregada:', window.APP_CONFIG.APP.NAME);
    }

    async initializeComponents() {
        // Inicializar componentes na ordem correta
        const components = [
            { name: 'Storage', instance: window.storage },
            { name: 'Cache', instance: window.cache },
            { name: 'API', instance: window.api },
            { name: 'Toast', instance: window.toast },
            { name: 'Loading', instance: window.loading },
            { name: 'Sidebar', instance: window.sidebar },
            { name: 'Header', instance: window.header }
        ];

        for (const component of components) {
            if (component.instance) {
                console.log(`Componente ${component.name} inicializado`);
            } else {
                console.warn(`Componente ${component.name} não encontrado`);
            }
        }
    }

    setupRouting() {
        // Registrar rota de login
        window.router.register('/login', () => this.renderPage('LoginPage'));
        
        // Registrar rotas protegidas
        window.router.register('/dashboard', () => this.requireAuth(() => this.renderPage('DashboardPage')));
        window.router.register('/escalas', () => this.requireAuth(() => this.renderPage('EscalasPage')));
        window.router.register('/musicas', () => this.requireAuth(() => this.renderPage('MusicasPage')));
        window.router.register('/equipe', () => this.requireAuth(() => this.renderPage('EquipePage')));
        window.router.register('/utilitarios', () => this.requireAuth(() => this.renderPage('UtilitariosPage')));
        
        // Rota padrão - verificar autenticação
        window.router.register('/', () => this.handleRootRoute());
        
        console.log('Roteamento configurado');
    }

    loadTheme() {
        const savedTheme = window.storage.get('theme', 'light');
        document.body.setAttribute('data-theme', savedTheme);
        console.log('Tema carregado:', savedTheme);
    }

    initializeGlobalComponents() {
        // Tornar páginas globalmente acessíveis
        window.loginPage = new window.LoginPage();
        window.escalasPage = new window.EscalasPage();
        window.musicasPage = new window.MusicasPage();
        window.equipePage = new window.EquipePage();
        window.utilitariosPage = new window.UtilitariosPage();
        
        // Configurar eventos globais
        this.setupGlobalEvents();
        
        // Configurar listener de autenticação
        this.setupAuthListener();
        
        console.log('Componentes globais inicializados');
    }

    setupGlobalEvents() {
        // Evento de mudança de rota
        window.addEventListener('routechange', (e) => {
            this.handleRouteChange(e.detail.path);
        });

        // Evento de erro global
        window.addEventListener('error', (e) => {
            console.error('Erro global:', e.error);
            window.toast?.error('Ocorreu um erro inesperado');
        });

        // Evento de não tratado
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Promise não tratada:', e.reason);
            window.toast?.error('Ocorreu um erro em uma operação assíncrona');
        });

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Conexão online/offline
        window.addEventListener('online', () => {
            window.toast?.success('Conexão restaurada');
            this.syncData();
        });

        window.addEventListener('offline', () => {
            window.toast?.warning('Você está offline. Usando dados cacheados.');
        });
    }

    async renderPage(pageClassName) {
        try {
            // Mostrar loading
            window.loading?.show();
            
            // Limpar página anterior
            if (this.currentPage) {
                this.currentPage = null;
            }

            // Verificar se a classe existe
            const PageClass = window[pageClassName];
            if (!PageClass) {
                throw new Error(`Página ${pageClassName} não encontrada`);
            }

            // Criar instância da página
            this.currentPage = new PageClass();
            
            // Renderizar página
            const appContent = document.getElementById('app-content');
            if (!appContent) {
                throw new Error('Elemento #app-content não encontrado');
            }

            const html = await this.currentPage.render();
            appContent.innerHTML = html;

            // Atualizar header
            const pageTitle = this.getPageTitle(pageClassName);
            window.header?.setTitle(pageTitle);

            // Atualizar sidebar
            const currentPath = window.location.pathname;
            window.sidebar?.setActiveRoute(currentPath);

            // Inicializar componentes específicos da página
            this.initializePageComponents(pageClassName);

            // Esconder loading
            window.loading?.hide();

            console.log(`Página ${pageClassName} renderizada com sucesso`);

        } catch (error) {
            console.error('Erro ao renderizar página:', error);
            window.loading?.hide();
            window.toast?.error('Erro ao carregar a página');
        }
    }

    initializePageComponents(pageClassName) {
        // Inicializar componentes específicos de cada página
        switch (pageClassName) {
            case 'DashboardPage':
                this.currentPage?.initChart?.();
                break;
            case 'EscalasPage':
                // Nenhum componente específico necessário
                break;
            case 'MusicasPage':
                // Nenhum componente específico necessário
                break;
            case 'EquipePage':
                this.currentPage?.initParticipationChart?.();
                break;
            case 'UtilitariosPage':
                // Nenhum componente específico necessário
                break;
        }
    }

    getPageTitle(pageClassName) {
        const titles = {
            'DashboardPage': 'Dashboard',
            'EscalasPage': 'Escalas',
            'MusicasPage': 'Músicas',
            'EquipePage': 'Equipe',
            'UtilitariosPage': 'Utilitários'
        };
        return titles[pageClassName] || 'Louvor CEVD';
    }

    handleRouteChange(path) {
        console.log('Rota alterada para:', path);
        
        // Atualizar título da página
        const title = this.getPageTitleFromPath(path);
        document.title = `${title} - ${window.APP_CONFIG.APP.NAME}`;
        
        // Scroll para o topo
        window.scrollTo(0, 0);
    }

    getPageTitleFromPath(path) {
        const titles = {
            '/dashboard': 'Dashboard',
            '/escalas': 'Escalas',
            '/musicas': 'Músicas',
            '/equipe': 'Equipe',
            '/utilitarios': 'Utilitários'
        };
        return titles[path] || 'Dashboard';
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K: Busca global
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.openGlobalSearch();
        }

        // Ctrl/Cmd + /: Mostrar atalhos
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            this.showShortcuts();
        }

        // Esc: Fechar modais
        if (e.key === 'Escape') {
            this.closeModals();
        }
    }

    openGlobalSearch() {
        window.toast?.info('Busca global em desenvolvimento', 'info');
    }

    showShortcuts() {
        const shortcuts = [
            { key: 'Ctrl + K', description: 'Busca global' },
            { key: 'Ctrl + /', description: 'Mostrar atalhos' },
            { key: 'Esc', description: 'Fechar modais' },
            { key: 'Ctrl + S', description: 'Sincronizar dados' }
        ];

        const shortcutsHTML = shortcuts.map(shortcut => `
            <div class="shortcut-item">
                <kbd>${shortcut.key}</kbd>
                <span>${shortcut.description}</span>
            </div>
        `).join('');

        // Criar modal de atalhos
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Atalhos de Teclado</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="shortcuts-list">
                        ${shortcutsHTML}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Eventos do modal
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn?.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    closeModals() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        });
    }

    async syncData() {
        try {
            await window.api?.syncAll();
            window.toast?.success('Dados sincronizados com sucesso');
        } catch (error) {
            console.error('Erro na sincronização:', error);
            window.toast?.warning('Erro na sincronização. Usando dados cacheados.');
        }
    }

    hideLoading() {
        const loadingElement = document.getElementById('loading');
        const appContent = document.getElementById('app-content');
        
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
        
        if (appContent) {
            appContent.classList.remove('hidden');
        }
    }

    showError(message) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div class="error-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>Erro</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">
                        <i class="fas fa-redo"></i>
                        Recarregar
                    </button>
                </div>
            `;
        }
    }

    // Método para reinicializar a aplicação
    async restart() {
        console.log('Reiniciando aplicação...');
        
        // Limpar cache
        window.cache?.clear();
        
        // Recarregar configuração
        this.loadConfiguration();
        
        // Reconfigurar roteamento
        this.setupRouting();
        
        // Recarregar página atual
        const currentPath = window.location.pathname;
        await window.router.handleRoute(currentPath);
        
        window.toast?.success('Aplicação reiniciada com sucesso');
    }

    // Métodos de Autenticação
    async requireAuth(callback) {
        try {
            // Verificar se o serviço de autenticação está inicializado
            if (!window.authService?.isInitialized) {
                await window.authService?.initialize();
            }

            // Verificar se usuário está autenticado
            const session = await window.authService?.checkCurrentSession();
            
            if (session) {
                // Usuário está autenticado, executar callback
                return callback();
            } else {
                // Usuário não está autenticado, redirecionar para login
                window.toast?.warning('Você precisa estar autenticado para acessar esta página');
                window.router?.navigate('/login');
                return null;
            }
            
        } catch (error) {
            console.error('Erro na verificação de autenticação:', error);
            window.router?.navigate('/login');
            return null;
        }
    }

    async handleRootRoute() {
        try {
            // Verificar se usuário está autenticado
            const session = await window.authService?.checkCurrentSession();
            
            if (session) {
                // Usuário autenticado, ir para dashboard
                return this.renderPage('DashboardPage');
            } else {
                // Usuário não autenticado, ir para login
                return this.renderPage('LoginPage');
            }
            
        } catch (error) {
            console.error('Erro ao verificar autenticação na rota raiz:', error);
            return this.renderPage('LoginPage');
        }
    }

    setupAuthListener() {
        if (!window.authService) return;

        // Configurar listener para mudanças de autenticação
        window.authService.onAuthStateChange((event, session) => {
            console.log('Estado de autenticação mudou:', event);
            
            if (event === 'SIGNED_IN' && session) {
                // Usuário fez login
                window.toast?.success('Bem-vindo ao sistema!');
                
                // Atualizar sidebar com dados do usuário
                const profile = window.storage?.get('user_profile');
                if (profile) {
                    window.sidebar?.setUserInfo(profile);
                }
                
                // Redirecionar para dashboard se estiver na página de login
                if (window.location.pathname === '/login') {
                    window.router?.navigate('/dashboard');
                }
                
            } else if (event === 'SIGNED_OUT') {
                // Usuário fez logout
                window.toast?.info('Você saiu do sistema');
                
                // Limpar sidebar
                window.sidebar?.setUserInfo(null);
                
                // Redirecionar para login
                window.router?.navigate('/login');
            }
        });
    }

    // Método para logout global
    async logout() {
        try {
            await window.authService?.logout();
            window.router?.navigate('/login');
        } catch (error) {
            console.error('Erro no logout:', error);
            window.toast?.error('Erro ao sair do sistema');
        }
    }
}

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.init();
    
    // Tornar instância global
    window.app = app;
});

// Tratar caso o DOM já esteja carregado
if (document.readyState === 'loading') {
    // Ainda carregando, aguardar evento
} else {
    // DOM já carregado, inicializar imediatamente
    (async () => {
        const app = new App();
        await app.init();
        window.app = app;
    })();
}
