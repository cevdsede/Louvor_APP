const SCRIPT_URL = APP_CONFIG.SCRIPT_URL;

// AUTO LOGOUT - 24 horas
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

function checkSession() {
    const last = localStorage.getItem('last_activity');
    const now = Date.now();
    if (last && (now - parseInt(last) > SESSION_TIMEOUT)) {
        alert("Sessão expirada. Faça login novamente.");
        logout(true);
    }
    localStorage.setItem('last_activity', now.toString());
}

async function syncAllData() {
    const statusBox = document.getElementById('syncStatus');
    const progFill = document.getElementById('progFill');
    const progText = document.getElementById('progText');

    statusBox.style.display = 'block';

    const updateProgress = (pct, text) => {
        progFill.style.width = pct + '%';
        progText.innerText = text;
    };

    try {
        await performFetches(updateProgress);
        updateProgress(100, "Dados Atualizados!");
        initDashboard(); // Atualiza o gráfico após o sync manual
        setTimeout(() => { statusBox.style.display = 'none'; }, 1000);
    } catch (e) {
        console.error(e);
        updateProgress(0, "Erro ao conectar.");
        setTimeout(() => { statusBox.style.display = 'none'; }, 2000);
    }
}

// Background Sync (Silencioso)
async function backgroundSync() {
    try {
        console.log("Iniciando Sync em Segundo Plano...");
        await performFetches(() => { });
        console.log("Sync em Segundo Plano Concluído.");
    } catch (e) {
        console.error("Erro no background sync:", e);
    }
}

async function performFetches(progressCb) {
    try {
        progressCb(10, "Escalas...");
        const res1 = await fetch(SCRIPT_URL + "?sheet=Transformar");
        const data1 = await res1.json();
        if (data1 && data1.data) localStorage.setItem('offline_escala', JSON.stringify(data1.data));

        progressCb(30, "Repertório...");
        const res2 = await fetch(SCRIPT_URL + "?sheet=Repertório");
        const data2 = await res2.json();
        if (data2 && data2.data) localStorage.setItem('offline_repertorio', JSON.stringify(data2.data));

        progressCb(50, "Músicas...");
        const res3 = await fetch(SCRIPT_URL + "?sheet=Musicas");
        const data3 = await res3.json();
        if (data3 && data3.data) localStorage.setItem('offline_musicas', JSON.stringify(data3.data));

        progressCb(65, "Componentes...");
        const res4 = await fetch(SCRIPT_URL + "?sheet=Componentes");
        const data4 = await res4.json();
        if (data4 && data4.data) localStorage.setItem('offline_componentes', JSON.stringify(data4.data));

        progressCb(80, "Temas...");
        const resTemas = await fetch(SCRIPT_URL + "?sheet=" + encodeURIComponent("Tema Músicas"));
        const dataTemas = await resTemas.json();
        if (dataTemas && dataTemas.data) localStorage.setItem('offline_temas', JSON.stringify(dataTemas.data));

        progressCb(85, "Lembretes...");
        const resLemb = await fetch(SCRIPT_URL + "?sheet=Lembretes");
        const dataLemb = await resLemb.json();
        if (dataLemb && dataLemb.data) localStorage.setItem('offline_lembretes', JSON.stringify(dataLemb.data));

        progressCb(90, "Histórico...");
        const res5 = await fetch(SCRIPT_URL + "?sheet=" + encodeURIComponent("Historico de Músicas"));
        const data5 = await res5.json();
        if (data5 && data5.data) localStorage.setItem('offline_historico', JSON.stringify(data5.data));

        progressCb(95, "Imagens...");
        const res6 = await fetch(SCRIPT_URL + "?action=getImages");
        const data6 = await res6.json();
        if (data6 && data6.data) localStorage.setItem('offline_imagens', JSON.stringify(data6.data));

        const now = new Date();
        localStorage.setItem('last_full_sync', now.toISOString());

        // PROCESSA NOTIFICAÇÕES APÓS SYNC
        processarNotificacoes();
        initDashboard(); // Garante que o gráfico atualiza após sync pleno
        updateLastUpdateText();
    } catch (err) {
        console.error("Erro durante o fetch de dados:", err);
        throw err;
    }
}

