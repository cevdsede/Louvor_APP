// Sistema de API
class API {
    constructor() {
        this.baseURL = window.APP_CONFIG.API.BASE_URL;
        this.endpoints = window.APP_CONFIG.API.ENDPOINTS;
    }

    // Requisição genérica
    async request(endpoint, options = {}) {
        const url = this.baseURL + endpoint;
        
        try {
            // Tentar cache primeiro
            const cacheKey = `api_${endpoint}`;
            const cached = window.cache.get(cacheKey);
            if (cached && !options.skipCache) {
                return cached;
            }

            // Fazer requisição
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Salvar no cache
            if (!options.skipCache) {
                window.cache.set(cacheKey, data);
            }

            return data;

        } catch (error) {
            console.warn(`Erro na requisição para ${endpoint}:`, error);
            
            // Tentar usar cache offline
            const offlineData = this.getOfflineData(endpoint);
            if (offlineData) {
                console.log('Usando dados offline para:', endpoint);
                return offlineData;
            }

            // Retornar dados de exemplo
            return this.getFallbackData(endpoint);
        }
    }

    // Obter dados offline
    getOfflineData(endpoint) {
        const storageKeys = {
            [this.endpoints.ESCALAS]: window.APP_CONFIG.STORAGE.OFFLINE_ESCALAS,
            [this.endpoints.REPERTORIO]: window.APP_CONFIG.STORAGE.OFFLINE_REPERTORIO,
            [this.endpoints.LEMBRETES]: window.APP_CONFIG.STORAGE.OFFLINE_LEMBRETES
        };

        const storageKey = storageKeys[endpoint];
        return storageKey ? window.storage.get(storageKey) : null;
    }

    // Salvar dados offline
    saveOfflineData(endpoint, data) {
        const storageKeys = {
            [this.endpoints.ESCALAS]: window.APP_CONFIG.STORAGE.OFFLINE_ESCALAS,
            [this.endpoints.REPERTORIO]: window.APP_CONFIG.STORAGE.OFFLINE_REPERTORIO,
            [this.endpoints.LEMBRETES]: window.APP_CONFIG.STORAGE.OFFLINE_LEMBRETES
        };

        const storageKey = storageKeys[endpoint];
        if (storageKey) {
            window.storage.set(storageKey, data);
        }
    }

    // Dados de fallback
    getFallbackData(endpoint) {
        const fallbackData = {
            [this.endpoints.ESCALAS]: [
                {
                    "Nome dos Cultos": "Culto de Domingo",
                    "Data": new Date().toISOString().split('T')[0],
                    "Função": "Ministro",
                    "Nome": "Ministro Exemplo",
                    "Músicas": "Grande é o Senhor",
                    "Cantor": "Fernandinho",
                    "Tons": "G"
                }
            ],
            [this.endpoints.REPERTORIO]: [
                {
                    "Músicas": "Grande é o Senhor",
                    "Cantor": "Fernandinho",
                    "Tons": "G",
                    "Categoria": "Adoração"
                }
            ],
            [this.endpoints.LEMBRETES]: [
                {
                    "Data": new Date().toISOString().split('T')[0],
                    "Lembrete": "Ensaiar sábado às 15h",
                    "Prioridade": "Alta"
                }
            ]
        };

        return fallbackData[endpoint] || [];
    }

    // Métodos específicos
    async getEscalas() {
        const data = await this.request(this.endpoints.ESCALAS);
        this.saveOfflineData(this.endpoints.ESCALAS, data);
        return this.normalizeData(data, 'escala');
    }

    async getRepertorio() {
        const data = await this.request(this.endpoints.REPERTORIO);
        this.saveOfflineData(this.endpoints.REPERTORIO, data);
        return this.normalizeData(data, 'repertorio');
    }

    async getLembretes() {
        const data = await this.request(this.endpoints.LEMBRETES);
        this.saveOfflineData(this.endpoints.LEMBRETES, data);
        return this.normalizeData(data, 'lembrete');
    }

    // Normalizar dados
    normalizeData(data, type) {
        if (!Array.isArray(data)) {
            return [];
        }

        return data.map(item => {
            const normalized = { ...item };
            
            // Garantir campos obrigatórios
            if (type === 'escala') {
                normalized['Nome dos Cultos'] = item['Nome dos Cultos'] || 'Culto';
                normalized['Data'] = item['Data'] || new Date().toISOString().split('T')[0];
                normalized['Função'] = item['Função'] || 'Participante';
                normalized['Nome'] = item['Nome'] || 'Não informado';
            }
            
            return normalized;
        });
    }

    // Sincronizar todos os dados
    async syncAll() {
        try {
            const [escalas, repertorio, lembretes] = await Promise.all([
                this.getEscalas(),
                this.getRepertorio(),
                this.getLembretes()
            ]);

            return {
                escalas,
                repertorio,
                lembretes,
                synced: true,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Erro na sincronização:', error);
            return {
                escalas: this.getOfflineData(this.endpoints.ESCALAS) || [],
                repertorio: this.getOfflineData(this.endpoints.REPERTORIO) || [],
                lembretes: this.getOfflineData(this.endpoints.LEMBRETES) || [],
                synced: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Limpar cache
    clearCache() {
        window.cache.clear();
    }
}

// Criar instância global
window.api = new API();
