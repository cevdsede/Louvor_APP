async function carregarRepertorio(force = false) {
    const container = document.getElementById('repertorioAgrupado');
    const loader = document.getElementById('loader');
    const cached = localStorage.getItem('offline_repertorio');

    // Função auxiliar para parse seguro
    function safeParse(jsonString, fallback = []) {
        try {
            if (!jsonString || jsonString === "undefined" || jsonString === "null") return fallback;
            return JSON.parse(jsonString);
        } catch (e) {
            console.warn("JSON Parse Error:", e);
            return fallback;
        }
    }

    // Se tem cache e não é forçado, renderiza e busca em silêncio
    if (!force && cached) {
        render(safeParse(cached));
        setTimeout(() => silentSync(), 500);
        return;
    }

    const btnIcon = document.querySelector('.nav-btn.fa-sync-alt, .header-right-nav i.fa-sync-alt, .header-right i.fa-sync-alt');
    if (btnIcon) btnIcon.classList.add('fa-spin');

    try {
        let data;
        
        try {
            const response = await fetch(APP_CONFIG.SCRIPT_URL + "?sheet=Repertório_PWA");
            const json = await response.json();
            data = json.data;
            localStorage.setItem('offline_repertorio', JSON.stringify(data));
        } catch (corsError) {
            console.warn('CORS bloqueou carregamento, usando cache local:', corsError);
            
            if (cached) {
                data = safeParse(cached);
            } else {
                // Se não tiver cache, criar dados de exemplo
                data = [{
                    "Músicas": "Grande é o Senhor",
                    "Cantor": "Fernandinho",
                    "Tons": "G",
                    "Culto": "Culto de Domingo",
                    "Data": new Date().toISOString().split('T')[0],
                    "Ministro": "Ministro Exemplo"
                }];
                localStorage.setItem('offline_repertorio', JSON.stringify(data));
            }
        }
        
        render(data);
        if (loader) loader.style.display = 'none';
        
        // Toast de sucesso apenas quando for sincronização manual (force = true)
        if (force) {
            showToast("Repertório sincronizado com sucesso!", 'success');
        }
    } catch (e) {
        if (cached) {
            render(safeParse(cached));
        } else {
            console.error(e);
            if (loader) loader.innerText = "Erro ao carregar dados.";
            showToast("Erro ao sincronizar repertório.", 'error');
        }
    } finally {
        if (btnIcon) btnIcon.classList.remove('fa-spin');
        if (loader) loader.style.display = 'none';
    }
}

async function silentSync() {
    try {
        let data;
        
        try {
            // Tentar carregar online
            const response = await fetch(APP_CONFIG.SCRIPT_URL + "?sheet=Repertório_PWA");
            const json = await response.json();
            data = json.data;
            localStorage.setItem('offline_repertorio', JSON.stringify(data));
        } catch (corsError) {
            // Se CORS bloquear, usar cache local
            console.warn('CORS bloqueou sync, usando cache local:', corsError);
            
            const cachedRepertorio = localStorage.getItem('offline_repertorio');
            if (cachedRepertorio) {
                data = safeParse(cachedRepertorio);
            } else {
                // Se não tiver cache, criar dados de exemplo
                console.warn('Sem cache local, criando dados de exemplo');
                data = [{
                    "Músicas": "Grande é o Senhor",
                    "Cantor": "Fernandinho",
                    "Tons": "G",
                    "Culto": "Culto de Domingo",
                    "Data": new Date().toISOString().split('T')[0],
                    "Ministro": "Ministro Exemplo"
                }];
                localStorage.setItem('offline_repertorio', JSON.stringify(data));
            }
        }

        // Só renderiza se não houver busca ativa E nenhum item aberto (para não fechar na cara do usuário)
        const hasActiveItems = document.querySelector('.active') !== null;
        if (SyncManager.getQueue().length === 0 && !hasActiveItems) {
            render(data);
        }
    } catch (e) { 
        console.log("Silent sync failed - usando apenas cache local");
        // Tentar renderizar com cache existente como último recurso
        try {
            const cachedRepertorio = localStorage.getItem('offline_repertorio');
            if (cachedRepertorio) {
                render(safeParse(cachedRepertorio));
            }
        } catch (renderError) {
            console.error("Falha total ao renderizar:", renderError);
        }
    }
}

