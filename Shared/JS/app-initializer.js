/**
 * App Initializer
 * Coordena a inicialização segura de todos os módulos do aplicativo
 */

class AppInitializer {
    constructor() {
        this.modules = new Map();
        this.isReady = false;
        this.initPromise = null;
        
        this.setupModules();
    }
    
    setupModules() {
        // Definir módulos e suas dependências
        this.modules.set('config', {
            instance: () => window.APP_CONFIG,
            dependencies: [],
            essential: true
        });
        
        this.modules.set('connection', {
            instance: () => window.ConnectionChecker,
            dependencies: [],
            essential: false
        });
        
        this.modules.set('indexeddb', {
            instance: () => window.IDBManager,
            dependencies: ['config'],
            essential: true
        });
        
        this.modules.set('performance', {
            instance: () => window.PerformanceManager,
            dependencies: ['config'],
            essential: false
        });
        
        this.modules.set('offline', {
            instance: () => window.OfflineIndicator,
            dependencies: ['config'],
            essential: false
        });
        
        this.modules.set('serviceworker', {
            instance: () => window.AdvancedServiceWorker,
            dependencies: ['config'],
            essential: false
        });
        
        this.modules.set('dashboard', {
            instance: () => window.AdvancedDashboard,
            dependencies: ['config', 'indexeddb'],
            essential: false
        });
        
        this.modules.set('metrics', {
            instance: () => window.AdminMetrics,
            dependencies: ['config', 'indexeddb'],
            essential: false
        });
    }
    
