// MenuUtilitarios.js logic

const user = JSON.parse(localStorage.getItem('user_token') || '{}');
const role = user.Perfil || user.Role || 'User';

if (role === 'Admin' || role === 'Lider') {
    const btnChamada = document.getElementById('btnChamada');
    if (btnChamada) {
        btnChamada.style.display = 'flex';
    }
}

function confirmingTema() {
    localStorage.setItem('tema_escolhido_id', tempThemeId);
    toggleThemePanel(); // defined in temas-core.js
    if (window.aplicarTemaAtual) aplicarTemaAtual();
}

// Override confirmingTema from HTML if needed, but the HTML called confirmarTema()
// We should match the name or ensure the HTML calls this. 
// The original HTML had: onclick="confirmarTema()"
window.confirmarTema = confirmingTema;
