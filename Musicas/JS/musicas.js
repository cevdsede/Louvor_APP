const SCRIPT_URL = APP_CONFIG.SCRIPT_URL;
const urlGet = SCRIPT_URL + "?sheet=Musicas";

async function loadData(force = false) {
    const loader = document.getElementById('loader');
    const cached = localStorage.getItem('offline_musicas');

    // Se tem cache e nÃ£o for forÃ§ado pelo botÃ£o, mostra logo e atualiza quieto
    if (!force && cached) {
        renderAccordion(JSON.parse(cached));
        // SincronizaÃ§Ã£o silenciosa em background apÃ³s carregar o cache
        setTimeout(() => silentSync(), 500);
        return;
    }

    // Se for forÃ§ado (botÃ£o) ou nÃ£o tiver cache, mostra loader
    const btnIcon = document.querySelector('.nav-btn.fa-sync-alt, .header-right-nav i.fa-sync-alt, .header-right i.fa-sync-alt, .btn-update i');
    if (btnIcon) btnIcon.classList.add('fa-spin');

    // ... existing logic ...
    try {
        const response = await fetch(urlGet);
        const json = await response.json();
        localStorage.setItem('offline_musicas', JSON.stringify(json.data));
        renderAccordion(json.data);
        if (loader) loader.style.display = 'none';
    } catch (e) {
        if (loader) {
            loader.innerText = "Erro ao conectar.";
            showToast("Erro ao carregar músicas.", 'error');
        }
        if (cached) renderAccordion(JSON.parse(cached));
    } finally {
        if (btnIcon) btnIcon.classList.remove('fa-spin');
    }
}

async function silentSync() {
    try {
        const response = await fetch(urlGet);
        const json = await response.json();
        localStorage.setItem('offline_musicas', JSON.stringify(json.data));

        // SÃ³ renderiza se nÃ£o houver busca ativa E nenhum item aberto
        const hasOpenItems = document.querySelector('.open') !== null;
        if (document.getElementById('searchInput').value === "" && !hasOpenItems) {
            renderAccordion(json.data);
        }
    } catch (e) { console.log("Silent sync failed"); }
}

function renderAccordion(data) {
    const container = document.getElementById('main-content');
    container.innerHTML = '';

    const grouped = data.reduce((acc, m) => {
        const t = m.Tema || "Geral";
        const e = m.Estilo || "Outros";
        if (!acc[t]) acc[t] = {};
        if (!acc[t][e]) acc[t][e] = [];
        acc[t][e].push(m);
        return acc;
    }, {});

    for (const tema in grouped) {
        const temaSection = document.createElement('div');
        temaSection.className = 'tema-section';
        temaSection.innerHTML = `
  <div class="tema-header" onclick="toggle(this.parentElement)">
    <span><i class="fas fa-folder"></i> ${tema}</span>
    <i class="fas fa-chevron-down arrow"></i>
  </div>
  <div class="tema-content"></div>
`;

        const temaContent = temaSection.querySelector('.tema-content');

        for (const estilo in grouped[tema]) {
            const estiloSection = document.createElement('div');
            estiloSection.className = 'estilo-section';
            estiloSection.innerHTML = `
    <div class="estilo-header" onclick="toggle(this.parentElement)">
      <span>${estilo}</span>
      <i class="fas fa-chevron-down arrow"></i>
    </div>
    <div class="estilo-content">
      <div class="music-grid"></div>
    </div>
  `;

            const grid = estiloSection.querySelector('.music-grid');

            grouped[tema][estilo].forEach(m => {
                // GERAÃ‡ÃƒO AUTOMÃ TICA DOS LINKS DE BUSCA
                const query = encodeURIComponent(`${m.Músicas} ${m.Cantor}`);
                const linkYT = `https://www.youtube.com/results?search_query=${query}`;
                const linkCF = `https://www.cifraclub.com.br/?q=${query}`;
                const linkSP = `https://open.spotify.com/search/${query}`;
                const linkLT = `https://www.letras.mus.br/?q=${query}`;

                const card = document.createElement('div');
                card.className = 'premium-card';
                card.style.padding = '15px';
                card.style.position = 'relative';
                card.setAttribute('data-search', `${m.Músicas} ${m.Cantor}`.toLowerCase());
                card.innerHTML = `
      <button class="btn-del-lib" onclick="excluirDaBiblioteca('${m.Músicas}', '${m.Cantor}')" title="Excluir">
        <i class="fas fa-trash-alt"></i>
      </button>
      <div class="music-info">
        <h3 class="font-heading" style="font-size: 1rem; margin-bottom: 4px; padding-right: 25px;">${m.Músicas}</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 15px;"><i class="fas fa-microphone me-1"></i> ${m.Cantor}</p>
      </div>
      <div class="actions">
        <a href="${linkYT}" target="_blank" class="btn btn-yt"><i class="fab fa-youtube"></i> Video</a>
        <a href="${linkCF}" target="_blank" class="btn btn-cf"><i class="fas fa-guitar"></i> Cifra</a>
        <a href="${linkSP}" target="_blank" class="btn btn-sp"><i class="fab fa-spotify"></i> Play</a>
        <a href="${linkLT}" target="_blank" class="btn btn-lt"><i class="fas fa-align-left"></i> Letra</a>
      </div>
    `;
                grid.appendChild(card);
            });
            temaContent.appendChild(estiloSection);
        }
        container.appendChild(temaSection);
    }
}