// Ouvinte para re-renderizar quando a sincronização terminar
window.addEventListener('syncCompleted', () => carregarRepertorio());

// Monitora conclusão de sincronização para atualizar caches
window.addEventListener('syncCompleted', async () => {
    try {
        // Tentar atualizar cache do repertório
        const repResponse = await fetch(APP_CONFIG.SCRIPT_URL + "?sheet=Repertório_PWA");
        const repJson = await repResponse.json();
        localStorage.setItem('offline_repertorio', JSON.stringify(repJson.data || []));
        console.log("📝 Cache do repertório atualizado após sync concluído");
        
        // Tentar atualizar cache do histórico
        const histResponse = await fetch(APP_CONFIG.SCRIPT_URL + "?sheet=Historico de Músicas");
        const histJson = await histResponse.json();
        localStorage.setItem('offline_historico', JSON.stringify(histJson.data || []));
        console.log("📝 Cache do histórico atualizado após sync concluído (repertório)");
    } catch (e) {
        console.warn("Não foi possível atualizar caches após sync (repertório):", e);
        // Se falhar, pelo menos recarrega a página para mostrar mudanças
        setTimeout(() => carregarRepertorio(true), 1000);
    }
});

function render(data) {
    const container = document.getElementById('repertorioAgrupado');
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="loading">Nenhum repertório encontrado.</div>';
        return;
    }

    const dadosOrdenados = data.sort((a, b) => new Date(b.Data) - new Date(a.Data));
    const grupos = {};
    dadosOrdenados.forEach(item => {
        const chave = item["Culto+Data"];
        if (!grupos[chave]) {
            grupos[chave] = { nome: item.Culto, dataFull: item.Data, musicas: [] };
        }
        grupos[chave].musicas.push(item);
    });

    container.innerHTML = '';

    for (let chave in grupos) {
        const grupo = grupos[chave];
        const d = new Date(grupo.dataFull);
        const dataFmt = ("0" + d.getUTCDate()).slice(-2) + "/" + ("0" + (d.getUTCMonth() + 1)).slice(-2) + "/" + d.getUTCFullYear();

        const section = document.createElement('div');
        section.className = 'culto-group';

        // Forma segura de armazenar os dados para o botão Add All (igual escalas.js)
        section.dataset.musicas = JSON.stringify(grupo.musicas.map(m => ({
            musicaCantor: `${m.Músicas} - ${m.Cantor}`,
            ministro: m.Ministro || "Líder não definido",
            tom: m.Tons || "--"
        })));

        section.innerHTML = `
        <div class="culto-header">
          <div class="header-left" onclick="toggleAccordion(this)">
            <span class="data-badge">${dataFmt}</span>
            <h3>${grupo.nome}</h3>
          </div>
          <div class="header-right">
            <button class="btn-add-all" onclick="processarBulk(this)">
              <i class="fas fa-plus-circle"></i> <span>Add Histórico</span>
            </button>
            <i class="fas fa-chevron-down arrow-icon" onclick="toggleAccordion(this)"></i>
          </div>
        </div>
        <div class="culto-body">
          ${grupo.musicas.map(m => `
            <div class="musica-item">
              <div class="m-nome">${m.Músicas} - ${m.Cantor}</div>
              <div class="m-tom"><span>${m.Tons || '--'}</span></div>
              <div class="m-ministro"><i class="fas fa-user"></i> ${m.Ministro}</div>
              <div class="actions">
                <button class="btn-action btn-history" onclick="addHistorico(this, '${m.Músicas.replace(/'/g, "\\'")}', '${m.Cantor.replace(/'/g, "\\'")}', '${m.Tons || "--"}', '${m.Ministro || "Líder não definido"}')">
                  <i class="fas fa-bookmark"></i>
                </button>
                <button class="btn-action btn-delete" onclick="excluir('${m.Músicas.replace(/'/g, "\\'")}', '${grupo.nome.replace(/'/g, "\\'")}|${grupo.dataFull}', '${m.Cantor.replace(/'/g, "\\'")}')">  
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
        container.appendChild(section);
    }
}

