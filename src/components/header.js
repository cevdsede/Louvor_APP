// Componente de Header
class Header {
    constructor() {
        this.element = null;
        this.init();
    }

    init() {
        this.createHeader();
        this.bindEvents();
    }

    createHeader() {
        const headerHTML = `
            <header id="header" class="header">
                <div class="header-left">
                    <button class="menu-toggle" title="Menu">
                        <i class="fas fa-bars"></i>
                    </button>
                    <button class="back-btn" title="Voltar">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <button class="home-btn" title="Início">
                        <i class="fas fa-home"></i>
                    </button>
                </div>

                <div class="header-center">
                    <h1 class="page-title">Dashboard</h1>
                </div>

                <div class="header-right">
                    <button class="sync-btn" title="Sincronizar">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="theme-btn" title="Temas">
                        <i class="fas fa-palette"></i>
                    </button>
                    <button class="notifications-btn" title="Notificações">
                        <i class="fas fa-bell"></i>
                        <span class="notification-badge">3</span>
                    </button>
                </div>
            </header>
        `;

        document.body.insertAdjacentHTML('beforeend', headerHTML);
        this.element = document.getElementById('header');
    }

    bindEvents() {
        // Menu toggle
        const menuToggle = this.element?.querySelector('.menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                window.sidebar?.toggle();
            });
        }

        // Back button
        const backBtn = this.element?.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.history.back();
            });
        }

        // Home button
        const homeBtn = this.element?.querySelector('.home-btn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                window.router?.navigate('/dashboard');
            });
        }

        // Sync button
        const syncBtn = this.element?.querySelector('.sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.sync());
        }

        // Theme button
        const themeBtn = this.element?.querySelector('.theme-btn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleTheme());
        }

        // Notifications button
        const notificationsBtn = this.element?.querySelector('.notifications-btn');
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', () => this.showNotifications());
        }
    }

    // Atualizar título da página
    setTitle(title) {
        const titleElement = this.element?.querySelector('.page-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    // Sincronizar dados
    async sync() {
        const syncBtn = this.element?.querySelector('.sync-btn i');
        if (!syncBtn) return;

        // Adicionar animação de loading
        syncBtn.classList.add('fa-spin');
        
        try {
            const result = await window.api?.syncAll();
            
            if (result.synced) {
                window.toast?.show('Dados sincronizados com sucesso!', 'success');
            } else {
                window.toast?.show('Usando dados offline', 'warning');
            }
        } catch (error) {
            window.toast?.show('Erro na sincronização', 'error');
        } finally {
            // Remover animação
            setTimeout(() => {
                syncBtn.classList.remove('fa-spin');
            }, 1000);
        }
    }

    // Alternar tema
    toggleTheme() {
        const currentTheme = window.storage.get('theme', 'light');
        const themes = ['light', 'dark', 'blue', 'green', 'purple'];
        const currentIndex = themes.indexOf(currentTheme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        
        window.storage.set('theme', nextTheme);
        document.body.setAttribute('data-theme', nextTheme);
        
        const themeNames = {
            light: 'claro',
            dark: 'escuro',
            blue: 'azul',
            green: 'verde',
            purple: 'roxo'
        };
        
        window.toast?.show(`Tema ${themeNames[nextTheme]} ativado`, 'success');
    }

    // Mostrar notificações
    showNotifications() {
        const notifications = [
            { id: 1, title: 'Nova escala', message: 'Escala de domingo foi atualizada', time: '2h atrás', read: false },
            { id: 2, title: 'Lembrete', message: 'Ensaiar sábado às 15h', time: '5h atrás', read: false },
            { id: 3, title: 'Música nova', message: '5 novas músicas adicionadas', time: '1d atrás', read: true }
        ];

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Notificações</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="notifications-list">
                        ${notifications.map(notif => `
                            <div class="notification-item ${notif.read ? 'read' : ''}">
                                <div class="notification-icon">
                                    <i class="fas fa-bell"></i>
                                </div>
                                <div class="notification-content">
                                    <div class="notification-title">${notif.title}</div>
                                    <div class="notification-message">${notif.message}</div>
                                    <div class="notification-time">${notif.time}</div>
                                </div>
                                <div class="notification-actions">
                                    <button class="notification-action">•••</button>
                                </div>
                            </div>
                        `).join('')}
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

        // Marcar como lidas
        const unreadCount = notifications.filter(n => !n.read).length;
        if (unreadCount > 0) {
            const badge = this.element?.querySelector('.notification-badge');
            if (badge) {
                badge.style.display = 'none';
            }
        }
    }

    // Atualizar badge de notificações
    updateNotificationBadge(count) {
        const badge = this.element?.querySelector('.notification-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 9 ? '9+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // Mostrar/Esconder botão voltar
    showBackButton(show = true) {
        const backBtn = this.element?.querySelector('.back-btn');
        if (backBtn) {
            backBtn.style.display = show ? 'flex' : 'none';
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
window.header = new Header();
