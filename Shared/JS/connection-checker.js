/**
 * Connection Checker
 * Sistema inteligente de verificação de conexão sem CORS issues
 */

class ConnectionChecker {
    constructor() {
        this.isOnline = navigator.onLine;
        this.lastCheck = Date.now();
        this.checkInterval = 30000; // 30 segundos
        this.timeout = 5000; // 5 segundos timeout
        this.endpoints = [
            'https://httpbin.org/status/200',
            'https://www.google.com',
            'https://jsonplaceholder.typicode.com/posts/1',
            'https://api.github.com',
            'https://www.cloudflare.com'
        ];
        
        this.init();
    }
    
    init() {
        // Event listeners do navegador
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.notifyChange('online');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.notifyChange('offline');
        });
        
        // Verificação periódica
        setInterval(() => {
            this.checkConnection();
        }, this.checkInterval);
        
        // Verificação inicial
        setTimeout(() => this.checkConnection(), 1000);
    }
    
    async checkConnection() {
        const wasOnline = this.isOnline;
        
        try {
            // Verificação rápida usando API do navegador
            if (!navigator.onLine) {
                this.isOnline = false;
                if (wasOnline) this.notifyChange('offline');
                return false;
            }
            
            // Verificação com múltiplos endpoints
            const online = await this.checkWithEndpoints();
            
            if (online !== this.isOnline) {
                this.isOnline = online;
                this.notifyChange(online ? 'online' : 'offline');
            }
            
            this.lastCheck = Date.now();
            return online;
            
        } catch (error) {
            console.debug('Erro na verificação de conexão:', error.message);
            return false;
        }
    }
    
    async checkWithEndpoints() {
        // Tentar múltiplos endpoints em paralelo
        const promises = this.endpoints.map(endpoint => 
            this.checkEndpoint(endpoint)
        );
        
        try {
            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            
            // Considerar online se pelo menos um endpoint responder
            return successful > 0;
            
        } catch (error) {
            return false;
        }
    }
    
    async checkEndpoint(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response.ok || response.type === 'opaque';
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            // Silenciar erros esperados de CORS e timeout
            if (error.name === 'AbortError' || 
                error.name === 'TypeError' || 
                error.message.includes('Failed to fetch')) {
                return false;
            }
            
            return false;
        }
    }
    
    notifyChange(status) {
        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent('connection-change', {
            detail: {
                status,
                timestamp: Date.now(),
                wasOnline: status === 'online'
            }
        }));
        
        // Atualizar indicadores se existirem
        if (window.OfflineIndicator) {
            if (status === 'online') {
                window.OfflineIndicator.setStatus('online', 'Conexão restaurada');
            } else {
                window.OfflineIndicator.setStatus('offline', 'Sem conexão com a internet');
            }
        }
    }
    
    // Métodos públicos
    async isCurrentlyOnline() {
        await this.checkConnection();
        return this.isOnline;
    }
    
    getConnectionInfo() {
        return {
            isOnline: this.isOnline,
            lastCheck: this.lastCheck,
            checkInterval: this.checkInterval,
            endpoints: this.endpoints.length
        };
    }
    
    addEndpoint(url) {
        if (!this.endpoints.includes(url)) {
            this.endpoints.push(url);
        }
    }
    
    removeEndpoint(url) {
        const index = this.endpoints.indexOf(url);
        if (index > -1) {
            this.endpoints.splice(index, 1);
        }
    }
    
    setCheckInterval(interval) {
        this.checkInterval = interval;
    }
    
    setTimeout(timeout) {
        this.timeout = timeout;
    }
    
    // Método estático para uso rápido
    static async quickCheck() {
        const checker = new ConnectionChecker();
        return await checker.isCurrentlyOnline();
    }
}

// Instância global
window.ConnectionChecker = new ConnectionChecker();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConnectionChecker;
}
