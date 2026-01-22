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
    try {
        // Eventos do Cache
        const cachedEvents = localStorage.getItem('offline_consagracao');
        if (cachedEvents) {
            allEvents = JSON.parse(cachedEvents);
            if (!silent) renderEvents();
        }

        // Busca Live
        const resEvents = await fetch(`${APP_CONFIG.SCRIPT_URL}?sheet=Consagração`);
        const dataEvents = await resEvents.json();
        allEvents = dataEvents.data || [];
        localStorage.setItem('offline_consagracao', JSON.stringify(allEvents));
        renderEvents();

        // Componentes
        const cachedComp = localStorage.getItem('offline_componentes');
        let components = cachedComp ? JSON.parse(cachedComp) : [];
        if (!cachedComp) {
            const r = await fetch(`${APP_CONFIG.SCRIPT_URL}?sheet=Componentes`);
            const d = await r.json();
            components = d.data;
            localStorage.setItem('offline_componentes', JSON.stringify(components));
        }

        allComponents = components.filter(c => {
            const nome = (c.Nome || "").toUpperCase().trim();
            const func = (c.Função || "").toUpperCase().trim();
            return nome !== "CONVIDADO" && func !== "CONVIDADO";
        });

        // Cache PresenÃ§as
        fetch(`${APP_CONFIG.SCRIPT_URL}?sheet=Comp_Cons`)
            .then(res => res.json())
            .then(json => localStorage.setItem('offline_chamada', JSON.stringify(json.data || [])))
            .catch(e => console.warn("Cache background fail", e));

    } catch (e) {
        console.error("Fetch Error:", e);
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
            <div class="event-info-box" onclick="openAttendance('${ev.ID_AULA || ev.ID}')">
                <span class="event-title">${ev.TEMA || ev.Tema}</span>
                <span class="event-subtitle">
                    <i class="far fa-calendar-alt"></i> ${formatDate(ev.DATA || ev.Data)}
                </span>
            </div>
            <div class="btn-action-icon" onclick="deleteEvent('${ev.ID_AULA || ev.ID}', '${ev.TEMA || ev.Tema}')">
                <i class="fas fa-trash-alt"></i>
            </div>
        </div>
    `).join('');
}

async function deleteEvent(id, theme) {
    if (!confirm(`Excluir permanentemente a aula "${theme}"?`)) return;
    SyncManager.addToQueue({ action: "deleteEvent", ID_AULA: id });
    allEvents = allEvents.filter(e => (e.ID_AULA || e.ID) !== id);
    localStorage.setItem('offline_consagracao', JSON.stringify(allEvents));
    renderEvents();
}

async function openAttendance(id) {
    currentEvent = allEvents.find(e => (e.ID_AULA || e.ID) === id);
    if (!currentEvent) return;

    document.getElementById('displayTheme').innerText = currentEvent.TEMA || currentEvent.Tema;
    document.getElementById('displayDate').innerText = formatDate(currentEvent.DATA || currentEvent.Data);

    attendanceData = {};
    const cachedPres = localStorage.getItem('offline_chamada');
    let existing = cachedPres ? JSON.parse(cachedPres).filter(c => c.ID_AULA === id) : [];

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
        const fotoPath = dbImg.find(img => img.nome === (comp.Foto || "").split('/').pop());
        const imgUrl = fotoPath ? fotoPath.url : "https://ui-avatars.com/api/?name=" + name + "&background=random";
        const status = attendanceData[name].status;
        if (status === 'PRESENTE') p++; else if (status === 'JUSTIFICADO') j++; else a++;

        return `
            <div class="member-card state-${status[0]}">
                <img src="${imgUrl}" class="member-avatar">
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
    if (!val) return alert("Insira o motivo.");
    attendanceData[currentCompJustifying] = { status: 'JUSTIFICADO', text: val };
    closeModal('modalJustify');
    renderComponents();
}

function openAddInactiveModal() {
    const select = document.getElementById('selectInactive');
    const currentNames = Object.keys(attendanceData);
    const candidates = allComponents.filter(c => !currentNames.includes(c.Nome)).sort((a, b) => a.Nome.localeCompare(b.Nome));

    if (candidates.length === 0) return alert("Todos os membros já estão na lista.");

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
    if (!date || !theme) return alert("Preencha todos os campos.");
    const id = Math.random().toString(16).substring(2, 10);
    const ev = { DATA: date, TEMA: theme, ID_AULA: id, STATUS: "FECHADO" };
    SyncManager.addToQueue({ action: "addRow", sheet: "Consagração", data: ev });
    allEvents.unshift(ev);
    localStorage.setItem('offline_consagracao', JSON.stringify(allEvents));
    renderEvents();
    closeModal('modalEvent');
}

document.getElementById('btnSaveAttendance').addEventListener('click', () => {
    const names = Object.keys(attendanceData);
    if (names.length === 0) return alert("Lista vazia.");
    const batch = names.map(n => ({
        "COMPONENTES": attendanceData[n].text || "",
        "NOME": n,
        "PRESENÇA": attendanceData[n].status,
        "ID_AULA": currentEvent.ID_AULA || currentEvent.ID
    }));
    SyncManager.addToQueue({ action: "saveAttendance", ID_AULA: currentEvent.ID_AULA || currentEvent.ID, data: batch });
    const cache = JSON.parse(localStorage.getItem('offline_chamada') || '[]');
    const cleaned = cache.filter(c => c.ID_AULA !== (currentEvent.ID_AULA || currentEvent.ID));
    localStorage.setItem('offline_chamada', JSON.stringify([...cleaned, ...batch]));
    alert("Sincronizando chamada...");
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