    async init() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = this.initializeModules();
        return this.initPromise;
    }
    
    async initializeModules() {
        console.log('🚀 Inicializando aplicativo Louvor CEVD...');
        
        try {
            // Aguardar DOM estar pronto
            await this.waitForDOM();
            
            // Inicializar módulos essenciais primeiro
            await this.initializeEssentialModules();
            
            // Inicializar módulos não essenciais em paralelo
            await this.initializeNonEssentialModules();
            
            // Configurar listeners globais
            this.setupGlobalListeners();
            
            this.isReady = true;
            console.log('✅ Aplicativo inicializado com sucesso!');
            
            // Disparar evento de pronto
            window.dispatchEvent(new CustomEvent('app-ready'));
            
        } catch (error) {
            console.error('❌ Erro na inicialização do aplicativo:', error);
            
            // Tentar inicialização mínima
            await this.initializeMinimalMode();
        }
    }
    
    async waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }
    
    async initializeEssentialModules() {
        const essentialModules = Array.from(this.modules.entries())
            .filter(([_, config]) => config.essential);
        
        for (const [name, config] of essentialModules) {
            try {
                await this.initializeModule(name, config);
                console.log(`✅ Módulo essencial ${name} inicializado`);
            } catch (error) {
                console.error(`❌ Erro ao inicializar módulo essencial ${name}:`, error);
                throw error; // Módulos essenciais não podem falhar
            }
        }
    }
    
    async initializeNonEssentialModules() {
        const nonEssentialModules = Array.from(this.modules.entries())
            .filter(([_, config]) => !config.essential);
        
        // Inicializar em paralelo com tratamento de erros individuais
        const initPromises = nonEssentialModules.map(async ([name, config]) => {
            try {
                await this.initializeModule(name, config);
                console.log(`✅ Módulo ${name} inicializado`);
            } catch (error) {
                console.warn(`⚠️ Módulo ${name} não pôde ser inicializado:`, error.message);
                // Não falhar completamente por módulos não essenciais
            }
        });
        
        await Promise.allSettled(initPromises);
    }
    
    async initializeModule(name, config) {
        // Verificar dependências
        for (const dep of config.dependencies) {
            if (!this.modules.get(dep)?.initialized) {
                throw new Error(`Dependência ${dep} não inicializada para ${name}`);
            }
        }
        
        // Inicializar módulo
        const instance = config.instance();
        if (instance && typeof instance.init === 'function') {
            await instance.init();
        }
        
        // Marcar como inicializado
        this.modules.get(name).initialized = true;
    }
    
    async initializeMinimalMode() {
        console.warn('🔄 Inicializando modo mínimo...');
        
        try {
            // Apenas configuração básica
            if (window.APP_CONFIG) {
                console.log('✅ Configuração básica carregada');
            }
            
            // IndexedDB se disponível
            if (window.IDBManager) {
                try {
                    await window.IDBManager.init();
                    console.log('✅ IndexedDB inicializado em modo mínimo');
                } catch (error) {
                    console.warn('⚠️ IndexedDB não disponível em modo mínimo');
                }
            }
            
            console.log('✅ Modo mínimo inicializado');
            
        } catch (error) {
            console.error('❌ Falha completa na inicialização:', error);
        }
    }
    
    setupGlobalListeners() {
        // Listener para erros globais
        window.addEventListener('error', (event) => {
            console.error('Erro global:', event.error);
            this.recordError('global', event.error);
        });
        
        // Listener para promises rejeitadas
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Promise rejeitada:', event.reason);
            this.recordError('promise', event.reason);
        });
        
        // Listener para mudança de conexão
        window.addEventListener('online', () => {
            console.log('🌐 Conexão restaurada');
            this.notifyModules('online');
        });
        
        window.addEventListener('offline', () => {
            console.log('📱 Modo offline ativado');
            this.notifyModules('offline');
        });
        
        // Listener para antes de descarregar
        window.addEventListener('beforeunload', () => {
            console.log('👋 Aplicativo sendo fechado');
            this.cleanup();
        });
    }
    
    notifyModules(event) {
        // Notificar módulos sobre mudanças de estado
        this.modules.forEach((config, name) => {
            const instance = config.instance();
            if (instance && typeof instance.onConnectionChange === 'function') {
                instance.onConnectionChange(event);
            }
        });
    }
    
    recordError(type, error) {
        try {
            // Tentar registrar erro no IndexedDB
            if (window.IDBManager) {
                window.IDBManager.recordMetric('error', {
                    type,
                    message: error.message || error,
                    stack: error.stack,
                    timestamp: Date.now(),
                    url: window.location.href
                });
            }
        } catch (e) {
            console.error('Erro ao registrar erro:', e);
        }
    }
    
    cleanup() {
        // Limpar recursos antes de fechar
        this.modules.forEach((config, name) => {
            const instance = config.instance();
            if (instance && typeof instance.destroy === 'function') {
                try {
                    instance.destroy();
                } catch (error) {
                    console.warn(`Erro ao limpar módulo ${name}:`, error);
                }
            }
        });
    }
    
    // Métodos públicos
    isModuleReady(name) {
        return this.modules.get(name)?.initialized || false;
    }
    
    getModule(name) {
        const config = this.modules.get(name);
        return config?.initialized ? config.instance() : null;
    }
    
    async restartModule(name) {
        const config = this.modules.get(name);
        if (!config) {
            throw new Error(`Módulo ${name} não encontrado`);
        }
        
        try {
            // Limpar módulo se existir método destroy
            const instance = config.instance();
            if (instance && typeof instance.destroy === 'function') {
                instance.destroy();
            }
            
            // Reinicializar
            config.initialized = false;
            await this.initializeModule(name, config);
            
            console.log(`✅ Módulo ${name} reinicializado`);
        } catch (error) {
            console.error(`❌ Erro ao reinicializar módulo ${name}:`, error);
            throw error;
        }
    }
    
    getInitializationStatus() {
        const status = {};
        this.modules.forEach((config, name) => {
            status[name] = {
                initialized: config.initialized || false,
                essential: config.essential,
                dependencies: config.dependencies
            };
        });
        return status;
    }
}

// Instância global
window.AppInitializer = new AppInitializer();

// Auto-inicialização quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.AppInitializer.init();
    });
} else {
    window.AppInitializer.init();
}

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppInitializer;
}