// Nova função para o botão Add All ler os dados do dataset
function processarBulk(btn) {
    const section = btn.closest('.culto-group');
    const musicas = section.dataset.musicas;
    addBulkHistorico(btn, musicas);
}
function toggleAccordion(el) {
    el.closest('.culto-group').classList.toggle('active');
}

async function addHistorico(btn, musica, cantor, tom, ministro) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    try {
        // Verificação local de duplicatas
        const cachedHistorico = JSON.parse(localStorage.getItem('offline_historico') || '[]');
        const musicaCantor = `${musica} - ${cantor}`;
        
        // Verificar se já existe no histórico local
        const duplicataLocal = cachedHistorico.some(item => {
            // Tentar acessar como array (índice 1 = "Musica - Cantor")
            let itemMusicaCantor = "";
            if (Array.isArray(item)) {
                itemMusicaCantor = String(item[1] || "").trim();
            } else {
                // Tentar acessar como objeto
                itemMusicaCantor = String(item["Musica - Cantor"] || "").trim();
            }
            return itemMusicaCantor === musicaCantor;
        });
        
        if (duplicataLocal) {
            if (typeof showToast === 'function') {
                showToast(`⚠️ "${musicaCantor}" já está no histórico!`, 'warning', 4000);
            }
            btn.innerHTML = '<i class="fas fa-bookmark"></i>';
            btn.disabled = false;
            return;
        }
        
        // Criar payload para SyncManager
        const payload = {
            action: "addHistory",
            musicaCantor: musicaCantor,
            ministro: ministro || "Líder não definido",
            tom: tom || "--"
        };
        
        // Adicionar ao SyncManager
        SyncManager.addToQueue(payload);
        
        // Feedback de sucesso
        if (typeof showToast === 'function') {
            showToast(`✅ "${musicaCantor}" adicionado ao histórico!`, 'success', 3000);
        }
        
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.classList.add('saved');
        
    } catch (e) {
        console.error("Erro ao adicionar ao histórico:", e);
        if (typeof showToast === 'function') {
            showToast("❌ Erro ao adicionar ao histórico", 'error', 3000);
        }
        btn.innerHTML = '<i class="fas fa-bookmark"></i>';
        btn.disabled = false;
    }
}

