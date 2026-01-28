// Página de Utilitários
class Utilitarios {
    constructor() {
        this.data = {
            lembretes: []
        };
        this.currentView = 'tools';
    }

    async render() {
        await this.loadData();
        return this.getTemplate();
    }

    async loadData() {
        try {
            const result = await window.api?.getLembretes();
            this.data.lembretes = result || [];
        } catch (error) {
            console.error('Erro ao carregar dados dos utilitários:', error);
        }
    }

    getTemplate() {
        return `
            <div class="app-layout">
                ${window.sidebar?.render()?.outerHTML || ''}
                
                <div class="main-content">
                    ${window.header?.render()?.outerHTML || ''}
                    
                    <div class="content-wrapper">
                        <!-- Header da Página -->
                        <div class="page-header">
                            <h1 class="page-title">Utilitários</h1>
                            <p class="page-description">Ferramentas e recursos do ministério</p>
                        </div>

                        <!-- Conteúdo Principal -->
                        <div class="page-content">
                            ${this.renderCurrentView()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderCurrentView() {
        return `
            <div class="utilities-grid">
                ${this.renderToolsSection()}
                ${this.renderLembretesSection()}
                ${this.renderResourcesSection()}
            </div>
        `;
    }

    renderToolsSection() {
        const tools = [
            {
                id: 'scale-generator',
                title: 'Gerador de Escalas',
                description: 'Crie escalas automáticas baseadas na disponibilidade da equipe',
                icon: 'fa-calendar-plus',
                color: '#3b82f6',
                action: () => this.openScaleGenerator()
            },
            {
                id: 'music-transposer',
                title: 'Transpor Músicas',
                description: 'Altere o tom de músicas automaticamente',
                icon: 'fa-music',
                color: '#10b981',
                action: () => this.openMusicTransposer()
            },
            {
                id: 'availability-manager',
                title: 'Gerenciar Disponibilidade',
                description: 'Controle a disponibilidade dos voluntários',
                icon: 'fa-user-check',
                color: '#8b5cf6',
                action: () => this.openAvailabilityManager()
            },
            {
                id: 'report-generator',
                title: 'Gerador de Relatórios',
                description: 'Crie relatórios detalhados de participação',
                icon: 'fa-chart-bar',
                color: '#f59e0b',
                action: () => this.openReportGenerator()
            },
            {
                id: 'backup-manager',
                title: 'Backup e Restauração',
                description: 'Faça backup dos dados e restaure quando necessário',
                icon: 'fa-database',
                color: '#ef4444',
                action: () => this.openBackupManager()
            },
            {
                id: 'settings',
                title: 'Configurações',
                description: 'Personalize as configurações do sistema',
                icon: 'fa-cog',
                color: '#64748b',
                action: () => this.openSettings()
            }
        ];

        return `
            <section class="utilities-section">
                <h2 class="section-title">Ferramentas</h2>
                <div class="tools-grid">
                    ${tools.map(tool => this.renderToolCard(tool)).join('')}
                </div>
            </section>
        `;
    }

    renderLembretesSection() {
        const upcomingLembretes = this.getUpcomingLembretes();

        return `
            <section class="utilities-section">
                <div class="section-header">
                    <h2 class="section-title">Lembretes</h2>
                    <button class="btn btn-primary btn-sm" onclick="window.utilitariosPage?.showAddLembreteModal()">
                        <i class="fas fa-plus"></i>
                        Novo Lembrete
                    </button>
                </div>
                
                <div class="lembretes-container">
                    ${upcomingLembretes.length > 0 ? 
                        upcomingLembretes.map(lembrete => this.renderLembreteCard(lembrete)).join('') : 
                        this.renderEmptyLembretes()
                    }
                </div>
            </section>
        `;
    }

    renderResourcesSection() {
        const resources = [
            {
                title: 'Tutoriais',
                description: 'Aprenda a usar todas as funcionalidades do sistema',
                icon: 'fa-book',
                color: '#3b82f6',
                items: ['Como criar escalas', 'Gerenciar músicas', 'Configurar equipe']
            },
            {
                title: 'Downloads',
                description: 'Planilhas e documentos úteis',
                icon: 'fa-download',
                color: '#10b981',
                items: ['Planilha de escalas', 'Modelo de repertório', 'Formulário de cadastro']
            },
            {
                title: 'Links Úteis',
                description: 'Recursos externos e referências',
                icon: 'fa-link',
                color: '#8b5cf6',
                items: ['Letras de músicas', 'Cifras', 'Vídeos de ensino']
            }
        ];

        return `
            <section class="utilities-section">
                <h2 class="section-title">Recursos</h2>
                <div class="resources-grid">
                    ${resources.map(resource => this.renderResourceCard(resource)).join('')}
                </div>
            </section>
        `;
    }

    renderToolCard(tool) {
        return `
            <div class="tool-card" onclick="(${tool.action})()">
                <div class="tool-icon" style="background: ${tool.color}">
                    <i class="fas ${tool.icon}"></i>
                </div>
                <div class="tool-content">
                    <h3 class="tool-title">${tool.title}</h3>
                    <p class="tool-description">${tool.description}</p>
                </div>
                <div class="tool-action">
                    <i class="fas fa-arrow-right"></i>
                </div>
            </div>
        `;
    }

    renderLembreteCard(lembrete) {
        const date = new Date(lembrete.Data);
        const formattedDate = date.toLocaleDateString('pt-BR');
        const priorityClass = this.getPriorityClass(lembrete.Prioridade);

        return `
            <div class="lembrete-card">
                <div class="lembrete-header">
                    <div class="lembrete-date">${formattedDate}</div>
                    <span class="priority-badge ${priorityClass}">${lembrete.Prioridade || 'Normal'}</span>
                </div>
                <div class="lembrete-content">
                    <p>${lembrete.Lembrete}</p>
                </div>
                <div class="lembrete-actions">
                    <button class="btn-icon" onclick="window.utilitariosPage?.editLembrete('${lembrete.Data}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="window.utilitariosPage?.deleteLembrete('${lembrete.Data}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    renderEmptyLembretes() {
        return `
            <div class="empty-state">
                <i class="fas fa-bell"></i>
                <h3>Nenhum lembrete encontrado</h3>
                <p>Adicione lembretes para não perder nenhuma data importante</p>
                <button class="btn btn-primary" onclick="window.utilitariosPage?.showAddLembreteModal()">
                    <i class="fas fa-plus"></i>
                    Adicionar Lembrete
                </button>
            </div>
        `;
    }

    renderResourceCard(resource) {
        return `
            <div class="resource-card">
                <div class="resource-header">
                    <div class="resource-icon" style="background: ${resource.color}">
                        <i class="fas ${resource.icon}"></i>
                    </div>
                    <div class="resource-info">
                        <h3 class="resource-title">${resource.title}</h3>
                        <p class="resource-description">${resource.description}</p>
                    </div>
                </div>
                <div class="resource-items">
                    ${resource.items.map(item => `
                        <div class="resource-item">
                            <i class="fas fa-file-alt"></i>
                            <span>${item}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Métodos utilitários
    getUpcomingLembretes() {
        const today = new Date();
        const next30Days = new Date();
        next30Days.setDate(today.getDate() + 30);

        return this.data.lembretes
            .filter(lembrete => {
                const lembreteDate = new Date(lembrete.Data);
                return lembreteDate >= today && lembreteDate <= next30Days;
            })
            .sort((a, b) => new Date(a.Data) - new Date(b.Data));
    }

    getPriorityClass(priority) {
        const classes = {
            'Alta': 'priority-high',
            'Média': 'priority-medium',
            'Baixa': 'priority-low'
        };
        return classes[priority] || 'priority-normal';
    }

    // Métodos de interação
    openScaleGenerator() {
        window.toast?.info('Gerador de escalas em desenvolvimento', 'info');
    }

    openMusicTransposer() {
        window.toast?.info('Transpositor de músicas em desenvolvimento', 'info');
    }

    openAvailabilityManager() {
        window.toast?.info('Gerenciador de disponibilidade em desenvolvimento', 'info');
    }

    openReportGenerator() {
        window.toast?.info('Gerador de relatórios em desenvolvimento', 'info');
    }

    openBackupManager() {
        window.toast?.info('Gerenciador de backup em desenvolvimento', 'info');
    }

    openSettings() {
        window.toast?.info('Configurações em desenvolvimento', 'info');
    }

    showAddLembreteModal() {
        window.toast?.info('Adicionar lembrete em desenvolvimento', 'info');
    }

    editLembrete(date) {
        window.toast?.info('Editar lembrete em desenvolvimento', 'info');
    }

    deleteLembrete(date) {
        if (confirm('Tem certeza que deseja excluir este lembrete?')) {
            window.toast?.info('Excluir lembrete em desenvolvimento', 'info');
        }
    }
}

// Registrar página
window.UtilitariosPage = Utilitarios;
