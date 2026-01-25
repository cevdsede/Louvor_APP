/**
 * Offline Indicator System
 * Indicadores visuais avançados para status offline/online e disponibilidade de dados
 */

class OfflineIndicator {
    constructor(options = {}) {
        this.options = {
            position: 'top-right', // top-right, top-left, bottom-right, bottom-left, top-center, inline
            showConnectionStatus: true,
            showDataAvailability: true,
            autoHideDelay: 5000, // ms para esconder mensagens
            checkInterval: 30000, // ms para verificar conexão
            ...options
        };
        
        this.isOnline = navigator.onLine;
        this.lastSyncTime = null;
        this.dataStatus = new Map(); // cache do status dos dados
        this.indicator = null;
        this.messages = [];
        
        this.init();
    }
    
    init() {
        this.addGlobalStyles();
        // Aguardar DOM estar pronto antes de criar elementos
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createIndicator();
                this.setupEventListeners();
                this.startConnectionCheck();
                this.updateStatus();
                // Forçar exibição inicial (sem loop infinito)
                setTimeout(() => {
                    this.updateDataStatus();
                }, 1000);
            });
        } else {
            this.createIndicator();
            this.setupEventListeners();
            this.startConnectionCheck();
            this.updateStatus();
            // Forçar exibição inicial (sem loop infinito)
            setTimeout(() => {
                this.updateDataStatus();
            }, 1000);
        }
    }
    
    addGlobalStyles() {
        const styleId = 'offline-indicator-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .offline-indicator {
                position: fixed;
                z-index: 1001; /* Abaixo do header (1000) mas acima do conteúdo */
                display: flex;
                flex-direction: column;
                gap: 8px;
                pointer-events: none;
                transition: all 0.3s ease;
            }

            .offline-indicator.inline {
                position: static;
                left: auto;
                right: auto;
                top: auto;
                bottom: auto;
                transform: none;
                z-index: auto;
                width: 100%;
                align-items: center;
                pointer-events: none;
            }
            
            .offline-indicator.top-right {
                top: 80px;
                right: 20px;
            }
            .offline-indicator.top-left {
                top: 80px;
                left: 20px;
            }
            
            .offline-indicator.top-center {
                top: 120px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1001;
            }
            
            .offline-indicator.bottom-right {
                bottom: 80px;
                right: 20px;
            }
            
            .offline-indicator.bottom-center {
                bottom: 10px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1001;
            }
            
            .offline-indicator.bottom-left {
                bottom: 80px;
                left: 20px;
            }
            
            .offline-status {
                background: var(--surface, var(--card-bg, #ffffff));
                border-radius: 12px;
                padding: 12px 16px;
                box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.15));
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                font-weight: 600;
                pointer-events: all;
                cursor: pointer;
                transition: all 0.3s ease;
                border: 2px solid transparent;
                color: var(--text-main, var(--text-primary, #0f172a));
            }
            
            .offline-status.online {
                border-color: var(--accent-green, #10b981);
                color: var(--accent-green, #10b981);
            }
            
            .offline-status.offline {
                border-color: var(--accent-red, #ef4444);
                color: var(--accent-red, #ef4444);
            }
            
            .offline-status.syncing {
                border-color: var(--accent-gold, #f59e0b);
                color: var(--accent-gold, #f59e0b);
            }
            
            .offline-status:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-lg, 0 6px 16px rgba(0,0,0,0.2));
            }
            
            .offline-status-icon {
                width: 16px;
                height: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .offline-status-icon.online {
                color: var(--accent-green, #10b981);
            }
            
            .offline-status-icon.offline {
                color: var(--accent-red, #ef4444);
            }
            
            .offline-status-icon.syncing {
                color: var(--accent-gold, #f59e0b);
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            .offline-status-text {
                flex: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 200px;
            }
            
            .offline-status-details {
                font-size: 10px;
                opacity: 0.8;
                margin-top: 2px;
            }
            
            .data-availability {
                background: var(--surface, var(--card-bg, #ffffff));
                border-radius: 20px;
                padding: 8px 16px;
                box-shadow: var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.1));
                font-size: 11px;
                pointer-events: all;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                gap: 12px;
                align-items: center;
                flex-wrap: nowrap;
                overflow: hidden;
                max-width: 100%;
                color: var(--text-main, var(--text-primary, #0f172a));
            }

            .offline-indicator.inline .data-availability {
                justify-content: center;
                flex-wrap: wrap;
                row-gap: 6px;
            }
            
            .data-availability:hover {
                transform: translateY(-1px);
                box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.15));
            }
            
            .data-item {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                margin-right: 12px;
                white-space: nowrap;
            }
            
            .data-item:last-child {
                margin-right: 0;
            }
            
            .data-item-icon {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                flex-shrink: 0;
            }
            
            .data-item-icon.fresh {
                background: var(--accent-green, #10b981);
            }
            
            .data-item-icon.stale {
                background: var(--accent-gold, #f59e0b);
            }
            
            .data-item-icon.missing {
                background: var(--accent-red, #ef4444);
            }
            
            .data-item-icon.syncing {
                background: var(--secondary, #6366f1);
                animation: pulse 1.5s ease-in-out infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .data-item-text {
                font-size: 10px;
                white-space: nowrap;
                overflow: visible;
                text-overflow: clip;
                max-width: none;
                font-weight: 600;
            }
            
            .data-item-age {
                font-size: 8px;
                opacity: 0.6;
                white-space: nowrap;
                font-weight: 500;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .offline-indicator {
                    gap: 6px;
                }
                
                .offline-status {
                    padding: 10px 12px;
                    font-size: 11px;
                }
                
                .offline-status-text {
                    max-width: 150px;
                }
                
                .data-availability {
                    padding: 6px 10px;
                    font-size: 10px;
                }
                
                .data-item-text {
                    max-width: none;
                }
            }
            
            @media (orientation: landscape) {
                .offline-indicator.inline .data-availability {
                    justify-content: center;
                }
            }
            
            /* Animation for new messages */
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            .offline-status.new {
                animation: slideIn 0.3s ease-out;
            }
        `;
        document.head.appendChild(style);
    }
    
    createIndicator() {
        this.indicator = document.createElement('div');

        const inlineHost = document.getElementById('offlineDataBar');
        if (inlineHost) {
            this.indicator.className = 'offline-indicator inline';
            inlineHost.appendChild(this.indicator);
            return;
        }

        this.indicator.className = `offline-indicator ${this.options.position}`;
        
        // Ajustar posição para não interferir com o conteúdo principal
        if (this.options.position === 'floating') {
            // Posição flutuante no lado direito
            this.indicator.style.cssText = `
                position: fixed;
                top: 50%;
                right: 20px;
                transform: translateY(-50%);
                max-height: 70vh;
                overflow-y: auto;
                z-index: 1001;
            `;
        }
        
        document.body.appendChild(this.indicator);
    }
    
    setupEventListeners() {
        // Connection events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateStatus();
            this.showMessage('Conexão restaurada', 'online');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateStatus();
            this.showMessage('Sem conexão com a internet', 'offline');
        });
        
        // Sync events (custom events from other parts of the app)
        window.addEventListener('syncStarted', () => {
            this.showMessage('Sincronizando dados...', 'syncing');
        });
        
        window.addEventListener('syncCompleted', () => {
            this.lastSyncTime = new Date();
            this.updateDataStatus();
            this.showMessage('Dados sincronizados', 'online');
        });
        
        window.addEventListener('syncError', () => {
            this.showMessage('Erro na sincronização', 'offline');
        });
    }
    
    async startConnectionCheck() {
        // Verificar conexão periodicamente
        setInterval(async () => {
            try {
                const isOnline = await this.checkConnectionReliably();
                const wasOffline = !this.isOnline;
                
                if (wasOffline && isOnline) {
                    this.showMessage('Conexão restaurada', 'online');
                    this.updateStatus();
                } else if (!wasOffline && !isOnline) {
                    this.showMessage('Sem conexão com a internet', 'offline');
                    this.updateStatus();
                }
                
                this.isOnline = isOnline;
                
            } catch (error) {
                // Silenciar erros de verificação para não poluir console
                console.debug('Erro na verificação de conexão:', error.message);
            }
        }, this.options.checkInterval);
    }
    
    async checkConnectionReliably() {
        try {
            // 1. Verificar API do navegador
            if (!navigator.onLine) {
                return false;
            }
            
            // 2. Tentar fazer uma requisição simples para um serviço confiável
            // Usar um endpoint que não cause CORS issues
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            try {
                // Tentar múltiplas abordagens
                const methods = [
                    () => fetch('https://httpbin.org/status/200', {
                        method: 'HEAD',
                        mode: 'no-cors',
                        signal: controller.signal
                    }),
                    () => fetch('https://www.google.com', {
                        method: 'HEAD',
                        mode: 'no-cors',
                        signal: controller.signal
                    }),
                    () => fetch('https://jsonplaceholder.typicode.com/posts/1', {
                        method: 'HEAD',
                        mode: 'no-cors',
                        signal: controller.signal
                    })
                ];
                
                for (const method of methods) {
                    try {
                        const response = await method();
                        clearTimeout(timeoutId);
                        return true;
                    } catch (e) {
                        continue; // Tentar próxima abordagem
                    }
                }
                
                clearTimeout(timeoutId);
                return false;
                
            } catch (error) {
                clearTimeout(timeoutId);
                return false;
            }
            
        } catch (error) {
            return false;
        }
    }
    
    updateStatus() {
        if (!this.indicator) return;
        
        // Limpar mensagens antigas
        this.clearMessages();
        
        // Status da conexão
        if (this.options.showConnectionStatus) {
            this.addConnectionStatus();
        }
        
        // Disponibilidade dos dados
        if (this.options.showDataAvailability) {
            this.updateDataStatus();
            this.addDataAvailability();
        }
    }
    
    addConnectionStatus() {
        const status = document.createElement('div');
        status.className = `offline-status ${this.isOnline ? 'online' : 'offline'} new`;
        
        const icon = this.isOnline ? 
            '<i class="fas fa-wifi"></i>' : 
            '<i class="fas fa-wifi-slash"></i>';
        
        const text = this.isOnline ? 'Online' : 'Offline';
        const details = this.isOnline ? 
            'Conectado à internet' : 
            'Trabalhando offline';
        
        status.innerHTML = `
            <div class="offline-status-icon ${this.isOnline ? 'online' : 'offline'}">
                ${icon}
            </div>
            <div class="offline-status-text">
                <div>${text}</div>
                <div class="offline-status-details">${details}</div>
            </div>
        `;
        
        status.addEventListener('click', () => {
            this.showConnectionDetails();
        });
        
        this.indicator.appendChild(status);
        this.messages.push(status);
        
        // Auto-hide para mensagens de sucesso
        if (this.isOnline) {
            setTimeout(() => {
                if (status.parentNode) {
                    status.style.opacity = '0';
                    setTimeout(() => status.remove(), 300);
                }
            }, this.options.autoHideDelay);
        }
    }
    
    updateDataStatus() {
        // Verificar status dos dados principais
        const dataSources = [
            { key: 'offline_escala', name: 'Escalas' },
            { key: 'offline_musicas', name: 'Músicas' },
            { key: 'offline_repertorio', name: 'Repertório' },
            { key: 'offline_componentes', name: 'Componentes' }
        ];
        
        dataSources.forEach(source => {
            const data = localStorage.getItem(source.key);
            const status = this.getDataStatus(data);
            
            this.dataStatus.set(source.key, {
                name: source.name,
                status: status,
                timestamp: data ? this.getDataTimestamp(data) : null
            });
        });
        
        // Removido: this.updateStatus() para evitar loop infinito
    }
    
    getDataStatus(data) {
        if (!data) return 'missing';
        
        try {
            const parsed = JSON.parse(data);
            // O app salva offline_* como Array direto. Alguns módulos podem salvar como { data: [...] }.
            const arr = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.data) ? parsed.data : null);
            if (!arr) return 'missing';
            
            const lastSync = localStorage.getItem('last_full_sync');
            if (!lastSync) return 'stale';
            
            const syncAge = Date.now() - new Date(lastSync).getTime();
            const maxAge = 24 * 60 * 60 * 1000; // 24 horas
            
            if (syncAge > maxAge) return 'stale';
            return 'fresh';
        } catch (error) {
            return 'missing';
        }
    }
    
    getDataTimestamp(data) {
        try {
            const parsed = JSON.parse(data);
            return parsed.timestamp || null;
        } catch (error) {
            return null;
        }
    }
    
    addDataAvailability() {
        if (this.dataStatus.size === 0) return;
        
        const container = document.createElement('div');
        container.className = 'data-availability';
        
        const items = Array.from(this.dataStatus.entries())
            .map(([key, status]) => this.createDataItem(key, status))
            .join('');
        
        container.innerHTML = items;
        
        container.addEventListener('click', () => {
            this.showDataDetails();
        });
        
        this.indicator.appendChild(container);
        this.messages.push(container);
    }
    
    createDataItem(key, status) {
        return `
            <div class="data-item">
                <div class="data-item-icon ${status.status}"></div>
                <div class="data-item-text">${status.name}</div>
            </div>
        `;
    }
    
    formatAge(ms) {
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d`;
        if (hours > 0) return `${hours}h`;
        if (minutes > 0) return `${minutes}m`;
        return 'Agora';
    }
    
    showMessage(text, type = 'info') {
        const message = document.createElement('div');
        message.className = `offline-status ${type} new`;
        
        const icons = {
            online: '<i class="fas fa-check-circle"></i>',
            offline: '<i class="fas fa-exclamation-triangle"></i>',
            syncing: '<i class="fas fa-sync fa-spin"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        
        message.innerHTML = `
            <div class="offline-status-icon ${type}">
                ${icons[type] || icons.info}
            </div>
            <div class="offline-status-text">${text}</div>
        `;
        
        this.indicator.appendChild(message);
        this.messages.push(message);
        
        // Auto-hide para mensagens não-críticas
        if (type !== 'offline') {
            setTimeout(() => {
                if (message.parentNode) {
                    message.style.opacity = '0';
                    setTimeout(() => message.remove(), 300);
                }
            }, this.options.autoHideDelay);
        }
    }
    
    clearMessages() {
        this.messages.forEach(message => {
            if (message.parentNode) {
                message.remove();
            }
        });
        this.messages = [];
    }
    
    showConnectionDetails() {
        const details = {
            online: this.isOnline,
            connectionType: this.getConnectionType(),
            lastCheck: new Date().toLocaleString('pt-BR'),
            lastSync: this.lastSyncTime ? this.lastSyncTime.toLocaleString('pt-BR') : 'Nunca'
        };
        
        console.log('Connection Details:', details);
        
        // Mostrar toast com informações
        if (window.showToast) {
            window.showToast(
                `Status: ${details.online ? 'Online' : 'Offline'} | Última sinc: ${details.lastSync}`,
                'info',
                5000
            );
        }
    }
    
    showDataDetails() {
        const details = {};
        this.dataStatus.forEach((status, key) => {
            details[key] = {
                name: status.name,
                status: status.status,
                timestamp: status.timestamp
            };
        });
        
        console.log('Data Status Details:', details);
        
        // Mostrar resumo em toast
        const freshCount = Array.from(this.dataStatus.values()).filter(s => s.status === 'fresh').length;
        const totalCount = this.dataStatus.size;
        
        if (window.showToast) {
            window.showToast(
                `Dados: ${freshCount}/${totalCount} atualizados`,
                freshCount === totalCount ? 'success' : 'warning',
                3000
            );
        }
    }
    
    getConnectionType() {
        // Tentar detectar tipo de conexão
        if ('connection' in navigator) {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            return connection ? connection.effectiveType || 'unknown' : 'unknown';
        }
        return 'unknown';
    }
    
    // Métodos públicos
    setStatus(type, message) {
        this.showMessage(message, type);
    }
    
    updateData(key, status) {
        this.dataStatus.set(key, status);
        this.updateStatus();
    }
    
    isDataFresh(key) {
        const status = this.dataStatus.get(key);
        return status && status.status === 'fresh';
    }
    
    getAllDataStatus() {
        const result = {};
        this.dataStatus.forEach((status, key) => {
            result[key] = status;
        });
        return result;
    }
    
    destroy() {
        this.clearMessages();
        if (this.indicator) {
            this.indicator.remove();
            this.indicator = null;
        }
    }
}

// Instância global com configuração para renderização inline (acima da "Última atualização")
window.OfflineIndicator = new OfflineIndicator({
    position: 'inline',
    showConnectionStatus: false, // desativado para economizar espaço
    showDataAvailability: true, // mostrar apenas disponibilidade de dados
    autoHideDelay: 3000, // esconder mais rápido
    checkInterval: 60000 // verificar a cada 60 segundos
});

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OfflineIndicator;
}
