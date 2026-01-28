// Sistema de Gerenciamento de Estado Global
class Store {
    constructor(initialState = {}) {
        this.state = { ...initialState };
        this.listeners = new Map();
        this.middleware = [];
        this.history = [];
        this.maxHistorySize = 50;
    }

    // Adicionar middleware
    use(middleware) {
        this.middleware.push(middleware);
    }

    // Obter estado
    getState(key = null) {
        if (key) {
            return this.getNestedValue(this.state, key);
        }
        return { ...this.state };
    }

    // Definir estado
    setState(key, value) {
        const prevState = { ...this.state };
        
        // Aplicar middleware
        let nextState = { ...prevState };
        const action = { type: 'SET_STATE', key, value };
        
        for (const middleware of this.middleware) {
            nextState = middleware(nextState, action) || nextState;
        }

        // Atualizar estado
        this.setNestedValue(nextState, key, value);
        this.state = nextState;

        // Salvar no histórico
        this.saveHistory(prevState, action);

        // Notificar listeners
        this.notifyListeners(key, value, prevState[key]);

        // Persistir se necessário
        this.persistState(key, value);
    }

    // Atualizar estado com função
    updateState(key, updater) {
        const currentValue = this.getState(key);
        const newValue = typeof updater === 'function' 
            ? updater(currentValue) 
            : updater;
        this.setState(key, newValue);
    }

    // Assinar mudanças
    subscribe(key, callback, options = {}) {
        const id = Date.now() + Math.random();
        
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }

        this.listeners.get(key).push({
            id,
            callback,
            immediate: options.immediate || false,
            deep: options.deep || false
        });

        // Executar imediatamente se solicitado
        if (options.immediate) {
            const currentValue = this.getState(key);
            callback(currentValue, currentValue);
        }

        // Retornar função de unsubscribe
        return () => {
            const keyListeners = this.listeners.get(key);
            if (keyListeners) {
                const index = keyListeners.findIndex(l => l.id === id);
                if (index > -1) {
                    keyListeners.splice(index, 1);
                }
            }
        };
    }

    // Assinar múltiplas chaves
    subscribeMultiple(keys, callback, options = {}) {
        const unsubscribers = keys.map(key => 
            this.subscribe(key, callback, options)
        );

        return () => {
            unsubscribers.forEach(unsubscribe => unsubscribe());
        };
    }

    // Notificar listeners
    notifyListeners(key, newValue, prevValue) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(listener => {
                try {
                    listener.callback(newValue, prevValue);
                } catch (error) {
                    console.error('Error in store listener:', error);
                }
            });
        }

        // Notificar listeners de deep subscription
        if (key.includes('.')) {
            const parentKey = key.split('.')[0];
            const parentListeners = this.listeners.get(parentKey);
            if (parentListeners) {
                parentListeners
                    .filter(listener => listener.deep)
                    .forEach(listener => {
                        try {
                            listener.callback(this.getState(parentKey), this.getState(parentKey));
                        } catch (error) {
                            console.error('Error in deep store listener:', error);
                        }
                    });
            }
        }
    }

    // Limpar estado
    clearState() {
        const prevState = { ...this.state };
        this.state = {};
        this.listeners.clear();
        this.history = [];
        localStorage.removeItem('app_state');
    }

    // Resetar estado para valor inicial
    resetState(key = null) {
        if (key) {
            const initialValue = this.getInitialState(key);
            this.setState(key, initialValue);
        } else {
            this.state = { ...this.getInitialState() };
            this.notifyAllListeners();
        }
    }

    // Obter valor inicial
    getInitialState(key = null) {
        // Implementar conforme necessário
        return null;
    }

    // Salvar no histórico
    saveHistory(prevState, action) {
        this.history.push({
            timestamp: Date.now(),
            action,
            prevState: { ...prevState },
            nextState: { ...this.state }
        });

        // Limitar tamanho do histórico
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    // Desfazer última ação
    undo() {
        if (this.history.length === 0) return false;

        const lastEntry = this.history.pop();
        this.state = { ...lastEntry.prevState };
        this.notifyAllListeners();

        return true;
    }

    // Obter histórico
    getHistory() {
        return [...this.history];
    }

    // Persistir estado no localStorage
    persistState(key, value) {
        const persistKeys = ['user', 'theme', 'settings'];
        
        if (persistKeys.includes(key)) {
            try {
                const currentState = localStorage.getItem('app_state') 
                    ? JSON.parse(localStorage.getItem('app_state')) 
                    : {};
                currentState[key] = value;
                localStorage.setItem('app_state', JSON.stringify(currentState));
            } catch (error) {
                console.error('Error persisting state:', error);
            }
        }
    }

    // Carregar estado persistido
    loadPersistedState() {
        try {
            const persisted = localStorage.getItem('app_state');
            if (persisted) {
                const state = JSON.parse(persisted);
                Object.keys(state).forEach(key => {
                    this.setState(key, state[key]);
                });
            }
        } catch (error) {
            console.error('Error loading persisted state:', error);
        }
    }

    // Notificar todos os listeners
    notifyAllListeners() {
        this.listeners.forEach((keyListeners, key) => {
            const value = this.getState(key);
            keyListeners.forEach(listener => {
                try {
                    listener.callback(value, value);
                } catch (error) {
                    console.error('Error in store listener:', error);
                }
            });
        });
    }

    // Utilitários para valores aninhados
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    // Debug: imprimir estado atual
    debug() {
        console.group('Store State');
        console.log('Current State:', this.state);
        console.log('Listeners:', Array.from(this.listeners.entries()).map(([key, listeners]) => ({
            key,
            count: listeners.length
        })));
        console.log('History Size:', this.history.length);
        console.groupEnd();
    }
}

