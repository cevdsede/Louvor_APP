// SPA Navigation System
class SPANavigation {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.mainWrapper = null;
        this.init();
    }

    getCurrentPage() {
        const path = window.location.pathname;

        // Se estamos em uma subpasta, precisamos ajustar a base URL
        const baseUrl = window.location.origin;
        const fullPath = window.location.href;

        // Detectar se estamos em uma subpasta
        if (fullPath.includes('/Escalas/')) {
            if (path.includes('Escalas')) return 'escalas';
            if (path.includes('Musicas')) return 'musicas';
            if (path.includes('Componentes')) return 'componentes';
            if (path.includes('Utilitarios')) return 'utilitarios';
            return 'escalas'; // default se estiver em Escalas
        } else if (fullPath.includes('/Musicas/')) {
            if (path.includes('Escalas')) return 'escalas';
            if (path.includes('Musicas')) return 'musicas';
            if (path.includes('Componentes')) return 'componentes';
            if (path.includes('Utilitarios')) return 'utilitarios';
            return 'musicas'; // default se estiver em Musicas
        } else {
            // Estamos na raiz
            if (path.includes('Escalas')) return 'escalas';
            if (path.includes('Musicas')) return 'musicas';
            if (path.includes('Componentes')) return 'componentes';
            if (path.includes('Utilitarios')) return 'utilitarios';
            return 'dashboard';
        }
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupNavigation());
        } else {
            this.setupNavigation();
        }
    }

    setupNavigation() {
        this.mainWrapper = document.querySelector('.main-wrapper');
        if (!this.mainWrapper) {
            console.error('Main wrapper not found');
            return;
        }

        // Setup navigation clicks
        const navItems = document.querySelectorAll('.side-item[data-page]');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateToPage(page);
            });
        });

        // Set active state
        this.updateActiveState();
    }

    async navigateToPage(page) {
        if (page === this.currentPage) return;

        try {
            // Show loading
            this.showLoading();

            // Load page content
            const content = await this.loadPageContent(page);

            // Update main wrapper
            this.mainWrapper.innerHTML = content;

            // Update current page
            this.currentPage = page;

            // Update URL without reload
            const newUrl = this.getPageUrl(page);
            history.pushState({ page }, '', newUrl);

            // Update active state
            this.updateActiveState();

            // Initialize page-specific scripts
            this.initializePageScripts(page);

        } catch (error) {
            console.error('Error loading page:', error);
            this.showError('Erro ao carregar a página');
        } finally {
            this.hideLoading();
        }
    }

    async loadPageContent(page) {
        // Sempre usar caminhos absolutos a partir da raiz do projeto
        const pageMap = {
            'dashboard': '/index.html',
            'escalas': '/Escalas/HTML/Escalas-main.html',
            'musicas': '/Musicas/HTML/MenuMusicas-main.html',
            'componentes': '/Componentes/HTML/Componentes.html',
            'utilitarios': '/Utilitarios/HTML/MenuUtilitarios.html'
        };

        const url = pageMap[page];
        if (!url) throw new Error(`Page not found: ${page}`);

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const html = await response.text();

        // For dashboard, we need to extract the main-wrapper content
        if (page === 'dashboard') {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const pageMainWrapper = doc.querySelector('.main-wrapper');

            if (!pageMainWrapper) throw new Error('Main wrapper not found in loaded page');

            return pageMainWrapper.innerHTML;
        }

        // For other pages, return the full HTML as they are main-wrapper content
        return html;
    }

    getPageUrl(page) {
        // Sempre usar caminhos absolutos a partir da raiz do projeto
        const urlMap = {
            'dashboard': '/index.html',
            'escalas': '/Escalas/HTML/Escalas-SPA.html',
            'musicas': '/Musicas/HTML/MenuMusicas-SPA.html',
            'componentes': '/Componentes/HTML/Componentes.html',
            'utilitarios': '/Utilitarios/HTML/MenuUtilitarios.html'
        };
        return urlMap[page] || 'index.html';
    }

    updateActiveState() {
        const navItems = document.querySelectorAll('.side-item[data-page]');
        navItems.forEach(item => {
            const page = item.dataset.page;
            if (page === this.currentPage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    initializePageScripts(page) {
        // Re-initialize common scripts
        if (typeof initializeCommon === 'function') {
            initializeCommon();
        }

        // Page-specific initializations
        switch (page) {
            case 'dashboard':
                if (typeof initializeDashboard === 'function') {
                    initializeDashboard();
                }
                break;
            case 'escalas':
                if (typeof initializeEscalas === 'function') {
                    initializeEscalas();
                }
                break;
            case 'musicas':
                if (typeof initializeMusicas === 'function') {
                    initializeMusicas();
                }
                break;
            case 'componentes':
                if (typeof initializeComponentes === 'function') {
                    initializeComponentes();
                }
                break;
            case 'utilitarios':
                if (typeof initializeUtilitarios === 'function') {
                    initializeUtilitarios();
                }
                break;
        }
    }

    showLoading() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'flex';
        }
    }

    hideLoading() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    showError(message) {
        // You can implement a better error display here
        alert(message);
    }
}

// Initialize SPA navigation
const spaNavigation = new SPANavigation();

// Handle browser back/forward buttons
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.page) {
        spaNavigation.navigateToPage(e.state.page);
    }
});
