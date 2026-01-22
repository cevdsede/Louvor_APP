const SCRIPT_URL = APP_CONFIG.SCRIPT_URL;

let globalEscalas = [];
let globalRepertorio = {};
let globalLembretes = [];
const iconsMap = {
    "Ministro": "fa-microphone-lines",
    "Back": "fa-microphone",
    "Violão": "fa-guitar",
    "Guitarra": "fa-guitar",
    "Teclado": "fa-keyboard",
    "Bateria": "fa-drum",
    "Baixo": "fa-guitar"
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

async function loadData(force = false) {
    const loader = document.getElementById('loader');
    const cachedE = localStorage.getItem('offline_escala');
    const cachedR = localStorage.getItem('offline_repertorio');
    const cachedL = localStorage.getItem('offline_lembretes');

    const escalaData = safeParse(cachedE);
    const repertorioData = safeParse(cachedR); // Returns [] object/array, but processRepertorio might expect object?
    const lembretesData = safeParse(cachedL);

    if (!force && escalaData.length > 0) {
        globalEscalas = escalaData;
        globalLembretes = lembretesData;
        processRepertorio(repertorioData);
        document.getElementById('calendarsContainer').style.display = 'flex';
        renderCalendars();
        setTimeout(() => silentSync(), 500);
        return;
    }

    loader.style.display = 'block';
    try {
        const [resE, resR, resL] = await Promise.all([
            fetch(SCRIPT_URL + "?sheet=Transformar"),
            fetch(SCRIPT_URL + "?sheet=Repertório_PWA"),
            fetch(SCRIPT_URL + "?sheet=Lembretes")
        ]);
        const jsonE = await resE.json();
        const jsonR = await resR.json();
        const jsonL = await resL.json();

        globalEscalas = jsonE.data;
        globalLembretes = jsonL.data;
        processRepertorio(jsonR.data);

        localStorage.setItem('offline_escala', JSON.stringify(jsonE.data));
        localStorage.setItem('offline_repertorio', JSON.stringify(jsonR.data));
        localStorage.setItem('offline_lembretes', JSON.stringify(jsonL.data));

        loader.style.display = 'none';
        document.getElementById('calendarsContainer').style.display = 'flex';
        renderCalendars();
        if (force) alert("Dados atualizados!");
    } catch (e) {
        loader.innerText = "Erro ao carregar dados.";
    }
}

async function silentSync() {
    try {
        const [resE, resR, resL] = await Promise.all([
            fetch(SCRIPT_URL + "?sheet=Transformar"),
            fetch(SCRIPT_URL + "?sheet=Repertório"),
            fetch(SCRIPT_URL + "?sheet=Lembretes")
        ]);
        const jsonE = await resE.json();
        const jsonR = await resR.json();
        const jsonL = await resL.json();

        globalEscalas = jsonE.data;
        globalLembretes = jsonL.data;

        localStorage.setItem('offline_escala', JSON.stringify(jsonE.data));
        localStorage.setItem('offline_repertorio', JSON.stringify(jsonR.data));
        localStorage.setItem('offline_lembretes', JSON.stringify(jsonL.data));

        const modalOpen = document.getElementById('eventModal').style.display === 'block';
        if (document.getElementById('personSearch').value === "" && !modalOpen) {
            processRepertorio(jsonR.data);
            renderCalendars();
        }
    } catch (e) { console.log("Silent sync failed"); }
}

function processRepertorio(data) {
    // Armazena raw para filtragem dinâmica
    globalRepertorio = data || [];
}

function renderCalendars() {
    const now = new Date();
    // Render Current Month
    renderMonth(now, 'month1');

    // Render Next Month
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    renderMonth(next, 'month2');
}

function renderMonth(date, containerId) {
    const container = document.getElementById(containerId);
    const year = date.getFullYear();
    const month = date.getMonth();
    const searchTerm = document.getElementById('personSearch').value.toLowerCase().trim();

    let html = `
  <div class="cal-header"><h2>${new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)}</h2></div>
  <div class="calendar-grid">
`;

    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach(d => html += `<div class="day-name">${d}</div>`);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) html += `<div></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayEscalas = globalEscalas.filter(e => e.Data.split('T')[0] === dateStr);
        const nomesNoDia = [...new Set(dayEscalas.map(e => e.Nome))];
        const isMatch = searchTerm !== "" && nomesNoDia.some(n => n.toLowerCase().includes(searchTerm));

        let classes = `day ${dayEscalas.length > 0 ? 'has-event' : ''} ${isMatch ? 'match-person' : ''}`;

        // Convert to string for onclick (careful with quotes)
        // Storing data in a global map might be cleaner, but simple approach:
        const onclick = dayEscalas.length ? `openDetails('${dateStr}')` : '';

        html += `
    <div class="${classes}" onclick="${onclick}">
      <span class="day-number">${d}</span>
      <div class="event-preview">
        ${nomesNoDia.slice(0, 3).map(n => `<span class="event-name">${n.split(' ')[0]}</span>`).join('')}
      </div>
    </div>
  `;
    }

    html += `</div>`;
    container.innerHTML = html;

    // Mostrar/Esconder botão de exportar
    const btnExport = document.getElementById('btnExport');
    if (searchTerm.length > 2) {
        btnExport.style.display = 'flex';
    } else {
        btnExport.style.display = 'none';
    }
}

async function exportarEscala() {
    const searchTerm = document.getElementById('personSearch').value.trim();
    if (!searchTerm) return;

    const template = document.getElementById('exportTemplate');
    const itemsContainer = document.getElementById('exportItems');
    const userName = document.getElementById('exportUserName');

    userName.innerText = searchTerm.toUpperCase();
    itemsContainer.innerHTML = '';

    // Filtra todas as escalas do usuário
    const minhasEscalas = globalEscalas.filter(e => e.Nome.toLowerCase().includes(searchTerm.toLowerCase()));

    if (minhasEscalas.length === 0) {
        alert("Nenhuma escala encontrada para este nome.");
        return;
    }

    // Ordena por data
    minhasEscalas.sort((a, b) => new Date(a.Data) - new Date(b.Data));

    // Limita Ã s próximas 10 para não ficar gigante
    minhasEscalas.slice(0, 10).forEach(e => {
        // CorreÃ§Ã£o de parsing de data: pega apenas a parte YYYY-MM-DD
        const dataBase = e.Data.includes('T') ? e.Data.split('T')[0] : e.Data;
        const d = new Date(dataBase + "T12:00:00");

        const dataFormatada = isNaN(d.getTime()) ? "DATA INVÃ LIDA" : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace(',', '');

        const item = document.createElement('div');
        item.className = 'export-item';
        item.innerHTML = `
    <span class="export-date">${dataFormatada.toUpperCase()}</span>
    <span class="export-culto">${e["Nome dos Cultos"]}</span>
    <span class="export-funcao">${e.Função}</span>
  `;
        itemsContainer.appendChild(item);
    });

    // Gera a imagem
    const btn = document.getElementById('btnExport');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-sync fa-spin"></i>';
    btn.disabled = true;

    try {
        // Pequeno delay para garantir que o DOM renderizou o template
        await new Promise(r => setTimeout(r, 100));

        const canvas = await html2canvas(template, {
            backgroundColor: '#2c3e50',
            scale: 2, // Melhor qualidade
            useCORS: true
        });

        // Converte para link e baixa/compartilha
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.download = `Escala_${searchTerm}.png`;
        link.href = image;
        link.click();

        alert("Imagem gerada com sucesso!");
    } catch (err) {
        console.error(err);
        alert("Erro ao gerar imagem.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

window.openDetails = function (dateStr) {
    const dayEscalas = globalEscalas.filter(e => e.Data.split('T')[0] === dateStr);
    const details = document.getElementById('modalDetails');
    const d = new Date(dateStr + "T12:00:00");
    document.getElementById('modalDate').innerText = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

    const cultos = dayEscalas.reduce((acc, item) => {
        // Agrupar por "Nome dos Cultos" (já que estamos dentro de um dia específico)
        const key = item["Nome dos Cultos"];
        if (!acc[key]) acc[key] = { info: item, membros: [] };
        acc[key].membros.push(item);
        return acc;
    }, {});

    details.innerHTML = Object.values(cultos).map(c => {
        const musicas = (Array.isArray(globalRepertorio) ? globalRepertorio : []).filter(m => {
            // Comparar Data (DD/MM/YYYY) e Nome do Culto
            if (!m.Data || !m.Culto) return false;

            const parts = c.info.Data.split('T')[0].split('-'); // [2026, 01, 25]
            const dataItemBR = `${parts[2]}/${parts[1]}/${parts[0]}`; // 25/01/2026

            const matchData = m.Data === dataItemBR;
            const matchNome = m.Culto.trim().toLowerCase() === c.info["Nome dos Cultos"].trim().toLowerCase();

            return matchData && matchNome;
        });

        // Verifica se o usuário logado estÃ¡ escalado neste culto
        const userToken = JSON.parse(localStorage.getItem('user_token') || '{}');
        const meuNomeLogado = (userToken.Nome || "").toLowerCase().trim();
        const isAdmin = userToken.Role === "Admin" || userToken.Role === "Lider";

        // Helper para normalizar nomes
        const normalize = str => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const nomeNormalizado = normalize(meuNomeLogado);

        const estouEscalado = (nomeNormalizado && c.membros.some(m => {
            const mNome = normalize(m.Nome);
            return mNome.includes(nomeNormalizado) || nomeNormalizado.includes(mNome);
        }));

        return `
     <div class="culto-detalhe">
        <div class="culto-header" style="display:flex; justify-content:space-between; align-items:center;">
          <span><i class="fas fa-church"></i> ${c.info["Nome dos Cultos"]}</span>
          <div style="display:flex; gap:5px;">
            ${estouEscalado ? `
              <button onclick="navigateToAddRepertorio('${c.info["Nome dos Cultos"]}|${c.info.Data}')" style="background:white; color:#e74c3c; border:none; padding:4px 8px; border-radius:4px; font-size:0.7rem; cursor:pointer;" title="Repertório">
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
            // Pega a primeira palavra da funÃ§Ã£o para definir a cor (ex: "Violão" de "Violão 1")
            const categoria = m.Função.split(' ')[0].trim();
            // Busca o desenho do ícone no mapa
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

         <div style="font-weight:bold; margin-top:10px; margin-bottom:5px; color:#aaa; font-size:0.7rem; display:flex; justify-content:space-between; align-items:center;">
           <span>REPERTÓRIO</span>
           
         </div>
         ${musicas.map(m => {
            const queryBusca = encodeURIComponent(`${m.Músicas}`);
            const querySpotify = encodeURIComponent(`${m.Músicas} ${m.Cantor || ''}`);
            return `
            <div class="musica-item">
              <div style="font-weight:bold">${m.Músicas}</div>
              <div style="font-size:0.75rem; color:#666; margin-top:2px">Tom: <b>${m.Tons || '--'}</b></div>
              <div class="m-links">
                <a href="https://www.youtube.com/results?search_query=${queryBusca}" target="_blank" class="l-yt" title="YouTube"><i class="fab fa-youtube"></i></a>
                <a href="https://open.spotify.com/search/${querySpotify}" target="_blank" class="l-sp" title="Spotify"><i class="fab fa-spotify"></i></a>
                <a href="https://www.cifraclub.com.br/?q=${queryBusca}" target="_blank" class="l-cf" title="Cifra Club"><i class="fas fa-guitar"></i></a>
                <a href="https://www.letras.mus.br/?q=${queryBusca}" target="_blank" class="l-lt" title="Letras.mus"><i class="fas fa-align-left"></i></a>
              </div>
            </div>`;
        }).join('') || '<div style="color:#ccc; font-size:0.8rem">Sem músicas.</div>'}
       </div>
     </div>`;
    }).join('');

    document.getElementById('eventModal').style.display = 'block';
}

window.onload = () => loadData();

function comunicarAusencia(dataCulto, nomeCulto, event) {
    if (event) event.stopPropagation();
    const fullDisplay = `${nomeCulto} (${dataCulto})`;
    document.getElementById('displayCultoAviso').innerText = fullDisplay;
    // Armazena separados para facilitar reconstrução se precisar
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

    // Formato para salvar IDÊNTICO ao Escalas.html?
    // Lá salva: Culto: "Nome (Data)"
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
        btn.innerText = "ENVIAR AVISO";
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
    } catch (e) { alert("â Œ Erro."); }
}

function navigateToAddRepertorio(culto) {
    // Preserves current calendar state
    let url = `../../Musicas/HTML/Cadastro de Repertorio.html?culto=${encodeURIComponent(culto)}`;
    const sourceUrl = `../../Escalas/HTML/Calendario.html`; // Fixed path
    url += `&source=${encodeURIComponent(sourceUrl)}`;
    window.location.href = url;
}

function confirmarTema() {
    localStorage.setItem('tema_escolhido_id', tempThemeId);
    toggleThemePanel();
    if (window.aplicarTemaAtual) aplicarTemaAtual();
}
