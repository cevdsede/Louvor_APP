// AcessoMesa.js

const userAcesso = JSON.parse(localStorage.getItem('user_token') || '{}');
if (userAcesso.Role && !hasPermission(userAcesso.Role, "AcessoMesa.html", "page")) {
    window.location.href = '../../index.html';
}

const MESA_URL = 'http://10.10.10.2';

// WAKE LOCK API - Manter tela ligada
let wakeLock = null;

async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock ativo: Tela nÃ£o desligarÃ¡.');
        } catch (err) {
            console.error(`Erro Wake Lock: ${err.name}, ${err.message}`);
        }
    } else {
        console.log("Wake Lock nÃ£o suportado neste navegador.");
    }
}

function shouldEmbedMesaIframe() {
    const host = (window.location.hostname || '').toLowerCase();
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    // Em HTTP (ex.: servido localmente), o iframe tende a funcionar.
    // Em HTTPS (ex.: GitHub Pages), o navegador bloqueia HTTP dentro de iframe (Mixed Content).
    return window.location.protocol === 'http:' || isLocalHost;
}

function setupMesaAccessUI() {
    const iframeContainer = document.getElementById('mesaIframeContainer');
    const iframe = document.getElementById('mesaIframe');
    const openBtn = document.getElementById('openMesaBtn');
    const openNewTabBtn = document.getElementById('openMesaNewTabBtn');
    const statusTitle = document.getElementById('mesaStatusTitle');

    if (openBtn) openBtn.setAttribute('href', MESA_URL);
    if (openNewTabBtn) openNewTabBtn.setAttribute('href', MESA_URL);
    if (iframe) iframe.setAttribute('src', MESA_URL);

    const allowIframe = shouldEmbedMesaIframe();
    if (!allowIframe) {
        // HTTPS: esconder iframe para evitar tela vazia / erro de Mixed Content
        if (iframeContainer) iframeContainer.style.display = 'none';
        document.documentElement.classList.add('no-iframe');
        if (statusTitle) statusTitle.innerHTML = '<i class="fas fa-sliders-h"></i> Abra os controles da Mesa de Som';
    } else {
        // HTTP/localhost: manter iframe
        if (iframeContainer) iframeContainer.style.display = 'block';
        document.documentElement.classList.remove('no-iframe');
        if (statusTitle) statusTitle.innerHTML = '<i class="fas fa-microchip"></i> Conectando à Mesa de Som...';
    }

    // Em alguns PWAs (principalmente iOS), target="_blank" pode não abrir como esperado.
    // Mantemos um fallback: se window.open falhar, navega na mesma janela.
    if (openNewTabBtn) {
        openNewTabBtn.addEventListener('click', (e) => {
            // Só intercepta quando estamos em HTTPS, onde o iframe não funciona
            if (allowIframe) return;
            e.preventDefault();
            const w = window.open(MESA_URL, '_blank', 'noopener');
            if (!w) window.location.href = MESA_URL;
        });
    }
}

// Requisitar novamente se a visibilidade mudar (ex: minimizou e voltou)
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

function confirmingTema() {
    // In AcessoMesa, the original HTML used confirmarTema() but did NOT have a local implementation
    // relying on temas-core.js or inline which was empty?
    // Looking at file, lines 265 in HTML said: // No local theme scripts needed, uses temas-core.js
    // So temas-core.js should handle it if variables are set.
    // However, the button calls confirmarTema().
    // temas-core.js likely has applying logic but might not have the handler exposed if it expects inline.
    // Let's delegate to standard logic.
    if (window.tempThemeId) {
        localStorage.setItem('tema_escolhido_id', window.tempThemeId);
    }
    toggleThemePanel();
    if (window.aplicarTemaAtual) aplicarTemaAtual();
}

window.confirmarTema = confirmingTema;

window.addEventListener('DOMContentLoaded', () => {
    setupMesaAccessUI();
});

window.onload = requestWakeLock;
