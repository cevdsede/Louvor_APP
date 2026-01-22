// AcessoMesa.js

const userAcesso = JSON.parse(localStorage.getItem('user_token') || '{}');
if (userAcesso.Role && !hasPermission(userAcesso.Role, "AcessoMesa.html", "page")) {
    window.location.href = '../../index.html';
}

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
window.onload = requestWakeLock;
