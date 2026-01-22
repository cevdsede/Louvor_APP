async function carregarRepertorio(force = false) {
    const container = document.getElementById('repertorioAgrupado');
    const loader = document.getElementById('loader');
    const cached = localStorage.getItem('offline_repertorio');

    // Se tem cache e nÃ£o Ã© forÃ§ado, renderiza e busca em silÃªncio
    if (!force && cached) {
        render(JSON.parse(cached));
        setTimeout(() => silentSync(), 500);
        return;
    }

    loader.style.display = 'block';
    loader.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';

    try {
        const response = await fetch(APP_CONFIG.SCRIPT_URL + "?sheet=Repertório");
        const json = await response.json();
        localStorage.setItem('offline_repertorio', JSON.stringify(json.data));
        render(json.data);
        loader.style.display = 'none';
        if (force) alert("Atualizado!");
    } catch (e) {
        if (cached) render(JSON.parse(cached));
        else container.innerHTML = '<div class="loading">Erro ao carregar dados.</div>';
    }
}

async function silentSync() {
    try {
        const response = await fetch(APP_CONFIG.SCRIPT_URL + "?sheet=Repertório");
        const json = await response.json();
        localStorage.setItem('offline_repertorio', JSON.stringify(json.data));

        // SÃ³ renderiza se nÃ£o houver busca ativa E nenhum item aberto (para nÃ£o fechar na cara do usuÃ¡rio)
        const hasActiveItems = document.querySelector('.active') !== null;
        if (SyncManager.getQueue().length === 0 && !hasActiveItems) {
            render(json.data);
        }
    } catch (e) { console.log("Silent sync failed"); }
}

// Ouvinte para re-renderizar quando a sincronizaÃ§Ã£o terminar
window.addEventListener('syncCompleted', () => carregarRepertorio());

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

        // Forma segura de armazenar os dados para o botÃ£o Add All
        section.dataset.musicas = JSON.stringify(grupo.musicas.map(m => ({
            musica: m.Músicas, cantor: m.Cantor, tom: m.Tons
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
              <div class="m-nome">${m.Músicas}</div>
              <div class="m-tom"><span>${m.Tons || '--'}</span></div>
              <div class="m-cantor"><i class="fas fa-user"></i> ${m.Cantor}</div>
              <div class="actions">
                <button class="btn-action btn-history" onclick="addHistorico(this, '${m.Músicas.replace(/'/g, "\\'")}', '${m.Cantor.replace(/'/g, "\\'")}', '${m.Tons}')">
                  <i class="fas fa-bookmark"></i>
                </button>
                <button class="btn-action btn-delete" onclick="excluir('${m.Músicas.replace(/'/g, "\\'")}', '${chave}', '${m.Cantor.replace(/'/g, "\\'")}')">
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

async function addHistorico(btn, musica, cantor, tom) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
        const res = await fetch(APP_CONFIG.SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "addHistory", musica, cantor, tom })
        });
        const dados = await res.json();
        if (dados.status === "success") {
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.classList.add('saved');
        } else {
            alert(dados.message);
            btn.innerHTML = '<i class="fas fa-bookmark"></i>';
        }
    } catch (e) { btn.innerHTML = '<i class="fas fa-bookmark"></i>'; }
}

async function addBulkHistorico(btn, jsonStr) {
    if (!confirm("Adicionar todas as músicas deste culto ao histórico? (Duplicatas serão ignoradas)")) return;
    const lista = JSON.parse(jsonStr);
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const res = await fetch(APP_CONFIG.SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "addHistory", data: lista })
        });
        const dados = await res.json();
        alert(dados.message);
    } catch (e) { alert("Erro na conexão."); }

    btn.innerHTML = original;
    btn.disabled = false;
}

async function excluir(musica, culto, cantor) {
    if (!confirm("Deseja realmente excluir esta música do repertório?")) return;

    const payload = { action: "delete", sheet: "Repertório", musica, culto, cantor };

    // 1. Atualiza UI imediatamente (Otimismo)
    SyncManager.updateLocalCache("Repertório", "delete", payload);
    render(JSON.parse(localStorage.getItem('offline_repertorio')));

    // 2. Adiciona Ã  fila de sincronizaÃ§Ã£o
    SyncManager.addToQueue(payload);
}

window.onload = () => carregarRepertorio();