function logout(force = false) {
    if (force || confirm("Deseja sair?")) {
        localStorage.removeItem('user_token');
        window.location.href = 'Login.html';
    }
}

function updateLastUpdateText() {
    const last = localStorage.getItem('last_full_sync');
    const el = document.getElementById('lastUpdateDate');
    if (last) {
        const d = new Date(last);
        el.innerText = "Última atualização: " + d.toLocaleString('pt-BR');
    } else {
        el.innerText = "Requer atualização inicial";
    }
}

let participacoesDetalhas = {};

function initDashboard() {
    const cached = localStorage.getItem('offline_escala');
    if (cached) {
        document.getElementById('dashLoader').style.display = 'none';
        processarERenderizar(JSON.parse(cached));
    } else {
        document.getElementById('dashLoader').innerHTML = "Aguardando sincronização...";
    }
}

function processarERenderizar(dados) {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const contagemMembros = {};
    const cultosUnicosGerais = new Set();
    participacoesDetalhas = {};

    dados.forEach(item => {
        // FILTRO GLOBAL DE CONVIDADOS
        if ((item.Nome && item.Nome.toUpperCase().includes("CONVIDADO")) ||
            (item["Função"] && item["Função"].toUpperCase().includes("CONVIDADO"))) {
            return;
        }

        const dataItem = new Date(item.Data);
        // O filtro de data foi removido para processar todos os itens

        const nome = item.Nome;
        const idCulto = item.Cultos;
        const nomeCulto = item["Nome dos Cultos"];
        const funcao = item["Função"];
        const dataFmt = dataItem.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        cultosUnicosGerais.add(idCulto);

        if (!contagemMembros[nome]) contagemMembros[nome] = new Set();
        contagemMembros[nome].add(idCulto);

        if (!participacoesDetalhas[nome]) participacoesDetalhas[nome] = {};
        if (!participacoesDetalhas[nome][idCulto]) {
            participacoesDetalhas[nome][idCulto] = { data: dataFmt, nomeCulto: nomeCulto, funcoes: [] };
        }
        if (!participacoesDetalhas[nome][idCulto].funcoes.includes(funcao)) {
            participacoesDetalhas[nome][idCulto].funcoes.push(funcao);
        }
    });

    const listaOrdenada = Object.keys(contagemMembros)
        .map(nome => ({ nome, total: contagemMembros[nome].size }))
        .sort((a, b) => b.total - a.total);

    document.getElementById('kpi-membros').innerText = listaOrdenada.length;
    document.getElementById('kpi-cultos').innerText = cultosUnicosGerais.size;

    // FUNÇÃO HELPER PARA NORMALIZAR TEXTO (remove acentos e diminui)
    const normalize = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    // CALCULAR PRÓXIMA ESCALA DO USUÁRIO
    const user = JSON.parse(localStorage.getItem('user_token') || '{}');
    // Tenta usar Nome ou User, o que tiver
    const rawNome = user.Nome || user.User || "";
    const meuNome = normalize(rawNome);

    // Verificação de debug (se quiser ver no console)
    console.log("Meu Nome Normalizado:", meuNome);

    const escalasUsuario = dados
        .filter(e => {
            if (!e.Nome || !meuNome) return false;
            const dataE = new Date(e.Data);
            // Ajusta timezone para evitar problemas de "ontem"
            dataE.setHours(dataE.getHours() + 12);

            const nomeEscala = normalize(e.Nome);

            // Match Bidirecional: "João" == "João Silva" ou "João Silva" == "João"
            const match = nomeEscala.includes(meuNome) || meuNome.includes(nomeEscala);

            // Data deve ser >= Hoje (zerado)
            return dataE >= hoje && match;
        })
        .sort((a, b) => new Date(a.Data) - new Date(b.Data));

    const kpiProxima = document.getElementById('kpi-proxima');
    if (escalasUsuario.length > 0) {
        const primeira = escalasUsuario[0];
        const dataRef = primeira.Data;
        const cultoRef = primeira["Nome dos Cultos"];

        // Pega todas as funções para o mesmo dia e culto
        const funcoes = escalasUsuario
            .filter(e => e.Data === dataRef && e["Nome dos Cultos"] === cultoRef)
            .map(e => e.Função);

        const funcoesUnicas = [...new Set(funcoes)].join(', ');
        const d = new Date(primeira.Data);
        const dataStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        kpiProxima.innerHTML = `
      <div style="font-weight:bold; color:var(--primary);">${cultoRef.split(' ')[0]} (${dataStr})</div>
      <div style="font-size:0.65rem; color:#7f8c8d; margin-top:2px;">Função: ${funcoesUnicas}</div>
    `;
        kpiProxima.style.fontSize = '0.9rem'; // Reset to base for the div structure
    } else {
        // Mostra quem ele tentou buscar para facilitar debug
        const nomeDisplay = user.Nome ? user.Nome.split(' ')[0] : 'Usuário';
        kpiProxima.innerHTML = `<span style="font-size:0.8rem">Nenhuma<br><small style="color:#bdc3c7">Login: ${nomeDisplay}</small></span>`;
        kpiProxima.style.fontSize = '1rem';
    }

    renderizarGrafico(listaOrdenada);
}

