// Página de Escalas
class Escalas {
    constructor() {
        this.data = {
            escalas: [],
            repertorio: []
        };
        this.currentView = 'list';
        this.searchTerm = '';
    }

    async render() {
        await this.loadData();
        return this.getTemplate();
    }

    async loadData() {
        try {
            const result = await window.api?.syncAll();
            if (result) {
                this.data.escalas = result.escalas || [];
                this.data.repertorio = result.repertorio || [];
            }
        } catch (error) {
            console.error('Erro ao carregar dados das escalas:', error);
        }
    }

    getTemplate() {
        const filteredEscalas = this.getFilteredEscalas();
        const groupedEscalas = this.groupEscalasByDate(filteredEscalas);

        return `
            <div class="app-layout">
                ${window.sidebar?.render()?.outerHTML || ''}
                
                <div class="main-content">
                    ${window.header?.render()?.outerHTML || ''}
                    
                    <div class="content-wrapper">
                        <!-- Header Simplificado -->
                        <div class="page-header-simple">
                            <h1 class="page-title">Escalas</h1>
                        </div>

                        <!-- Conteúdo Principal -->
                        <div class="page-content-simple">
                            ${Object.keys(groupedEscalas).length === 0 ? 
                                this.renderEmptyState() : 
                                this.renderEscalasList(groupedEscalas)
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        return `
            <div class="empty-state-simple">
                <i class="fas fa-calendar-xmark"></i>
                <h3>Nenhuma escala encontrada</h3>
                <p>Adicione sua primeira escala para começar</p>
                <button class="btn btn-primary" onclick="window.escalasPage?.showAddEscalaModal()">
                    <i class="fas fa-plus"></i>
                    Adicionar Escala
                </button>
            </div>
        `;
    }

    renderEscalasList(groupedEscalas) {
        return `
            <div class="escalas-list-simple">
                ${Object.entries(groupedEscalas).map(([date, escalas]) => `
                    <div class="date-group-simple">
                        <div class="date-header-simple">
                            <h3 class="date-title">${this.formatDate(date)}</h3>
                            <span class="date-count">${escalas.length} culto${escalas.length > 1 ? 's' : ''}</span>
                        </div>
                        <div class="cultos-list-simple">
                            ${escalas.map(escala => this.renderEscalaCardSimple(escala)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderEscalaCardSimple(escala) {
        return `
            <div class="escala-card-simple" onclick="window.escalasPage?.showEscalaDetails('${escala.Data}', '${escala['Nome dos Cultos']}')">
                <div class="escala-header-simple">
                    <div class="escala-info-simple">
                        <h4 class="escala-title-simple">${escala['Nome dos Cultos']}</h4>
                        <div class="escala-meta-simple">
                            <span class="escala-status ${this.getEscalaStatusClass(escala.Data)}">
                                ${this.getEscalaStatusText(escala.Data)}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="escala-content-simple">
                    <div class="escala-team-simple">
                        ${this.getTeamForEscala(escala.Data, escala['Nome dos Cultos']).slice(0, 4).map(member => `
                            <div class="team-member-simple">
                                <i class="fas ${this.getRoleIcon(member.Função)}"></i>
                                <span>${member.Nome}</span>
                            </div>
                        `).join('')}
                        ${this.getTeamForEscala(escala.Data, escala['Nome dos Cultos']).length > 4 ? `
                            <div class="team-more-simple">
                                +${this.getTeamForEscala(escala.Data, escala['Nome dos Cultos']).length - 4}
                            </div>
                        ` : ''}
                    </div>

                    ${escala.Músicas ? `
                        <div class="escala-music-simple">
                            <i class="fas fa-music"></i>
                            <span>${escala.Músicas}</span>
                            ${escala.Tons ? `<span class="music-tone-simple">${escala.Tons}</span>` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderListView() {
        const filteredEscalas = this.getFilteredEscalas();
        const groupedEscalas = this.groupEscalasByDate(filteredEscalas);

        if (Object.keys(groupedEscalas).length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-calendar-xmark"></i>
                    <h3>Nenhuma escala encontrada</h3>
                    <p>${this.searchTerm ? 'Tente outra busca' : 'Adicione sua primeira escala'}</p>
                    ${!this.searchTerm ? `
                        <button class="btn btn-primary" onclick="window.escalasPage?.showAddEscalaModal()">
                            <i class="fas fa-plus"></i>
                            Adicionar Escala
                        </button>
                    ` : ''}
                </div>
            `;
        }

        return `
            <div class="escalas-list">
                ${Object.entries(groupedEscalas).map(([date, escalas]) => `
                    <div class="date-group">
                        <div class="date-header">
                            <h3 class="date-title">${this.formatDate(date)}</h3>
                            <span class="date-count">${escalas.length} culto${escalas.length > 1 ? 's' : ''}</span>
                        </div>
                        <div class="cultos-grid">
                            ${escalas.map(escala => this.renderEscalaCard(escala)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderCalendarView() {
        return `
            <div class="calendar-view">
                <div class="calendar-header">
                    <button class="btn btn-ghost" onclick="window.escalasPage?.previousMonth()">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h2 class="calendar-title">${this.getCurrentMonth()}</h2>
                    <button class="btn btn-ghost" onclick="window.escalasPage?.nextMonth()">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="calendar-grid">
                    ${this.renderCalendarGrid()}
                </div>
            </div>
        `;
    }

    renderTeamView() {
        const teamStats = this.getTeamStats();
        const teamMembers = this.getTeamMembers();

        return `
            <div class="team-view">
                <div class="team-stats">
                    ${teamStats.map(stat => `
                        <div class="team-stat-card">
                            <div class="stat-icon" style="background: ${stat.color}">
                                <i class="fas ${stat.icon}"></i>
                            </div>
                            <div class="stat-info">
                                <div class="stat-value">${stat.count}</div>
                                <div class="stat-label">${stat.role}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="team-members">
                    <h3 class="section-title">Membros da Equipe</h3>
                    <div class="members-grid">
                        ${teamMembers.map(member => this.renderTeamMemberCard(member)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderEscalaCard(escala) {
        return `
            <div class="escala-card" onclick="window.escalasPage?.showEscalaDetails('${escala.Data}', '${escala['Nome dos Cultos']}')">
                <div class="escala-header">
                    <div class="escala-info">
                        <h4 class="escala-title">${escala['Nome dos Cultos']}</h4>
                        <div class="escala-meta">
                            <span class="escala-date">${this.formatDate(escala.Data)}</span>
                            <span class="escala-status ${this.getEscalaStatusClass(escala.Data)}">
                                ${this.getEscalaStatusText(escala.Data)}
                            </span>
                        </div>
                    </div>
                    <div class="escala-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); window.escalasPage?.editEscala('${escala.Data}', '${escala['Nome dos Cultos']}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
                
                <div class="escala-content">
                    <div class="escala-team">
                        <h5>Equipe</h5>
                        <div class="team-list">
                            ${this.getTeamForEscala(escala.Data, escala['Nome dos Cultos']).slice(0, 3).map(member => `
                                <div class="team-member">
                                    <i class="fas ${this.getRoleIcon(member.Função)}"></i>
                                    <span>${member.Nome}</span>
                                </div>
                            `).join('')}
                            ${this.getTeamForEscala(escala.Data, escala['Nome dos Cultos']).length > 3 ? `
                                <div class="team-more">
                                    +${this.getTeamForEscala(escala.Data, escala['Nome dos Cultos']).length - 3} mais
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    ${escala.Músicas ? `
                        <div class="escala-music">
                            <h5>Repertório</h5>
                            <div class="music-info">
                                <i class="fas fa-music"></i>
                                <span>${escala.Músicas}</span>
                                ${escala.Tons ? `<span class="music-tone">${escala.Tons}</span>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderTeamMemberCard(member) {
        const participacoes = this.getMemberParticipations(member.name);
        const ultimaParticipacao = participacoes.length > 0 ? participacoes[0] : null;

        return `
            <div class="team-member-card">
                <div class="member-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="member-info">
                    <h4 class="member-name">${member.name}</h4>
                    <p class="member-role">${member.role}</p>
                    <div class="member-stats">
                        <span class="stat">
                            <i class="fas fa-calendar"></i>
                            ${participacoes.length} participações
                        </span>
                        ${ultimaParticipacao ? `
                            <span class="stat">
                                <i class="fas fa-clock"></i>
                                Última: ${this.formatDate(ultimaParticipacao.data)}
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="member-actions">
                    <button class="btn-icon" onclick="window.escalasPage?.showMemberDetails('${member.name}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Métodos utilitários
    getFilteredEscalas() {
        if (!this.searchTerm) return this.data.escalas;

        const term = this.searchTerm.toLowerCase();
        return this.data.escalas.filter(escala => 
            escala['Nome dos Cultos']?.toLowerCase().includes(term) ||
            escala.Nome?.toLowerCase().includes(term) ||
            escala.Função?.toLowerCase().includes(term) ||
            escala.Músicas?.toLowerCase().includes(term)
        );
    }

    groupEscalasByDate(escalas) {
        const grouped = {};
        escalas.forEach(escala => {
            const date = escala.Data;
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(escala);
        });
        return grouped;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { 
            weekday: 'long',
            day: '2-digit', 
            month: '2-digit',
            year: 'numeric'
        });
    }

    getEscalaStatusClass(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'status-past';
        if (diffDays === 0) return 'status-today';
        if (diffDays <= 3) return 'status-soon';
        return 'status-future';
    }

    getEscalaStatusText(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Realizado';
        if (diffDays === 0) return 'Hoje';
        if (diffDays === 1) return 'Amanhã';
        if (diffDays <= 7) return `Em ${diffDays} dias`;
        return `Em ${diffDays} dias`;
    }

    getTeamForEscala(date, culto) {
        return this.data.escalas.filter(escala => 
            escala.Data === date && escala['Nome dos Cultos'] === culto
        );
    }

    getRoleIcon(role) {
        const icons = {
            'Ministro': 'fa-microphone',
            'Back': 'fa-microphone-stand',
            'Violão': 'fa-guitar',
            'Guitarra': 'fa-guitar-electric',
            'Baixo': 'fa-mandolin',
            'Bateria': 'fa-drum',
            'Teclado': 'fa-keyboard'
        };
        return icons[role] || 'fa-user';
    }

    getTeamStats() {
        const roles = {};
        this.data.escalas.forEach(escala => {
            const role = escala.Função || 'Participante';
            roles[role] = (roles[role] || 0) + 1;
        });

        const colors = {
            'Ministro': '#3b82f6',
            'Back': '#10b981',
            'Violão': '#f59e0b',
            'Guitarra': '#ef4444',
            'Baixo': '#8b5cf6',
            'Bateria': '#06b6d4',
            'Teclado': '#ec4899'
        };

        return Object.entries(roles).map(([role, count]) => ({
            role,
            count,
            icon: this.getRoleIcon(role),
            color: colors[role] || '#64748b'
        }));
    }

    getTeamMembers() {
        const members = {};
        this.data.escalas.forEach(escala => {
            if (escala.Nome) {
                if (!members[escala.Nome]) {
                    members[escala.Nome] = {
                        name: escala.Nome,
                        role: escala.Função || 'Participante'
                    };
                }
            }
        });
        return Object.values(members);
    }

    getMemberParticipations(memberName) {
        return this.data.escalas
            .filter(escala => escala.Nome === memberName)
            .map(escala => ({
                data: escala.Data,
                culto: escala['Nome dos Cultos'],
                funcao: escala.Função
            }))
            .sort((a, b) => new Date(b.data) - new Date(a.data));
    }

    // Métodos de interação
    switchView(view) {
        this.currentView = view;
        window.router?.renderComponent(window.escalasPage);
    }

    handleSearch(term) {
        this.searchTerm = term;
        window.router?.renderComponent(window.escalasPage);
    }

    showEscalaDetails(date, culto) {
        // Implementar modal de detalhes
        console.log('Mostrar detalhes:', date, culto);
    }

    editEscala(date, culto) {
        // Implementar edição
        console.log('Editar escala:', date, culto);
    }

    showAddEscalaModal() {
        // Implementar modal de adição
        console.log('Adicionar nova escala');
    }

    exportEscalas() {
        // Implementar exportação
        console.log('Exportar escalas');
    }

    showMemberDetails(memberName) {
        // Implementar detalhes do membro
        console.log('Detalhes do membro:', memberName);
    }

    previousMonth() {
        // Implementar navegação do calendário
        console.log('Mês anterior');
    }

    nextMonth() {
        // Implementar navegação do calendário
        console.log('Próximo mês');
    }

    getCurrentMonth() {
        const date = new Date();
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }

    renderCalendarGrid() {
        // Implementar grade do calendário
        return '<div class="calendar-placeholder">Calendário em desenvolvimento...</div>';
    }
}

// Registrar página
window.EscalasPage = Escalas;