async function addBulkHistorico(btn, jsonStr) {
    const confirmed = await showConfirmModal(
        "Adicionar todas as músicas ao histórico? (Duplicatas serão ignoradas)",
        "Adicionar",
        "Cancelar"
    );
    if (!confirmed) return;

    const lista = JSON.parse(jsonStr);
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    // Validação local de duplicatas APENAS no histórico
    const cachedHistorico = JSON.parse(localStorage.getItem('offline_historico') || '[]');
    
    let musicasParaAdicionar = [];
    let duplicatasEncontradas = 0;
    let errosEncontrados = 0;

    // Processar cada música
    for (const item of lista) {
        try {
            const musicaCantor = String(item.musicaCantor || "").trim();
            
            if (!musicaCantor) {
                errosEncontrados++;
                continue;
            }
            
            // Verificar se já existe no histórico local
            const duplicataLocal = cachedHistorico.some(historicoItem => {
                // Tentar acessar como array (índice 1 = "Musica - Cantor")
                let itemMusicaCantor = "";
                if (Array.isArray(historicoItem)) {
                    itemMusicaCantor = String(historicoItem[1] || "").trim();
                } else {
                    // Tentar acessar como objeto
                    itemMusicaCantor = String(historicoItem["Musica - Cantor"] || "").trim();
                }
                return itemMusicaCantor === musicaCantor;
            });
            
            if (duplicataLocal) {
                duplicatasEncontradas++;
                console.log(`⚠️ Duplicata encontrada no histórico: ${musicaCantor}`);
            } else {
                // Adicionar à lista para processamento
                musicasParaAdicionar.push({
                    action: "addHistory",
                    musicaCantor: musicaCantor,
                    ministro: item.ministro || "Líder não definido",
                    tom: item.tom || "--"
                });
            }
        } catch (e) {
            console.error("Erro ao processar item:", item, e);
            errosEncontrados++;
        }
    }

    // Feedback inicial
    if (musicasParaAdicionar.length === 0 && duplicatasEncontradas > 0) {
        if (typeof showToast === 'function') {
            showToast(`📝 Todas as ${duplicatasEncontradas} música(s) já estão no histórico!`, 'info', 4000);
        }
        btn.innerHTML = original;
        btn.disabled = false;
        return;
    }

    // Adicionar todas as músicas ao SyncManager
    try {
        musicasParaAdicionar.forEach(payload => {
            SyncManager.addToQueue(payload);
        });
        
        // Feedback detalhado
        let mensagemFinal = "";
        if (musicasParaAdicionar.length > 0) {
            mensagemFinal += `✅ ${musicasParaAdicionar.length} música(s) adicionada(s) ao histórico! `;
        }
        if (duplicatasEncontradas > 0) {
            mensagemFinal += `⚠️ ${duplicatasEncontradas} duplicata(s) no histórico ignorada(s). `;
        }
        if (errosEncontrados > 0) {
            mensagemFinal += `❌ ${errosEncontrados} erro(s) encontrado(s).`;
        }
        
        if (typeof showToast === 'function') {
            const toastType = musicasParaAdicionar.length > 0 ? 'success' : (duplicatasEncontradas > 0 ? 'warning' : 'info');
            showToast(mensagemFinal || "Nenhuma música processada.", toastType, 5000);
        }
        
        // Atualizar botão
        btn.innerHTML = '<i class="fas fa-check"></i> Concluído';
        btn.classList.add('saved');
        
        // Atualizar cache do histórico após um tempo
        setTimeout(() => {
            silentSync();
        }, 2000);
        
    } catch (e) {
        console.error("Erro ao adicionar músicas ao histórico:", e);
        if (typeof showToast === 'function') {
            showToast("❌ Erro ao adicionar músicas ao histórico", 'error', 3000);
        }
        btn.innerHTML = original;
        btn.disabled = false;
    }
}

// Adicionar listener de duplicata bloqueada para mostrar feedback correto
window.addEventListener('syncItemBlocked', (event) => {
    const { musica, cantor, culto, data } = event.detail;
    console.log("🚫 Duplicata bloqueada - Atualizando UI (repertório)");
    
    // Mostrar aviso de duplicata apenas com toast
    if (typeof showToast === 'function') {
        showToast(`⚠️ "${musica}" já está no histórico!`, 'warning', 5000);
    }
});

async function excluir(musica, culto, cantor) {
    const confirmed = await showConfirmModal(
        "Deseja realmente excluir esta música do repertório?",
        "Excluir",
        "Cancelar"
    );
    if (!confirmed) return;

    // culto vem como "Nome do Culto|Data"
    const [nomeCulto, dataISO] = culto.split('|');

    const payload = {
        action: "delete",
        sheet: "Repertório_PWA",
        Músicas: musica,
        Culto: nomeCulto,
        Data: dataISO
    };

    // 1. Atualiza UI imediatamente (Otimismo)
    SyncManager.updateLocalCache("Repertório_PWA", "delete", payload);
    const cachedData = safeParse(localStorage.getItem('offline_repertorio'));
    render(cachedData);
    showToast("✅ Música excluída com sucesso!", 'success');

    // 2. Adiciona à fila de sincronização
    SyncManager.addToQueue(payload);
}

window.onload = () => carregarRepertorio();
