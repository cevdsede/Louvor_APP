const SCRIPT_URL = APP_CONFIG.SCRIPT_URL;

let globalEscalas = [];
let globalRepertorio = [];
let globalLembretes = [];

// Mapeamento de ícones por categoria
const iconsMap = {
    'Violão': 'fa-guitar',
    'Guitarra': 'fa-guitar',
    'Baixo': 'fa-drum-steelpan',
    'Bateria': 'fa-drum',
    'Teclado': 'fa-keyboard',
    'Vocal': 'fa-microphone',
    'Ministro': 'fa-crown',
    'Líder': 'fa-crown',
    'Som': 'fa-sliders',
    'Mesa': 'fa-sliders',
    'Data Show': 'fa-desktop',
    'Transmissão': 'fa-video',
    'Mídia': 'fa-camera'
};

async function loadData(force = false) {
    const loader = document.getElementById('loader');
    const container = document.getElementById('calendarsContainer');
    const btnExport = document.getElementById('btnExport');

    // 1. Prioridade: Local Storage (Carregamento Imediato)
    const cachedE = localStorage.getItem('offline_escala');
    const cachedR = localStorage.getItem('offline_repertorio');
    const cachedL = localStorage.getItem('offline_lembretes');

    if (!force && cachedE) {
        globalEscalas = JSON.parse(cachedE);
        globalRepertorio = JSON.parse(cachedR || '[]');
        globalLembretes = JSON.parse(cachedL || '[]');
        renderCalendars();
        container.style.display = 'flex';
        btnExport.style.display = 'flex';
        // Faz um sync silencioso em segundo plano para atualizar
        setTimeout(() => silentSync(), 1000);
        return;
    }

    loader.style.display = 'block';
    container.style.display = 'none';

    try {
        await silentSync(); // Reusa a lógica de fetch
        renderCalendars();
        container.style.display = 'flex';
        btnExport.style.display = 'flex';
    } catch (e) {
        console.error("Erro ao carregar dados:", e);
        if (!cachedE) alert("Erro ao conectar com o servidor.");
    } finally {
        loader.style.display = 'none';
    }
}

