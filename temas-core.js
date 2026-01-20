/**
 * Gerenciador de Temas Dinâmico - Louvor CEVD
 * Permite a troca de temas, persistência e aplicação GLOBAL agressiva.
 */

function aplicarTemaAtual() {
    if (typeof TEMAS_DISPONIVEIS === 'undefined') return;

    const temaId = localStorage.getItem('tema_escolhido_id') || 1;
    const tema = TEMAS_DISPONIVEIS[temaId];
    if (!tema) return;

    const root = document.documentElement;

    // 1. Configurar Variáveis CSS no :root
    const vars = {
        '--primary': tema.primary,
        '--secondary': tema.secondary || tema.primary,
        '--accent': tema.primary,
        '--bg': tema.bg,
        '--bg-override': tema.gradient || tema.bg,
        '--card-bg': tema.cardBg || '#ffffff',
        '--header-bg': tema.headerBg || '#ffffff',
        '--text-primary': tema.text || '#1e293b',
        '--text-muted': tema.textMuted || '#64748b',
        '--border-radius': tema.radius || '16px',
        '--card-shadow': tema.shadow || '0 4px 15px rgba(0,0,0,0.05)',
        '--card-border': tema.border || 'none',
        '--backdrop-blur': tema.blur || 'none',
        '--header-text': tema.headerText || tema.text || '#1e293b'
    };

    Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));

    // 2. Aplicar Fundo ao Body (Fallback e Pre-render)
    document.body.style.backgroundAttachment = "fixed";

    // 3. INJEÇÃO DE ESTILO GLOBAL
    let styleTag = document.getElementById('theme-global-overrides');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'theme-global-overrides';
        document.head.appendChild(styleTag);
    }

    styleTag.innerHTML = `
        body { 
            background: var(--bg-override) !important; 
            background-attachment: fixed !important;
            color: var(--text-primary) !important;
            transition: background 0.3s ease !important;
        }
        
        .header-bar, .premium-header { 
            background: var(--header-bg) !important; 
            backdrop-filter: var(--backdrop-blur) !important;
            border-bottom: 1px solid rgba(0,0,0,0.05) !important;
        }

        .header-title { color: var(--header-text) !important; }

        .nav-btn, .nav-icons i, .header-actions i {
            color: var(--header-text) !important;
        }

        .menu-item, .menu-card, .premium-card, .kpi-card, .glass-card, .comp-card, .dashboard-card, .chart-card {
            background: var(--card-bg) !important;
            border-radius: var(--border-radius) !important;
            box-shadow: var(--card-shadow) !important;
            border: var(--card-border) !important;
            color: var(--text-primary) !important;
            backdrop-filter: var(--backdrop-blur) !important;
        }

        .menu-item i, .menu-card i, .kpi-card i, .comp-card i {
            color: var(--primary) !important;
        }

        .menu-item span, .menu-card span, .kpi-card span, .comp-card span {
            color: var(--text-primary) !important;
        }

        .btn-premium, .btn-sync, .apply-btn {
            background: var(--primary) !important;
            border-radius: var(--border-radius) !important;
            color: #ffffff !important;
        }

        .premium-input {
            border-radius: 12px !important;
            background: var(--bg) !important;
            color: var(--text-primary) !important;
        }
    `;

    localStorage.setItem('tema_atual_nome', tema.nome);
}

/**
 * Troca o tema globalmente
 */
function mudarTema(id) {
    if (typeof TEMAS_DISPONIVEIS === 'undefined' || !TEMAS_DISPONIVEIS[id]) return;
    localStorage.setItem('tema_escolhido_id', id);
    aplicarTemaAtual();
    const panel = document.getElementById('themePanel');
    if (panel) panel.style.display = 'none';
}

// Inicialização segura
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicarTemaAtual);
} else {
    aplicarTemaAtual();
}

// Observer para casos de carregamento dinâmico
const themeObserver = new MutationObserver(() => {
    if (document.body) {
        aplicarTemaAtual();
        themeObserver.disconnect();
    }
});
themeObserver.observe(document.documentElement, { childList: true });