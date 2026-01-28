const SCRIPT_URL = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.SCRIPT_URL) ? APP_CONFIG.SCRIPT_URL : 'https://script.google.com/macros/s/AKfycbzdG9W3b6Z7h8J9dK2L4m5P6n7q8r9s0t1u2v3w4x5y6z7/exec';

const urlEscala = SCRIPT_URL + "?sheet=Transformar";
const urlRepertorio = SCRIPT_URL + "?sheet=Repertório_PWA";
const urlLembretes = SCRIPT_URL + "?sheet=Lembretes";

// Função auxiliar para parse seguro
function safeParse(jsonString, fallback = []) {
    try {
        if (!jsonString || jsonString === "undefined" || jsonString === "null") return fallback;
        return JSON.parse(jsonString);
    } catch (e) {
        console.warn('Erro ao fazer parse JSON:', e);
        return fallback;
    }
}

let globalEscalas = [];
let globalRepertorio = [];
let globalLembretes = [];

// Mapeamento de ícones por categoria
const iconsMap = {
    'Violão': 'fa-guitar',
    'Guitarra': 'fa-guitar-electric',
    'Baixo': 'fa-mandolin',
    'Bateria': 'fa-drum',
    'Teclado': 'fa-keyboard',
    'Back': 'fa-microphone-stand',
    'Vocal': 'fa-microphone',
    'Ministro': 'fa-crown',
    'Líder': 'fa-crown',
    'Som': 'fa-sliders',
    'Mesa': 'fa-sliders',
    'Data Show': 'fa-desktop',
    'Transmissão': 'fa-video',
    'Mídia': 'fa-camera'
};


async function silentSync() {
    try {
        let jsonE, jsonR, jsonL;

        try {
            // Tentar carregar online com normalização centralizada
            const [respE, respR, respL, respCu] = await Promise.all([
                supabaseFetch('escalas'),
                supabaseFetch('repertorio'),
                supabaseFetch('lembretes'),
                supabaseFetch('cultos')
            ]);

            globalEscalas = normalizeData(respE, 'escala');
            globalRepertorio = normalizeData(respR, 'repertorio');
            globalLembretes = normalizeData(respL, 'lembrete');
            const globalCultos = normalizeData(respCu, 'culto');

            localStorage.setItem('offline_escala', JSON.stringify(globalEscalas));
            localStorage.setItem('offline_repertorio', JSON.stringify(globalRepertorio));
            localStorage.setItem('offline_lembretes', JSON.stringify(globalLembretes));
            localStorage.setItem('offline_cultos', JSON.stringify(globalCultos));
        } catch (corsError) {
            // Se CORS bloquear, usar cache local
            console.warn('CORS bloqueou sync, usando cache local:', corsError);

            const cachedE = localStorage.getItem('offline_escala');
            const cachedR = localStorage.getItem('offline_repertorio');
            const cachedL = localStorage.getItem('offline_lembretes');

            globalEscalas = safeParse(cachedE);
            globalRepertorio = safeParse(cachedR);
            globalLembretes = safeParse(cachedL);

            // Se não tiver cache, criar dados de exemplo
            if (!cachedE || !cachedR) {
                console.warn('Sem cache local, criando dados de exemplo');
                if (!cachedE) {
                    globalEscalas = [{
                        "Nome dos Cultos": "Culto de Domingo",
                        "Data": new Date().toISOString().split('T')[0],
                        "Função": "Ministro",
                        "Nome": "Ministro Exemplo",
                        "Músicas": "Grande é o Senhor",
                        "Cantor": "Fernandinho",
                        "Tons": "G"
                    }];
                    localStorage.setItem('offline_escala', JSON.stringify(globalEscalas));
                }

                if (!cachedR) {
                    globalRepertorio = [{
                        "Músicas": "Grande é o Senhor",
                        "Cantor": "Fernandinho",
                        "Tons": "G",
                        "Culto": "Culto de Domingo",
                        "Data": new Date().toISOString().split('T')[0],
                        "Ministro": "Ministro Exemplo"
                    }];
                    localStorage.setItem('offline_repertorio', JSON.stringify(globalRepertorio));
                }
            }
        }

        // Se não houver busca ativa, re-renderiza com dados novos
        if (!document.getElementById('personSearch').value) {
            renderCalendars();
        }
    } catch (e) {
        console.warn("Silent sync failed", e);
    }
}

