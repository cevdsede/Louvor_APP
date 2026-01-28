// Página de Equipe
class Equipe {
    constructor() {
        this.data = {
            escalas: []
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
            const result = await window.api?.getEscalas();
            this.data.escalas = result || [];
        } catch (error) {
            console.error('Erro ao carregar dados da equipe:', error);
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
                            <h1 class="page-title">Equipe</h1>
                            <p class="page-description">Membros e participação do ministério</p>
                        </div>

                        <!-- Estatísticas -->
                        <div class="team-stats-overview">
                            ${this.renderTeamStats()}
                        </div>

                        <!-- Controles -->
                        <div class="page-controls">
                            <div class="view-switcher">
                                <button class="view-btn ${this.currentView === 'list' ? 'active' : ''}" 
                                        onclick="window.equipePage?.switchView('list')">
                                    <i class="fas fa-list"></i>
                                    Lista
                                </button>
                                <button class="view-btn ${this.currentView === 'grid' ? 'active' : ''}" 
                                        onclick="window.equipePage?.switchView('grid')">
                                    <i class="fas fa-th"></i>
                                    Grid
                                </button>
                                <button class="view-btn ${this.currentView === 'participation' ? 'active' : ''}" 
                                        onclick="window.equipePage?.switchView('participation')">
                                    <i class="fas fa-chart-bar"></i>
                                    Participação
                                </button>
                            </div>

                            <div class="search-box">
                                <div class="search-input-wrapper">
                                    <i class="fas fa-search"></i>
                                    <input type="text" 
                                           placeholder="Pesquisar membro..." 
                                           value="${this.searchTerm}"
                                           onkeyup="window.equipePage?.handleSearch(this.value)">
                                </div>
                            </div>

                            <div class="action-buttons">
                                <button class="btn btn-primary" onclick="window.equipePage?.showAddMemberModal()">
                                    <i class="fas fa-user-plus"></i>
                                    Novo Membro
                                </button>
                                <button class="btn btn-outline" onclick="window.equipePage?.exportTeam()">
                                    <i class="fas fa-download"></i>
                                    Exportar
                                </button>
                            </div>
                        </div>

                        <!-- Conteúdo das Views -->
                        <div class="page-content">
                            ${this.renderCurrentView()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderCurrentView() {
        switch (this.currentView) {
            case 'list':
                return this.renderListView();
            case 'grid':
                return this.renderGridView();
            case 'participation':
                return this.renderParticipationView();
            default:
                return this.renderListView();
        }
    }

    renderTeamStats() {
        const stats = this.getTeamStatistics();
        
        return `
            <div class="stats-cards">
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.totalMembers}</div>
                        <div class="stat-label">Total de Membros</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.activeThisMonth}</div>
                        <div class="stat-label">Ativos este Mês</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon purple">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.topParticipator}</div>
                        <div class="stat-label">Maior Participação</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.avgParticipation}</div>
                        <div class="stat-label">Média de Participação</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderListView() {
        const filteredMembers = this.getFilteredMembers();

        if (filteredMembers.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>Nenhum membro encontrado</h3>
                    <p>${this.searchTerm ? 'Tente outra busca' : 'Adicione seu primeiro membro'}</p>
                    ${!this.searchTerm ? `
                        <button class="btn btn-primary" onclick="window.equipePage?.showAddMemberModal()">
                            <i class="fas fa-user-plus"></i>
                            Adicionar Membro
                        </button>
                    ` : ''}
                </div>
            `;
        }

        return `
            <div class="team-list">
                ${filteredMembers.map(member => this.renderMemberCard(member)).join('')}
            </div>
        `;
    }

    renderGridView() {
        const filteredMembers = this.getFilteredMembers();

        return `
            <div class="team-grid">
                ${filteredMembers.map(member => this.renderMemberGridCard(member)).join('')}
            </div>
        `;
    }

    renderParticipationView() {
        const participationData = this.getParticipationData();

        return `
            <div class="participation-view">
                <div class="participation-chart">
                    <canvas id="participationChart" width="400" height="200"></canvas>
                </div>
                <div class="participation-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Membro</th>
                                <th>Participações</th>
                                <th>Última Participação</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${participationData.map(member => this.renderParticipationRow(member)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderMemberCard(member) {
        const participation = this.getMemberParticipation(member.name);
        const lastParticipation = participation.length > 0 ? participation[0].date : null;

        return `
            <div class="member-card">
                <div class="member-header">
                    <div class="member-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="member-info">
                        <h3 class="member-name">${member.name}</h3>
                        <p class="member-role">${member.primaryRole}</p>
                        <div class="member-stats">
                            <span class="stat">
                                <i class="fas fa-calendar"></i>
                                ${participation.length} participações
                            </span>
                            ${lastParticipation ? `
                                <span class="stat">
                                    <i class="fas fa-clock"></i>
                                    Última: ${this.formatDate(lastParticipation)}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="member-actions">
                        <button class="btn-icon" onclick="window.equipePage?.viewMember('${member.name}')" title="Ver">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="window.equipePage?.editMember('${member.name}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
                
                <div class="member-roles">
                    <h4>Funções:</h4>
                    <div class="roles-list">
                        ${member.roles.map(role => `
                            <span class="role-badge">${role}</span>
                        `).join('')}
                    </div>
                </div>

                <div class="member-recent">
                    <h4>Participações Recentes:</h4>
                    <div class="recent-list">
                        ${participation.slice(0, 3).map(p => `
                            <div class="recent-item">
                                <i class="fas fa-calendar"></i>
                                <span>${this.formatDate(p.date)} - ${p.culto}</span>
                                <span class="role-text">${p.role}</span>
                            </div>
                        `).join('')}
                        ${participation.length > 3 ? `
                            <div class="recent-more">
                                +${participation.length - 3} mais
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderMemberGridCard(member) {
        const participation = this.getMemberParticipation(member.name);

        return `
            <div class="member-grid-card" onclick="window.equipePage?.viewMember('${member.name}')">
                <div class="member-avatar-large">
                    <i class="fas fa-user"></i>
                </div>
                <h3 class="member-name">${member.name}</h3>
                <p class="member-role">${member.primaryRole}</p>
                <div class="member-stats">
                    <span class="stat">
                        <i class="fas fa-calendar"></i>
                        ${participation.length}
                    </span>
                </div>
            </div>
        `;
    }

    renderParticipationRow(member) {
        const status = this.getMemberStatus(member.lastParticipation);
        
        return `
            <tr>
                <td>${member.name}</td>
                <td>${member.participations}</td>
                <td>${member.lastParticipation ? this.formatDate(member.lastParticipation) : 'Nunca'}</td>
                <td>
                    <span class="status-badge ${status.class}">${status.text}</span>
                </td>
            </tr>
        `;
    }

    // Métodos utilitários
    getTeamStatistics() {
        const members = this.getTeamMembers();
        const today = new Date();
        const thisMonth = today.getMonth();
        const thisYear = today.getFullYear();

        const participations = members.map(member => ({
            name: member.name,
            count: this.getMemberParticipation(member.name).length
        }));

        const activeThisMonth = members.filter(member => {
            const participations = this.getMemberParticipation(member.name);
            return participations.some(p => {
                const date = new Date(p.date);
                return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
            });
        }).length;

        const topParticipator = participations.reduce((max, member) => 
            member.count > max.count ? member : max, { count: 0 }).name || 'N/A';

        const avgParticipation = participations.length > 0 
            ? Math.round(participations.reduce((sum, m) => sum + m.count, 0) / participations.length)
            : 0;

        return {
            totalMembers: members.length,
            activeThisMonth,
            topParticipator,
            avgParticipation
        };
    }

    getTeamMembers() {
        const members = {};
        const roles = {};

        this.data.escalas.forEach(escala => {
            if (escala.Nome) {
                if (!members[escala.Nome]) {
                    members[escala.Nome] = {
                        name: escala.Nome,
                        roles: new Set(),
                        participations: []
                    };
                }
                members[escala.Nome].roles.add(escala.Função || 'Participante');
                
                // Contar funções
                const role = escala.Função || 'Participante';
                roles[role] = (roles[role] || 0) + 1;
            }
        });

        // Converter Sets para arrays e determinar função principal
        return Object.values(members).map(member => ({
            name: member.name,
            roles: Array.from(member.roles),
            primaryRole: this.getPrimaryRole(member.roles)
        }));
    }

    getPrimaryRole(roles) {
        const rolePriority = {
            'Ministro': 1,
            'Back': 2,
            'Violão': 3,
            'Guitarra': 4,
            'Baixo': 5,
            'Bateria': 6,
            'Teclado': 7
        };

        return roles.reduce((primary, role) => {
            const priority = rolePriority[role] || 999;
            const primaryPriority = rolePriority[primary] || 999;
            return priority < primaryPriority ? role : primary;
        });
    }

    getMemberParticipation(memberName) {
        return this.data.escalas
            .filter(escala => escala.Nome === memberName)
            .map(escala => ({
                date: escala.Data,
                culto: escala['Nome dos Cultos'],
                role: escala.Função || 'Participante'
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    getFilteredMembers() {
        const members = this.getTeamMembers();
        
        if (!this.searchTerm) return members;

        const term = this.searchTerm.toLowerCase();
        return members.filter(member => 
            member.name.toLowerCase().includes(term) ||
            member.roles.some(role => role.toLowerCase().includes(term))
        );
    }

    getParticipationData() {
        const members = this.getTeamMembers();
        
        return members.map(member => {
            const participations = this.getMemberParticipation(member.name);
            const lastParticipation = participations.length > 0 ? participations[0].date : null;
            
            return {
                name: member.name,
                participations: participations.length,
                lastParticipation
            };
        }).sort((a, b) => b.participations - a.participations);
    }

    getMemberStatus(lastParticipation) {
        if (!lastParticipation) {
            return { class: 'status-inactive', text: 'Inativo' };
        }

        const daysSinceLastParticipation = Math.floor(
            (new Date() - new Date(lastParticipation)) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastParticipation <= 30) {
            return { class: 'status-active', text: 'Ativo' };
        } else if (daysSinceLastParticipation <= 90) {
            return { class: 'status-warning', text: 'Afastado' };
        } else {
            return { class: 'status-inactive', text: 'Inativo' };
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit',
            year: 'numeric'
        });
    }

    // Métodos de interação
    switchView(view) {
        this.currentView = view;
        window.router?.renderComponent(window.equipePage);
    }

    handleSearch(term) {
        this.searchTerm = term;
        window.router?.renderComponent(window.equipePage);
    }

    viewMember(memberName) {
        console.log('Ver membro:', memberName);
    }

    editMember(memberName) {
        console.log('Editar membro:', memberName);
    }

    showAddMemberModal() {
        console.log('Adicionar novo membro');
    }

    exportTeam() {
        console.log('Exportar equipe');
    }
}

// Registrar página
window.EquipePage = Equipe;