async function silentSync() {
    try {
        const [respE, respR, respL] = await Promise.all([
            fetch(SCRIPT_URL + "?sheet=Transformar"),
            fetch(SCRIPT_URL + "?sheet=Repertório_PWA"),
            fetch(SCRIPT_URL + "?sheet=Lembretes")
        ]);

        const [jsonE, jsonR, jsonL] = await Promise.all([respE.json(), respR.json(), respL.json()]);

        globalEscalas = jsonE.data;
        globalRepertorio = jsonR.data;
        globalLembretes = jsonL.data;

        localStorage.setItem('offline_escala', JSON.stringify(globalEscalas));
        localStorage.setItem('offline_repertorio', JSON.stringify(globalRepertorio));
        localStorage.setItem('offline_lembretes', JSON.stringify(globalLembretes));

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

    const search = document.getElementById('personSearch').value.toLowerCase().trim();

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
        const musicas = (Array.isArray(globalRepertorio) ? globalRepertorio : []).filter(m => {
            if (!m.Data || !m.Culto) return false;
            const normalizeDate = (d) => {
                if (d.includes('/')) {
                    const p = d.split('/');
                    return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
                }
                return d.split('T')[0];
            };
            const matchData = normalizeDate(c.info.Data) === normalizeDate(m.Data);
            const matchNome = m.Culto.trim().toLowerCase() === c.info["Nome dos Cultos"].trim().toLowerCase();
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
              <button onclick="comunicarAusencia('${c.info.Data.split('T')[0]}', '${c.info["Nome dos Cultos"]}', event)" style="background:#e74c3c; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.7rem; cursor:pointer;" title="Aviso">
                <i class="fas fa-bell"></i>
              </button>
            ` : ''}
          </div>
        </div>
       <div class="culto-body">
         <div style="font-weight:bold; margin-bottom:5px; color:#aaa; font-size:0.7rem">EQUIPE</div>
${c.membros.map(m => {
            const categoria = (m.Função || "").split(' ')[0].trim();
            const iconeBase = iconsMap[categoria] || 'fa-user';
            return `
<div class="member-item">
  <span>
    <i class="fa-solid ${iconeBase} ${categoria}"></i> 
    ${m.Nome}
  </span>
  <span style="color:#888; font-size:0.75rem">${m.Função}</span>
</div>
`;
        }).join('')}
         
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
            tom: m.Tons || '--'
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

window.onload = () => loadData();

async function processarBulk(btn, encodedData) {
    if (!confirm("Adicionar todas as músicas deste culto ao histórico? (Duplicatas serão ignoradas)")) return;

    const lista = JSON.parse(decodeURIComponent(encodedData));
    const originalContent = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    btn.disabled = true;

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "addHistory", data: lista })
        });
        const dados = await res.json();
        alert(dados.message || "Conclído!");
        btn.innerHTML = '<i class="fas fa-check"></i> Concluído';
        btn.style.background = "#2c3e50";
    } catch (e) {
        console.error(e);
        alert("Erro na conexão ou no servidor.");
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

function comunicarAusencia(dataCulto, nomeCulto, event) {
    if (event) event.stopPropagation();
    const fullDisplay = `${nomeCulto} (${dataCulto})`;
    document.getElementById('displayCultoAviso').innerText = fullDisplay;
    document.getElementById('inputCultoData').value = dataCulto;
    document.getElementById('inputCultoNome').value = nomeCulto;
    document.getElementById('modalAvisoMembro').style.display = 'flex';
}

function fecharModalAvisoMembro() {
    document.getElementById('modalAvisoMembro').style.display = 'none';
    document.getElementById('textoAvisoMembro').value = '';
}

async function enviarAvisoMembro() {
    const info = document.getElementById('textoAvisoMembro').value.trim();
    const dataCulto = document.getElementById('inputCultoData').value;
    const nomeCulto = document.getElementById('inputCultoNome').value;

    if (!info) return alert("Descreva o motivo do aviso.");

    const userToken = JSON.parse(localStorage.getItem('user_token') || '{}');
    const meuLogin = userToken.Login || userToken.User || "membro";
    const id_Lembrete = 'AVISO-' + Math.random().toString(16).substr(2, 8);
    const cultoFormatted = `${nomeCulto} (${dataCulto})`;

    const payload = {
        action: "addRow",
        sheet: "Lembretes",
        data: {
            id_Lembrete,
            Componente: meuLogin,
            Data: new Date().toLocaleDateString('pt-BR'),
            Culto: cultoFormatted,
            Info: info
        }
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
            alert("✅ Aviso enviado!");
            fecharModalAvisoMembro();
            loadData(true);
        } else {
            alert("⚠️ Erro ao enviar: " + res.message);
        }
    } catch (e) {
        alert("Erro de conexão.");
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

async function excluirAviso(id_Aviso, event) {
    if (event) event.stopPropagation();
    if (!confirm("Deseja remover este aviso?")) return;
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "delete", sheet: "Lembretes", id_Lembrete: id_Aviso })
        });
        const res = await response.json();
        if (res.status === "success") { alert("✅ Removido!"); loadData(true); }
    } catch (e) { alert("❌ Erro."); }
}

async function excluirMusica(musica, cultoData, cantor) {
    if (!confirm(`Deseja remover "${musica}" do repertório?`)) return;

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
            alert("✅ Removido!");
            loadData(true);
            document.getElementById('eventModal').style.display = 'none'; // Fecha para recarregar visual
        } else {
            alert("⚠️ Erro: " + res.message);
        }
    } catch (e) {
        console.error("Erro na exclusão:", e);
        alert("❌ Erro de conexão.");
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
