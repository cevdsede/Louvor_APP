// Página de Dashboard
class Dashboard {
    constructor() {
        this.data = {
            escalas: [],
            repertorio: [],
            lembretes: []
        };
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
                this.data.lembretes = result.lembretes || [];
            }
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
        }
    }

    getTemplate() {
        const stats = this.getStats();
        const recentEscalas = this.getRecentEscalas();
        const upcomingLembretes = this.getUpcomingLembretes();

        return `
            <div class="app-layout">
                ${window.sidebar?.render()?.outerHTML || ''}
                
                <div class="main-content">
                    ${window.header?.render()?.outerHTML || ''}
                    
                    <div class="content-wrapper">
                        <!-- Header da Página -->
                        <div class="page-header">
                            <h1 class="page-title">Dashboard</h1>
                            <p class="page-description">Visão geral do ministério de louvor</p>
                        </div>

                        <!-- Stats Cards -->
                        <div class="stats-grid">
                            ${this.renderStatCard('Escalas', stats.totalEscalas, 'fa-calendar-check', 'blue')}
                            ${this.renderStatCard('Músicas', stats.totalMusicas, 'fa-music', 'green')}
                            ${this.renderStatCard('Voluntários', stats.totalVoluntarios, 'fa-users', 'purple')}
                            ${this.renderStatCard('Lembretes', stats.totalLembretes, 'fa-bell', 'orange')}
                        </div>

                        <!-- Conteúdo Principal -->
                        <div class="dashboard-grid">
                            <!-- Próximas Escalas -->
                            <div class="card">
                                <div class="card-header">
                                    <h2 class="card-title">Próximas Escalas</h2>
                                    <button class="btn btn-ghost btn-sm" onclick="window.router?.navigate('/escalas')">
                                        Ver todas
                                    </button>
                                </div>
                                <div class="card-body">
                                    ${recentEscalas.length > 0 ? recentEscalas.map(escala => this.renderEscalaCard(escala)).join('') : 
                                        '<p class="text-center text-slate-400 py-8">Nenhuma escala próxima encontrada</p>'}
                                </div>
                            </div>

                            <!-- Lembretes -->
                            <div class="card">
                                <div class="card-header">
                                    <h2 class="card-title">Lembretes</h2>
                                    <button class="btn btn-ghost btn-sm" onclick="window.router?.navigate('/utilitarios')">
                                        Gerenciar
                                    </button>
                                </div>
                                <div class="card-body">
                                    ${upcomingLembretes.length > 0 ? upcomingLembretes.map(lembrete => this.renderLembreteCard(lembrete)).join('') : 
                                        '<p class="text-center text-slate-400 py-8">Nenhum lembrete próximo</p>'}
                                </div>
                            </div>

                            <!-- Atividades Recentes -->
                            <div class="card">
                                <div class="card-header">
                                    <h2 class="card-title">Atividades Recentes</h2>
                                </div>
                                <div class="card-body">
                                    ${this.renderRecentActivities()}
                                </div>
                            </div>

                            <!-- Gráfico de Participação -->
                            <div class="card">
                                <div class="card-header">
                                    <h2 class="card-title">Participação Mensal</h2>
                                </div>
                                <div class="card-body">
                                    <canvas id="participationChart" width="400" height="200"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderStatCard(title, value, icon, color) {
        const colorClasses = {
            blue: 'bg-blue-500',
            green: 'bg-green-500',
            purple: 'bg-purple-500',
            orange: 'bg-orange-500'
        };

        return `
            <div class="stat-card">
                <div class="stat-icon ${colorClasses[color]}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${value}</div>
                    <div class="stat-label">${title}</div>
                </div>
            </div>
        `;
    }

    renderEscalaCard(escala) {
        const data = new Date(escala.Data);
        const dataFormatada = data.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit' 
        });

        return `
            <div class="escala-card">
                <div class="escala-header">
                    <div class="escala-info">
                        <h3 class="escala-title">${escala['Nome dos Cultos']}</h3>
                        <p class="escala-date">${dataFormatada}</p>
                    </div>
                    <div class="escala-status">
                        <span class="status-badge ${this.getStatusClass(data)}">${this.getStatusText(data)}</span>
                    </div>
                </div>
                <div class="escala-details">
                    <div class="escala-role">
                        <i class="fas fa-user"></i>
                        <span>${escala.Nome}</span>
                        <span class="role-text">${escala.Função}</span>
                    </div>
                    ${escala.Músicas ? `
                        <div class="escala-music">
                            <i class="fas fa-music"></i>
                            <span>${escala.Músicas}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderLembreteCard(lembrete) {
        const data = new Date(lembrete.Data);
        const dataFormatada = data.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit' 
        });

        return `
            <div class="lembrete-card">
                <div class="lembrete-header">
                    <div class="lembrete-date">${dataFormatada}</div>
                    <div class="lembrete-priority ${lembrete.Prioridade?.toLowerCase() || 'normal'}">
                        ${lembrete.Prioridade || 'Normal'}
                    </div>
                </div>
                <div class="lembrete-content">
                    <p>${lembrete.Lembrete}</p>
                </div>
            </div>
        `;
    }

    renderRecentActivities() {
        const activities = [
            { icon: 'fa-calendar-plus', text: 'Nova escala adicionada', time: '2h atrás', color: 'blue' },
            { icon: 'fa-music', text: '3 músicas atualizadas', time: '5h atrás', color: 'green' },
            { icon: 'fa-user-plus', text: 'Novo voluntário cadastrado', time: '1d atrás', color: 'purple' },
            { icon: 'fa-edit', text: 'Escala de domingo atualizada', time: '2d atrás', color: 'orange' }
        ];

        return `
            <div class="activities-list">
                ${activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-icon ${activity.color}">
                            <i class="fas ${activity.icon}"></i>
                        </div>
                        <div class="activity-content">
                            <p class="activity-text">${activity.text}</p>
                            <span class="activity-time">${activity.time}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getStats() {
        const voluntarios = new Set();
        const musicas = new Set();

        this.data.escalas.forEach(escala => {
            if (escala.Nome) voluntarios.add(escala.Nome);
            if (escala.Músicas) musicas.add(escala.Músicas);
        });

        return {
            totalEscalas: this.data.escalas.length,
            totalMusicas: musicas.size,
            totalVoluntarios: voluntarios.size,
            totalLembretes: this.data.lembretes.length
        };
    }

    getRecentEscalas() {
        const hoje = new Date();
        const proximos30dias = new Date();
        proximos30dias.setDate(hoje.getDate() + 30);

        return this.data.escalas
            .filter(escala => {
                const dataEscala = new Date(escala.Data);
                return dataEscala >= hoje && dataEscala <= proximos30dias;
            })
            .sort((a, b) => new Date(a.Data) - new Date(b.Data))
            .slice(0, 5);
    }

    getUpcomingLembretes() {
        const hoje = new Date();
        const proximos7dias = new Date();
        proximos7dias.setDate(hoje.getDate() + 7);

        return this.data.lembretes
            .filter(lembrete => {
                const dataLembrete = new Date(lembrete.Data);
                return dataLembrete >= hoje && dataLembrete <= proximos7dias;
            })
            .sort((a, b) => new Date(a.Data) - new Date(b.Data))
            .slice(0, 5);
    }

    getStatusClass(data) {
        const hoje = new Date();
        const diffDias = Math.ceil((data - hoje) / (1000 * 60 * 60 * 24));

        if (diffDias < 0) return 'status-past';
        if (diffDias <= 3) return 'status-urgent';
        if (diffDias <= 7) return 'status-soon';
        return 'status-normal';
    }

    getStatusText(data) {
        const hoje = new Date();
        const diffDias = Math.ceil((data - hoje) / (1000 * 60 * 60 * 24));

        if (diffDias < 0) return 'Passado';
        if (diffDias === 0) return 'Hoje';
        if (diffDias === 1) return 'Amanhã';
        if (diffDias <= 7) return `Em ${diffDias} dias`;
        return `Em ${diffDias} dias`;
    }

    async initChart() {
        // Inicializar gráfico quando o elemento estiver disponível
        setTimeout(() => {
            const canvas = document.getElementById('participationChart');
            if (canvas && window.Chart) {
                this.createParticipationChart(canvas);
            }
        }, 100);
    }

    createParticipationChart(canvas) {
        const ctx = canvas.getContext('2d');
        
        // Dados de exemplo - substituir com dados reais
        const data = {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            datasets: [{
                label: 'Participantes',
                data: [12, 19, 15, 25, 22, 30],
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2,
                tension: 0.4
            }]
        };

        new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
}

// Registrar página
window.DashboardPage = Dashboard;
