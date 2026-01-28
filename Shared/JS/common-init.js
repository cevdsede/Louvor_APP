// Common initialization for all pages
function initializeCommon() {
    console.log('Common initialization');
    
    // Initialize user data
    const userData = JSON.parse(localStorage.getItem('user_token') || '{}');
    if (userData.nome) {
        const userNameElement = document.getElementById('userNameSide');
        if (userNameElement) {
            userNameElement.textContent = userData.nome;
        }
        
        const userAvatarElement = document.getElementById('userAvatar');
        if (userAvatarElement) {
            userAvatarElement.textContent = userData.nome.charAt(0).toUpperCase();
        }
    }
    
    // Initialize theme system
    if (typeof applyTemaAtual === 'function') {
        applyTemaAtual();
    }
    
    // Initialize sync system only if available and if we're on a page that has sync elements
    if (typeof syncAllViews === 'function' && document.getElementById('escala-container')) {
        syncAllViews().catch(error => {
            console.log('Sync system not available or failed:', error.message);
        });
    }
}

// Page-specific initialization functions
function initializeDashboard() {
    console.log('Dashboard initialization');
    // Dashboard-specific initialization
}

function initializeEscalas() {
    console.log('Escalas initialization');
    // Escalas-specific initialization
    if (typeof carregarEscalas === 'function') {
        carregarEscalas();
    }
    if (typeof carregarCalendario === 'function') {
        carregarCalendario();
    }
    if (typeof carregarLimpeza === 'function') {
        carregarLimpeza();
    }
}

function initializeMusicas() {
    console.log('Musicas initialization');
    // Musicas-specific initialization
    if (typeof loadStats === 'function') {
        loadStats(true);
    }
    if (typeof carregarGraficos === 'function') {
        carregarGraficos();
    }
}

function initializeComponentes() {
    console.log('Componentes initialization');
    // Componentes-specific initialization
}

function initializeUtilitarios() {
    console.log('Utilitarios initialization');
    // Utilitarios-specific initialization
}

// Initialize common functionality when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeCommon();
});
