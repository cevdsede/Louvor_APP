/**
 * Admin Metrics Panel
 * Painel de métricas e monitoramento para administradores
 */

class AdminMetrics {
    constructor() {
        this.metrics = new Map();
        this.charts = new Map();
        this.realTimeData = new Map();
        this.alerts = [];
        this.isMonitoring = false;
        
        this.config = {
            refreshInterval: 30000, // 30 segundos
            alertThresholds: {
                errorRate: 0.01, // 1%
                loadTime: 3000, // 3 segundos
                offlineRate: 0.2 // 20%
            },
            retentionDays: 30,
            ...this.getDefaultConfig()
        };
        
        this.init();
    }
    
    getDefaultConfig() {
        return {
            chartColors: {
                primary: '#3498db',
                success: '#27ae60',
                warning: '#f39c12',
                danger: '#e74c3c',
                info: '#9b59b6'
            },
            maxDataPoints: 100,
            exportFormats: ['csv', 'json', 'pdf']
        };
    }
    
    async init() {
        // Verificar se usuário é admin
        if (!await this.isAdmin()) {
            console.warn('Acesso negado: usuário não é administrador');
            return;
        }
        
        this.addGlobalStyles();
        // Aguardar DOM estar pronto antes de criar elementos
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
                this.startMonitoring();
                this.loadHistoricalData();
            });
        } else {
            this.setupEventListeners();
            this.startMonitoring();
            this.loadHistoricalData();
        }
    }
    
    async isAdmin() {
        try {
            const userToken = localStorage.getItem('user_token') || 
                             await window.IDBManager?.get('user_token');
            
            if (!userToken) return false;
            
            const user = JSON.parse(userToken);
            return ['Admin', 'SuperAdmin'].includes(user.Role);
        } catch (error) {
            console.error('Erro ao verificar permissões:', error);
            return false;
        }
    }
    
    addGlobalStyles() {
        const styleId = 'admin-metrics-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .admin-metrics-panel {
                position: fixed;
                top: 0;
                right: -100%;
                width: 400px;
                height: 100vh;
                background: var(--background);
                border-left: 1px solid var(--border);
                box-shadow: -2px 0 10px rgba(0,0,0,0.1);
                transition: right 0.3s ease;
                z-index: 10000;
                overflow-y: auto;
            }
            
            .admin-metrics-header {
                padding: 20px;
                background: var(--primary, #1e293b);
                color: white;
                position: sticky;
                top: 0;
                z-index: 1;
            }
            
            .admin-metrics-title {
                font-size: 18px;
                font-weight: 700;
                margin: 0 0 10px 0;
            }
            
            .admin-metrics-status {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
            }
            
            .status-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                animation: pulse 2s infinite;
            }
            
            .status-indicator.online {
                background: #27ae60;
            }
            
            .status-indicator.warning {
                background: #f39c12;
            }
            
            .status-indicator.error {
                background: #e74c3c;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .admin-metrics-content {
                padding: 20px;
            }
            
            .metrics-section {
                margin-bottom: 30px;
            }
            
            .metrics-section-title {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 15px;
                color: var(--text-primary, #1e293b);
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .metric-card {
                background: #f8fafc;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 12px;
                border-left: 4px solid var(--primary, #3498db);
            }
            
            .metric-card.warning {
                border-left-color: #f39c12;
            }
            
            .metric-card.error {
                border-left-color: #e74c3c;
            }
            
            .metric-card.success {
                border-left-color: #27ae60;
            }
            
            .metric-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .metric-name {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-primary, #1e293b);
            }
            
            .metric-value {
                font-size: 20px;
                font-weight: 700;
                color: var(--text-primary, #1e293b);
            }
            
            .metric-change {
                font-size: 12px;
                color: var(--text-muted, #64748b);
            }
            
            .metric-change.positive {
                color: #27ae60;
            }
            
            .metric-change.negative {
                color: #e74c3c;
            }
            
            .chart-container {
                height: 200px;
                margin-bottom: 15px;
                position: relative;
            }
            
            .alerts-section {
                background: #fff5f5;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
            }
            
            .alert-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                background: white;
                border-radius: 6px;
                margin-bottom: 8px;
                border-left: 4px solid #e74c3c;
            }
            
            .alert-item.warning {
                border-left-color: #f39c12;
            }
            
            .alert-item.info {
                border-left-color: #3498db;
            }
            
            .alert-icon {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                color: white;
            }
            
            .alert-icon.error {
                background: #e74c3c;
            }
            
            .alert-icon.warning {
                background: #f39c12;
            }
            
            .alert-icon.info {
                background: #3498db;
            }
            
            .alert-content {
                flex: 1;
            }
            
            .alert-title {
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 2px;
            }
            
            .alert-message {
                font-size: 11px;
                color: var(--text-muted, #64748b);
            }
            
            .alert-time {
                font-size: 10px;
                color: var(--text-muted, #64748b);
            }
            
            .actions-section {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .action-btn {
                flex: 1;
                padding: 10px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                background: white;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .action-btn:hover {
                background: #f8fafc;
                border-color: var(--secondary, #3498db);
            }
            
            .action-btn.primary {
                background: var(--primary, #3498db);
                color: white;
                border-color: var(--primary, #3498db);
            }
            
            .action-btn.primary:hover {
                background: var(--secondary, #3498db);
            }
            
            .loading-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid #f3f4f6;
                border-top: 2px solid var(--primary, #3498db);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .admin-metrics-panel {
                    width: 100%;
                    right: -100%;
                }
            }
            
            /* Theme-aware styles */
            [data-theme="dark"] .admin-metrics-panel {
                background: #1f2937;
                color: #f3f4f6;
            }
            
            [data-theme="dark"] .metric-card {
                background: #374151;
            }
            
            [data-theme="dark"] .alerts-section {
                background: #450a0a;
            }
            
            [data-theme="dark"] .alert-item {
                background: #374151;
            }
            
            [data-theme="dark"] .action-btn {
                background: #374151;
                color: #f3f4f6;
                border-color: #4b5563;
            }
            
            [data-theme="dark"] .action-btn:hover {
                background: #4b5563;
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Aguardar DOM estar pronto para criar botão
        const createToggleButton = () => {
            // Botão flutuante removido - usar apenas menu Utilitários
            console.log('Botão flutuante de métricas desabilitado');
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createToggleButton);
        } else {
            createToggleButton();
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'M') {
                this.toggle();
            }
        });
    }
    
    createToggleButton() {
        // Botão flutuante removido - usar apenas menu Utilitários
        console.log('Botão flutuante de métricas desabilitado');
    }
    
    createPanel() {
        if (document.getElementById('admin-metrics-panel')) return;
        
        const panel = document.createElement('div');
        panel.id = 'admin-metrics-panel';
        panel.className = 'admin-metrics-panel';
        
        panel.innerHTML = `
            <div class="admin-metrics-header">
                <h2 class="admin-metrics-title">📊 Painel de Métricas</h2>
                <div class="admin-metrics-status">
                    <div class="status-indicator online"></div>
                    <span>Monitorando em tempo real</span>
                </div>
            </div>
            
            <div class="admin-metrics-content">
                <div class="actions-section">
                    <button class="action-btn" onclick="window.AdminMetrics.exportData('csv')">📥 CSV</button>
                    <button class="action-btn" onclick="window.AdminMetrics.exportData('json')">📄 JSON</button>
                    <button class="action-btn primary" onclick="window.AdminMetrics.refreshAll()">🔄 Atualizar</button>
                </div>
                
                <div class="alerts-section" id="alerts-section">
                    <div class="metrics-section-title">⚠️ Alertas</div>
                    <div id="alerts-list">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
                
                <div class="metrics-section">
                    <div class="metrics-section-title">🚀 Performance</div>
                    
                    <div class="metric-card">
                        <div class="metric-header">
                            <span class="metric-name">Tempo de Carregamento</span>
                            <span class="metric-value" id="load-time-metric">--</span>
                        </div>
                        <div class="metric-change" id="load-time-change">--</div>
                    </div>
                    
                    <div class="metric-card">
                        <div class="metric-header">
                            <span class="metric-name">Taxa de Erro</span>
                            <span class="metric-value" id="error-rate-metric">--</span>
                        </div>
                        <div class="metric-change" id="error-rate-change">--</div>
                    </div>
                    
                    <div class="chart-container">
                        <canvas id="performance-chart"></canvas>
                    </div>
                </div>
                
                <div class="metrics-section">
                    <div class="metrics-section-title">👥 Engajamento</div>
                    
                    <div class="metric-card">
                        <div class="metric-header">
                            <span class="metric-name">Usuários Ativos</span>
                            <span class="metric-value" id="active-users-metric">--</span>
                        </div>
                        <div class="metric-change" id="active-users-change">--</div>
                    </div>
                    
                    <div class="metric-card">
                        <div class="metric-header">
                            <span class="metric-name">Taxa de Uso Offline</span>
                            <span class="metric-value" id="offline-rate-metric">--</span>
                        </div>
                        <div class="metric-change" id="offline-rate-change">--</div>
                    </div>
                    
                    <div class="chart-container">
                        <canvas id="engagement-chart"></canvas>
                    </div>
                </div>
                
                <div class="metrics-section">
                    <div class="metrics-section-title">💾 Armazenamento</div>
                    
                    <div class="metric-card">
                        <div class="metric-header">
                            <span class="metric-name">Cache Usage</span>
                            <span class="metric-value" id="cache-usage-metric">--</span>
                        </div>
                        <div class="metric-change" id="cache-usage-change">--</div>
                    </div>
                    
                    <div class="metric-card">
                        <div class="metric-header">
                            <span class="metric-name">IndexedDB Size</span>
                            <span class="metric-value" id="idb-size-metric">--</span>
                        </div>
                        <div class="metric-change" id="idb-size-change">--</div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
    }
    
    toggle() {
        const panel = document.getElementById('admin-metrics-panel');
        if (!panel) {
            this.createPanel();
            setTimeout(() => this.open(), 100);
        } else {
            if (panel.classList.contains('open')) {
                this.close();
            } else {
                this.open();
            }
        }
    }
    
    open() {
        const panel = document.getElementById('admin-metrics-panel');
        if (panel) {
            panel.classList.add('open');
            this.refreshAll();
        }
    }
    
    close() {
        const panel = document.getElementById('admin-metrics-panel');
        if (panel) {
            panel.classList.remove('open');
        }
    }
    
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        
        // Coletar métricas iniciais
        this.collectMetrics();
        
        // Configurar coleta periódica
        setInterval(() => {
            this.collectMetrics();
        }, this.config.refreshInterval);
        
        // Configurar listeners para métricas em tempo real
        this.setupRealTimeListeners();
    }
    
    setupRealTimeListeners() {
        // Performance metrics
        window.addEventListener('load', () => {
            this.recordLoadTime();
        });
        
        // Error tracking
        window.addEventListener('error', (e) => {
            this.recordError(e);
        });
        
        // User interactions
        document.addEventListener('click', () => {
            this.recordInteraction();
        });
        
        // Sync events
        window.addEventListener('syncCompleted', () => {
            this.recordSyncSuccess();
        });
        
        window.addEventListener('syncError', () => {
            this.recordSyncError();
        });
    }
    
    async collectMetrics() {
        try {
            // Verificar se Chart.js está disponível
            if (typeof Chart === 'undefined') {
                console.warn('Chart.js não está disponível, pulando atualização de gráficos');
                return;
            }
            
            // Performance metrics
            const loadTime = await this.getLoadTime();
            const errorRate = await this.getErrorRate();
            
            // Engagement metrics
            const activeUsers = await this.getActiveUsers();
            const offlineRate = await this.getOfflineRate();
            
            // Storage metrics
            const cacheUsage = await this.getCacheUsage();
            const idbSize = await this.getIDBSize();
            
            // Atualizar UI
            this.updateMetrics({
                loadTime,
                errorRate,
                activeUsers,
                offlineRate,
                cacheUsage,
                idbSize
            });
            
            // Verificar alertas
            this.checkAlerts({
                loadTime,
                errorRate,
                offlineRate
            });
            
            // Salvar métricas
            await this.saveMetrics({
                timestamp: Date.now(),
                loadTime,
                errorRate,
                activeUsers,
                offlineRate,
                cacheUsage,
                idbSize
            });
            
        } catch (error) {
            console.error('Erro ao coletar métricas:', error);
            this.recordError(error);
        }
    }
    
    async getLoadTime() {
        if ('performance' in window && 'timing' in performance) {
            const timing = performance.timing;
            return timing.loadEventEnd - timing.navigationStart;
        }
        return null;
    }
    
    async getErrorRate() {
        const errors = await window.IDBManager?.getMetrics('error', 100) || [];
        const totalRequests = await window.IDBManager?.getMetrics('request', 100) || [];
        
        if (totalRequests.length === 0) return 0;
        return errors.length / totalRequests.length;
    }
    
    async getActiveUsers() {
        // Simulação - em produção, isso viria do backend
        const lastActivity = await window.IDBManager?.get('last_activity');
        if (!lastActivity) return 0;
        
        const hoursSinceActivity = (Date.now() - parseInt(lastActivity)) / (1000 * 60 * 60);
        return hoursSinceActivity < 24 ? 1 : 0;
    }
    
    async getOfflineRate() {
        try {
            const storageInfo = await window.IDBManager?.getStorageInfo();
            if (!storageInfo) return 0;
            
            // Simulação baseada no uso offline
            return Math.random() * 0.3; // 0-30%
        } catch (error) {
            return 0;
        }
    }
    
    async getCacheUsage() {
        try {
            if (window.AdvancedServiceWorker) {
                const cacheInfo = await window.AdvancedServiceWorker.getCacheInfo();
                const totalSize = cacheInfo.reduce((sum, cache) => sum + cache.size, 0);
                return this.formatBytes(totalSize);
            }
            return '--';
        } catch (error) {
            return '--';
        }
    }
    
    async getIDBSize() {
        try {
            if (window.IDBManager) {
                const dbSize = await window.IDBManager.getDatabaseSize();
                return this.formatBytes(dbSize.totalSize);
            }
            return '--';
        } catch (error) {
            return '--';
        }
    }
    
    formatBytes(bytes) {
        if (bytes === 0 || bytes === '--') return '--';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    updateMetrics(metrics) {
        // Update load time
        const loadTimeEl = document.getElementById('load-time-metric');
        if (loadTimeEl && metrics.loadTime) {
            loadTimeEl.textContent = `${metrics.loadTime}ms`;
            this.updateMetricCard(loadTimeEl.closest('.metric-card'), metrics.loadTime, 3000);
        }
        
        // Update error rate
        const errorRateEl = document.getElementById('error-rate-metric');
        if (errorRateEl) {
            errorRateEl.textContent = `${(metrics.errorRate * 100).toFixed(2)}%`;
            this.updateMetricCard(errorRateEl.closest('.metric-card'), metrics.errorRate, this.config.alertThresholds.errorRate);
        }
        
        // Update active users
        const activeUsersEl = document.getElementById('active-users-metric');
        if (activeUsersEl) {
            activeUsersEl.textContent = metrics.activeUsers;
        }
        
        // Update offline rate
        const offlineRateEl = document.getElementById('offline-rate-metric');
        if (offlineRateEl) {
            offlineRateEl.textContent = `${(metrics.offlineRate * 100).toFixed(1)}%`;
            this.updateMetricCard(offlineRateEl.closest('.metric-card'), metrics.offlineRate, this.config.alertThresholds.offlineRate);
        }
        
        // Update storage metrics
        const cacheUsageEl = document.getElementById('cache-usage-metric');
        if (cacheUsageEl) {
            cacheUsageEl.textContent = metrics.cacheUsage;
        }
        
        const idbSizeEl = document.getElementById('idb-size-metric');
        if (idbSizeEl) {
            idbSizeEl.textContent = metrics.idbSize;
        }
        
        // Update charts
        this.updateCharts(metrics);
    }
    
    updateMetricCard(card, value, threshold) {
        if (!card) return;
        
        card.classList.remove('warning', 'error', 'success');
        
        if (value > threshold) {
            card.classList.add('error');
        } else if (value > threshold * 0.8) {
            card.classList.add('warning');
        } else {
            card.classList.add('success');
        }
    }
    
    updateCharts(metrics) {
        // Update performance chart
        this.updatePerformanceChart(metrics);
        
        // Update engagement chart
        this.updateEngagementChart(metrics);
    }
    
    updatePerformanceChart(metrics) {
        const canvas = document.getElementById('performance-chart');
        if (!canvas) return;
        
        // Verificar se Chart.js está disponível
        if (typeof Chart === 'undefined') {
            console.error('Chart.js não está disponível');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Simular dados históricos
        const labels = this.generateTimeLabels(10);
        const loadData = this.generateHistoricalData(10, metrics.loadTime || 2000, 500);
        const errorData = this.generateHistoricalData(10, (metrics.errorRate || 0.01) * 100, 0.5);
        
        if (this.charts.has('performance')) {
            const chart = this.charts.get('performance');
            chart.data.labels = labels;
            chart.data.datasets[0].data = loadData;
            chart.data.datasets[1].data = errorData;
            chart.update('none');
        } else {
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Load Time (ms)',
                            data: loadData,
                            borderColor: this.config.chartColors.primary,
                            backgroundColor: 'rgba(52, 152, 219, 0.1)',
                            tension: 0.4,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Error Rate (%)',
                            data: errorData,
                            borderColor: this.config.chartColors.danger,
                            backgroundColor: 'rgba(231, 76, 60, 0.1)',
                            tension: 0.4,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left'
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: {
                                drawOnChartArea: false
                            }
                        }
                    }
                }
            });
            
            this.charts.set('performance', chart);
        }
    }
    
    updateEngagementChart(metrics) {
        const canvas = document.getElementById('engagement-chart');
        if (!canvas) return;
        
        // Verificar se Chart.js está disponível
        if (typeof Chart === 'undefined') {
            console.error('Chart.js não está disponível');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        const labels = this.generateTimeLabels(7);
        const activeData = this.generateHistoricalData(7, metrics.activeUsers || 1, 0.5);
        const offlineData = this.generateHistoricalData(7, (metrics.offlineRate || 0.2) * 100, 10);
        
        if (this.charts.has('engagement')) {
            const chart = this.charts.get('engagement');
            chart.data.labels = labels;
            chart.data.datasets[0].data = activeData;
            chart.data.datasets[1].data = offlineData;
            chart.update('none');
        } else {
            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Usuários Ativos',
                            data: activeData,
                            backgroundColor: this.config.chartColors.success
                        },
                        {
                            label: 'Uso Offline (%)',
                            data: offlineData,
                            backgroundColor: this.config.chartColors.info
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            
            this.charts.set('engagement', chart);
        }
    }
    
    generateTimeLabels(count) {
        const labels = [];
        const now = new Date();
        
        for (let i = count - 1; i >= 0; i--) {
            const time = new Date(now - i * 60 * 60 * 1000);
            labels.push(time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        }
        
        return labels;
    }
    
    generateHistoricalData(count, current, variance) {
        const data = [];
        
        for (let i = 0; i < count; i++) {
            const value = current + (Math.random() - 0.5) * variance * 2;
            data.push(Math.max(0, value));
        }
        
        return data;
    }
    
    checkAlerts(metrics) {
        const newAlerts = [];
        
        // Check load time
        if (metrics.loadTime > this.config.alertThresholds.loadTime) {
            newAlerts.push({
                type: 'error',
                title: 'Tempo de Carregamento Alto',
                message: `Tempo de carregamento: ${metrics.loadTime}ms`,
                timestamp: Date.now()
            });
        }
        
        // Check error rate
        if (metrics.errorRate > this.config.alertThresholds.errorRate) {
            newAlerts.push({
                type: 'error',
                title: 'Taxa de Erro Elevada',
                message: `Taxa de erro: ${(metrics.errorRate * 100).toFixed(2)}%`,
                timestamp: Date.now()
            });
        }
        
        // Check offline rate
        if (metrics.offlineRate > this.config.alertThresholds.offlineRate) {
            newAlerts.push({
                type: 'warning',
                title: 'Alto Uso Offline',
                message: `Taxa offline: ${(metrics.offlineRate * 100).toFixed(1)}%`,
                timestamp: Date.now()
            });
        }
        
        // Update alerts
        this.alerts = [...newAlerts, ...this.alerts].slice(0, 10); // Keep last 10
        this.renderAlerts();
    }
    
    renderAlerts() {
        const alertsList = document.getElementById('alerts-list');
        if (!alertsList) return;
        
        if (this.alerts.length === 0) {
            alertsList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">Nenhum alerta</div>';
            return;
        }
        
        alertsList.innerHTML = this.alerts.map(alert => `
            <div class="alert-item ${alert.type}">
                <div class="alert-icon ${alert.type}">
                    ${alert.type === 'error' ? '!' : alert.type === 'warning' ? '⚠' : 'i'}
                </div>
                <div class="alert-content">
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-message">${alert.message}</div>
                </div>
                <div class="alert-time">${this.formatTime(alert.timestamp)}</div>
            </div>
        `).join('');
    }
    
    formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Agora';
        if (minutes < 60) return `${minutes}min`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        
        const days = Math.floor(hours / 24);
        return `${days}d`;
    }
    
    async saveMetrics(metrics) {
        try {
            await window.IDBManager?.recordMetric('performance', metrics);
        } catch (error) {
            console.error('Erro ao salvar métricas:', error);
        }
    }
    
    recordLoadTime() {
        if ('performance' in window && 'timing' in performance) {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            this.realTimeData.set('loadTime', loadTime);
        }
    }
    
    recordError(error) {
        this.realTimeData.set('lastError', {
            message: error.message || error,
            timestamp: Date.now(),
            url: window.location.href
        });
    }
    
    recordInteraction() {
        const count = this.realTimeData.get('interactions') || 0;
        this.realTimeData.set('interactions', count + 1);
    }
    
    recordSyncSuccess() {
        const count = this.realTimeData.get('syncSuccess') || 0;
        this.realTimeData.set('syncSuccess', count + 1);
    }
    
    recordSyncError() {
        const count = this.realTimeData.get('syncErrors') || 0;
        this.realTimeData.set('syncErrors', count + 1);
    }
    
    async loadHistoricalData() {
        try {
            const metrics = await window.IDBManager?.getMetrics('performance', 100);
            if (metrics && metrics.length > 0) {
                console.log(`Carregados ${metrics.length} registros históricos`);
            }
        } catch (error) {
            console.error('Erro ao carregar dados históricos:', error);
        }
    }
    
    async refreshAll() {
        const refreshBtn = document.querySelector('.action-btn.primary');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<div class="loading-spinner"></div>';
            refreshBtn.disabled = true;
        }
        
        await this.collectMetrics();
        
        if (refreshBtn) {
            refreshBtn.innerHTML = '🔄 Atualizar';
            refreshBtn.disabled = false;
        }
    }
    
    async exportData(format) {
        try {
            const metrics = await window.IDBManager?.getMetrics('performance', 1000) || [];
            
            let content, filename, mimeType;
            
            switch (format) {
                case 'csv':
                    content = this.convertToCSV(metrics);
                    filename = `metrics-${Date.now()}.csv`;
                    mimeType = 'text/csv';
                    break;
                    
                case 'json':
                    content = JSON.stringify(metrics, null, 2);
                    filename = `metrics-${Date.now()}.json`;
                    mimeType = 'application/json';
                    break;
                    
                default:
                    throw new Error('Formato não suportado');
            }
            
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            
            URL.revokeObjectURL(url);
            
            if (window.showToast) {
                window.showToast(`Dados exportados como ${format.toUpperCase()}`, 'success');
            }
            
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            if (window.showToast) {
                window.showToast('Erro ao exportar dados', 'error');
            }
        }
    }
    
    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        const csvRows = data.map(row => 
            headers.map(header => `"${row[header] || ''}"`).join(',')
        );
        
        return [csvHeaders, ...csvRows].join('\n');
    }
}

// Instância global
window.AdminMetrics = new AdminMetrics();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminMetrics;
}