function renderCalendars() {
    const now = new Date();
    const months = [];

    for (let i = 0; i < 2; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        months.push({
            month: d.getMonth(),
            year: d.getFullYear(),
            containerId: `month${i + 1}`
        });
    }

    months.forEach(m => {
        const el = document.getElementById(m.containerId);
        el.innerHTML = generateCalendarHTML(m.year, m.month);
    });
}

function generateCalendarHTML(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = new Date(year, month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const searchInput = document.getElementById('globalSearchInput');
    const search = searchInput ? searchInput.value.toLowerCase().trim() : "";

    let html = `<h3>${monthName.toUpperCase()}</h3>`;
    html += `<div class="calendar-grid">
        <div class="day-name">Dom</div><div class="day-name">Seg</div><div class="day-name">Ter</div>
        <div class="day-name">Qua</div><div class="day-name">Qui</div><div class="day-name">Sex</div>
        <div class="day-name">Sáb</div>`;

    for (let i = 0; i < firstDay; i++) {
        html += `<div class="day empty"></div>`;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const escalasDoDia = globalEscalas.filter(e => e.Data.split('T')[0] === dateStr);
        const hasEscala = escalasDoDia.length > 0;

        let matchesSearch = false;
        let namesToDisplay = [];

        if (search) {
            const filtered = escalasDoDia.filter(e =>
                (e.Nome && e.Nome.toLowerCase().includes(search)) ||
                (e.Função && e.Função.toLowerCase().includes(search))
            );
            matchesSearch = filtered.length > 0;
            namesToDisplay = [...new Set(filtered.map(e => e.Nome))];
        } else {
            namesToDisplay = [...new Set(escalasDoDia.map(e => e.Nome))];
        }

        const isToday = today.getTime() === new Date(dateStr + "T12:00:00").getTime();

        let classList = "day";
        if (hasEscala) classList += " has-event";
        if (isToday) classList += " today";
        if (search && matchesSearch) classList += " match-person";
        if (search && !matchesSearch && hasEscala) classList += " dimmed";

        html += `
        <div class="${classList}" onclick="openDetails('${dateStr}')">
            <span class="day-number">${day}</span>
            <div class="event-preview">
                ${namesToDisplay.slice(0, 2).map(n => `<span class="event-name">${n.split(' ')[0]}</span>`).join('')}
                ${namesToDisplay.length > 2 ? `<span class="event-name">...</span>` : ''}
            </div>
        </div>`;
    }

    html += `</div>`;
    return html;
}

window.openDetails = function (dateStr) {
    const dayEscalas = globalEscalas.filter(e => e.Data.split('T')[0] === dateStr);
    const details = document.getElementById('modalDetails');
    const d = new Date(dateStr + "T12:00:00");
    document.getElementById('modalDate').innerText = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

    const cultos = dayEscalas.reduce((acc, item) => {
        const key = item["Nome dos Cultos"];
        if (!acc[key]) acc[key] = { info: item, membros: [] };
        acc[key].membros.push(item);
        return acc;
    }, {});

    const userToken = JSON.parse(localStorage.getItem('user_token') || '{}');
    const meuNomeLogado = (userToken.Nome || "").toLowerCase().trim();
    const isAdmin = userToken.Role === "Admin" || userToken.Role === "Lider";
    const normalize = str => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const nomeNormalizado = normalize(meuNomeLogado);

    details.innerHTML = Object.values(cultos).map(c => {
        const dataAvisoCheck = new Date(c.info.Data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const musicas = (Array.isArray(globalRepertorio) ? globalRepertorio : []).filter(m => {
            // Se as duas pontas tiverem id_culto (v2.9+), usa vínculo direto
            if (m.id_culto && c.info.id_culto) {
                return m.id_culto === c.info.id_culto;
            }

            // Fallback para strings (legado ou novos itens na fila)
            if (!m.Data || !m.Culto) return false;
            const normalizeDate = (d) => {
                if (d.includes('/')) {
                    const p = d.split('/');
                    return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
                }
                return d.split('T')[0];
            };
            const matchData = normalizeDate(c.info.Data) === normalizeDate(m.Data);
            const matchNome = (m.Culto || m.culto || "").trim().toLowerCase() === c.info["Nome dos Cultos"].trim().toLowerCase();
            return matchData && matchNome;
        });

        const estouEscalado = !!(nomeNormalizado && c.membros.some(m => {
            const mNome = normalize(m.Nome || "");
            return mNome.includes(nomeNormalizado) || nomeNormalizado.includes(mNome);
        }));

        return `
     <div class="culto-detalhe">
        <div class="culto-header" style="display:flex; justify-content:space-between; align-items:center;">
          <span><i class="fas fa-church"></i> ${c.info["Nome dos Cultos"]}</span>
          <div style="display:flex; gap:5px;">
            ${estouEscalado ? `
              <button onclick="openNativeRepertorio('${c.info["Nome dos Cultos"]}|${c.info.Data}')" style="background:white; color:#e74c3c; border:none; padding:4px 8px; border-radius:4px; font-size:0.7rem; cursor:pointer;" title="Repertório">
                <i class="fas fa-music"></i>
              </button>
              <button onclick="comunicarAusencia('${dataAvisoCheck}', '${c.info["Nome dos Cultos"]}', event)" style="background:#e74c3c; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.7rem; cursor:pointer;" title="Aviso">
                <i class="fas fa-bell"></i>
              </button>
            ` : ''}
          </div>
        </div>
       <div class="culto-body">
         <div style="font-weight:bold; margin-bottom:5px; color:#aaa; font-size:0.7rem">EQUIPE</div>
${(() => {
                let ministroCount = 0;
                let backCount = 0;
                const backColors = ["#1abc9c", "#e67e22", "#9b59b6", "#2ecc71", "#34495e"];

                return c.membros.map(m => {
                    const categoria = (m.Função || "").split(' ')[0].trim();
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
                <span>
                    <i class="fa-solid ${iconeBase} ${categoria}" style="${extraStyle}"></i> 
                    ${m.Nome}
                </span>
                <span style="color:#888; font-size:0.75rem">${m.Função}</span>
                </div>`;
                }).join('');
            })()}
         
         ${globalLembretes.filter(l => {
                const dataAviso = new Date(dateStr + "T12:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                const matchData = l.Culto && l.Culto.includes(dataAviso);
                const matchNome = l.Culto && l.Culto.toLowerCase().includes(c.info["Nome dos Cultos"].toLowerCase());
                return matchData && matchNome;
            }).length > 0 ? `
           <div style="margin-top:10px; border-top:1px dashed #eee; padding-top:5px;">
             <div style="font-weight:bold; color:#e74c3c; font-size:0.7rem">AVISOS</div>
             ${globalLembretes.filter(l => {
                const dataAviso = new Date(dateStr + "T12:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                const matchData = l.Culto && l.Culto.includes(dataAviso);
                const matchNome = l.Culto && l.Culto.toLowerCase().includes(c.info["Nome dos Cultos"].toLowerCase());
                return matchData && matchNome;
            }).map(a => `
               <div style="font-size:0.75rem; color:#c0392b; margin-top:3px; position:relative;">
                 <b>${a.Componente}:</b> ${a.Info}
                 ${a.Componente.toLowerCase().trim() === meuNomeLogado ? `
                   <i class="fas fa-trash-alt" onclick="excluirAviso('${a.id_Lembrete}', event)" style="margin-left:5px; cursor:pointer;" title="Remover"></i>
                 ` : (isAdmin || (userToken.Login && a.Componente.toLowerCase().trim() === userToken.Login.toLowerCase().trim())) ? `
                   <i class="fas fa-trash-alt" onclick="excluirAviso('${a.id_Lembrete}', event)" style="margin-left:5px; cursor:pointer;" title="Remover (Admin)"></i>
                 ` : ''}
               </div>
             `).join('')}
           </div>
          ` : ''}

         <div style="font-weight:bold; margin-top:10px; margin-bottom:5px; color:#aaa; font-size:0.7rem;">
            REPERTÓRIO
         </div>

         ${(musicas.length > 0 && estouEscalado) ? `
            <button class="btn-add-bulk" 
                    style="margin-bottom:10px; width:100%; background:#2ecc71; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:0.75rem;" 
                onclick="processarBulk(this, '${encodeURIComponent(JSON.stringify(musicas.map(m => ({
                ministro: m.Ministro || 'Líder não definido',
                musicaCantor: (m.Músicas && m.Cantor) ? `${m.Músicas} - ${m.Cantor}` : (m.Músicas || 'Sem Título'),
                tom: m.Tons || '--',
                culto: c.info["Nome dos Cultos"], // Adicionar culto para validação
                data: dateStr // Adicionar data para validação
            }))))}')">
                <i class="fas fa-history"></i> Add Histórico
            </button>
         ` : ''}

         ${musicas.map(m => {
                const nomeMusica = m.Músicas || "Sem título";
                const nomeCantor = m.Cantor || "Artista Desconhecido";
                const ministro = m.Ministro || "Líder não definido";
                const queryBusca = encodeURIComponent(nomeMusica);
                const querySpotify = encodeURIComponent(`${nomeMusica} ${nomeCantor}`);

                return `
            <div class="musica-item">
              <div class="m-nome-musica" style="font-weight: bold; font-size: 0.9rem;">${nomeMusica} - ${nomeCantor}</div>
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
                    onclick="excluirMusica('${nomeMusica.replace(/'/g, "\\'")}', '${(m.Culto || "").replace(/'/g, "\\'")}|${m.Data}', '${nomeCantor.replace(/'/g, "\\'")}')" 
                    style="position: static; margin: 0; padding: 5px; background:transparent; border:none; color:#e74c3c; cursor:pointer;"
                    title="Excluir">
                    <i class="fas fa-trash-alt"></i>
                </button>` : ''}
              </div>
            </div>`;
            }).join('') || '<div style="color:#ccc; font-size:0.8rem">Sem músicas.</div>'}
       </div>
     </div>`;
    }).join('');

    document.getElementById('eventModal').style.display = 'block';
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
    console.log("🚫 Duplicata bloqueada - Atualizando UI (calendário)");

    // Mostrar aviso de duplicata apenas com toast
    if (typeof showToast === 'function') {
        showToast(`⚠️ "${musica}" já está no repertório para este culto!`, 'warning', 5000);
    }
});



