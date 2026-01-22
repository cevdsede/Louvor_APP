const SCRIPT_URL = APP_CONFIG.SCRIPT_URL;
const url = SCRIPT_URL + "?sheet=" + encodeURIComponent("Historico de Músicas");

async function loadData(force = false) {
    const loader = document.getElementById('loader');
    const cached = localStorage.getItem('offline_historico');

    if (!force && cached) {
        loader.style.display = 'none';
        renderHistory(JSON.parse(cached));
        setTimeout(() => silentSync(), 500);
        return;
    }

    loader.style.display = 'block';
    try {
        const response = await fetch(url);
        const json = await response.json();
        localStorage.setItem('offline_historico', JSON.stringify(json.data));
        renderHistory(json.data);
        loader.style.display = 'none';
        if (force) alert("Histórico atualizado!");
    } catch (e) {
        if (cached) renderHistory(JSON.parse(cached));
        else loader.innerText = "Erro ao carregar dados.";
    }
}

async function silentSync() {
    try {
        const response = await fetch(url);
        const json = await response.json();
        localStorage.setItem('offline_historico', JSON.stringify(json.data));

        // SÃ³ renderiza se nÃ£o houver busca ativa E nenhum item aberto (para nÃ£o fechar na cara do usuÃ¡rio)
        const hasOpenItems = document.querySelector('.open') !== null;
        if (document.getElementById('searchInput').value === "" && !hasOpenItems) {
            renderHistory(json.data);
        }
    } catch (e) { console.log("Silent sync failed"); }
}

function renderHistory(data) {
    const container = document.getElementById('main-content');
    container.innerHTML = '';

    // Mapear informaÃ§Ãµes da biblioteca de mÃºsicas
    const catalogRaw = localStorage.getItem('offline_musicas');
    const catalog = catalogRaw ? JSON.parse(catalogRaw) : [];
    const musicMap = catalog.reduce((acc, m) => {
        const musicName = (m.Músicas || m["Músicas"] || "").trim();
        const artist = (m.Cantor || "").trim();
        const key = `${musicName} - ${artist}`.toLowerCase();
        acc[key] = { tema: m.Tema || "Geral", estilo: m.Estilo || "Outros" };
        return acc;
    }, {});

    // Agrupar: Cantor -> Tema -> Estilo
    const grouped = data.reduce((acc, item) => {
        const cantor = item.Cantor || "Não Informado";
        const nomeMusica = (item.Músicas || item["Músicas"] || "").trim();
        const info = musicMap[`${nomeMusica} - ${cantor}`.toLowerCase()] || { tema: "Geral", estilo: "Outros" };

        const tema = info.tema;
        const estilo = info.estilo;

        if (!acc[cantor]) acc[cantor] = {};
        if (!acc[cantor][tema]) acc[cantor][tema] = {};
        if (!acc[cantor][tema][estilo]) acc[cantor][tema][estilo] = [];

        acc[cantor][tema][estilo].push({ ...item, musicName: nomeMusica });
        return acc;
    }, {});

    // Gerar HTML
    for (const cantor in grouped) {
        const sectionCantor = document.createElement('div');
        sectionCantor.className = 'cantor-section';

        let temasHtml = '';
        const temas = grouped[cantor];

        for (const tema in temas) {
            let estilosHtml = '';
            const estilos = temas[tema];

            for (const estilo in estilos) {
                const musicas = estilos[estilo];
                estilosHtml += `
          <div class="estilo-section">
            <div class="estilo-header" onclick="this.parentElement.classList.toggle('open')">
              <h4><i class="fas ${estilo === 'Adoração' ? 'fa-hands-praying' : (estilo === 'Celebração' ? 'fa-face-laugh-beam' : 'fa-tag')}"></i> ${estilo} <span class="count">${musicas.length}</span></h4>
              <i class="fas fa-chevron-down arrow"></i>
            </div>
            <div class="estilo-content">
              <div class="music-list">
                ${musicas.map(m => {
                    const displayMusic = m.musicName || "Sem Nome";
                    return `
                    <div class="music-item" data-search="${cantor.toLowerCase()} ${tema.toLowerCase()} ${estilo.toLowerCase()} ${displayMusic.toLowerCase()}">
                      <span class="music-name">${displayMusic}</span>
                      <span class="music-ton">${m.Tons || '--'}</span>
                    </div>
                  `}).join('')}
              </div>
            </div>
          </div>
        `;
            }

            temasHtml += `
        <div class="tema-section">
          <div class="tema-header" onclick="this.parentElement.classList.toggle('open')">
            <h3><i class="fas fa-folder"></i> ${tema}</h3>
            <i class="fas fa-chevron-down arrow"></i>
          </div>
          <div class="tema-content">
            ${estilosHtml}
          </div>
        </div>
      `;
        }

        sectionCantor.innerHTML = `
      <div class="cantor-header" onclick="this.parentElement.classList.toggle('open')">
        <h2>
          <i class="fas fa-user-circle"></i> ${cantor}
        </h2>
        <i class="fas fa-chevron-down arrow"></i>
      </div>
      <div class="cantor-content">
        ${temasHtml}
      </div>
    `;
        container.appendChild(sectionCantor);
    }
}

function filterHistory() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const items = document.querySelectorAll('.music-item');
    const levels = document.querySelectorAll('.cantor-section, .tema-section, .estilo-section');

    if (q === "") {
        levels.forEach(s => { s.classList.remove('open', 'hidden'); });
        items.forEach(i => i.classList.remove('hidden'));
        return;
    }

    // Primeiro oculta tudo e filtra itens
    items.forEach(item => {
        const text = item.getAttribute('data-search');
        item.classList.toggle('hidden', !text.includes(q));
    });

    // Depois abre os nÃ­veis que contÃªm itens visÃ­veis
    levels.forEach(level => {
        const visibleItems = level.querySelectorAll('.music-item:not(.hidden)');
        if (visibleItems.length > 0) {
            level.classList.remove('hidden');
            level.classList.add('open');
        } else {
            level.classList.add('hidden');
        }
    });
}

function applyPermissions() {
    const user = JSON.parse(localStorage.getItem('user_token') || '{}');
    if (user.Role) {
        if (!hasPermission(user.Role, "Historico de Musicas.html", "page")) {
            window.location.href = '../../index.html';
        }
    }
}

window.onload = () => {
    loadData();
    applyPermissions();
}
