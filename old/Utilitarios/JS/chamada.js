// Chamada.js
let allEvents = [];
let allComponents = [];
let currentEvent = null;
let attendanceData = {};
let currentCompJustifying = null;

document.getElementById('btnBack').addEventListener('click', () => {
    const viewAttendance = document.getElementById('viewAttendance');
    if (viewAttendance && (viewAttendance.style.display === 'flex' || viewAttendance.style.display === 'block')) {
        showView('events');
        fetchData(true); // silent refresh
    } else {
        window.location.href = 'MenuUtilitarios.html';
    }
});

// --- TEMA ---
function confirmingTema() {
    if (window.tempThemeId) {
        localStorage.setItem('tema_escolhido_id', window.tempThemeId);
    }
    toggleThemePanel();
    if (window.aplicarTemaAtual) aplicarTemaAtual();
}
window.confirmarTema = confirmingTema;

async function init() {
    await fetchData();
    // SÃ³ muda para 'events' se nÃ£o houver aula aberta (ex: primeiro load)
    if (!currentEvent) showView('events');
}

async function fetchData(silent = false) {
    const btnIcon = document.querySelector('.nav-btn.fa-sync-alt, .header-right-nav i.fa-sync-alt, .header-right i.fa-sync-alt');
    if (btnIcon) btnIcon.classList.add('fa-spin');
    try {
        // Eventos do Supabase
        console.log("🔄 Buscando eventos via Supabase...");
        allEvents = await supabaseFetch('eventos');
        localStorage.setItem('offline_eventos_chamada', JSON.stringify(allEvents));
        renderEvents();

        // Componentes (Membros)
        console.log("🔄 Buscando membros via Supabase...");
        const members = await supabaseFetch('membros');
        localStorage.setItem('offline_componentes', JSON.stringify(members));

        allComponents = members.filter(c => {
            const nome = (c.nome || c.Nome || "").toUpperCase().trim();
            const ativo = String(c.ativo || c.Ativo || "").toUpperCase().trim();
            return nome !== "CONVIDADO" && ativo === "SIM";
        });

        // Presenças em background
        console.log("🔄 Buscando presenças via Supabase...");
        const presencas = await supabaseFetch('presenca_consagracao');
        localStorage.setItem('offline_chamada', JSON.stringify(presencas));

        if (!silent) {
            showToast("Chamada sincronizada com sucesso!", 'success');
        }

    } catch (e) {
        console.error("Fetch Error:", e);
        if (!silent) {
            showToast("Erro ao sincronizar chamada.", 'error');
        }
    } finally {
        if (btnIcon) btnIcon.classList.remove('fa-spin');
    }
}

function renderEvents() {
    const container = document.getElementById('eventsList');
    if (allEvents.length === 0) {
        container.innerHTML = '<div class="text-center py-5 text-muted">Nenhuma aula cadastrada.</div>';
        return;
    }
    const sorted = [...allEvents].sort((a, b) => new Date(b.DATA || b.Data) - new Date(a.DATA || a.Data));

    container.innerHTML = sorted.map(ev => `
        <div class="event-card">
            <div class="event-info-box" onclick="openAttendance('${ev.id_evento || ev.ID_EVENTO || ev.id}')">
                <span class="event-title">${ev.TEMA || ev.Tema}</span>
                <span class="event-subtitle">
                    <i class="far fa-calendar-alt"></i> ${formatDate(ev.DATA || ev.Data)}
                </span>
            </div>
            <div class="btn-action-icon" onclick="deleteEvent('${ev.id_evento || ev.id}', '${ev.TEMA || ev.Tema}')">
                <i class="fas fa-trash-alt"></i>
            </div>
        </div>
    `).join('');
}

async function deleteEvent(id, theme) {
    if (!confirm(`Excluir permanentemente a aula "${theme}"?`)) return;
    SyncManager.addToQueue({
        action: "delete",
        sheet: "Eventos",
        data: { id_evento: id }
    });
    allEvents = allEvents.filter(e => (e.id_evento || e.id) !== id);
    localStorage.setItem('offline_eventos_chamada', JSON.stringify(allEvents));
    renderEvents();
}

