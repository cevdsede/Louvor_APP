const SCRIPT_URL = APP_CONFIG.SCRIPT_URL;
let tsTema, tsEstilo;

// 1. Carregar os temas da aba "Tema Músicas" ao abrir a página
async function loadTemas() {
    const select = document.getElementById('temaSelect');
    const cached = localStorage.getItem('offline_temas');
    let data = [];

    if (cached) {
        data = JSON.parse(cached);
    } else {
        try {
            const response = await fetch(SCRIPT_URL + "?sheet=" + encodeURIComponent("Tema Músicas"));
            const json = await response.json();
            data = json.data;
            localStorage.setItem('offline_temas', JSON.stringify(data));
        } catch (e) {
            console.error("Erro ao carregar temas:", e);
        }
    }

    const options = (data || []).filter(item => {
        let nomeTema = Object.values(item)[0];
        return nomeTema && nomeTema !== "Tema";
    }).map(item => {
        let nomeTema = Object.values(item)[0];
        return { value: nomeTema, text: nomeTema };
    });

    if (tsTema) tsTema.destroy();
    tsTema = new TomSelect("#temaSelect", {
        options: options,
        placeholder: "Selecione o tema...",
        create: false
    });

    if (tsEstilo) tsEstilo.destroy();
    tsEstilo = new TomSelect("#estiloSelect", {
        placeholder: "Selecione o estilo...",
        create: false
    });
}

// Auxiliar de Formatação
function toTitleCase(str) {
    if (!str) return "";
    return str.toLowerCase().split(' ').map(word => {
        if (word.length <= 2 && ["de", "da", "do", "dos", "das", "e"].includes(word)) return word;
        return (word.charAt(0).toUpperCase() + word.slice(1));
    }).join(' ');
}

// 2. Lógica de envio do formulário
document.getElementById('musicForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const btn = document.getElementById('btnSubmit');
    const status = document.getElementById('status');
    const formData = new FormData(this);
    const data = {};

    formData.forEach((v, k) => {
        let val = v.toString().trim();
        // Formatação: Primeira letra maiúscula de cada palavra
        if (k === "Musica" || k === "Cantor") val = toTitleCase(val);
        data[k] = val;
    });

    // VALIDAÇÃO DE DUPLICATAS
    const musicasExistentes = JSON.parse(localStorage.getItem('offline_musicas') || '[]');
    const jaExiste = musicasExistentes.find(m =>
        (m.Musica || m.MusicaCorigida || "").toLowerCase().trim() === data.Musica.toLowerCase().trim() &&
        (m.Cantor || m["Cantor Corrigido"] || "").toLowerCase().trim() === data.Cantor.toLowerCase().trim()
    );

    if (jaExiste) {
        alert("⚠️ Esta música já está cadastrada para este cantor!");
        return;
    }

    // Adiciona campos obrigatórios para o SyncManager se não estiverem no form
    if (!data.action) data.action = "addRow";
    if (!data.sheet) data.sheet = "Musicas";

    // 1. Atualização Otimista local
    SyncManager.updateLocalCache("Musicas", "add", data);

    // 2. Adiciona na fila de sincronização
    SyncManager.addToQueue(data);

    // Notifica a página pai para atualizar os dados em background
    if (window.parent) {
        window.parent.postMessage({ action: 'saved' }, '*');
    }

    // 3. UI Feedback
    status.innerText = "✅ Música salva localmente!";
    status.className = "msg-success";
    status.style.display = "block";

    const isModal = document.body.classList.contains('is-modal') || new URLSearchParams(window.location.search).get('modal') === 'true';

    if (isModal) {
        status.innerText += " Retornando ao repertório...";
        setTimeout(() => {
            handleBack();
        }, 1200);
    } else {
        // Reset form and TomSelects se não estiver no modal
        this.reset();
        if (tsTema) tsTema.clear();
        if (tsEstilo) tsEstilo.clear();
    }

    if (!navigator.onLine) {
        status.innerText = "☁️ Modo Offline: Salvo localmente. Sincronizará ao voltar conexão.";
    }
});

function handleBack() {
    const urlParams = new URLSearchParams(window.location.search);
    let source = urlParams.get('source');
    const isModal = document.body.classList.contains('is-modal') || urlParams.get('modal') === 'true';

    if (!source) source = 'Cadastro de Repertorio.html';

    // Se estiver no modal, garante que o destino saiba disso
    if (isModal && !source.includes('modal=true')) {
        source += (source.includes('?') ? '&' : '?') + 'modal=true';
    }

    console.log("Navegando de volta para:", source);
    window.location.href = source;
}

// Iniciar carregamento dos temas
window.addEventListener('DOMContentLoaded', loadTemas);