// Middleware útil para logging
const loggingMiddleware = (state, action) => {
    console.log(`Store Action: ${action.type}`, {
        key: action.key,
        value: action.value,
        timestamp: new Date().toISOString()
    });
    return state;
};

// Middleware para validação
const validationMiddleware = (schema) => (state, action) => {
    if (schema[action.key]) {
        const isValid = schema[action.key](action.value);
        if (!isValid) {
            console.warn(`Invalid value for ${action.key}:`, action.value);
            return state; // Não aplicar mudança inválida
        }
    }
    return state;
};

// Criar store global com estado inicial
const initialState = {
    user: null,
    theme: 'light',
    loading: false,
    error: null,
    escalas: [],
    musicas: [],
    componentes: [],
    notifications: [],
    settings: {
        autoSync: true,
        notifications: true,
        theme: 'light'
    }
};

// Instanciar store global
window.store = new Store(initialState);

// Adicionar middleware
window.store.use(loggingMiddleware);

// Carregar estado persistido
window.store.loadPersistedState();

// Criar store específico para módulos
class ModuleStore extends Store {
    constructor(moduleName, initialState = {}) {
        super(initialState);
        this.moduleName = moduleName;
    }

    // Namespace para keys
    namespacedKey(key) {
        return `${this.moduleName}.${key}`;
    }

    // Sobrescrever setState para usar namespace
    setState(key, value) {
        const namespacedKey = this.namespacedKey(key);
        super.setState(namespacedKey, value);
    }

    // Sobrescrever getState para usar namespace
    getState(key = null) {
        const namespacedKey = key ? this.namespacedKey(key) : null;
        return super.getState(namespacedKey);
    }

    // Assinar com namespace automático
    subscribe(key, callback, options = {}) {
        const namespacedKey = this.namespacedKey(key);
        return super.subscribe(namespacedKey, callback, options);
    }
}

// Funções utilitárias globais
window.createStore = (initialState) => new Store(initialState);
window.createModuleStore = (moduleName, initialState) => new ModuleStore(moduleName, initialState);

// Exportar classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Store, ModuleStore };
}