async function openAttendance(id) {
    currentEvent = allEvents.find(e => (e.id_evento || e.id) === id);
    if (!currentEvent) return;

    document.getElementById('displayTheme').innerText = currentEvent.TEMA || currentEvent.Tema;
    document.getElementById('displayDate').innerText = formatDate(currentEvent.DATA || currentEvent.Data);

    attendanceData = {};
    const cachedPres = localStorage.getItem('offline_chamada');
    let existing = cachedPres ? JSON.parse(cachedPres).filter(c => c.id_evento === id) : [];

    if (existing.length > 0) {
        existing.forEach(c => {
            attendanceData[c.NOME] = { status: c.PRESENÇA || 'AUSENTE', text: (c.COMPONENTES || c.Justificativa) || '' };
        });
    } else {
        allComponents.filter(c => String(c.Ativo).toUpperCase().trim() === "SIM")
            .forEach(c => attendanceData[c.Nome] = { status: 'AUSENTE', text: '' });
    }

    renderComponents();
    showView('attendance');
    window.scrollTo(0, 0);
}

function renderComponents() {
    const container = document.getElementById('compList');
    const cachedImg = localStorage.getItem('offline_imagens');
    const dbImg = cachedImg ? JSON.parse(cachedImg) : [];
    const names = Object.keys(attendanceData).sort();
    let p = 0, a = 0, j = 0;

    container.innerHTML = names.map(name => {
        const comp = allComponents.find(c => c.Nome === name) || { Nome: name };

        // Extrai o nome do arquivo da URL de forma mais robusta
        let nomeArquivo = "";
        if (comp.Foto) {
            const urlParts = comp.Foto.split('/');
            nomeArquivo = urlParts.pop() || urlParts.pop();
            if (nomeArquivo.includes('id=')) {
                nomeArquivo = nomeArquivo.split('id=').pop().split('&')[0];
            }
        }

        const urlLocal = `../../assets/equipe/${comp.nome || comp.Nome}.png`;

        // SMART SEARCH: Tenta encontrar a foto de forma inteligente
        const fotoObj = dbImg.find(img => {
            // 1. Match exato por ID (da planilha) ou Nome do Arquivo (puro)
            if (nomeArquivo && (img.id === nomeArquivo || img.nome === nomeArquivo)) return true;

            // 2. Match por link direto
            if (comp.Foto && img.id && comp.Foto.includes(img.id)) return true;

            // 3. Match Inteligente por Nome (Ignora .Foto.123, .png, etc)
            const nomeMembroNorm = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            const nomeFotoNorm = (img.nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .split('.foto.')[0].split('.')[0].replace(/[-_]/g, ' ').trim();

            if (!nomeFotoNorm || !nomeMembroNorm) return false;

            // Match exato após normalização (Evita "Gabriel" match "Anne Gabrielly")
            return nomeFotoNorm === nomeMembroNorm;
        });

        const urlDrive = fotoObj ? fotoObj.url : null;
        const avatarPlaceholder = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
        const finalImgSrc = urlDrive || avatarPlaceholder;

        const status = attendanceData[name].status;
        if (status === 'PRESENTE') p++; else if (status === 'JUSTIFICADO') j++; else a++;

        return `
            <div class="member-card state-${status[0]}">
                <img src="${urlLocal}" onerror="this.onerror=null; this.src='${urlDrive}';" class="member-avatar">
                <span class="member-name">${name}</span>
                <div class="action-group">
                    <button class="btn-status p ${status === 'PRESENTE' ? 'active' : ''}" onclick="setStatus('${name}', 'PRESENTE')"><i class="fas fa-check"></i></button>
                    <button class="btn-status a ${status === 'AUSENTE' ? 'active' : ''}" onclick="setStatus('${name}', 'AUSENTE')"><i class="fas fa-times"></i></button>
                    <button class="btn-status j ${status === 'JUSTIFICADO' ? 'active' : ''}" onclick="openJustifyModal('${name}')"><i class="fas fa-file-alt"></i></button>
                    <button class="btn-status btn-remove" onclick="removeMember('${name}')"><i class="fas fa-user-minus"></i></button>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('countPresent').innerText = p;
    document.getElementById('countAbsent').innerText = a;
    document.getElementById('countJustified').innerText = j;
}

function setStatus(name, status) {
    attendanceData[name].status = status;
    if (status !== 'JUSTIFICADO') attendanceData[name].text = '';
    renderComponents();
}

function removeMember(name) {
    if (confirm(`Remover "${name}" desta aula?`)) {
        delete attendanceData[name];
        renderComponents();
    }
}

function openJustifyModal(name) {
    currentCompJustifying = name;
    document.getElementById('justifyWorkerName').innerText = name;
    document.getElementById('justifyText').value = attendanceData[name]?.text || '';
    openModal('modalJustify');
}

function confirmJustify() {
    const val = document.getElementById('justifyText').value.trim();
    if (!val) return showToast("Insira o motivo.", 'warning');
    attendanceData[currentCompJustifying] = { status: 'JUSTIFICADO', text: val };
    closeModal('modalJustify');
    renderComponents();
}

function openAddInactiveModal() {
    const select = document.getElementById('selectInactive');
    const currentNames = Object.keys(attendanceData);
    const candidates = allComponents.filter(c => !currentNames.includes(c.Nome)).sort((a, b) => a.Nome.localeCompare(b.Nome));

    if (candidates.length === 0) return showToast("Todos os membros já estão na lista.", 'info');

    select.innerHTML = candidates.map(c => `<option value="${c.Nome}">${c.Nome} (${c.Função})</option>`).join('');
    openModal('modalAddInactive');
}

function addInactiveToAttendance() {
    const name = document.getElementById('selectInactive').value;
    if (name) {
        attendanceData[name] = { status: 'AUSENTE', text: '' };
        renderComponents();
        closeModal('modalAddInactive');
    }
}

async function saveNewEvent() {
    const date = document.getElementById('eventDate').value;
    const theme = document.getElementById('eventTheme').value.trim();
    if (!date || !theme) return showToast("Preencha todos os campos.", 'warning');
    const id = Math.random().toString(16).substring(2, 10);
    const ev = {
        data: date,
        tema: theme,
        id_evento: id,
        status: "FECHADO"
    };
    SyncManager.addToQueue({
        action: "addRow",
        sheet: "Eventos",
        data: ev
    });
    allEvents.unshift(ev);
    localStorage.setItem('offline_eventos_chamada', JSON.stringify(allEvents));
    renderEvents();
    closeModal('modalEvent');
}

document.getElementById('btnSaveAttendance').addEventListener('click', () => {
    const names = Object.keys(attendanceData);
    if (names.length === 0) return showToast("Lista vazia.", 'warning');

    const idEvento = currentEvent.id_evento || currentEvent.id;

    const batch = names.map(n => ({
        justificativa: attendanceData[n].text || "",
        nome: n,
        presenca: attendanceData[n].status,
        id_evento: idEvento
    }));

    // Envia o lote de presenças via SyncManager (lógica customizada ou múltiplos addRow)
    // Para simplificar, usaremos uma ação dedicada no SyncManager se possível, ou enviaremos um por um
    batch.forEach(item => {
        SyncManager.addToQueue({
            action: "addRow",
            sheet: "Presenças",
            data: item
        });
    });

    const cache = JSON.parse(localStorage.getItem('offline_chamada') || '[]');
    const cleaned = cache.filter(c => c.id_evento !== idEvento);
    localStorage.setItem('offline_chamada', JSON.stringify([...cleaned, ...batch]));
    showToast("Chamada sincronizada e salva localmente!");
    showView('events');
});

function showView(v) {
    document.getElementById('viewEvents').style.display = v === 'events' ? 'block' : 'none';
    document.getElementById('viewAttendance').style.display = v === 'attendance' ? 'block' : 'none';
    document.getElementById('pageTitle').innerText = v === 'events' ? 'Chamada Consagração' : 'Realizar Chamada';
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function openCreateModal() {
    document.getElementById('eventDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('eventTheme').value = '';
    openModal('modalEvent');
}
function formatDate(s) { if (!s) return ""; return new Date(s).toLocaleDateString('pt-BR'); }
window.onclick = e => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; };
window.onload = init;
