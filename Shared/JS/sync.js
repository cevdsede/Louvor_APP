/**
 * Gerenciador de Sincronização Offline (sync.js)
 * v2.0 - Adicionado suporte a Periodic Background Sync
 */

const SyncManager = {
    QUEUE_KEY: 'sync_queue',
    PERIODIC_TAG: 'update-louvor-data',

    // --- CÓDIGO ORIGINAL REFORMULADO ---
    addToQueue(data) {
        console.log("📤 === ITEM ADICIONADO À FILA ===");
        console.log("Dados recebidos:", JSON.stringify(data, null, 2));
        console.log("Timestamp:", new Date().toISOString());

        let queue = this.getQueue();
        console.log("Itens na fila antes de adicionar:", queue.length);

        // Verificar se já existe um item idêntico na fila
        const itemDuplicado = queue.find(existingItem => {
            // Acessar dados corretamente (estão aninhados em data.data)
            const existingSheet = existingItem.data.data?.sheet || existingItem.data.sheet;
            const existingAction = existingItem.data.data?.action || existingItem.data.action;
            const newSheet = data.data?.sheet || data.sheet;
            const newAction = data.data?.action || data.action;

            if (existingSheet === newSheet && existingAction === newAction) {
                if (newSheet === 'Repertório_PWA' && newAction === 'addRow') {
                    const existing = existingItem.data.data || existingItem.data;
                    const novo = data.data || data;

                    return String(existing.Músicas || "").trim() === String(novo.Músicas || "").trim() &&
                        String(existing.Cantor || "").trim() === String(novo.Cantor || "").trim() &&
                        String(existing.Culto || "").trim() === String(novo.Culto || "").trim() &&
                        String(existing.Data || "").trim() === String(novo.Data || "").trim();
                }
            }
            return false;
        });

        if (itemDuplicado) {
            console.log("🚫 ITEM DUPLICADO NA FILA - Não adicionando");
            console.log("Item existente:", JSON.stringify(itemDuplicado, null, 2));
            return;
        }

        queue.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            data: data
        });

        console.log("Item adicionado com ID:", queue[queue.length - 1].id);
        console.log("Total de itens na fila após adicionar:", queue.length);

        localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
        this.processQueue();
    },

    getQueue() {
        return JSON.parse(localStorage.getItem(this.QUEUE_KEY) || '[]');
    },

    async processQueue() {
        if (!navigator.onLine || this.isProcessing) return;

        let queue = this.getQueue();
        if (queue.length === 0) return;

        this.isProcessing = true;

        const SUPABASE_URL = APP_CONFIG.SUPABASE_URL;
        const SUPABASE_KEY = APP_CONFIG.SUPABASE_KEY;

        try {
            while (queue.length > 0) {
                const item = queue[0];
                console.log(`🔄 Sincronizando item ${item.id}... Restantes: ${queue.length}`);

                const data = item.data;
                const action = data.action || (data.data?.action);
                const sheet = data.sheet || (data.data?.sheet);

                // Mapeamento Planilha -> Tabela
                let table = '';
                if (sheet === 'Repertório_PWA' || sheet === 'Repertorio_PWA') table = 'repertorio';
                else if (sheet === 'Lembretes') table = 'lembretes';
                else if (sheet === 'Musicas') table = 'musicas';
                else if (sheet === 'Transformar') table = 'escalas';
                else if (sheet === 'Consagração') table = 'consagracao';
                else if (sheet === 'Comp_Cons') table = 'presenca_consagracao';
                else if (action === 'addHistory') table = 'historico_musicas';

                if (!table) {
                    console.warn("Tabela não mapeada para sync:", sheet, action);
                    queue.shift();
                    continue;
                }

                try {
                    let response;
                    const headers = {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    };

                    if (action === 'addRow' || action === 'add' || action === 'addHistory') {
                        // INSERT
                        let payload = data.data || data;
                        // Limpeza de campos legados se necessário
                        delete payload.sheet;
                        delete payload.action;

                        // MAPEAMENTO AUTOMÁTICO: Converter chaves para minúsculo para Supabase
                        const normalizedPayload = {};
                        Object.keys(payload).forEach(key => {
                            // Mapeamentos específicos para compatibilidade com Schema Supabase
                            let normalizedKey = key.toLowerCase()
                                .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos

                            if (normalizedKey === 'musicas') normalizedKey = 'musica';
                            if (normalizedKey === 'tons') normalizedKey = 'tom';

                            normalizedPayload[normalizedKey] = payload[key];
                        });

                        response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify(normalizedPayload)
                        });
                    } else if (action === 'delete' || action === 'deleteEvent') {
                        // DELETE
                        const filters = data.data || data;
                        let query = "";

                        // Converter filtros para minúsculo e montar query string
                        Object.keys(filters).forEach((key, index) => {
                            if (key === 'sheet' || key === 'action') return;

                            let normalizedKey = key.toLowerCase()
                                .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                            if (normalizedKey === 'musicas') normalizedKey = 'musica';
                            if (normalizedKey === 'tons') normalizedKey = 'tom';

                            query += `${index === 0 ? '' : '&'}${normalizedKey}=eq.${encodeURIComponent(filters[key])}`;
                        });

                        response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
                            method: 'DELETE',
                            headers
                        });
                    }

                    if (response && response.ok) {
                        console.log("✅ Item processado com sucesso em Supabase.");
                        queue.shift();
                    } else {
                        const errorText = await response.text();
                        console.error("❌ Erro no sync Supabase:", errorText);
                        // Se for erro de validação ou algo permanente, removemos para não travar
                        if (response.status === 400 || response.status === 404) {
                            queue.shift();
                        } else {
                            break; // Tenta depois
                        }
                    }
                    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
                } catch (e) {
                    console.error("❌ Falha na conexão durante sync:", e);
                    break;
                }
            }
            console.log("🏁 Sincronização da fila concluída.");
            window.dispatchEvent(new CustomEvent('syncCompleted'));
        } finally {
            this.isProcessing = false;
        }
    },

    // --- NOVA LÓGICA: PERIODIC BACKGROUND SYNC ---

    /**
     * Registra a sincronização periódica no navegador
     */
    async registerPeriodicSync() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;

                // Verifica se o navegador suporta periodicSync
                if ('periodicSync' in registration) {
                    try {
                        await registration.periodicSync.register(this.PERIODIC_TAG, {
                            minInterval: 12 * 60 * 60 * 1000 // 12 horas
                        });
                        console.log("Periodic Sync registrado!");
                    } catch (error) {
                        console.log("Periodic Sync não pôde ser registrado: ", error);
                    }
                }
            } catch (e) {
                console.log("Service Worker não está pronto.");
            }
        }
    },

    /**
     * Método chamado pelo Service Worker para atualizar o cache
     * Esta função deve ser exportada ou acessível pelo worker
     */
    async performFullFetch() {
        console.log("Executando fetch completo em segundo plano...");
        const SUPABASE_URL = APP_CONFIG.SUPABASE_URL;
        const SUPABASE_KEY = APP_CONFIG.SUPABASE_KEY;

        const fetchFromSupabase = async (table) => {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });
            return await res.json();
        };

        try {
            const endpoints = [
                { key: 'offline_escala', table: 'escalas' },
                { key: 'offline_repertorio', table: 'repertorio' },
                { key: 'offline_musicas', table: 'musicas' },
                { key: 'offline_lembretes', table: 'lembretes' },
                { key: 'offline_componentes', table: 'membros' }
            ];

            for (const item of endpoints) {
                const data = await fetchFromSupabase(item.table);
                localStorage.setItem(item.key, JSON.stringify(data));
            }

            localStorage.setItem('last_full_sync', new Date().toISOString());
            return true;
        } catch (e) {
            return false;
        }
    },

    // Helper original mantido
    updateLocalCache(sheet, action, payload) {
        let key = '';
        // Mapeamento Nome da Planilha -> Chave do LocalStorage
        if (sheet === 'Repertório_PWA' || sheet === 'Repertório') key = 'offline_repertorio';
        else if (sheet === 'Lembretes') key = 'offline_lembretes';
        else if (sheet === 'Musicas') key = 'offline_musicas';
        else if (sheet === 'Transformar') key = 'offline_escala';
        else return;

        let data = JSON.parse(localStorage.getItem(key) || '[]');

        if (action === 'add') {
            // NÃO adicionar Repertório_PWA automaticamente ao cache
            // Deixe o servidor validar duplicatas primeiro
            if (sheet !== 'Repertório_PWA' && sheet !== 'Repertório') {
                data.push(payload);
            }
        } else if (action === 'remove' || action === 'delete') {
            // Implementação específica para cada tipo de exclusão
            if (sheet === 'Repertório_PWA' || sheet === 'Repertório') {
                // Para Repertório, remover por combinação de Músicas + Culto + Data
                data = data.filter(item => {
                    const itemMusica = String(item.Músicas || "").trim();
                    const itemCulto = String(item.Culto || "").trim();
                    const itemData = String(item.Data || "").trim();

                    const payloadMusica = String(payload.Músicas || "").trim();
                    const payloadCulto = String(payload.Culto || "").trim();
                    const payloadData = String(payload.Data || "").trim();

                    return !(itemMusica === payloadMusica &&
                        itemCulto === payloadCulto &&
                        itemData === payloadData);
                });
            } else if (sheet === 'Lembretes') {
                // Para Lembretes, remover por id_Lembrete
                data = data.filter(item => item.id_Lembrete !== payload.id_Lembrete);
            }
        }

        localStorage.setItem(key, JSON.stringify(data));
    }
};

// Monitora volta da conexão
window.addEventListener('online', () => SyncManager.processQueue());

// Inicialização
window.addEventListener('load', () => {
    SyncManager.processQueue();
    // Tenta registrar o periodic sync sempre que o app carregar
    SyncManager.registerPeriodicSync();
});