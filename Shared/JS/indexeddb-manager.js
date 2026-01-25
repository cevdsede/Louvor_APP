/**
 * IndexedDB Manager
 * Sistema de banco de dados local robusto para substituir localStorage
 */

class IndexedDBManager {
    constructor(options = {}) {
        this.options = {
            dbName: 'LouvorCEVD_DB',
            version: 1,
            storeName: 'app_data',
            maxSize: 50 * 1024 * 1024, // 50MB
            ...options
        };
        
        this.db = null;
        this.isReady = false;
        this.initPromise = null;
        
        this.init();
    }
    
    async init() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.options.dbName, this.options.version);
            
            request.onerror = () => {
                console.error('Erro ao abrir IndexedDB:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                this.isReady = true;
                console.log('IndexedDB inicializado com sucesso');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Criar store principal
                if (!db.objectStoreNames.contains(this.options.storeName)) {
                    const store = db.createObjectStore(this.options.storeName, { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                }
                
                // Criar store para sincronização
                if (!db.objectStoreNames.contains('sync_queue')) {
                    const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                    syncStore.createIndex('status', 'status', { unique: false });
                }
                
                // Criar store para cache de imagens
                if (!db.objectStoreNames.contains('image_cache')) {
                    const imageStore = db.createObjectStore('image_cache', { keyPath: 'url' });
                    imageStore.createIndex('timestamp', 'timestamp', { unique: false });
                    imageStore.createIndex('size', 'size', { unique: false });
                }
                
                // Criar store para métricas
                if (!db.objectStoreNames.contains('metrics')) {
                    const metricsStore = db.createObjectStore('metrics', { keyPath: 'id', autoIncrement: true });
                    metricsStore.createIndex('type', 'type', { unique: false });
                    metricsStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
        
        return this.initPromise;
    }
    
    // ========== MÉTODOS PRINCIPAIS ==========
    
    async set(key, value, options = {}) {
        await this.init();
        
        const {
            type = 'data',
            ttl = null, // time to live em ms
            compress = false
        } = options;
        
        const item = {
            key,
            value: compress ? await this.compress(value) : value,
            timestamp: Date.now(),
            type,
            ttl: ttl ? Date.now() + ttl : null,
            compressed: compress,
            size: this.calculateSize(value)
        };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.options.storeName], 'readwrite');
            const store = transaction.objectStore(this.options.storeName);
            const request = store.put(item);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async get(key, fallback = null) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.options.storeName], 'readonly');
            const store = transaction.objectStore(this.options.storeName);
            const request = store.get(key);
            
            request.onsuccess = async () => {
                const item = request.result;
                
                if (!item) {
                    resolve(fallback);
                    return;
                }
                
                // Verificar TTL
                if (item.ttl && Date.now() > item.ttl) {
                    await this.remove(key);
                    resolve(fallback);
                    return;
                }
                
                // Descomprimir se necessário
                const value = item.compressed ? await this.decompress(item.value) : item.value;
                resolve(value);
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async remove(key) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.options.storeName], 'readwrite');
            const store = transaction.objectStore(this.options.storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async clear() {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.options.storeName], 'readwrite');
            const store = transaction.objectStore(this.options.storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async keys() {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.options.storeName], 'readonly');
            const store = transaction.objectStore(this.options.storeName);
            const request = store.getAllKeys();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async has(key) {
        const value = await this.get(key);
        return value !== null;
    }
    
    // ========== MÉTODOS DE SINCRONIZAÇÃO ==========
    
    async addToSyncQueue(data) {
        await this.init();
        
        const item = {
            data,
            timestamp: Date.now(),
            status: 'pending',
            retries: 0
        };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sync_queue'], 'readwrite');
            const store = transaction.objectStore('sync_queue');
            const request = store.add(item);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getSyncQueue(limit = 50) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sync_queue'], 'readonly');
            const store = transaction.objectStore('sync_queue');
            const index = store.index('status');
            const request = index.getAll('pending', limit);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async updateSyncItem(id, updates) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sync_queue'], 'readwrite');
            const store = transaction.objectStore('sync_queue');
            
            store.get(id).onsuccess = (event) => {
                const item = event.target.result;
                if (item) {
                    Object.assign(item, updates);
                    const updateRequest = store.put(item);
                    updateRequest.onsuccess = () => resolve(updateRequest.result);
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error('Item não encontrado'));
                }
            };
        });
    }
    
    async removeSyncItem(id) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sync_queue'], 'readwrite');
            const store = transaction.objectStore('sync_queue');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // ========== CACHE DE IMAGENS ==========
    
    async cacheImage(url, blob) {
        await this.init();
        
        const item = {
            url,
            blob,
            timestamp: Date.now(),
            size: blob.size
        };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['image_cache'], 'readwrite');
            const store = transaction.objectStore('image_cache');
            const request = store.put(item);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getCachedImage(url) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['image_cache'], 'readonly');
            const store = transaction.objectStore('image_cache');
            const request = store.get(url);
            
            request.onsuccess = () => {
                const item = request.result;
                if (item) {
                    // Verificar se a imagem não é muito antiga (7 dias)
                    const maxAge = 7 * 24 * 60 * 60 * 1000;
                    if (Date.now() - item.timestamp < maxAge) {
                        resolve(item.blob);
                        return;
                    }
                }
                resolve(null);
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async cleanupOldImages() {
        await this.init();
        
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
        const cutoffTime = Date.now() - maxAge;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['image_cache'], 'readwrite');
            const store = transaction.objectStore('image_cache');
            const index = store.index('timestamp');
            const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    // ========== MÉTRICAS ==========
    
    async recordMetric(type, data) {
        await this.init();
        
        const metric = {
            type,
            data,
            timestamp: Date.now()
        };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['metrics'], 'readwrite');
            const store = transaction.objectStore('metrics');
            const request = store.add(metric);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getMetrics(type, limit = 100) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['metrics'], 'readonly');
            const store = transaction.objectStore('metrics');
            const index = store.index('type');
            const request = index.getAll(type, limit);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async cleanupOldMetrics() {
        await this.init();
        
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias
        const cutoffTime = Date.now() - maxAge;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['metrics'], 'readwrite');
            const store = transaction.objectStore('metrics');
            const index = store.index('timestamp');
            const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    // ========== UTILITÁRIOS ==========
    
    async getStorageInfo() {
        await this.init();
        
        return new Promise((resolve, reject) => {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                navigator.storage.estimate().then(estimate => {
                    resolve({
                        quota: estimate.quota,
                        usage: estimate.usage,
                        available: estimate.quota - estimate.usage,
                        usagePercentage: (estimate.usage / estimate.quota * 100).toFixed(2)
                    });
                }).catch(reject);
            } else {
                resolve({
                    quota: 'unknown',
                    usage: 'unknown',
                    available: 'unknown',
                    usagePercentage: 'unknown'
                });
            }
        });
    }
    
    async getDatabaseSize() {
        await this.init();
        
        let totalSize = 0;
        
        const stores = ['app_data', 'sync_queue', 'image_cache', 'metrics'];
        
        for (const storeName of stores) {
            const size = await this.getStoreSize(storeName);
            totalSize += size;
        }
        
        return {
            totalSize,
            formattedSize: this.formatBytes(totalSize),
            stores: stores.map(name => ({
                name,
                size: this.getStoreSize(name)
            }))
        };
    }
    
    async getStoreSize(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const items = request.result;
                const size = items.reduce((total, item) => {
                    return total + this.calculateSize(item);
                }, 0);
                resolve(size);
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    calculateSize(obj) {
        return new Blob([JSON.stringify(obj)]).size;
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async compress(data) {
        // Implementação simplificada - em produção usar CompressionStream API
        const jsonString = JSON.stringify(data);
        return jsonString; // Placeholder
    }
    
    async decompress(data) {
        // Implementação simplificada
        return data; // Placeholder
    }
    
    // ========== MIGRAÇÃO DO LOCALSTORAGE ==========
    
    async migrateFromLocalStorage() {
        console.log('Iniciando migração do localStorage para IndexedDB...');
        
        const migrationMap = {
            'offline_escala': { key: 'offline_escala', type: 'data' },
            'offline_musicas': { key: 'offline_musicas', type: 'data' },
            'offline_repertorio': { key: 'offline_repertorio', type: 'data' },
            'offline_componentes': { key: 'offline_componentes', type: 'data' },
            'offline_temas': { key: 'offline_temas', type: 'data' },
            'offline_historico': { key: 'offline_historico', type: 'data' },
            'offline_lembretes': { key: 'offline_lembretes', type: 'data' },
            'offline_imagens': { key: 'offline_imagens', type: 'data' },
            'user_token': { key: 'user_token', type: 'auth' },
            'last_full_sync': { key: 'last_full_sync', type: 'meta' },
            'last_activity': { key: 'last_activity', type: 'meta' },
            'user_notificacoes': { key: 'user_notificacoes', type: 'notifications' },
            'notificacoes_conhecidas_ids': { key: 'notificacoes_conhecidas_ids', type: 'notifications' }
        };
        
        let migrated = 0;
        let errors = 0;
        
        for (const [localStorageKey, config] of Object.entries(migrationMap)) {
            try {
                const value = localStorage.getItem(localStorageKey);
                if (value !== null) {
                    await this.set(config.key, value, { type: config.type });
                    localStorage.removeItem(localStorageKey);
                    migrated++;
                }
            } catch (error) {
                console.error(`Erro ao migrar ${localStorageKey}:`, error);
                errors++;
            }
        }
        
        console.log(`Migração concluída: ${migrated} itens migrados, ${errors} erros`);
        return { migrated, errors };
    }
    
    // ========== COMPATIBILIDADE COM LOCALSTORAGE ==========
    
    createLocalStorageAdapter() {
        return {
            getItem: async (key) => {
                return await this.get(key);
            },
            
            setItem: async (key, value) => {
                return await this.set(key, value);
            },
            
            removeItem: async (key) => {
                return await this.remove(key);
            },
            
            clear: async () => {
                return await this.clear();
            },
            
            key: async (index) => {
                const keys = await this.keys();
                return keys[index] || null;
            },
            
            get length() {
                return this.keys().then(keys => keys.length);
            }
        };
    }
}

// Instância global
window.IDBManager = new IndexedDBManager();

// Compatibilidade com localStorage existente
window.StorageCompat = {
    async getItem(key) {
        try {
            return await window.IDBManager.get(key) || localStorage.getItem(key);
        } catch (error) {
            return localStorage.getItem(key);
        }
    },
    
    async setItem(key, value) {
        try {
            await window.IDBManager.set(key, value);
            localStorage.removeItem(key); // Remover do localStorage após migrar
        } catch (error) {
            localStorage.setItem(key, value);
        }
    },
    
    async removeItem(key) {
        try {
            await window.IDBManager.remove(key);
            localStorage.removeItem(key);
        } catch (error) {
            localStorage.removeItem(key);
        }
    },
    
    async clear() {
        try {
            await window.IDBManager.clear();
            localStorage.clear();
        } catch (error) {
            localStorage.clear();
        }
    }
};

// Auto-migração ao carregar
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.IDBManager.init();
        
        // Verificar se já migrou
        const hasMigrated = await window.IDBManager.get('migration_completed');
        if (!hasMigrated) {
            await window.IDBManager.migrateFromLocalStorage();
            await window.IDBManager.set('migration_completed', true);
        }
    } catch (error) {
        console.error('Erro na inicialização do IndexedDB:', error);
    }
});

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndexedDBManager;
}
