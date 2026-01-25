/**
 * Advanced Service Worker Manager
 * Service Worker robusto com background sync inteligente e cache strategies
 */

class AdvancedServiceWorkerManager {
    constructor() {
        this.registration = null;
        this.isSupported = 'serviceWorker' in navigator;
        this.syncQueue = [];
        this.cacheStrategies = {
            networkFirst: this.networkFirst.bind(this),
            cacheFirst: this.cacheFirst.bind(this),
            staleWhileRevalidate: this.staleWhileRevalidate.bind(this),
            networkOnly: this.networkOnly.bind(this),
            cacheOnly: this.cacheOnly.bind(this)
        };
        
        this.init();
    }
    
    async init() {
        if (!this.isSupported) {
            // Silenciar warning em desenvolvimento/local
            if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {
                console.info('Service Worker não suportado neste navegador');
            }
            return;
        }
        
        try {
            await this.registerServiceWorker();
            this.setupEventListeners();
            this.startBackgroundSync();
        } catch (error) {
            // Não mostrar erro em desenvolvimento se for relacionado a Service Worker
            if (!error.message.includes('Service Worker')) {
                console.error('Erro ao inicializar Service Worker:', error);
            }
            // Não falhar completamente se Service Worker não funcionar
        }
    }
    
    async registerServiceWorker() {
        this.registration = await navigator.serviceWorker.register('/service-worker.js', {
            scope: '/'
        });
        
        console.log('Service Worker registrado:', this.registration.scope);
        
        // Aguardar ativação
        if (this.registration.active) {
            console.log('Service Worker já está ativo');
        } else {
            this.registration.addEventListener('updatefound', () => {
                const newWorker = this.registration.installing;
                console.log('Novo Service Worker encontrado');
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.showUpdateNotification();
                    }
                });
            });
        }
        
        return this.registration;
    }
    
    setupEventListeners() {
        // Mensagens do Service Worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            this.handleServiceWorkerMessage(event);
        });
        
        // Eventos de conexão
        window.addEventListener('online', () => {
            this.processSyncQueue();
        });
        
        // Eventos de sincronização personalizados
        window.addEventListener('syncStarted', () => {
            this.notifyServiceWorker('sync-started');
        });
        
        window.addEventListener('syncCompleted', () => {
            this.notifyServiceWorker('sync-completed');
        });
    }
    
    handleServiceWorkerMessage(event) {
        const { type, data } = event.data;
        
        switch (type) {
            case 'sync-queue-updated':
                this.syncQueue = data.queue;
                break;
            case 'cache-updated':
                this.handleCacheUpdate(data);
                break;
            case 'background-sync-completed':
                this.handleBackgroundSyncComplete(data);
                break;
            case 'storage-quota-exceeded':
                this.handleStorageQuotaExceeded();
                break;
        }
    }
    
    notifyServiceWorker(type, data = {}) {
        if (this.registration && this.registration.active) {
            this.registration.active.postMessage({ type, data });
        }
    }
    
    // ========== CACHE STRATEGIES ==========
    
    async networkFirst(request) {
        try {
            const networkResponse = await fetch(request);
            
            // Cache em caso de sucesso
            if (networkResponse.ok) {
                const cache = await caches.open('dynamic-cache-v1');
                cache.put(request, networkResponse.clone());
            }
            
            return networkResponse;
        } catch (error) {
            // Fallback para cache
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }
            
            throw error;
        }
    }
    
    async cacheFirst(request) {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            // Atualizar cache em background
            this.updateCacheInBackground(request);
            return cachedResponse;
        }
        
        // Fallback para network
        try {
            const networkResponse = await fetch(request);
            
            if (networkResponse.ok) {
                const cache = await caches.open('dynamic-cache-v1');
                cache.put(request, networkResponse.clone());
            }
            
            return networkResponse;
        } catch (error) {
            throw error;
        }
    }
    
    async staleWhileRevalidate(request) {
        const cachedResponse = await caches.match(request);
        const fetchPromise = fetch(request).then(async (networkResponse) => {
            if (networkResponse.ok) {
                const cache = await caches.open('dynamic-cache-v1');
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        });
        
        return cachedResponse || fetchPromise;
    }
    
    async networkOnly(request) {
        return fetch(request);
    }
    
    async cacheOnly(request) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw new Error('No cached response found');
    }
    
    async updateCacheInBackground(request) {
        try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
                const cache = await caches.open('dynamic-cache-v1');
                cache.put(request, networkResponse);
            }
        } catch (error) {
            console.log('Background cache update failed:', error);
        }
    }
    
    // ========== BACKGROUND SYNC ==========
    
    startBackgroundSync() {
        // Registrar periodic sync se suportado
        this.registerPeriodicSync();
        
        // Registrar sync tag para eventos manuais
        this.registerSyncTag();
        
        // Processar fila de sincronização
        this.processSyncQueue();
    }
    
    async registerPeriodicSync() {
        if ('periodicSync' in this.registration) {
            try {
                await this.registration.periodicSync.register('background-sync', {
                    minInterval: 60 * 60 * 1000 // 1 hora
                });
                console.log('Periodic Sync registrado');
            } catch (error) {
                console.log('Periodic Sync não pôde ser registrado:', error);
            }
        }
    }
    
    async registerSyncTag() {
        // Registrar tag para sincronização manual
        if ('sync' in this.registration) {
            // Será usado quando houver dados para sincronizar
        }
    }
    
    async addToSyncQueue(data) {
        const syncItem = {
            id: Date.now() + Math.random(),
            timestamp: Date.now(),
            data,
            retries: 0,
            maxRetries: 3
        };
        
        this.syncQueue.push(syncItem);
        
        // Tentar sincronizar imediatamente se online
        if (navigator.onLine) {
            this.processSyncQueue();
        } else {
            // Registrar background sync para quando voltar online
            this.registerOneTimeSync();
        }
        
        // Salvar no IndexedDB para persistência
        await this.saveSyncQueue();
        
        return syncItem.id;
    }
    
    async processSyncQueue() {
        if (!navigator.onLine || this.syncQueue.length === 0) {
            return;
        }
        
        console.log(`Processando ${this.syncQueue.length} itens da fila de sincronização`);
        
        const failedItems = [];
        
        for (const item of this.syncQueue) {
            try {
                await this.processSyncItem(item);
            } catch (error) {
                console.error('Erro ao processar item de sincronização:', error);
                
                item.retries++;
                if (item.retries < item.maxRetries) {
                    failedItems.push(item);
                }
            }
        }
        
        this.syncQueue = failedItems;
        await this.saveSyncQueue();
        
        if (this.syncQueue.length === 0) {
            console.log('Fila de sincronização processada com sucesso');
            window.dispatchEvent(new CustomEvent('syncCompleted'));
        }
    }
    
    async processSyncItem(item) {
        const { data } = item;
        
        switch (data.type) {
            case 'api-request':
                return await this.processApiRequest(data);
            case 'form-submit':
                return await this.processFormSubmit(data);
            case 'data-update':
                return await this.processDataUpdate(data);
            default:
                throw new Error(`Tipo de sincronização desconhecido: ${data.type}`);
        }
    }
    
    async processApiRequest(data) {
        const response = await fetch(data.url, {
            method: data.method || 'GET',
            headers: data.headers || {},
            body: data.body
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        return response.json();
    }
    
    async processFormSubmit(data) {
        const formData = new FormData();
        Object.entries(data.fields).forEach(([key, value]) => {
            formData.append(key, value);
        });
        
        const response = await fetch(data.url, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Form submit failed: ${response.status}`);
        }
        
        return response.json();
    }
    
    async processDataUpdate(data) {
        const response = await fetch(APP_CONFIG.SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data.payload)
        });
        
        if (!response.ok) {
            throw new Error(`Data update failed: ${response.status}`);
        }
        
        return response.json();
    }
    
    async registerOneTimeSync() {
        if ('sync' in this.registration) {
            try {
                await this.registration.sync.register('one-time-sync');
                console.log('One-time sync registrado');
            } catch (error) {
                console.log('One-time sync não pôde ser registrado:', error);
            }
        }
    }
    
    async saveSyncQueue() {
        try {
            await window.IDBManager.set('sync_queue', this.syncQueue, { type: 'sync' });
        } catch (error) {
            console.error('Erro ao salvar fila de sincronização:', error);
        }
    }
    
    async loadSyncQueue() {
        try {
            const queue = await window.IDBManager.get('sync_queue');
            if (queue) {
                this.syncQueue = queue;
            }
        } catch (error) {
            console.error('Erro ao carregar fila de sincronização:', error);
        }
    }
    
    // ========== CACHE MANAGEMENT ==========
    
    async clearCache(cacheName = 'dynamic-cache-v1') {
        try {
            await caches.delete(cacheName);
            console.log(`Cache ${cacheName} limpo`);
        } catch (error) {
            console.error('Erro ao limpar cache:', error);
        }
    }
    
    async getCacheInfo() {
        const cacheNames = await caches.keys();
        const cacheInfo = [];
        
        for (const name of cacheNames) {
            const cache = await caches.open(name);
            const keys = await cache.keys();
            let totalSize = 0;
            
            for (const request of keys) {
                const response = await cache.match(request);
                if (response) {
                    const blob = await response.blob();
                    totalSize += blob.size;
                }
            }
            
            cacheInfo.push({
                name,
                entries: keys.length,
                size: totalSize,
                formattedSize: this.formatBytes(totalSize)
            });
        }
        
        return cacheInfo;
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // ========== NOTIFICAÇÕES ==========
    
    showUpdateNotification() {
        if (window.showToast) {
            window.showToast(
                'Nova versão disponível! Clique para atualizar.',
                'info',
                10000,
                () => {
                    window.location.reload();
                }
            );
        }
    }
    
    handleCacheUpdate(data) {
        console.log('Cache atualizado:', data);
        
        if (window.showToast) {
            window.showToast('Cache atualizado com sucesso', 'success');
        }
    }
    
    handleBackgroundSyncComplete(data) {
        console.log('Background sync concluído:', data);
        
        if (window.showToast) {
            window.showToast('Dados sincronizados em background', 'success');
        }
    }
    
    handleStorageQuotaExceeded() {
        console.warn('Cota de armazenamento excedida');
        
        if (window.showToast) {
            window.showToast(
                'Espaço de armazenamento cheio. Limpando cache antigo...',
                'warning'
            );
        }
        
        this.cleanupOldCache();
    }
    
    async cleanupOldCache() {
        try {
            const cacheNames = await caches.keys();
            const now = Date.now();
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
            
            for (const name of cacheNames) {
                if (name.includes('v1') || name.includes('dynamic')) {
                    const cache = await caches.open(name);
                    const requests = await cache.keys();
                    
                    for (const request of requests) {
                        const response = await cache.match(request);
                        if (response) {
                            const dateHeader = response.headers.get('date');
                            if (dateHeader) {
                                const responseDate = new Date(dateHeader).getTime();
                                if (now - responseDate > maxAge) {
                                    await cache.delete(request);
                                }
                            }
                        }
                    }
                }
            }
            
            console.log('Cache antigo limpo com sucesso');
        } catch (error) {
            console.error('Erro ao limpar cache antigo:', error);
        }
    }
    
    // ========== MÉTODOS PÚBLICOS ==========
    
    async forceRefresh() {
        try {
            // Limpar caches principais
            await this.clearCache('dynamic-cache-v1');
            await this.clearCache('api-cache-v1');
            
            // Recarregar página
            window.location.reload();
        } catch (error) {
            console.error('Erro ao forçar refresh:', error);
        }
    }
    
    async preloadCriticalResources() {
        const criticalResources = [
            '/',
            '/index.html',
            '/Shared/JS/config.js',
            '/Shared/JS/performance-core.js',
            '/Shared/JS/skeleton-loading.js',
            '/Shared/CSS/main.css'
        ];
        
        const cache = await caches.open('critical-cache-v1');
        
        for (const url of criticalResources) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response);
                }
            } catch (error) {
                console.log(`Falha ao pré-carregar ${url}:`, error);
            }
        }
    }
    
    getRegistration() {
        return this.registration;
    }
    
    isServiceWorkerReady() {
        return this.registration && this.registration.active;
    }
    
    getSyncQueueStatus() {
        return {
            length: this.syncQueue.length,
            items: this.syncQueue.map(item => ({
                id: item.id,
                type: item.data.type,
                timestamp: item.timestamp,
                retries: item.retries
            }))
        };
    }
}

// Instância global
window.AdvancedServiceWorker = new AdvancedServiceWorkerManager();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedServiceWorkerManager;
}
