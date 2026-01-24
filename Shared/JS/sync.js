/**
 * Gerenciador de Sincronização Offline (sync.js)
 * v2.0 - Adicionado suporte a Periodic Background Sync
 */

const SyncManager = {
    QUEUE_KEY: 'sync_queue',
    PERIODIC_TAG: 'update-louvor-data',

    // --- CÓDIGO ORIGINAL REFORMULADO ---
    addToQueue(data) {
        let queue = this.getQueue();
        queue.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            data: data
        });
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

        try {
            while (queue.length > 0) {
                const item = queue[0];
                console.log(`🔄 Sincronizando item ${item.id}... Restantes: ${queue.length}`);

                // CORREÇÃO DE EMERGÊNCIA: Injetar 'action' se estiver faltando
                if (item.data.sheet === 'Repertório_PWA' && !item.data.action) {
                    item.data.action = 'addRow';
                }

                try {
                    const response = await fetch(APP_CONFIG.SCRIPT_URL, {
                        method: 'POST',
                        body: JSON.stringify(item.data)
                    });
                    const res = await response.json();

                    if (res.status === "success" || res.status === "error") {
                        if (res.status === "error") console.error("Erro no servidor:", res.message);

                        // Remove item processado
                        queue.shift();
                        localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
                        console.log("✅ Item processado com sucesso.");
                    } else {
                        throw new Error("Resposta inválida");
                    }
                } catch (e) {
                    console.error("❌ Falha no item, removendo para não travar fila:", e);
                    queue.shift();
                    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
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
        try {
            const endpoints = [
                { key: 'offline_escala', sheet: 'Transformar' },
                { key: 'offline_repertorio', sheet: 'Repertório_PWA' },
                { key: 'offline_musicas', sheet: 'Musicas' },
                { key: 'offline_lembretes', sheet: 'Lembretes' },
                { key: 'offline_consagracao', sheet: 'Consagração' },
                { key: 'offline_chamada', sheet: 'Comp_Cons' }
            ];

            for (const item of endpoints) {
                const res = await fetch(`${APP_CONFIG.SCRIPT_URL}?sheet=${item.sheet}`);
                const json = await res.json();
                localStorage.setItem(item.key, JSON.stringify(json.data));
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
            data.push(payload);
        } else if (action === 'remove' || action === 'delete') {
            // Implementação genérica de remoção, assumindo que payload tenha id ou campos únicos
            // Para Repertorio, talvez remover pelo ID ou combinação
            // Simplificado para 'add' por enquanto pois é o uso principal
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