/**
 * Advanced Dashboard System
 * Dashboard com estatísticas detalhadas e gráficos de evolução
 */

class AdvancedDashboard {
    constructor() {
        this.charts = new Map();
        this.metrics = new Map();
        this.filters = {
            period: 'month', // week, month, quarter, year
            team: 'all',
            role: 'all'
        };
        
        this.init();
    }
    
    init() {
        this.addGlobalStyles();
        this.setupEventListeners();
    }
    
    addGlobalStyles() {
        const styleId = 'advanced-dashboard-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .advanced-dashboard {
                padding: 20px;
                max-width: 1400px;
                margin: 0 auto;
            }
            
            .dashboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                flex-wrap: wrap;
                gap: 20px;
            }
            
            .dashboard-title {
                font-size: 24px;
                font-weight: 700;
                color: var(--text-primary, #1e293b);
                margin: 0;
            }
            
            .dashboard-filters {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }
            
            .filter-select {
                padding: 8px 12px;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                background: white;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .filter-select:hover {
                border-color: var(--secondary, #3498db);
            }
            
            .filter-select:focus {
                outline: none;
                border-color: var(--secondary, #3498db);
                box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
            }
            
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .metric-card {
                background: white;
                border-radius: 16px;
                padding: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .metric-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            }
            
            .metric-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, var(--secondary, #3498db), var(--primary, #1e293b));
            }
            
            .metric-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            
            .metric-title {
                font-size: 14px;
                color: var(--text-muted, #64748b);
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .metric-icon {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                color: white;
            }
            
            .metric-value {
                font-size: 32px;
                font-weight: 800;
                color: var(--text-primary, #1e293b);
                margin-bottom: 8px;
                line-height: 1;
            }
            
            .metric-change {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 12px;
                font-weight: 600;
            }
            
            .metric-change.positive {
                color: #10b981;
            }
            
            .metric-change.negative {
                color: #ef4444;
            }
            
            .metric-change.neutral {
                color: #6b7280;
            }
            
            .charts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .chart-card {
                background: white;
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            }
            
            .chart-card.full-width {
                grid-column: 1 / -1;
            }
            
            .chart-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .chart-title {
                font-size: 18px;
                font-weight: 700;
                color: var(--text-primary, #1e293b);
                margin: 0;
            }
            
            .chart-actions {
                display: flex;
                gap: 8px;
            }
            
            .chart-action-btn {
                padding: 6px 10px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                background: white;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .chart-action-btn:hover {
                background: #f8fafc;
                border-color: var(--secondary, #3498db);
            }
            
            .chart-container {
                position: relative;
                height: 300px;
            }
            
            .chart-container.tall {
                height: 400px;
            }
            
            .leaderboard-card {
                background: white;
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            }
            
            .leaderboard-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .leaderboard-item {
                display: flex;
                align-items: center;
                padding: 12px 0;
                border-bottom: 1px solid #f1f5f9;
                transition: all 0.2s;
            }
            
            .leaderboard-item:hover {
                background: #f8fafc;
                margin: 0 -12px;
                padding: 12px;
                border-radius: 8px;
            }
            
            .leaderboard-item:last-child {
                border-bottom: none;
            }
            
            .leaderboard-rank {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 14px;
                margin-right: 12px;
            }
            
            .leaderboard-rank.gold {
                background: linear-gradient(135deg, #fbbf24, #f59e0b);
                color: white;
            }
            
            .leaderboard-rank.silver {
                background: linear-gradient(135deg, #e5e7eb, #9ca3af);
                color: white;
            }
            
            .leaderboard-rank.bronze {
                background: linear-gradient(135deg, #f87171, #dc2626);
                color: white;
            }
            
            .leaderboard-rank.other {
                background: #f1f5f9;
                color: #64748b;
            }
            
            .leaderboard-info {
                flex: 1;
            }
            
            .leaderboard-name {
                font-weight: 600;
                color: var(--text-primary, #1e293b);
                margin-bottom: 2px;
            }
            
            .leaderboard-role {
                font-size: 12px;
                color: var(--text-muted, #64748b);
            }
            
            .leaderboard-value {
                font-weight: 700;
                color: var(--secondary, #3498db);
                font-size: 18px;
            }
            
            .loading-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 16px;
                z-index: 10;
            }
            
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f4f6;
                border-top: 4px solid var(--secondary, #3498db);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .advanced-dashboard {
                    padding: 12px;
                }
                
                .dashboard-header {
                    flex-direction: column;
                    align-items: flex-start;
                }
                
                .dashboard-filters {
                    width: 100%;
                }
                
                .filter-select {
                    flex: 1;
                    min-width: 120px;
                }
                
                .metrics-grid {
                    grid-template-columns: 1fr;
                    gap: 16px;
                }
                
                .charts-grid {
                    grid-template-columns: 1fr;
                    gap: 16px;
                }
                
                .metric-value {
                    font-size: 24px;
                }
                
                .chart-container {
                    height: 250px;
                }
            }
            
            /* Theme-aware styles */
            [data-theme="dark"] .metric-card,
            [data-theme="dark"] .chart-card,
            [data-theme="dark"] .leaderboard-card {
                background: #1f2937;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            
            [data-theme="dark"] .filter-select {
                background: #374151;
                border-color: #4b5563;
                color: #f3f4f6;
            }
            
            [data-theme="dark"] .leaderboard-item {
                border-color: #374151;
            }
            
            [data-theme="dark"] .leaderboard-item:hover {
                background: #374151;
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Listeners para filtros
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('filter-select')) {
                this.filters[e.target.dataset.filter] = e.target.value;
                this.refreshDashboard();
            }
        });
    }
    
    async renderDashboard(container) {
        if (!container) return;
        
        container.innerHTML = `
            <div class="advanced-dashboard">
                <div class="dashboard-header">
                    <h2 class="dashboard-title">📊 Dashboard Avançado</h2>
                    <div class="dashboard-filters">
                        <select class="filter-select" data-filter="period">
                            <option value="week">Esta Semana</option>
                            <option value="month" selected>Este Mês</option>
                            <option value="quarter">Este Trimestre</option>
                            <option value="year">Este Ano</option>
                        </select>
                        <select class="filter-select" data-filter="team">
                            <option value="all" selected>Todas Equipes</option>
                            <option value="vocal">Vocal</option>
                            <option value="instrumental">Instrumental</option>
                            <option value="tecnico">Técnico</option>
                        </select>
                        <select class="filter-select" data-filter="role">
                            <option value="all" selected>Todos Cargos</option>
                            <option value="lider">Líder</option>
                            <option value="vocalista">Vocalista</option>
                            <option value="instrumentista">Instrumentista</option>
                            <option value="tecnico">Técnico</option>
                        </select>
                    </div>
                </div>
                
                <div class="metrics-grid" id="metricsGrid">
                    <!-- Metrics serão inseridas aqui -->
                </div>
                
                <div class="charts-grid">
                    <div class="chart-card full-width">
                        <div class="chart-header">
                            <h3 class="chart-title">📈 Evolução da Participação</h3>
                            <div class="chart-actions">
                                <button class="chart-action-btn" onclick="window.AdvancedDashboard.exportChart('evolution')">📥 Exportar</button>
                                <button class="chart-action-btn" onclick="window.AdvancedDashboard.toggleChartType('evolution')">🔄 Tipo</button>
                            </div>
                        </div>
                        <div class="chart-container tall" id="evolutionChart">
                            <div class="loading-overlay">
                                <div class="loading-spinner"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3 class="chart-title">🎵 Distribuição por Função</h3>
                            <div class="chart-actions">
                                <button class="chart-action-btn" onclick="window.AdvancedDashboard.exportChart('roles')">📥 Exportar</button>
                            </div>
                        </div>
                        <div class="chart-container" id="rolesChart">
                            <div class="loading-overlay">
                                <div class="loading-spinner"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3 class="chart-title">📅 Frequência Mensal</h3>
                            <div class="chart-actions">
                                <button class="chart-action-btn" onclick="window.AdvancedDashboard.exportChart('frequency')">📥 Exportar</button>
                            </div>
                        </div>
                        <div class="chart-container" id="frequencyChart">
                            <div class="loading-overlay">
                                <div class="loading-spinner"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="charts-grid">
                    <div class="leaderboard-card">
                        <div class="chart-header">
                            <h3 class="chart-title">🏆 Top Participantes</h3>
                            <div class="chart-actions">
                                <button class="chart-action-btn" onclick="window.AdvancedDashboard.exportLeaderboard()">📥 Exportar</button>
                            </div>
                        </div>
                        <ul class="leaderboard-list" id="leaderboardList">
                            <!-- Leaderboard será inserido aqui -->
                        </ul>
                    </div>
                    
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3 class="chart-title">🎯 Taxa de Engajamento</h3>
                            <div class="chart-actions">
                                <button class="chart-action-btn" onclick="window.AdvancedDashboard.exportChart('engagement')">📥 Exportar</button>
                            </div>
                        </div>
                        <div class="chart-container" id="engagementChart">
                            <div class="loading-overlay">
                                <div class="loading-spinner"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        await this.loadDashboardData();
    }
    
    async loadDashboardData() {
        try {
            // Mostrar loading nos metrics
            this.showMetricsLoading();
            
            // Carregar dados das escalas
            const escalas = await this.getEscalasData();
            const componentes = await this.getComponentesData();
            
            // Processar dados
            const metrics = this.calculateMetrics(escalas, componentes);
            const evolutionData = this.calculateEvolution(escalas);
            const rolesData = this.calculateRolesDistribution(escalas);
            const frequencyData = this.calculateFrequency(escalas);
            const engagementData = this.calculateEngagement(escalas, componentes);
            const leaderboardData = this.calculateLeaderboard(escalas);
            
            // Renderizar componentes
            this.renderMetrics(metrics);
            this.renderEvolutionChart(evolutionData);
            this.renderRolesChart(rolesData);
            this.renderFrequencyChart(frequencyData);
            this.renderEngagementChart(engagementData);
            this.renderLeaderboard(leaderboardData);
            
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            this.showError('Erro ao carregar dados do dashboard');
        }
    }
    
    async getEscalasData() {
        try {
            const data = await window.IDBManager?.get('offline_escala') || 
                        JSON.parse(localStorage.getItem('offline_escala') || '[]');
            return data.data || [];
        } catch (error) {
            console.error('Erro ao carregar escalas:', error);
            return [];
        }
    }
    
    async getComponentesData() {
        try {
            const data = await window.IDBManager?.get('offline_componentes') || 
                        JSON.parse(localStorage.getItem('offline_componentes') || '[]');
            return data.data || [];
        } catch (error) {
            console.error('Erro ao carregar componentes:', error);
            return [];
        }
    }
    
    calculateMetrics(escalas, componentes) {
        const now = new Date();
        const periodStart = this.getPeriodStart();
        
        // Filtrar escalas do período
        const periodEscalas = escalas.filter(e => {
            const data = new Date(e.Data);
            return data >= periodStart && data <= now;
        });
        
        // Calcular métricas básicas
        const totalParticipacoes = periodEscalas.length;
        const participantesUnicos = new Set(periodEscalas.map(e => e.Nome)).size;
        const cultosRealizados = new Set(periodEscalas.map(e => e.Cultos)).size;
        const mediaParticipacoesPorCulto = cultosRealizados > 0 ? (totalParticipacoes / cultosRealizados).toFixed(1) : 0;
        
        // Calcular mudança em relação ao período anterior
        const previousPeriodStart = this.getPreviousPeriodStart();
        const previousPeriodEscalas = escalas.filter(e => {
            const data = new Date(e.Data);
            return data >= previousPeriodStart && data < periodStart;
        });
        
        const changeTotal = this.calculateChange(previousPeriodEscalas.length, totalParticipacoes);
        const changeParticipantes = this.calculateChange(
            new Set(previousPeriodEscalas.map(e => e.Nome)).size,
            participantesUnicos
        );
        
        return {
            totalParticipacoes: {
                value: totalParticipacoes,
                change: changeTotal,
                icon: '👥',
                color: '#3498db'
            },
            participantesUnicos: {
                value: participantesUnicos,
                change: changeParticipantes,
                icon: '🎵',
                color: '#10b981'
            },
            cultosRealizados: {
                value: cultosRealizados,
                change: 0, // Não calcula mudança para cultos
                icon: '⛪',
                color: '#f59e0b'
            },
            mediaParticipacoes: {
                value: mediaParticipacoesPorCulto,
                change: 0,
                icon: '📊',
                color: '#8b5cf6'
            }
        };
    }
    
    calculateEvolution(escalas) {
        const months = this.getLastMonths(12);
        const evolutionData = months.map(month => {
            const monthStart = new Date(month.year, month.month - 1, 1);
            const monthEnd = new Date(month.year, month.month, 0);
            
            const monthEscalas = escalas.filter(e => {
                const data = new Date(e.Data);
                return data >= monthStart && data <= monthEnd;
            });
            
            return {
                month: `${month.month}/${month.year}`,
                participacoes: monthEscalas.length,
                participantes: new Set(monthEscalas.map(e => e.Nome)).size,
                cultos: new Set(monthEscalas.map(e => e.Cultos)).size
            };
        });
        
        return evolutionData;
    }
    
    calculateRolesDistribution(escalas) {
        const rolesCount = {};
        
        escalas.forEach(escala => {
            const funcao = escala.Função || 'Não definida';
            rolesCount[funcao] = (rolesCount[funcao] || 0) + 1;
        });
        
        return Object.entries(rolesCount)
            .map(([role, count]) => ({ role, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 funções
    }
    
    calculateFrequency(escalas) {
        const frequencyMap = new Map();
        
        escalas.forEach(escala => {
            const nome = escala.Nome;
            if (!frequencyMap.has(nome)) {
                frequencyMap.set(nome, {
                    total: 0,
                    months: new Set()
                });
            }
            
            const freq = frequencyMap.get(nome);
            freq.total++;
            
            const data = new Date(escala.Data);
            const monthKey = `${data.getFullYear()}-${data.getMonth()}`;
            freq.months.add(monthKey);
        });
        
        // Calcular frequência mensal média
        const frequencyData = Array.from(frequencyMap.entries())
            .map(([nome, freq]) => ({
                nome,
                total: freq.total,
                mesesUnicos: freq.months.size,
                mediaMensal: (freq.total / freq.months.size).toFixed(1)
            }))
            .sort((a, b) => b.mediaMensal - a.mediaMensal)
            .slice(0, 15); // Top 15
        
        return frequencyData;
    }
    
    calculateEngagement(escalas, componentes) {
        const totalComponentes = componentes.length;
        const activeComponentes = new Set(escalas.map(e => e.Nome)).size;
        const engagementRate = totalComponentes > 0 ? (activeComponentes / totalComponentes * 100).toFixed(1) : 0;
        
        // Calcular engajamento por mês
        const months = this.getLastMonths(6);
        const engagementByMonth = months.map(month => {
            const monthStart = new Date(month.year, month.month - 1, 1);
            const monthEnd = new Date(month.year, month.month, 0);
            
            const monthEscalas = escalas.filter(e => {
                const data = new Date(e.Data);
                return data >= monthStart && data <= monthEnd;
            });
            
            const monthActive = new Set(monthEscalas.map(e => e.Nome)).size;
            const monthRate = totalComponentes > 0 ? (monthActive / totalComponentes * 100).toFixed(1) : 0;
            
            return {
                month: `${month.month}/${month.year}`,
                rate: monthRate,
                active: monthActive,
                total: totalComponentes
            };
        });
        
        return {
            current: engagementRate,
            active: activeComponentes,
            total: totalComponentes,
            byMonth: engagementByMonth
        };
    }
    
    calculateLeaderboard(escalas) {
        const participacoesMap = new Map();
        
        escalas.forEach(escala => {
            const nome = escala.Nome;
            participacoesMap.set(nome, (participacoesMap.get(nome) || 0) + 1);
        });
        
        return Array.from(participacoesMap.entries())
            .map(([nome, participacoes]) => ({ nome, participacoes }))
            .sort((a, b) => b.participacoes - a.participacoes)
            .slice(0, 10); // Top 10
    }
    
    showMetricsLoading() {
        const metricsGrid = document.getElementById('metricsGrid');
        if (metricsGrid) {
            metricsGrid.innerHTML = Array(4).fill().map(() => `
                <div class="metric-card">
                    <div class="loading-overlay">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            `).join('');
        }
    }
    
    renderMetrics(metrics) {
        const metricsGrid = document.getElementById('metricsGrid');
        if (!metricsGrid) return;
        
        metricsGrid.innerHTML = Object.entries(metrics).map(([key, metric]) => `
            <div class="metric-card">
                <div class="metric-header">
                    <div class="metric-title">${this.getMetricTitle(key)}</div>
                    <div class="metric-icon" style="background: ${metric.color}">
                        ${metric.icon}
                    </div>
                </div>
                <div class="metric-value">${metric.value}</div>
                <div class="metric-change ${this.getChangeClass(metric.change)}">
                    ${this.getChangeIcon(metric.change)}
                    <span>${this.formatChange(metric.change)}</span>
                </div>
            </div>
        `).join('');
    }
    
    renderEvolutionChart(data) {
        const container = document.getElementById('evolutionChart');
        if (!container) return;
        
        container.innerHTML = '<canvas id="evolutionCanvas"></canvas>';
        
        const ctx = document.getElementById('evolutionCanvas').getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.month),
                datasets: [
                    {
                        label: 'Participações',
                        data: data.map(d => d.participacoes),
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Participantes Únicos',
                        data: data.map(d => d.participantes),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Cultos',
                        data: data.map(d => d.cultos),
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        this.charts.set('evolution', ctx.chart);
    }
    
    renderRolesChart(data) {
        const container = document.getElementById('rolesChart');
        if (!container) return;
        
        container.innerHTML = '<canvas id="rolesCanvas"></canvas>';
        
        const ctx = document.getElementById('rolesCanvas').getContext('2d');
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.role),
                datasets: [{
                    data: data.map(d => d.count),
                    backgroundColor: [
                        '#3498db', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    }
                }
            }
        });
        
        this.charts.set('roles', ctx.chart);
    }
    
    renderFrequencyChart(data) {
        const container = document.getElementById('frequencyChart');
        if (!container) return;
        
        container.innerHTML = '<canvas id="frequencyCanvas"></canvas>';
        
        const ctx = document.getElementById('frequencyCanvas').getContext('2d');
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.nome),
                datasets: [{
                    label: 'Média Mensal',
                    data: data.map(d => parseFloat(d.mediaMensal)),
                    backgroundColor: '#8b5cf6'
                }]
            },
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
                        beginAtZero: true
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
        
        this.charts.set('frequency', ctx.chart);
    }
    
    renderEngagementChart(data) {
        const container = document.getElementById('engagementChart');
        if (!container) return;
        
        container.innerHTML = '<canvas id="engagementCanvas"></canvas>';
        
        const ctx = document.getElementById('engagementCanvas').getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.byMonth.map(d => d.month),
                datasets: [{
                    label: 'Taxa de Engajamento (%)',
                    data: data.byMonth.map(d => parseFloat(d.rate)),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
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
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
        
        this.charts.set('engagement', ctx.chart);
    }
    
    renderLeaderboard(data) {
        const container = document.getElementById('leaderboardList');
        if (!container) return;
        
        container.innerHTML = data.map((item, index) => {
            const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'other';
            
            return `
                <li class="leaderboard-item">
                    <div class="leaderboard-rank ${rankClass}">${index + 1}</div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${item.nome}</div>
                        <div class="leaderboard-role">Participante</div>
                    </div>
                    <div class="leaderboard-value">${item.participacoes}</div>
                </li>
            `;
        }).join('');
    }
    
    // Utilitários
    getPeriodStart() {
        const now = new Date();
        switch (this.filters.period) {
            case 'week':
                return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            case 'month':
                return new Date(now.getFullYear(), now.getMonth(), 1);
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                return new Date(now.getFullYear(), quarter * 3, 1);
            case 'year':
                return new Date(now.getFullYear(), 0, 1);
            default:
                return new Date(now.getFullYear(), now.getMonth(), 1);
        }
    }
    
    getPreviousPeriodStart() {
        const currentStart = this.getPeriodStart();
        const periodLength = currentStart.getTime() - Date.now();
        return new Date(currentStart.getTime() + periodLength);
    }
    
    getLastMonths(count) {
        const months = [];
        const now = new Date();
        
        for (let i = count - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                month: date.getMonth() + 1,
                year: date.getFullYear()
            });
        }
        
        return months;
    }
    
    calculateChange(previous, current) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous * 100).toFixed(1);
    }
    
    getChangeClass(change) {
        if (change > 0) return 'positive';
        if (change < 0) return 'negative';
        return 'neutral';
    }
    
    getChangeIcon(change) {
        if (change > 0) return '↑';
        if (change < 0) return '↓';
        return '→';
    }
    
    formatChange(change) {
        if (change > 0) return `+${change}%`;
        if (change < 0) return `${change}%`;
        return '0%';
    }
    
    getMetricTitle(key) {
        const titles = {
            totalParticipacoes: 'Total de Participações',
            participantesUnicos: 'Participantes Únicos',
            cultosRealizados: 'Cultos Realizados',
            mediaParticipacoes: 'Média por Culto'
        };
        return titles[key] || key;
    }
    
    showError(message) {
        if (window.showToast) {
            window.showToast(message, 'error');
        } else {
            console.error(message);
        }
    }
    
    async refreshDashboard() {
        await this.loadDashboardData();
    }
    
    exportChart(chartId) {
        const chart = this.charts.get(chartId);
        if (chart) {
            const url = chart.toBase64Image();
            const link = document.createElement('a');
            link.download = `chart-${chartId}-${Date.now()}.png`;
            link.href = url;
            link.click();
        }
    }
    
    exportLeaderboard() {
        const data = Array.from(document.querySelectorAll('.leaderboard-item')).map((item, index) => {
            const name = item.querySelector('.leaderboard-name').textContent;
            const value = item.querySelector('.leaderboard-value').textContent;
            return { Posição: index + 1, Nome: name, Participações: value };
        });
        
        const csv = this.convertToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `leaderboard-${Date.now()}.csv`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }
    
    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        const csvRows = data.map(row => 
            headers.map(header => `"${row[header]}"`).join(',')
        );
        
        return [csvHeaders, ...csvRows].join('\n');
    }
    
    toggleChartType(chartId) {
        const chart = this.charts.get(chartId);
        if (chart) {
            chart.config.type = chart.config.type === 'line' ? 'bar' : 'line';
            chart.update();
        }
    }
}

// Instância global
window.AdvancedDashboard = new AdvancedDashboard();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedDashboard;
}
