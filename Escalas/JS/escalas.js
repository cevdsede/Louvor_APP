const SCRIPT_URL = APP_CONFIG.SCRIPT_URL;
const urlEscala = SCRIPT_URL + "?sheet=Transformar";
const urlRepertorio = SCRIPT_URL + "?sheet=Repertório_PWA";
const urlLembretes = SCRIPT_URL + "?sheet=Lembretes";

const iconsMap = {
    "Ministro": "fa-microphone-lines",
    "Back": "fa-microphone-stand",
    "Violão": "fa-guitar",
    "Guitarra": "fa-guitar-electric",
    "Teclado": "fa-keyboard",
    "Bateria": "fa-drum",
    "Baixo": "fa-mandolin"
};
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

    if (!force && cachedE) {
        const eData = JSON.parse(cachedE);
        const rData = JSON.parse(cachedR || '[]');
        const lData = JSON.parse(cachedL || '[]');
        renderMaster(eData, rData, lData);
        setTimeout(() => silentSync(), 1000);
        return;
    }

    const btnIcon = document.querySelector('.nav-btn.fa-sync-alt') || document.querySelector('.header-right i.fa-sync-alt');
    if (btnIcon) btnIcon.classList.add('fa-spin');

    try {
        await silentSync();
        const eData = JSON.parse(localStorage.getItem('offline_escala'));
        const rData = JSON.parse(localStorage.getItem('offline_repertorio'));
        const lData = JSON.parse(localStorage.getItem('offline_lembretes'));
        renderMaster(eData, rData, lData);
        if (btnIcon) btnIcon.classList.remove('fa-spin');
        if (loader) loader.style.display = 'none';
    } catch (e) {
        console.error(e);
        loader.innerText = "Erro ao carregar dados.";
    }
}

async function silentSync() {
    try {
        const [resEscala, resRepertorio, resLembretes] = await Promise.all([
            fetch(urlEscala), fetch(urlRepertorio), fetch(urlLembretes)
        ]);
        const escalaJson = await resEscala.json();
        const repertorioJson = await resRepertorio.json();
        const lembretesJson = await resLembretes.json();

        localStorage.setItem('offline_escala', JSON.stringify(escalaJson.data));
        localStorage.setItem('offline_repertorio', JSON.stringify(repertorioJson.data));
        localStorage.setItem('offline_lembretes', JSON.stringify(lembretesJson.data));

        // SÃ³ renderiza se nÃ£o houver busca ativa E nenhum accordion aberto
        const hasActiveItems = document.querySelector('.accordion-item.active') !== null;
        if (document.getElementById('searchInput').value === "" && !hasActiveItems) {
            renderMaster(escalaJson.data, repertorioJson.data, lembretesJson.data);
        }
    } catch (e) { console.log("Silent sync failed"); }
}

