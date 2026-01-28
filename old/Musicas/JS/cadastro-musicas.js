const SCRIPT_URL = APP_CONFIG.SCRIPT_URL;
let tsTema, tsEstilo;

// 1. Carregar os temas da aba "Tema Músicas" ao abrir a página
async function loadTemas(force = false) {
    const btnIcon = document.querySelector('.nav-btn.fa-sync-alt, .header-right-nav i.fa-sync-alt, .header-right i.fa-sync-alt');
    if (btnIcon) btnIcon.classList.add('fa-spin');

    const select = document.getElementById('temaSelect');
    const cached = localStorage.getItem('offline_temas');
    let data = [];

    if (!force && cached) {
        data = JSON.parse(cached);
    } else {
        try {
            if (force) await new Promise(r => setTimeout(r, 500));
            // Usar helper global
            data = await supabaseFetch('temas');
            localStorage.setItem('offline_temas', JSON.stringify(data));

            if (force) {
                showToast("Temas sincronizados com sucesso!", 'success');
            }
        } catch (e) {
            console.error("Erro ao carregar temas:", e);
            if (force) {
                showToast("Erro ao sincronizar temas.", 'error');
            }
        }
    }

    const options = (data || []).map(item => {
        return { value: item.nome, text: item.nome };
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

    if (btnIcon) btnIcon.classList.remove('fa-spin');
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
    const rawData = {};

    formData.forEach((v, k) => {
        let val = v.toString().trim();
        if (k === "Musica" || k === "Cantor") val = toTitleCase(val);
        rawData[k] = val;
    });

    // VALIDAÇÃO DE DUPLICATAS
    const musicasExistentes = JSON.parse(localStorage.getItem('offline_musicas') || '[]');
    const jaExiste = musicasExistentes.find(m =>
        (m.musica || m.Musica || "").toLowerCase().trim() === rawData.Musica.toLowerCase().trim() &&
        (m.cantor || m.Cantor || "").toLowerCase().trim() === rawData.Cantor.toLowerCase().trim()
    );

    if (jaExiste) {
        showToast("⚠️ Esta música já está cadastrada para este cantor!", 'warning');
        return;
    }

    // MAPEAMENTO PARA SUPABASE (Campos em minúsculo)
    const supabaseData = {
        tema: rawData.Tema,
        estilo: rawData.Estilo,
        musica: rawData.Musica,
        cantor: rawData.Cantor
    };

    // 1. Atualização Otimista local (usando formato legado para compatibilidade visual imediata se necessário)
    // Mas o SyncManager agora vai salvar em minúsculo, então o cache deve seguir
    SyncManager.updateLocalCache("Musicas", "add", supabaseData);

    // 2. Adiciona na fila de sincronização
    SyncManager.addToQueue({
        action: "addRow",
        sheet: "Musicas",
        data: supabaseData
    });

    // Notifica a página pai
    if (window.parent) {
        window.parent.postMessage({ action: 'saved' }, '*');
    }

    // 3. UI Feedback
    status.innerText = "✅ Música salva localmente!";
    status.className = "msg-success";
    status.style.display = "block";

    const isModal = document.body.classList.contains('is-modal') || new URLSearchParams(window.location.search).get('modal') === 'true';

    if (isModal) {
        setTimeout(() => {
            handleBack();
        }, 1200);
    } else {
        this.reset();
        if (tsTema) tsTema.clear();
        if (tsEstilo) tsEstilo.clear();
    }

    if (!navigator.onLine) {
        status.innerText = "☁️ Modo Offline. Sincronizará ao voltar conexão.";
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