let currentChart = null;
function renderizarGrafico(lista) {
    const labels = lista.map(d => d.nome);
    const valores = lista.map(d => d.total);
    const cores = labels.map((_, i) => `hsla(${200 + (i * 10)}, 70%, 50%, 0.85)`);

    const ctx = document.getElementById('escalaChart').getContext('2d');
    if (currentChart) currentChart.destroy();

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: valores,
                backgroundColor: cores,
                borderRadius: 5,
                // barThickness: 15, <--- APAGUE ESTA LINHA
                barPercentage: 0.7,    // Faz a barra ocupar 90% da largura da linha
                categoryPercentage: 1 // Diminui o espaço entre os grupos de linhas
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    abrirDetalhes(labels[index]);
                }
            },
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } } },
                y: { grid: { display: false }, ticks: { font: { weight: '600', size: 10 } } }
            }
        }
    });
}

function abrirDetalhes(nome) {
    document.getElementById('modalNome').innerText = nome;
    const cultosMembro = participacoesDetalhas[nome] || {};
    const container = document.getElementById('modalLista');
    const listaAgrupada = Object.values(cultosMembro);

    container.innerHTML = listaAgrupada.map(item => `
    <div class="detail-item">
      <div class="detail-top">
        <span class="detail-culto">${item.nomeCulto}</span>
        <span class="detail-date">${item.data}</span>
      </div>
      <span class="detail-funcoes"><i class="fas fa-tag"></i> ${item.funcoes.join(', ')}</span>
    </div>
  `).join('');
    document.getElementById('detailModal').style.display = 'flex';
}

function fecharModal() { document.getElementById('detailModal').style.display = 'none'; }

function applyPermissions() {
    if (userData.Role) {
        if (!hasPermission(userData.Role, "menuAcessoMesa", "menu")) {
            document.getElementById('menuAcessoMesa')?.classList.add('hidden-permission');
        }
    }
}

window.onclick = (event) => {
    if (event.target == document.getElementById('detailModal')) fecharModal();
}

window.onload = () => {
    if (userData.Nome) document.getElementById('userName').innerText = userData.Nome;
    applyPermissions();
    updateLastUpdateText();
    checkSession();
    initDashboard();
    processarNotificacoes();
    solicitarPermisaoNotificacao();

    // Listener para atualizar o gráfico se os dados mudarem em outra aba/página
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        const banner = document.getElementById('installBanner');
        if (banner) banner.style.display = 'block';

        const btnInstall = document.getElementById('btnInstall');
        if (btnInstall) {
            btnInstall.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log(`Usuário respondeu à instalação: ${outcome}`);
                    deferredPrompt = null;
                    if (banner) {
                        banner.style.animation = 'slideDown 0.5s reverse forwards'; // Animação de saída
                        setTimeout(() => banner.style.display = 'none', 500);
                    }
                }
            });
        }
    });


    setTimeout(backgroundSync, 5000); // Primeiro sync após 5s
    setInterval(backgroundSync, 300000); // Repete a cada 5 min (300000ms)
};