async function processarBulk(btn, encodedData) {
    const confirmed = await showConfirmModal(
        "Adicionar todas as músicas deste culto ao histórico? (Duplicatas serão ignoradas)",
        "Adicionar",
        "Cancelar"
    );
    if (!confirmed) return;

    const lista = JSON.parse(decodeURIComponent(encodedData));
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
    console.log("🚫 Duplicata bloqueada - Atualizando UI (calendário)");

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

// Função para buscar dados do culto específico
async function buscarDadosCulto(culto, data) {
    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=Repertório_PWA`);
        const result = await response.json();

        if (result.status === 'success' && result.data) {
            return result.data.filter(item =>
                item.Culto === culto && item.Data === data
            );
        }
        return [];
    } catch (error) {
        console.error('Erro ao buscar dados do culto:', error);
        return [];
    }
}

// Função para comunicar ausência
function comunicarAusencia(dataCulto, nomeCulto, event) {
    if (event) event.stopPropagation();
    const fullDisplay = `${nomeCulto} (${dataCulto})`;
    document.getElementById('displayCultoAviso').innerText = fullDisplay;
    document.getElementById('inputCultoAviso').value = fullDisplay;
    document.getElementById('modalAvisoMembro').style.display = 'flex';
}

function fecharModalAvisoMembro() {
    document.getElementById('modalAvisoMembro').style.display = 'none';
    document.getElementById('textoAvisoMembro').value = '';
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
        Data: new Date().toLocaleDateString('pt-BR'),
        Culto: fullCultoString,
        Info: info
    };

    const btn = document.getElementById('btnEnviarAvisoMembro');
    const originalText = btn.innerText;
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
            loadData(true);
        } else {
            showToast("⚠️ Erro ao enviar: " + res.message, 'error');
        }
    } catch (e) {
        showToast("Erro de conexão.", 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
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
        if (res.status === "success") { showToast("✅ Removido!"); loadData(true); }
    } catch (e) { showToast("❌ Erro.", 'error'); }
}

async function excluirMusica(musica, cultoData, cantor) {
    const confirmed = await showConfirmModal(
        `Deseja remover "${musica}" do repertório?`,
        "Remover",
        "Cancelar"
    );
    if (!confirmed) return;

    const [nomeCulto, dataCompleta] = cultoData.split('|');

    try {
        const payload = {
            action: "delete",
            sheet: "Repertório_PWA",
            Músicas: musica,
            Culto: nomeCulto,
            Data: dataCompleta
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const res = await response.json();
        if (res.status === "success") {
            showToast("✅ Removido!");
            loadData(true);
            document.getElementById('eventModal').style.display = 'none'; // Fecha para recarregar visual
        } else {
            showToast("⚠️ Erro: " + res.message, 'error');
        }
    } catch (e) {
        console.error("Erro na exclusão:", e);
        showToast("❌ Erro de conexão.", 'error');
    }
}

function confirmarTema() {
    localStorage.setItem('tema_escolhido_id', tempThemeId);
    toggleThemePanel();
    if (window.aplicarTemaAtual) aplicarTemaAtual();
}

async function exportarEscala() {
    const search = document.getElementById('personSearch').value.trim();
    if (!search) {
        alert("Digite um nome na busca para exportar as escalas específicas.");
        return;
    }

    const template = document.getElementById('exportTemplate');
    const exportItems = document.getElementById('exportItems');
    document.getElementById('exportUserName').innerText = search.toUpperCase();

    // Filtrar escalas e agrupar por dia/culto para evitar duplicatas se a pessoa tiver 2 funções no mesmo culto
    const filtered = globalEscalas.filter(e => e.Nome && e.Nome.toLowerCase().includes(search.toLowerCase()));

    if (filtered.length === 0) {
        alert("Nenhuma escala encontrada para este nome.");
        return;
    }

    // Agrupar funções pelo mesmo Culto + Data
    const agrupado = filtered.reduce((acc, current) => {
        const key = `${current["Nome dos Cultos"]}|${current.Data}`;
        if (!acc[key]) {
            acc[key] = { ...current, Funcoes: [current["Função"]] };
        } else {
            if (!acc[key].Funcoes.includes(current["Função"])) acc[key].Funcoes.push(current["Função"]);
        }
        return acc;
    }, {});

    const sortedEntries = Object.values(agrupado).sort((a, b) => new Date(a.Data) - new Date(b.Data));

    exportItems.innerHTML = sortedEntries.map(e => {
        // Robust Date Parsing for Export
        let d;
        if (e.Data.includes('T')) d = new Date(e.Data);
        else if (e.Data.includes('/')) {
            const p = e.Data.split('/');
            d = new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00`);
        } else d = new Date(e.Data + "T12:00:00");

        const dataStr = isNaN(d.getTime()) ? "Data Indisponível" : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        return `
            <div class="export-item">
                <span class="export-culto-data">${e["Nome dos Cultos"]} - ${dataStr}</span>
                <span class="export-funcao">${e.Funcoes.join(' / ')}</span>
            </div>
        `;
    }).join('');

    // Ajusta largura se houver muitos itens (para forçar colunas no canvas)
    template.style.width = sortedEntries.length > 6 ? "700px" : "400px";

    try {
        const canvas = await html2canvas(template, {
            useCORS: true,
            backgroundColor: "#2c3e50",
            scale: 2
        });
        const link = document.createElement('a');
        link.download = `Escala_${search.replace(/ /g, '_')}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    } catch (e) {
        console.error(e);
        alert("Erro ao gerar imagem.");
    } finally {
        template.style.width = "400px"; // Restaura original
    }
}
