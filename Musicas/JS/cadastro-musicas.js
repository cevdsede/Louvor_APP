// ATENÃ‡ÃƒO: Verifique se este Ã© o seu link atualizado do Web App
const SCRIPT_URL = APP_CONFIG.SCRIPT_URL;

// 1. Carregar os temas da aba "Tema Músicas" ao abrir a página
async function loadTemas() {
    const select = document.getElementById('temaSelect');
    const cached = localStorage.getItem('offline_temas');

    let data = [];

    if (cached) {
        data = JSON.parse(cached);
    } else {
        try {
            // Fallback se nÃ£o tiver cache
            const response = await fetch(SCRIPT_URL + "?sheet=" + encodeURIComponent("Tema MÃºsicas"));
            const json = await response.json();
            data = json.data;
            // Salva para proxima vez (embora o index.html seja o principal responsÃ¡vel)
            localStorage.setItem('offline_temas', JSON.stringify(data));
        } catch (e) {
            console.error("Erro ao carregar temas:", e);
            select.innerHTML = '<option value="">Erro ao conectar</option>';
            return;
        }
    }

    select.innerHTML = '<option value="">Selecione o tema...</option>';

    if (data && data.length > 0) {
        data.forEach(item => {
            let nomeTema = Object.values(item)[0];
            if (nomeTema && nomeTema !== "Tema") {
                let option = document.createElement('option');
                option.value = nomeTema;
                option.text = nomeTema;
                select.appendChild(option);
            }
        });
    }
}

// 2. LÃ³gica de envio do formulÃ¡rio
document.getElementById('musicForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const btn = document.getElementById('btnSubmit');
    const status = document.getElementById('status');
    const formData = new FormData(this);
    const data = {};

    formData.forEach((value, key) => data[key] = value);

    // 1. AtualizaÃ§Ã£o Otimista local
    SyncManager.updateLocalCache("Musicas", "add", data);

    // 2. Adiciona na fila de sincronizaÃ§Ã£o
    SyncManager.addToQueue(data);

    // 3. UI Feedback
    status.innerText = "✅ Música salva localmente!";
    status.className = "msg-success";
    status.style.display = "block";
    this.reset();

    if (!navigator.onLine) {
        status.innerText = "â˜ ï¸  Modo Offline: Salvo localmente. SincronizarÃ¡ ao voltar conexÃ£o.";
    }
});

function handleBack() {
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('source');
    if (source) {
        window.location.href = source;
    } else {
        window.location.href = 'Cadastro%20de%20Repertorio.html';
    }
}

// Iniciar carregamento dos temas
window.addEventListener('DOMContentLoaded', loadTemas);