function solicitarPermisaoNotificacao() {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

function mostrarNotificacaoNativa(titulo, corpo) {
    if ('Notification' in window && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(titulo, {
                body: corpo,
                icon: 'assets/backgroud.png',
                badge: 'assets/backgroud.png',
                vibrate: [300, 100, 300, 100, 300], // Vibração mais forte
                renotify: true, // Forçar notificação se o título for igual
                tag: 'louvor-app-rem'
            });
        });

        // Tentativa de tocar som (requer interação prévia do usuário)
        try {
            const audio = new Audio('https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3');
            audio.play().catch(e => console.log("Bloqueio de áudio automático:", e));
        } catch (e) { }
    }
}

// --- LOGICA DE NOTIFICAÇÕES ---
function processarNotificacoes() {
    const user = JSON.parse(localStorage.getItem('user_token') || '{}');
    const lastUserName = localStorage.getItem('last_user_name');
    const meuNome = (user.Nome || lastUserName || "").toLowerCase().trim();
    if (!meuNome) return;

    const escalas = JSON.parse(localStorage.getItem('offline_escala') || '[]');
    const lembretes = JSON.parse(localStorage.getItem('offline_lembretes') || '[]');
    const repertorios = JSON.parse(localStorage.getItem('offline_repertorio') || '[]');

    let notificacoes = JSON.parse(localStorage.getItem('user_notificacoes') || '[]');
    let conhecidasMaster = JSON.parse(localStorage.getItem('notificacoes_conhecidas_ids') || '[]');
    const hashesVisiveis = new Set(notificacoes.map(n => n.id));
    const hashesConhecidos = new Set(conhecidasMaster);

    let novosHashes = [];

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    // 1. Verificar Novas Escalas
    escalas.forEach(e => {
        const dataE = new Date(e.Data);
        if (dataE >= hoje && e.Nome.toLowerCase().trim().includes(meuNome)) {
            const id = `ESC-${e.Data}-${e.Cultos}-${e.Função}`;
            if (!hashesConhecidos.has(id)) {
                notificacoes.unshift({
                    id, type: 'escala', read: false, time: Date.now(),
                    msg: `Você foi escalado: ${e["Nome dos Cultos"]} (${dataE.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}) como ${e.Função}`
                });
                conhecidasMaster.push(id);
                hashesConhecidos.add(id);
                mostrarNotificacaoNativa("Nova Escala! 📅", `${e["Nome dos Cultos"]} como ${e.Função}`);
            }
        }
    });

    // 2. Verificar Avisos e Avisos Lider
    const meusCultosIds = new Set(escalas.filter(e => e.Nome.toLowerCase().trim().includes(meuNome)).map(e => e.Cultos));

    const isLiderOrAdmin = user.Role === 'Lider' || user.Role === 'Admin' || user.Role === 'SuperAdmin';

    lembretes.forEach(l => {
        const id = `AVISO-${l.id_Lembrete}`;
        if (hashesConhecidos.has(id)) return;

        // CASO 1: AVISO LIDER (Visível para Lider, Admin ou Autor)
        if (l.Culto === "AVISO_LIDER") {
            const isAuthor = l.Componente.toLowerCase().trim() === meuNome;

            if (isLiderOrAdmin || isAuthor) {
                notificacoes.unshift({
                    id, type: 'aviso_lider', read: false, time: Date.now(),
                    msg: `Aviso Lider de ${l.Componente}: "${l.Info}"`,
                    rawId: l.id_Lembrete, // Guardar ID original para delete server-side
                    isAuthor: isAuthor // Flag para saber se pode deletar
                });
                conhecidasMaster.push(id);
                hashesConhecidos.add(id);
                mostrarNotificacaoNativa("Aviso Lider 🔔", `${l.Componente}: ${l.Info}`);
            }
            return;
        }

        // CASO 2: AVISO NORMAL DE ESCALA
        // Verifica se o lembrete pertence a um culto onde estou
        const matchesMe = meusCultosIds.has(l.Culto.split('(')[0].trim()) || (l.Culto && meusCultosIds.has(l.Culto));
        let escalaMatch = escalas.find(e => l.Culto.includes(e["Nome dos Cultos"]) && l.Culto.includes(new Date(e.Data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })) && e.Nome.toLowerCase().trim().includes(meuNome));

        if (escalaMatch && l.Componente.toLowerCase().trim() !== meuNome) {
            notificacoes.unshift({
                id, type: 'aviso', read: false, time: Date.now(),
                msg: `Novo aviso no seu culto ${l.Culto}: ${l.Componente} disse "${l.Info}"`
            });
            conhecidasMaster.push(id);
            hashesConhecidos.add(id);
            mostrarNotificacaoNativa("Novo Aviso! 🔔", `${l.Componente}: ${l.Info}`);
        }
    });

    // 3. Verificar Repertório definido
    repertorios.forEach(r => {
        const id = `REP-${r["Culto+Data"]}-${r.Músicas}`;
        if (!hashesConhecidos.has(id)) {
            const matchMeuCulto = scalesMatchForRepertorio(r, escalas, meuNome);
            console.log(`Verificando: ${id}`);
            console.log(`Match com meu nome (${meuNome})?`, match);
            if (matchMeuCulto) {
                notificacoes.unshift({
                    id, type: 'musica', read: false, time: Date.now(),
                    msg: `Repertório definido para ${r["Culto+Data"]}: "${r.Músicas}"`
                });
                conhecidasMaster.push(id);
                hashesConhecidos.add(id);
                mostrarNotificacaoNativa("Repertório Definido! 🎶", `${r["Culto+Data"]}: ${r.Músicas}`);
            }
        }
    });

    // 4. Lembretes de Escala (1 dia antes e No Dia)
    escalas.forEach(e => {
        const dataE = new Date(e.Data);
        dataE.setHours(0, 0, 0, 0);
        const dataEStr = dataE.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        if (e.Nome.toLowerCase().trim().includes(meuNome)) {
            const diffDays = Math.ceil((dataE - hoje) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) { // Amanhã
                const id = `REM-1D-${e.Data}-${e.Cultos}`;
                if (!hashesConhecidos.has(id)) {
                    notificacoes.unshift({
                        id, type: 'escala', read: false, time: Date.now(),
                        msg: `Lembrete: Você está na escala de AMANHÃ (${dataEStr}) - ${e["Nome dos Cultos"]}`
                    });
                    conhecidasMaster.push(id);
                    hashesConhecidos.add(id);
                    mostrarNotificacaoNativa("Escala Amanhã! 📅", `Você toca amanhã no ${e["Nome dos Cultos"]}`);
                }
            } else if (diffDays === 0) { // Hoje
                const id = `REM-0D-${e.Data}-${e.Cultos}`;
                if (!hashesConhecidos.has(id)) {
                    notificacoes.unshift({
                        id, type: 'escala', read: false, time: Date.now(),
                        msg: `HOJE TEM ESCALA! (${dataEStr}) - ${e["Nome dos Cultos"]}. Não se atrase!`
                    });
                    conhecidasMaster.push(id);
                    hashesConhecidos.add(id);
                    mostrarNotificacaoNativa("É HOJE! 🎸", `Sua escala é hoje no ${e["Nome dos Cultos"]}!`);
                }
            }
        }
    });

    localStorage.setItem('user_notificacoes', JSON.stringify(notificacoes.slice(0, 50)));
    localStorage.setItem('notificacoes_conhecidas_ids', JSON.stringify(conhecidasMaster.slice(-500))); // Guarda os últimos 500 hashes
    atualizarBadge();
}