async function excluirDaBiblioteca(musica, cantor) {
    const confirmed = await showConfirmModal(
        `Deseja remover "${musica}" da biblioteca permanentemente?`,
        "Remover",
        "Cancelar"
    );
    if (!confirmed) return;

    // Encontrar o cartão da música para dar feedback visual imediato
    const cards = document.querySelectorAll('.music-card');
    let cardToRemove = null;
    for (let card of cards) {
        const searchData = card.getAttribute('data-search');
        if (searchData.includes(musica.toLowerCase()) && searchData.includes(cantor.toLowerCase())) {
            cardToRemove = card;
            break;
        }
    }

    if (cardToRemove) {
        // Estado de "Excluindo..."
        cardToRemove.style.opacity = '0.5';
        cardToRemove.innerHTML = '<div style="text-align:center; padding:20px; color:#e74c3c; font-weight:bold;"><i class="fas fa-spinner fa-spin"></i> Excluindo...</div>';
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "delete", sheet: "Musicas", musica: musica, cantor: cantor })
        });
        const res = await response.json();
        if (res.status === "success") {
            if (cardToRemove) {
                // Animação final de sumir
                cardToRemove.style.transition = 'all 0.5s';
                cardToRemove.style.transform = 'scale(0)';
                setTimeout(() => cardToRemove.remove(), 500);
            } else {
                loadData();
            }
        }
    } catch (e) {
        // Se der erro, recarrega tudo para garantir consistência
        setTimeout(() => loadData(), 1500);
    }
}

function toggle(el) { el.classList.toggle('open'); }

function filterMusics() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.music-card');
    const sections = document.querySelectorAll('.tema-section, .estilo-section');

    if (q === "") {
        sections.forEach(s => { s.classList.remove('open', 'hidden'); });
        cards.forEach(c => c.classList.remove('hidden'));
        return;
    }

    cards.forEach(card => {
        const match = card.getAttribute('data-search').includes(q);
        card.classList.toggle('hidden', !match);
    });

    document.querySelectorAll('.estilo-section').forEach(es => {
        const hasVisible = es.querySelectorAll('.music-card:not(.hidden)').length > 0;
        es.classList.toggle('hidden', !hasVisible);
        if (hasVisible) es.classList.add('open');
    });

    document.querySelectorAll('.tema-section').forEach(ts => {
        const hasVisible = ts.querySelectorAll('.estilo-section:not(.hidden)').length > 0;
        ts.classList.toggle('hidden', !hasVisible);
        if (hasVisible) ts.classList.add('open');
    });
}

function confirmarTema() {
    localStorage.setItem('tema_escolhido_id', tempThemeId);
    toggleThemePanel();
    if (window.aplicarTemaAtual) aplicarTemaAtual();
}

window.onload = () => loadData();
