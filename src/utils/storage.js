// Sistema de Storage Local
class Storage {
    constructor() {
        this.prefix = 'louvor_';
    }

    // Salvar dados
    set(key, value) {
        try {
            const prefixedKey = this.prefix + key;
            const serialized = JSON.stringify(value);
            localStorage.setItem(prefixedKey, serialized);
            return true;
        } catch (error) {
            console.error('Erro ao salvar no storage:', error);
            return false;
        }
    }

    // Obter dados
    get(key, defaultValue = null) {
        try {
            const prefixedKey = this.prefix + key;
            const serialized = localStorage.getItem(prefixedKey);
            if (serialized === null) {
                return defaultValue;
            }
            return JSON.parse(serialized);
        } catch (error) {
            console.error('Erro ao obter do storage:', error);
            return defaultValue;
        }
    }

    // Remover dados
    remove(key) {
        try {
            const prefixedKey = this.prefix + key;
            localStorage.removeItem(prefixedKey);
            return true;
        } catch (error) {
            console.error('Erro ao remover do storage:', error);
            return false;
        }
    }

    // Limpar todos os dados
    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Erro ao limpar storage:', error);
            return false;
        }
    }

    // Verificar se existe
    exists(key) {
        const prefixedKey = this.prefix + key;
        return localStorage.getItem(prefixedKey) !== null;
    }

    // Obter todas as chaves
    getAllKeys() {
        const keys = Object.keys(localStorage);
        return keys
            .filter(key => key.startsWith(this.prefix))
            .map(key => key.replace(this.prefix, ''));
    }

    // Salvar com expiração
    setWithExpiry(key, value, ttl) {
        try {
            const now = new Date().getTime();
            const item = {
                value: value,
                expiry: now + ttl
            };
            return this.set(key, item);
        } catch (error) {
            console.error('Erro ao salvar com expiração:', error);
            return false;
        }
    }

    // Obter com expiração
    getWithExpiry(key, defaultValue = null) {
        try {
            const item = this.get(key);
            if (!item || !item.expiry) {
                return defaultValue;
            }

            const now = new Date().getTime();
            if (now > item.expiry) {
                this.remove(key);
                return defaultValue;
            }

            return item.value;
        } catch (error) {
            console.error('Erro ao obter com expiração:', error);
            return defaultValue;
        }
    }
}

// Sistema de Cache
class Cache {
    constructor() {
        this.cache = new Map();
        this.ttl = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5 minutos
    }

    // Salvar no cache
    set(key, value, ttl = this.defaultTTL) {
        this.cache.set(key, value);
        this.ttl.set(key, Date.now() + ttl);
    }

    // Obter do cache
    get(key) {
        if (!this.cache.has(key)) {
            return null;
        }

        const expiry = this.ttl.get(key);
        if (Date.now() > expiry) {
            this.delete(key);
            return null;
        }

        return this.cache.get(key);
    }

    // Remover do cache
    delete(key) {
        this.cache.delete(key);
        this.ttl.delete(key);
    }

    // Limpar cache expirado
    cleanup() {
        const now = Date.now();
        for (const [key, expiry] of this.ttl.entries()) {
            if (now > expiry) {
                this.delete(key);
            }
        }
    }

    // Limpar todo o cache
    clear() {
        this.cache.clear();
        this.ttl.clear();
    }

    // Obter tamanho do cache
    size() {
        return this.cache.size;
    }
}

// Criar instâncias globais
window.storage = new Storage();
window.cache = new Cache();

// Limpar cache expirado periodicamente
setInterval(() => {
    window.cache.cleanup();
}, 60000); // A cada minuto
