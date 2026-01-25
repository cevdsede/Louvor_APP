// MenuUtilitarios.js logic

const user = JSON.parse(localStorage.getItem('user_token') || '{}');
const role = user.Perfil || user.Role || 'User';

// Mostrar botão de chamada para Admin e Lider
if (role === 'Admin' || role === 'Lider') {
    const btnChamada = document.getElementById('btnChamada');
    if (btnChamada) {
        btnChamada.style.display = 'flex';
    }
}

// Mostrar botões admin apenas para Admin
if (role === 'Admin') {
    const btnDashboard = document.getElementById('btnDashboard');
    const btnMetrics = document.getElementById('btnMetrics');
    
    if (btnDashboard) {
        btnDashboard.style.display = 'flex';
    }
    
    if (btnMetrics) {
        btnMetrics.style.display = 'flex';
    }
}

// Funções para abrir dashboards
function abrirDashboard() {
    if (window.AdvancedDashboard) {
        window.AdvancedDashboard.renderDashboard(document.body);
    } else {
        alert('Dashboard não disponível. Verifique se o módulo foi carregado.');
    }
}

function abrirMetrics() {
    if (window.AdminMetrics) {
        window.AdminMetrics.toggle();
    } else {
        alert('Painel de métricas não disponível. Verifique se o módulo foi carregado.');
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

// Atalho Ctrl+Shift+M para Painel de Métricas (apenas para Admin)
if (role === 'Admin') {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'M') {
            e.preventDefault();
            abrirMetrics();
        }
    });
}
