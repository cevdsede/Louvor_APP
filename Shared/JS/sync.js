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

        try {
            while (queue.length > 0) {
                const item = queue[0];
                console.log(`🔄 Sincronizando item ${item.id}... Restantes: ${queue.length}`);

                // CORREÇÃO DE EMERGÊNCIA: Injetar 'action' se estiver faltando
                if (item.data.sheet === 'Repertório_PWA' && !item.data.action) {
                    item.data.action = 'addRow';
                }

                // VALIDAÇÃO DE DUPLICATAS PARA REPERTÓRIO_PWA ANTES DE ENVIAR
                if (item.data.sheet === 'Repertório_PWA' && item.data.action === 'addRow') {
                    console.log("🔍 === VALIDAÇÃO DE DUPLICATAS NO SYNCMANAGER (REPERTÓRIO) ===");
                    
                    const cachedRepertorio = JSON.parse(localStorage.getItem('offline_repertorio') || '[]');
                    const r = item.data.data;
                    
                    console.log("Dados do item:", JSON.stringify(r, null, 2));
                    console.log("Cache do repertório:", cachedRepertorio.length, "itens");
                    
                    // Mostrar todos os itens do cache para debug
                    console.log("=== ITENS NO CACHE DO REPERTÓRIO ===");
                    cachedRepertorio.forEach((item, index) => {
                        console.log(`Item ${index + 1}:`, {
                            Músicas: item.Músicas,
                            Cantor: item.Cantor,
                            Culto: item.Culto,
                            Data: item.Data
                        });
                    });
                    
                    const rowMusica = String(r.Músicas || "").trim();
                    const rowCantor = String(r.Cantor || "").trim();
                    const rowCulto = String(r.Culto || "").trim();
                    const rowData = String(r.Data || "").trim();
                    
                    // Função para normalizar datas para comparação
                    const normalizarData = (dataStr) => {
                        if (!dataStr) return "";
                        
                        // Se já for formato ISO, remover timezone
                        if (dataStr.includes('T') && dataStr.includes('Z')) {
                            return dataStr.split('T')[0]; // "2026-02-01T08:00:00.000Z" → "2026-02-01"
                        }
                        
                        // Se for formato brasileiro "dd/mm/yyyy", converter para ISO
                        if (dataStr.includes('/')) {
                            const partes = dataStr.split('/');
                            if (partes.length === 3) {
                                const dia = partes[0].padStart(2, '0');
                                const mes = partes[1].padStart(2, '0');
                                const ano = partes[2];
                                return `${ano}-${mes}-${dia}`; // "01/02/2026" → "2026-02-01"
                            }
                        }
                        
                        // Se for formato ISO sem timezone
                        if (dataStr.includes('-') && dataStr.length === 10) {
                            return dataStr; // "2026-02-01"
                        }
                        
                        return dataStr; // Retorna original se não conseguir normalizar
                    };
                    
                    const rowDataNormalizada = normalizarData(rowData);
                    
                    console.log("Procurando por:", { rowMusica, rowCantor, rowCulto, rowData, rowDataNormalizada });
                    
                    const duplicata = cachedRepertorio.some((repItem, index) => {
                        const repMusica = String(repItem.Músicas || "").trim();
                        const repCantor = String(repItem.Cantor || "").trim();
                        const repCulto = String(repItem.Culto || "").trim();
                        const repData = String(repItem.Data || "").trim();
                        const repDataNormalizada = normalizarData(repData);
                        
                        const match = repMusica === rowMusica && 
                                     repCantor === rowCantor && 
                                     repCulto === rowCulto && 
                                     repDataNormalizada === rowDataNormalizada;
                        
                        console.log(`--- Comparando com item ${index + 1} ---`);
                        console.log("repMusica:", `"${repMusica}" vs rowMusica:`, `"${rowMusica}" =`, repMusica === rowMusica);
                        console.log("repCantor:", `"${repCantor}" vs rowCantor:`, `"${rowCantor}" =`, repCantor === rowCantor);
                        console.log("repCulto:", `"${repCulto}" vs rowCulto:`, `"${rowCulto}" =`, repCulto === rowCulto);
                        console.log("repData:", `"${repData}" (${repDataNormalizada}) vs rowData:`, `"${rowData}" (${rowDataNormalizada}) =`, repDataNormalizada === rowDataNormalizada);
                        console.log("Match final:", match);
                        
                        if (match) {
                            console.log(`🚫 DUPLICATA ENCONTRADA no item ${index + 1}:`, { repMusica, repCantor, repCulto, repData: repDataNormalizada });
                        }
                        
                        return match;
                    });
                    
                    if (duplicata) {
                        console.log("❌ ITEM BLOQUEADO - Duplicata encontrada no SyncManager");
                        
                        // Disparar evento para notificar o frontend
                        window.dispatchEvent(new CustomEvent('syncItemBlocked', {
                            detail: {
                                musica: rowMusica,
                                cantor: rowCantor,
                                culto: rowCulto,
                                data: rowData
                            }
                        }));
                        
                        // Remove item da fila sem enviar ao servidor
                        queue.shift();
                        localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
                        console.log("✅ Item duplicado removido da fila");
                        continue; // Pula para o próximo item
                    }
                    
                    console.log("✅ Item aprovado - Sem duplicatas no cache local");
                }

                // VALIDAÇÃO DE DUPLICATAS PARA HISTÓRICO ANTES DE ENVIAR
                if (item.data.action === 'addHistory') {
                    console.log("🔍 === VALIDAÇÃO DE DUPLICATAS NO SYNCMANAGER (HISTÓRICO) ===");
                    
                    const cachedHistorico = JSON.parse(localStorage.getItem('offline_historico') || '[]');
                    const musicaCantor = String(item.data.musicaCantor || "").trim();
                    
                    console.log("Música-Cantor:", musicaCantor);
                    console.log("Cache do histórico:", cachedHistorico.length, "itens");
                    
                    const duplicata = cachedHistorico.some((histItem, index) => {
                        // Tentar acessar como array (índice 1 = "Musica - Cantor")
                        let itemMusicaCantor = "";
                        if (Array.isArray(histItem)) {
                            itemMusicaCantor = String(histItem[1] || "").trim();
                        } else {
                            // Tentar acessar como objeto
                            itemMusicaCantor = String(histItem["Musica - Cantor"] || "").trim();
                        }
                        
                        const match = itemMusicaCantor === musicaCantor;
                        
                        console.log(`--- Comparando com item ${index + 1} ---`);
                        console.log("itemMusicaCantor:", `"${itemMusicaCantor}" vs musicaCantor:`, `"${musicaCantor}" =`, match);
                        
                        if (match) {
                            console.log(`🚫 DUPLICATA ENCONTRADA no item ${index + 1}:`, { itemMusicaCantor });
                        }
                        
                        return match;
                    });
                    
                    if (duplicata) {
                        console.log("❌ ITEM BLOQUEADO - Duplicata encontrada no histórico");
                        
                        // Disparar evento para notificar o frontend
                        window.dispatchEvent(new CustomEvent('syncItemBlocked', {
                            detail: {
                                musica: musicaCantor,
                                cantor: '',
                                culto: '',
                                data: ''
                            }
                        }));
                        
                        // Remove item da fila sem enviar ao servidor
                        queue.shift();
                        localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
                        console.log("✅ Item duplicado removido da fila");
                        continue; // Pula para o próximo item
                    }
                    
                    console.log("✅ Item aprovado - Sem duplicatas no cache local");
                }

                try {
                    const response = await fetch(APP_CONFIG.SCRIPT_URL, {
                        method: 'POST',
                        body: JSON.stringify(item.data)
                    });
                    const res = await response.json();

                    if (res.status === "success" || res.status === "warning" || res.status === "error") {
                        if (res.status === "error") console.error("Erro no servidor:", res.message);
                        if (res.status === "warning") console.warn("Aviso do servidor:", res.message);

                        // Se for addHistory bem-sucedido, atualizar cache local do histórico
                        if (item.data.action === "addHistory" && (res.status === "success" || res.status === "warning")) {
                            try {
                                // Buscar histórico atualizado do servidor
                                const histResponse = await fetch(APP_CONFIG.SCRIPT_URL + "?sheet=Historico de Músicas");
                                const histJson = await histResponse.json();
                                localStorage.setItem('offline_historico', JSON.stringify(histJson.data || []));
                                console.log("📝 Cache do histórico atualizado após sync");
                            } catch (histError) {
                                console.warn("Não foi possível atualizar cache do histórico:", histError);
                            }
                        }

                        // Se for Repertório_PWA bem-sucedido ou com aviso, atualizar cache local
                        if ((item.data.sheet === "Repertório_PWA" || item.data.sheet === "Repertorio_PWA") && 
                            (res.status === "success" || res.status === "warning")) {
                            try {
                                // Buscar repertório atualizado do servidor
                                const repResponse = await fetch(APP_CONFIG.SCRIPT_URL + "?sheet=Repertório_PWA");
                                const repJson = await repResponse.json();
                                localStorage.setItem('offline_repertorio', JSON.stringify(repJson.data || []));
                                console.log("📝 Cache do repertório atualizado após sync");
                            } catch (repError) {
                                console.warn("Não foi possível atualizar cache do repertório:", repError);
                            }
                        }

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