function renderMaster(escalas, musicas = [], lembretes = []) {
    const container = document.getElementById('escala-container');
    container.innerHTML = '';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    const escalaAgrupada = escalas.reduce((acc, item) => {
        // Robust Date Parsing
        let dataItem;
        if (item.Data && item.Data.includes('T')) {
            dataItem = new Date(item.Data);
        } else if (item.Data) {
            // Fallback for YYYY-MM-DD
            dataItem = new Date(item.Data + "T12:00:00");
        } else {
            return acc;
        }

        if (dataItem >= hoje) {
            // Nova chave Ãºnica baseada em Nome + Data (jÃ¡ que item.Cultos sumiu)
            const key = item["Nome dos Cultos"] + "|" + item.Data;
            if (!acc[key]) acc[key] = { info: item, membros: [], idComposto: key };
            acc[key].membros.push({ nome: item.Nome, funcao: item["Função"] });
        }
        return acc;
    }, {});

    // Remover agrupamento prévio, vamos filtrar na hora
    // const repertorioAgrupado = musicas.reduce...

    const escalasFiltradas = Object.values(escalaAgrupada).sort((a, b) => new Date(a.info.Data) - new Date(b.info.Data));

    if (escalasFiltradas.length === 0) {
        container.innerHTML = '<div class="loading">NÃ£o hÃ¡ cultos agendados.</div>';
        return;
    }

    escalasFiltradas.forEach(item => {
        // const key = item.info.Cultos; -> DEPRECATED
        const key = item.idComposto;
        const dataObj = new Date(item.info.Data);
        // Remove a vÃ­rgula do formato: ex "dom. 18/01"
        const dataFormatada = dataObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace(',', '');
        const dataAvisoCheck = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const dataFullFormatada = dataObj.toLocaleDateString('pt-BR');
        // Filtragem mais flexível para encontrar as músicas
        // Tenta bater a data (YYYY-MM-DD) e se o nome do culto está contido
        const dataYMD = item.info.Data.split('T')[0]; // ex: 2025-10-22
        const nomeCulto = item.info["Nome dos Cultos"].toLowerCase().trim();

        const musicasDoCulto = musicas.filter(m => {
            if (!m.Data || !m.Culto) return false;

            const normalizeDate = (d) => {
                if (d.includes('/')) {
                    const p = d.split('/');
                    return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
                }
                return d.split('T')[0];
            };

            const matchData = normalizeDate(item.info.Data) === normalizeDate(m.Data);
            const matchNome = m.Culto.trim().toLowerCase() === item.info["Nome dos Cultos"].trim().toLowerCase();

            return matchData && matchNome;
        });

        // Filtrar lembretes deste culto especÃ­fico (Aproximado por dd/mm + Nome do Culto)
        const avisosDoCulto = lembretes.filter(l => {
            const matchData = l.Culto && l.Culto.includes(dataAvisoCheck);
            const matchNome = l.Culto && l.Culto.toLowerCase().includes(item.info["Nome dos Cultos"].toLowerCase().trim());
            return matchData && matchNome;
        });

        // Verifica se o usuÃ¡rio logado estÃ¡ escoladado neste culto
        const userToken = JSON.parse(localStorage.getItem('user_token') || '{}');
        const meuNomeLogado = (userToken.Nome || "").toLowerCase().trim();
        const isAdmin = userToken.Role === "Admin" || userToken.Role === "SuperAdmin";

        // Helper para normalizar nomes
        const normalize = str => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const nomeNormalizado = normalize(meuNomeLogado);

        const estouEscalado = (nomeNormalizado && item.membros.some(m => {
            const mNome = normalize(m.nome);
            return mNome.includes(nomeNormalizado) || nomeNormalizado.includes(mNome);
        }));

        const itemEl = document.createElement('div');
        itemEl.className = 'accordion-item';
        itemEl.setAttribute('data-search', (item.info["Nome dos Cultos"] + " " + item.membros.map(m => m.nome).join(" ")).toLowerCase());

        // Armazena as músicas para a função Bulk (Formato: Ministro | Musica-Cantor | Tom)
        itemEl.dataset.musicas = JSON.stringify(musicasDoCulto.map(m => ({
            ministro: m.Ministro || 'Líder não definido',
            musicaCantor: (m.Músicas && m.Cantor) ? `${m.Músicas} - ${m.Cantor}` : (m.Músicas || 'Sem Título'),
            tom: m.Tons || '--'
        })));

        itemEl.innerHTML = `
  <div class="accordion-header" onclick="this.parentElement.classList.toggle('active')">
    <div class="header-info">
      <h3>${item.info["Nome dos Cultos"]}</h3>
      <span>📅 ${dataFormatada}</span>
    </div>
    <i class="fas fa-chevron-down icon-arrow"></i>
  </div>
  <div class="accordion-content">
    <div class="content-grid">
      <div>
        <div class="section-title-container">
          <span class="section-title"><i class="fas fa-users"></i> Equipe</span>
          ${estouEscalado ? `
            <button class="btn-ausencia" onclick="comunicarAusencia('${item.info["Nome dos Cultos"]} (${dataAvisoCheck})', event)" title="Comunicar Aviso">
              <i class="fas fa-bell"></i> Avisos
            </button>
          ` : ''}
        </div>
  ${(() => {
                let ministroCount = 0;
                let backCount = 0;
                const backColors = ["#1abc9c", "#e67e22", "#9b59b6", "#2ecc71", "#34495e"];

                return item.membros.map(m => {
                    const categoria = m.funcao.split(' ')[0];
                    let iconeBase = iconsMap[categoria] || 'fa-user';
                    let extraStyle = "";

                    if (categoria === "Ministro") {
                        ministroCount++;
                        if (ministroCount === 1) {
                            iconeBase = "fa-crown";
                        } else {
                            iconeBase = "fa-microphone-lines";
                            extraStyle = "color: #3498db !important;";
                        }
                    }

                    if (categoria === "Back") {
                        extraStyle = `color: ${backColors[backCount % backColors.length]} !important;`;
                        backCount++;
                    }

                    return `
                <div class="member-item">
                  <i class="fa-solid ${iconeBase} ${categoria}" style="${extraStyle}"></i>
                  <div class="member-info">
                      <span class="m-nome">${m.nome}</span>
                      <span class="m-funcao">${m.funcao}</span>
                  </div>
                </div>`;
                }).join('');
            })()}

        ${avisosDoCulto.length > 0 ? `
          <div class="extra-section" style="margin-top:15px; border-top:1px dashed #eee; padding-top:10px;">
            <span class="section-title" style="color:#e74c3c; font-size:0.7rem;"><i class="fas fa-exclamation-circle"></i> Avisos</span>
            ${avisosDoCulto.map(a => `
              <div style="font-size:0.8rem; background:#fff5f5; padding:8px; border-radius:5px; margin-top:5px; border-left:3px solid #e74c3c; position:relative;">
                <b>${a.Componente}:</b> ${a.Info}
                ${a.Componente.toLowerCase().trim() === meuNomeLogado ? `
                  <i class="fas fa-trash-alt" 
                     onclick="excluirAviso('${a.id_Lembrete}', event)" 
                     style="position:absolute; right:8px; top:8px; color:#e74c3c; cursor:pointer; font-size:0.7rem;"
                     title="Remover Aviso"></i>
                ` : (isAdmin || (userToken.Login && a.Componente.toLowerCase().trim() === userToken.Login.toLowerCase().trim())) ? `
                  <i class="fas fa-trash-alt" 
                     onclick="excluirAviso('${a.id_Lembrete}', event)" 
                     style="position:absolute; right:8px; top:8px; color:#e74c3c; cursor:pointer; font-size:0.7rem;"
                     title="Remover Aviso (Admin)"></i>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div>
        <div class="section-title-container">
          <span class="section-title"><i class="fas fa-music"></i> Repertório</span>
          ${estouEscalado ? `
            <button class="btn-add-bulk" onclick="openNativeRepertorio('${item.idComposto}')">
              <i class="fas fa-plus-circle"></i>
            </button>
          ` : ''}
        </div>
<div class="repertorio-list">
    ${musicasDoCulto.length > 0 ? `
        ${estouEscalado ? `
            <button class="btn-add-bulk" 
                    style="margin-bottom:10px; width:100%; background:#2ecc71; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold;" 
                    onclick="processarBulk(this, event)">
                <i class="fas fa-history"></i> Add Histórico
            </button>
        ` : ''}
        
        ${musicasDoCulto.map(m => {
                const nomeMusica = m.Músicas || "Música sem nome";
                const cantor = m.Cantor || "Artista Desconhecido";
                const ministro = m.Ministro || "Líder não definido";
                const queryBusca = encodeURIComponent(nomeMusica);
                const querySpotify = encodeURIComponent(`${nomeMusica} ${cantor}`);

                return `
            <div class="musica-item">
                <div class="m-nome-musica" style="font-weight: bold; font-size: 0.9rem;">${nomeMusica} - ${cantor}</div>
                <div class="m-mid-row" style="display: flex; justify-content: space-between; align-items: center; margin: 4px 0; font-size: 0.75rem;">
                    <span class="m-ministro"><i class="fas fa-user-voice" style="font-size: 9px; opacity: 0.7;"></i> ${ministro}</span>
                    <span class="m-tom" style="font-weight: bold; background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px;">${m.Tons || '--'}</span>
                </div>
                <div class="m-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                    <div class="m-links" style="margin: 0; display: flex; gap: 8px;">
                        <a href="https://www.youtube.com/results?search_query=${queryBusca}" target="_blank" class="l-yt" title="YouTube"><i class="fab fa-youtube"></i></a>
                        <a href="https://open.spotify.com/search/${querySpotify}" target="_blank" class="l-sp" title="Spotify"><i class="fab fa-spotify"></i></a>
                        <a href="https://www.cifraclub.com.br/?q=${queryBusca}" target="_blank" class="l-cf" title="Cifra Club"><i class="fas fa-guitar"></i></a>
                        <a href="https://www.letras.mus.br/?q=${queryBusca}" target="_blank" class="l-lt" title="Letras.mus"><i class="fas fa-align-left"></i></a>
                    </div>
                ${estouEscalado ? `
                <button class="btn-del-musica" 
                    onclick="excluirMusica('${nomeMusica.replace(/'/g, "\\'")}', '${(m.Culto || "").replace(/'/g, "\\'")}|${m.Data}', '${cantor.replace(/'/g, "\\'")}')" 
                    style="position: static; margin: 0; padding: 5px;"
                    title="Excluir">
                    <i class="fas fa-trash-alt"></i>
                </button>` : ''}
                </div>
            </div>`;
            }).join('')}
    ` : '<span style="color:#ccc; font-size:0.85rem">Aguardando repertório...</span>'}
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
    const originalContent = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    btn.disabled = true;

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "addHistory", data: lista })
        });
        const dados = await res.json();
        alert(dados.message);
        btn.innerHTML = '<i class="fas fa-check"></i> Concluído';
        btn.style.background = "#2c3e50";
    } catch (e) {
        alert("Erro na conexão.");
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

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
        action: "add",
        sheet: "Lembretes",
        id_Lembrete,
        Componente: meuLogin,
        Data: new Date().toLocaleDateString('pt-BR'),
        Culto: fullCultoString,
        Info: info
    };

    const btn = document.getElementById('btnEnviarAvisoMembro');
    btn.disabled = true;
    btn.innerText = "ENVIANDO...";

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const res = await response.json();
        if (res.status === "success") {
            showToast("✅ Aviso enviado!");
            fecharModalAvisoMembro();
            loadAll(true);
        } else {
            showToast("⚠️ Erro ao enviar: " + res.message, 'error');
        }
    } catch (e) {
        if (window.SyncManager) {
            SyncManager.addToQueue(payload);
            alert("☁️ Offline. O aviso será enviado depois.");
            fecharModalAvisoMembro();
        }
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
    const q = document.getElementById('searchInput').value.toLowerCase();
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
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "delete", sheet: "Lembretes", id_Lembrete: id_Aviso })
        });
        const res = await response.json();
        if (res.status === "success") { showToast("✅ Removido!"); loadAll(true); }
    } catch (e) { showToast("❌ Erro.", 'error'); }
}

function confirmarTema() {
    localStorage.setItem('tema_escolhido_id', tempThemeId);
    toggleThemePanel();
    if (window.aplicarTemaAtual) aplicarTemaAtual();
}

function confirmarTema() {
    localStorage.setItem('tema_escolhido_id', tempThemeId);
    toggleThemePanel();
    if (window.aplicarTemaAtual) aplicarTemaAtual();
}

loadAll();