function scalesMatchForRepertorio(rep, escalas, meuNome) {
    // Verifica se o usuário está na escala do culto/data desse repertório
    return escalas.some(e => {
        const dataE = new Date(e.Data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const keyE = `${e.Cultos} (${dataE})`;
        return keyE === rep["Culto+Data"] && e.Nome.toLowerCase().trim().includes(meuNome);
    });
}

function atualizarBadge() {
    const notifs = JSON.parse(localStorage.getItem('user_notificacoes') || '[]');
    const unread = notifs.filter(n => !n.read).length;
    const b = document.getElementById('notifBadge');
    if (unread > 0) {
        b.innerText = unread > 9 ? '9+' : unread;
        b.style.display = 'block';
    } else {
        b.style.display = 'none';
    }
}

function abrirNotificacoes() {
    const notifs = JSON.parse(localStorage.getItem('user_notificacoes') || '[]');
    const container = document.getElementById('notifLista');

    if (notifs.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">Nenhuma notificação por enquanto.</div>';
    } else {
        container.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}">
        <span class="notif-type type-${n.type}">${n.type}</span>
        <div class="notif-msg">${n.msg}</div>
        <div class="notif-time">${new Date(n.time).toLocaleString('pt-BR')}</div>
        <div class="notif-actions">
          <button class="btn-notif-del" onclick="excluirNotificacao('${n.id}', event)">
            <i class="fas fa-trash"></i> Remover
          </button>
        </div>
      </div>
    `).join('');
    }
    document.getElementById('notifModal').style.display = 'flex';
}

async function excluirNotificacao(id, event) {
    if (event) event.stopPropagation();
    let notifs = JSON.parse(localStorage.getItem('user_notificacoes') || '[]');
    const target = notifs.find(n => n.id === id);

    // DELETAR DO SERVIDOR? (Apenas Aviso Lider)
    if (target && target.type === 'aviso_lider') {
        const user = JSON.parse(localStorage.getItem('user_token') || '{}');
        const isLiderOrAdmin = user.Role === 'Lider' || user.Role === 'Admin' || user.Role === 'SuperAdmin';
        const isAuthor = target.isAuthor;

        if (isLiderOrAdmin || isAuthor) {
            if (confirm("Deseja apagar este aviso para TODOS (do servidor)?")) {
                try {
                    // Feedback visual
                    if (event && event.target) {
                        event.target.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    }

                    await fetch(SCRIPT_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: "delete",
                            sheet: "Lembretes",
                            id_Lembrete: target.rawId
                        })
                    });
                    alert("Aviso removido do servidor!");
                } catch (e) {
                    alert("Erro ao apagar do servidor. Apagando apenas localmente.");
                }
            }
        }
    }

    notifs = notifs.filter(n => n.id !== id);
    localStorage.setItem('user_notificacoes', JSON.stringify(notifs));
    abrirNotificacoes(); // Re-renderiza o modal
    atualizarBadge();
}

function limparNotificacoesLidas() {
    if (!confirm("Deseja remover todas as notificações lidas?")) return;
    let notifs = JSON.parse(localStorage.getItem('user_notificacoes') || '[]');
    notifs = notifs.filter(n => !n.read);
    localStorage.setItem('user_notificacoes', JSON.stringify(notifs));
    abrirNotificacoes();
    atualizarBadge();
}

function fecharNotificacoes() {
    document.getElementById('notifModal').style.display = 'none';
    marcarTodasLidas();
}

function marcarTodasLidas() {
    let notifs = JSON.parse(localStorage.getItem('user_notificacoes') || '[]');
    notifs.forEach(n => n.read = true);
    localStorage.setItem('user_notificacoes', JSON.stringify(notifs));
    atualizarBadge();
    const items = document.querySelectorAll('.notif-item');
    items.forEach(i => i.classList.remove('unread'));
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').then(reg => {
        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    showUpdateToast();
                }
            });
        });
    }).catch((err) => console.log('Erro Service Worker:', err));
}

function showUpdateToast() {
    // Remove se já existir algum para não duplicar
    const existing = document.getElementById('update-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'update-toast';

    // Estilização corrigida
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '30px',
        left: '20px',
        right: '20px',
        background: 'rgba(44, 62, 80, 0.95)',
        backdropFilter: 'blur(10px)',
        webkitBackdropFilter: 'blur(10px)',
        color: '#fff',
        padding: '16px 20px',
        borderRadius: '16px',
        zIndex: '10000',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)'
    });

    // HTML com crases para evitar erro de aspas
    toast.innerHTML = `
<div style="display:flex; align-items:center; gap:12px">
  <div style="background:#3498db; width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center">
    <i class="fas fa-cloud-download-alt"></i>
  </div>
  <div>
    <strong style="display:block; font-size:14px">Atualização Disponível</strong>
    <small style="opacity:0.8; font-size:12px">Novos recursos instalados!</small>
  </div>
</div>
<button id="btn-refresh-app" 
        style="background:#3498db; border:none; color:white; padding:10px 18px; border-radius:10px; font-weight:bold; cursor:pointer">
  ATUALIZAR
</button>
`;

    document.body.appendChild(toast);

    // Adiciona o evento de clique de forma separada para evitar erro de aspas no HTML
    document.getElementById('btn-refresh-app').addEventListener('click', function () {
        this.innerHTML = '<i class="fas fa-sync fa-spin"></i>';
        window.location.reload();
    });
}


let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    const banner = document.getElementById('installBanner');
    banner.style.display = 'block';

    // Lógica para o botão INSTALAR
    document.getElementById('btnInstall').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
            fecharBanner();
        }
    });

    // Lógica para o botão FECHAR (X)
    document.getElementById('closeInstallBanner').addEventListener('click', (e) => {
        e.stopPropagation(); // Evita disparar cliques indesejados
        fecharBanner();
    });
});

// Função auxiliar para esconder o banner com animação
function fecharBanner() {
    const banner = document.getElementById('installBanner');
    banner.style.animation = 'slideDown 0.4s reverse forwards';
    setTimeout(() => {
        banner.style.display = 'none';
    }, 400);
}

function abrirModalAvisoGeral() {
    document.getElementById('textoAvisoGeral').value = "";
    document.getElementById('avisoGeralModal').style.display = 'flex';
}

function fecharModalAvisoGeral() {
    document.getElementById('avisoGeralModal').style.display = 'none';
}

async function enviarAvisoGeral() {
    const text = document.getElementById('textoAvisoGeral').value.trim();
    const btn = document.getElementById('btnEnviarAvisoGeral');

    if (!text) {
        alert("Digite o texto do aviso!");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    const payload = {
        action: "add",
        sheet: "Lembretes",
        id_Lembrete: "AVISO-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
        Componente: userData.Nome || "Admin",
        Data: new Date().toLocaleDateString('pt-BR'),
        Culto: "AVISO_LIDER",
        Info: text
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const res = await response.json();
        if (res.status === "success") {
            alert("Aviso enviado com sucesso!");
            fecharModalAvisoGeral();
            backgroundSync(); // Atualiza localmente
        } else {
            alert("Erro ao enviar: " + res.message);
        }
    } catch (e) {
        alert("Erro de conexão.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'ENVIAR AVISO';
    }
}

function abrirModalPerfil() {
    const user = JSON.parse(localStorage.getItem('user_token') || '{}');
    document.getElementById('editNome').value = user.Nome || "";
    document.getElementById('perfilModal').style.display = 'flex';
}

function fecharModalPerfil() {
    document.getElementById('perfilModal').style.display = 'none';
}

async function salvarPerfil() {
    const btn = document.getElementById('btnSalvarPerfil');
    const nome = document.getElementById('editNome').value.trim();
    const senha = document.getElementById('editSenha').value.trim();

    // Pegamos o nome que está salvo atualmente no sistema antes de mudar
    const userData = JSON.parse(localStorage.getItem('user_token') || '{}');
    const originalNome = userData.Nome;

    if (!nome || !senha) {
        alert("Preencha todos os campos!");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: "updateUser",
                nome: nome,
                user: userData.User,
                senha: senha,
                originalNome: originalNome
            })
        });

        const result = await response.json();

        if (result.status === "success") {
            alert("Perfil atualizado! O app será reiniciado.");
            // Limpa o token e desloga para o usuário entrar com os novos dados
            localStorage.removeItem('user_token');
            window.location.reload();
        } else {
            alert("Erro: " + result.message);
        }
    } catch (e) {
        alert("Erro de conexão.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'SALVAR ALTERAÇÕES';
    }
}

const initAppVersion = () => {
    const el = document.getElementById('appVersion');
    if (el) el.innerText = `Versão v${APP_CONFIG.VERSION}`;
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppVersion);
} else {
    initAppVersion();
}
