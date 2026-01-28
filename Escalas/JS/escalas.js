const SCRIPT_URL = APP_CONFIG.SCRIPT_URL;

const iconsMap = {
    "Ministro": "fa-microphone-lines",
    "Back": "fa-microphone-stand",
    "Violão": "fa-guitar",
    "Guitarra": "fa-guitar-electric",
    "Teclado": "fa-keyboard",
    "Bateria": "fa-drum",
    "Baixo": "fa-mandolin"
};

// --- CONTROLE DE VISUALIZAÇÃO ---
function switchView(view) {
    // Atualiza botões
    document.querySelectorAll('.segmented-control button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${view}-view`).classList.add('active');

    // Atualiza seções
    document.querySelectorAll('.view-section').forEach(section => section.classList.remove('active'));
    document.getElementById(`${view}-view`).classList.add('active');

    // Reset de scroll e comportamentos específicos
    window.scrollTo(0, 0);

    // Ajusta visibilidade da busca se necessário (ex: ocultar na limpeza)
    const searchWrapper = document.getElementById('searchContainer');
    if (view === 'cleaning') {
        if (searchWrapper) searchWrapper.style.opacity = '0';
        if (searchWrapper) searchWrapper.style.pointerEvents = 'none';
        if (searchWrapper) searchWrapper.classList.remove('active');
    } else {
        if (searchWrapper) searchWrapper.style.opacity = '1';
        if (searchWrapper) searchWrapper.style.pointerEvents = 'all';
    }

    if (view === 'calendar') {
        if (typeof renderCalendars === 'function') renderCalendars();
    } else if (view === 'list') {
        if (typeof filterEscala === 'function') filterEscala();
    }
}

function handleGlobalSearch() {
    // Dispara ambos os filtros
    if (typeof filterEscala === 'function') filterEscala();
    if (typeof renderCalendars === 'function') renderCalendars();
}

function toggleSearch() {
    const container = document.getElementById('searchContainer');
    const input = document.getElementById('globalSearchInput');

    container.classList.toggle('active');

    if (container.classList.contains('active')) {
        setTimeout(() => input.focus(), 300);
    } else {
        input.value = '';
        handleGlobalSearch();
    }
}

async function syncAllViews() {
    const btnIcon = document.getElementById('masterSyncBtn');
    if (btnIcon) btnIcon.classList.add('fa-spin');

    document.getElementById('loader').style.display = 'block';
    document.getElementById('loaderText').innerText = "Sincronizando tudo...";

    try {
        // Sincroniza dados base (escalas, repertório, etc)
        await silentSync();

        // Sincroniza limpeza (se houver função específica)
        if (typeof syncLimpeza === 'function') await syncLimpeza(true);

        showToast("✅ Tudo atualizado!", 'success');
    } catch (e) {
        console.error("Erro na sincronização master:", e);
        showToast("❌ Erro ao sincronizar um ou mais módulos.", 'error');
    } finally {
        if (btnIcon) btnIcon.classList.remove('fa-spin');
        document.getElementById('loader').style.display = 'none';
    }
}

function safeParse(jsonString, fallback = []) {
    try {
        if (!jsonString || jsonString === "undefined" || jsonString === "null") return fallback;
        return JSON.parse(jsonString);
    } catch (e) {
        console.warn("JSON Parse Error:", e);
        return fallback;
    }
}

async function loadAll(force = false) {
    const loader = document.getElementById('loader');
    const cachedE = localStorage.getItem('offline_escala');
    const cachedR = localStorage.getItem('offline_repertorio');
    const cachedL = localStorage.getItem('offline_lembretes');

    // Inicializa views se estiverem disponíveis
    if (typeof loadData === 'function' && force) loadData(true); // Escala Calendário

    // Se tem cache e não é forçado, renderiza e busca em silêncio
    if (!force && cachedE && cachedR) {
        try {
            const eData = JSON.parse(cachedE);
            const rData = JSON.parse(cachedR || '[]');
            const lData = JSON.parse(cachedL || '[]');
            renderMaster(eData, rData, lData);
            setTimeout(() => silentSync(), 1000);
            return;
        } catch (parseError) {
            console.warn('Cache inválido, recarregando...', parseError);
        }
    }

    const btnIcon = document.getElementById('masterSyncBtn');
    if (btnIcon) btnIcon.classList.add('fa-spin');

    try {
        await silentSync();
        const eData = safeParse(localStorage.getItem('offline_escala'));
        const rData = safeParse(localStorage.getItem('offline_repertorio'));
        const lData = safeParse(localStorage.getItem('offline_lembretes'));
        renderMaster(eData, rData, lData);
        if (btnIcon) btnIcon.classList.remove('fa-spin');
        if (loader) loader.style.display = 'none';

        if (force) {
            showToast("Escalas sincronizadas com sucesso!", 'success');
        }
    } catch (e) {
        console.error(e);
        if (loader) loader.innerText = "Erro ao carregar dados.";
        if (force) showToast("Erro ao sincronizar escalas.", 'error');
    }
}

async function silentSync() {
    try {
        console.log("🔄 Sincronizando escalas via Supabase...");

        const [escalaDataRaw, repertorioDataRaw, lembretesDataRaw, cultosDataRaw] = await Promise.all([
            supabaseFetch('escalas'),
            supabaseFetch('repertorio'),
            supabaseFetch('lembretes'),
            supabaseFetch('cultos')
        ]);

        const escalaData = normalizeData(escalaDataRaw, 'escala');
        const repertorioData = normalizeData(repertorioDataRaw, 'repertorio');
        const lembretesData = normalizeData(lembretesDataRaw, 'lembrete');
        const cultosData = normalizeData(cultosDataRaw, 'culto');

        localStorage.setItem('offline_escala', JSON.stringify(escalaData));
        localStorage.setItem('offline_repertorio', JSON.stringify(repertorioData));
        localStorage.setItem('offline_lembretes', JSON.stringify(lembretesData));
        localStorage.setItem('offline_cultos', JSON.stringify(cultosData));

        // Só renderiza se não houver busca ativa E nenhum accordion aberto
        const searchInput = document.getElementById('globalSearchInput');
        const hasActiveItems = document.querySelector('.accordion-item.active') !== null;
        if ((!searchInput || searchInput.value === "") && !hasActiveItems) {
            renderMaster(escalaData, repertorioData, lembretesData);
        }
    } catch (e) {
        console.warn("Silent sync Supabase failed:", e);
        // Tentar renderizar com cache existente
        const cachedEscala = localStorage.getItem('offline_escala');
        const cachedRepertorio = localStorage.getItem('offline_repertorio');
        const cachedLembretes = localStorage.getItem('offline_lembretes');

        if (cachedEscala && cachedRepertorio) {
            renderMaster(
                safeParse(cachedEscala),
                safeParse(cachedRepertorio),
                safeParse(cachedLembretes)
            );
        }
    }
}

function renderMaster(escalas, musicas = [], lembretes = []) {
    const container = document.getElementById('escala-container');
    container.innerHTML = '';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    const escalaAgrupada = escalas.reduce((acc, item) => {
        let dataItem;
        if (item.Data && item.Data.includes('T')) {
            dataItem = new Date(item.Data);
        } else if (item.Data) {
            dataItem = new Date(item.Data + "T12:00:00");
        } else {
            return acc;
        }

        if (dataItem >= hoje) {
            const idCulto = item.id_culto || item.id_Culto;
            const key = idCulto ? idCulto : (item["Nome dos Cultos"] + "|" + item.Data);
            if (!acc[key]) acc[key] = { info: item, membros: [], idComposto: key };
            acc[key].membros.push({ nome: item.Nome, funcao: item["Função"] });
        }
        return acc;
    }, {});

    const escalasFiltradas = Object.values(escalaAgrupada).sort((a, b) => new Date(a.info.Data) - new Date(b.info.Data));

    if (escalasFiltradas.length === 0) {
        container.innerHTML = '<div class="loading">Não há cultos agendados.</div>';
        return;
    }

    escalasFiltradas.forEach(item => {
        const key = item.idComposto;
        const dataObj = new Date(item.info.Data);
        // Formato: DOM. 01/02
        const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
        const diaMes = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const dataFormatada = `${diaSemana} ${diaMes}`;
        const dataAvisoCheck = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        const musicasDoCulto = musicas.filter(m => {
            if (m.id_culto && item.info.id_culto) return m.id_culto === item.info.id_culto;
            if (!m.Data || !m.Culto) return false;
            const normalizeDate = (d) => d.includes('/') ? `${d.split('/')[2]}-${d.split('/')[1].padStart(2, '0')}-${d.split('/')[0].padStart(2, '0')}` : d.split('T')[0];
            return normalizeDate(item.info.Data) === normalizeDate(m.Data) &&
                (m.Culto || "").trim().toLowerCase() === item.info["Nome dos Cultos"].trim().toLowerCase();
        });

        const avisosDoCulto = lembretes.filter(l => {
            return l.Culto && l.Culto.includes(dataAvisoCheck) &&
                l.Culto.toLowerCase().includes(item.info["Nome dos Cultos"].toLowerCase().trim());
        });

        const userToken = JSON.parse(localStorage.getItem('user_token') || '{}');
        const meuNomeLogado = (userToken.Nome || "").toLowerCase().trim();
        const normalize = str => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const nomeNormalizado = normalize(meuNomeLogado);
        const estouEscalado = (nomeNormalizado && item.membros.some(m => normalize(m.nome).includes(nomeNormalizado)));

        const itemEl = document.createElement('div');
        itemEl.className = 'accordion-item';
        itemEl.setAttribute('data-search', (item.info["Nome dos Cultos"] + " " + item.membros.map(m => m.nome).join(" ")).toLowerCase());

        // Equipe
        let ministroCount = 0;
        let backCount = 0;
        const backColors = ["#1abc9c", "#e67e22", "#9b59b6", "#2ecc71", "#34495e"];

        const membersHTML = item.membros.map(m => {
            const categoria = m.funcao.split(' ')[0];
            let iconeBase = iconsMap[categoria] || 'fa-user';
            let extraStyle = "";
            let roleColorClass = categoria;

            if (categoria === "Ministro") ministroCount++;
            if (categoria === "Back") backCount++;

            return `
            <div class="member-item">
                <i class="fa-solid ${iconeBase} ${roleColorClass}"></i>
                <div class="member-info">
                    <span class="m-nome">${m.nome}</span>
                    <span class="m-funcao">${m.funcao}</span>
                </div>
            </div>`;
        }).join('');

        // Repertorio
        const repertorioHTML = musicasDoCulto.length > 0 ? musicasDoCulto.map(m => `
            <div class="musica-item">
                <div class="m-info-col">
                    <span class="m-titulo">${m.Músicas || 'Sem Título'}</span>
                    <span class="m-vocal">VOCAL: ${m.Cantor || 'Todos'}</span>
                </div>
                ${m.Tons ? `<div class="tom-badge">${m.Tons}</div>` : ''}
            </div>
        `).join('') : '<div style="padding: 10px; color: var(--text-secondary); font-size: 0.85rem;">Nenhuma música definida.</div>';

        itemEl.innerHTML = `
            <div class="accordion-header" onclick="this.parentElement.classList.toggle('active')">
                <div class="header-info">
                    <h3>${item.info["Nome dos Cultos"]}</h3>
                    <span><i class="far fa-calendar-alt"></i> ${dataFormatada}</span>
                </div>
                <div class="icon-arrow"><i class="fas fa-chevron-down"></i></div>
            </div>
            <div class="accordion-content">
                <div class="content-grid">
                    <div class="card-team">
                        <div class="section-title-container">
                            <span class="section-title"><i class="fas fa-users"></i> EQUIPE</span>
                            ${estouEscalado ? `<button class="btn-aviso" onclick="comunicarAusencia('${item.info["Nome dos Cultos"]} (${dataAvisoCheck})', event)"><i class="fas fa-bell"></i> AVISOS</button>` : ''}
                        </div>
                        <div class="members-list">
                            ${membersHTML}
                        </div>
                         ${avisosDoCulto.length > 0 ? `
                        <div style="margin-top:15px; background:#fff1f2; padding:10px; border-radius:10px; border:1px dashed #fda4af;">
                            <span style="font-size:0.75rem; font-weight:800; color:#e11d48; display:block; margin-bottom:5px;">⚠️ AVISOS DA EQUIPE</span>
                            ${avisosDoCulto.map(a => `<div style="font-size:0.85rem; color:#be123c;"><b>${a.Componente}:</b> ${a.Info}</div>`).join('')}
                        </div>` : ''}
                    </div>

                    <div class="card-repertoire">
                        <div class="section-title-container">
                            <span class="section-title"><i class="fas fa-music"></i> REPERTÓRIO</span>
                             ${estouEscalado ? `<button class="btn-add" onclick="openNativeRepertorio('${item.idComposto}')"><i class="fas fa-plus"></i></button>` : ''}
                        </div>
                        <div class="repertoire-list">
                            ${repertoireHTML}
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(itemEl);
    });
}

// --- FUNÇÕES DE HISTÓRICO BULK ---
function processarBulk(btn, eventOrInfo) {
    // Se vier do botão da lista, eventOrInfo é o Evento
    if (eventOrInfo && eventOrInfo.stopPropagation) {
        eventOrInfo.stopPropagation();
        const item = btn.closest('.accordion-item');
        const musicas = item.dataset.musicas;
        addBulkHistorico(btn, musicas);
    } else {
        // Fallback se for chamado diretamente (como no calendário antigo)
        addBulkHistorico(btn, eventOrInfo);
    }
}

async function addBulkHistorico(btn, jsonStr) {
    const confirmed = await showConfirmModal(
        "Adicionar todas as músicas deste culto ao histórico? (Duplicatas serão ignoradas)",
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
    console.log("🚫 Duplicata bloqueada - Atualizando UI (escalas)");

    // Mostrar aviso de duplicata apenas com toast
    if (typeof showToast === 'function') {
        showToast(`⚠️ "${musica}" já está no histórico!`, 'warning', 5000);
    }
});

// Função auxiliar para adicionar música individual ao histórico
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

// Monitora eventos de duplicata bloqueada para mostrar feedback correto
window.addEventListener('syncItemBlocked', (event) => {
    const { musica, cantor, culto, data } = event.detail;
    console.log("🚫 Duplicata bloqueada - Atualizando UI");

    // Mostrar aviso de duplicata apenas com toast
    if (typeof showToast === 'function') {
        showToast(`⚠️ "${musica}" já está no repertório para este culto!`, 'warning', 5000);
    }
});

function comunicarAusencia(fullCultoString, event) {
    if (event) event.stopPropagation();
    document.getElementById('displayCultoAviso').innerText = fullCultoString;
    document.getElementById('inputCultoAviso').value = fullCultoString;
    document.getElementById('modalAvisoMembro').style.display = 'flex';
}

async function enviarAvisoMembro() {
    const info = document.getElementById('textoAvisoMembro').value.trim();
    const fullCultoString = document.getElementById('inputCultoAviso').value;

    if (!info) return alert("Descreva o motivo do aviso.");

    const userToken = JSON.parse(localStorage.getItem('user_token') || '{}');
    const meuLogin = userToken.Login || userToken.User || "membro";
    const id_Lembrete = Math.random().toString(16).substr(2, 8);

    const payload = {
        sheet: "Lembretes",
        id_Lembrete,
        Componente: meuLogin,
        Data: new Date().toISOString(), // Usar ISO para Supabase
        Culto: fullCultoString,
        Info: info
    };

    const btn = document.getElementById('btnEnviarAvisoMembro');
    btn.disabled = true;
    btn.innerText = "ENVIANDO...";

    try {
        // Enviar para Supabase (via payload do SyncManager ou direto)
        // Usaremos o SyncManager para suportar offline
        SyncManager.addToQueue({
            action: "addRow",
            sheet: "Lembretes",
            data: {
                id_lembrete: id_Lembrete,
                componente: meuLogin,
                data: payload.Data,
                culto: fullCultoString,
                info: info
            }
        });

        showToast("✅ Aviso agendado para envio!");
        fecharModalAvisoMembro();
        // Recarregar após um pequeno delay para dar tempo do sync processar se estiver online
        setTimeout(() => loadAll(true), 1500);
    } catch (e) {
        console.error("Erro ao agendar aviso:", e);
        showToast("⚠️ Erro ao salvar aviso localmente", 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = "ENVIAR AVISO";
    }
}

function fecharModalAvisoMembro() {
    document.getElementById('modalAvisoMembro').style.display = 'none';
    document.getElementById('textoAvisoMembro').value = '';
}
async function excluirMusica(musica, cultoData, ministro) {
    const confirmed = await showConfirmModal(
        `Deseja remover "${musica}"?`,
        "Remover",
        "Cancelar"
    );
    if (!confirmed) return;

    // cultoData chega como "Nome do Culto|2026-02-01T08:00:00.000Z"
    const [nomeCulto, dataCompleta] = cultoData.split('|');

    try {
        const payload = {
            action: "delete",
            sheet: "Repertório_PWA",
            Músicas: musica,
            Culto: nomeCulto,
            Data: dataCompleta // Envia a data exatamente como está no JSON
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const res = await response.json();
        if (res.status === "success") {
            showToast("✅ Removido com sucesso!");
            loadAll(true);
        } else {
            showToast("⚠️ Erro ao excluir: " + res.message, 'error');
        }
    } catch (e) {
        showToast("❌ Erro de conexão.", 'error');
    }
}

async function excluirMusica(musica, cultoData, cantor) {
    const confirmed = await showConfirmModal(
        `Deseja remover "${musica}"?`,
        "Remover",
        "Cancelar"
    );
    if (!confirmed) return;
    try {
        // Passar os campos corretos para exclusÃ£o: MÃºsicas, Culto, Data
        const payload = {
            action: "delete",
            sheet: "Repertório_PWA",
            Músicas: musica,
            Culto: cultoData.split('|')[0], // Hack: Usaremos separador na chamada
            Data: cultoData.split('|')[1]
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const res = await response.json();
        if (res.status === "success") { showToast("✅ Removido!"); loadAll(true); }
    } catch (e) { setTimeout(() => loadAll(true), 1500); }
}

function filterEscala() {
    const input = document.getElementById('globalSearchInput');
    if (!input) return;
    const q = input.value.toLowerCase();
    document.querySelectorAll('.accordion-item').forEach(item => {
        item.classList.toggle('hidden', !item.getAttribute('data-search').includes(q));
    });
}

async function excluirAviso(id_Aviso, event) {
    if (event) event.stopPropagation();
    const confirmed = await showConfirmModal(
        "Deseja remover este aviso?",
        "Remover",
        "Cancelar"
    );
    if (!confirmed) return;
    try {
        SyncManager.addToQueue({
            action: "delete",
            sheet: "Lembretes",
            data: { id_Lembrete: id_Aviso }
        });
        showToast("✅ Remoção agendada!");
        setTimeout(() => loadAll(true), 1500);
    } catch (e) {
        console.error("Erro ao deletar aviso:", e);
        showToast("❌ Erro.", 'error');
    }
}

// Monitora conclusão de sincronização para atualizar cache do histórico
window.addEventListener('syncCompleted', async () => {
    try {
        const histResponse = await fetch(SCRIPT_URL + "?sheet=Historico de Músicas");
        const histJson = await histResponse.json();
        localStorage.setItem('offline_historico', JSON.stringify(histJson.data || []));
        console.log("📝 Cache do histórico atualizado após sync concluído");
    } catch (e) {
        console.warn("Não foi possível atualizar cache do histórico após sync:", e);
    }
});

// Monitora eventos de duplicata bloqueada para mostrar feedback correto
window.addEventListener('syncItemBlocked', (event) => {
    const { musica, cantor, culto, data } = event.detail;
    console.log("🚫 Duplicata bloqueada - Atualizando UI");

    // Mostrar aviso de duplicata apenas com toast
    if (typeof showToast === 'function') {
        showToast(`⚠️ "${musica}" já está no repertório para este culto!`, 'warning', 5000);
    }
});

window.addEventListener('load', () => loadAll(false));
