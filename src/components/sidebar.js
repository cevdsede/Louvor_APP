// Componente de Sidebar
class Sidebar {
    constructor() {
        this.isOpen = false;
        this.element = null;
        this.overlay = null;
        this.init();
    }

    init() {
        this.createSidebar();
        this.createOverlay();
        this.bindEvents();
    }

    createSidebar() {
        const sidebarHTML = `
            <aside id="sidebar" class="sidebar">
                <div class="sidebar-header">
                    <div class="sidebar-logo">
                        <img src="/assets/backgroud.png" alt="Logo" class="logo-img">
                        <span class="logo-text">Louvor CEVD</span>
                    </div>
                </div>

                <nav class="sidebar-nav">
                    <ul class="nav-list">
                        <li class="nav-item">
                            <a href="/dashboard" class="nav-link" data-route="/dashboard">
                                <i class="fas fa-th-large nav-icon"></i>
                                <span class="nav-text">Dashboard</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="/escalas" class="nav-link" data-route="/escalas">
                                <i class="fas fa-calendar-check nav-icon"></i>
                                <span class="nav-text">Escalas</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="/musicas" class="nav-link" data-route="/musicas">
                                <i class="fas fa-music nav-icon"></i>
                                <span class="nav-text">Músicas</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="/equipe" class="nav-link" data-route="/equipe">
                                <i class="fas fa-users-gear nav-icon"></i>
                                <span class="nav-text">Equipe</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="/utilitarios" class="nav-link" data-route="/utilitarios">
                                <i class="fas fa-tools nav-icon"></i>
                                <span class="nav-text">Utilitários</span>
                            </a>
                        </li>
                    </ul>
                </nav>

                <div class="sidebar-footer">
                    <div class="user-section">
                        <div class="user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="user-info">
                            <div class="user-name">Usuário</div>
                            <div class="user-role">Administrador</div>
                        </div>
                    </div>

                    <div class="sidebar-actions">
                        <button class="action-btn theme-btn" title="Trocar Tema">
                            <i class="fas fa-palette"></i>
                        </button>
                        <button class="action-btn logout-btn" title="Sair">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                </div>
            </aside>
        `;

        document.body.insertAdjacentHTML('beforeend', sidebarHTML);
        this.element = document.getElementById('sidebar');
    }

    createOverlay() {
        const overlayHTML = `
            <div id="sidebar-overlay" class="sidebar-overlay"></div>
        `;
        document.body.insertAdjacentHTML('beforeend', overlayHTML);
        this.overlay = document.getElementById('sidebar-overlay');
    }

    bindEvents() {
        // Toggle mobile sidebar
        const toggleBtn = document.querySelector('.sidebar-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }

        // Close sidebar on overlay click
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.close());
        }

        // Theme toggle
        const themeBtn = document.querySelector('.theme-toggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleTheme());
        }

        // Logout button
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Navigation items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const href = item.getAttribute('href');
                if (href) {
                    window.router?.navigate(href);
                }
            });
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.element?.classList.add('open');
        this.overlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.isOpen = false;
        this.element?.classList.remove('open');
        this.overlay?.classList.remove('active');
        document.body.style.overflow = '';
    }

    toggleTheme() {
        const currentTheme = window.storage.get('theme', 'light');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        window.storage.set('theme', newTheme);
        document.body.setAttribute('data-theme', newTheme);
        
        window.toast?.show(`Tema ${newTheme === 'dark' ? 'escuro' : 'claro'} ativado`, 'success');
    }

    handleLogout() {
        if (confirm('Tem certeza que deseja sair do sistema?')) {
            window.app?.logout();
        }
    }

    handleResize() {
        if (window.innerWidth > 768 && this.isOpen) {
            this.close();
        }
    }

    // Atualizar menu ativo
    setActiveRoute(route) {
        const links = this.element?.querySelectorAll('.nav-link');
        links?.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-route') === route) {
                link.classList.add('active');
            }
        });
    }

    // Atualizar informações do usuário
    updateUser(userInfo) {
        const userName = this.element?.querySelector('.user-name');
        const userRole = this.element?.querySelector('.user-role');
        const userAvatar = this.element?.querySelector('.user-avatar i');

        if (userName) userName.textContent = userInfo.name || 'Usuário';
        if (userRole) userRole.textContent = userInfo.role || 'Administrador';
        if (userAvatar && userInfo.avatar) {
            userAvatar.className = '';
            userAvatar.style.backgroundImage = `url(${userInfo.avatar})`;
            userAvatar.style.backgroundSize = 'cover';
            userAvatar.style.backgroundPosition = 'center';
        }
    }

    // Renderizar (para uso no sistema de componentes)
    render() {
        if (!this.element) {
            this.init();
        }
        return this.element;
    }
}

// Criar instância global
window.sidebar = new Sidebar();
