/**
 * Gerenciador de Temas Dinâmico - Louvor CEVD
 * Permite a troca de temas, persistência e aplicação GLOBAL agressiva.
 */

var tempThemeId = localStorage.getItem('tema_escolhido_id') || 1;

// Helper para cores translúcidas
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
}

function aplicarTemaAtual(previewId = null) {
    if (typeof TEMAS_DISPONIVEIS === 'undefined') return;

    let temaId = previewId || localStorage.getItem('tema_escolhido_id') || 1;
    // Garante que o ID seja um número se possível
    if (temaId && !isNaN(temaId)) temaId = parseInt(temaId);

    const tema = TEMAS_DISPONIVEIS[temaId];
    if (!tema) return;

    const root = document.documentElement;

    // 1. Configurar Variáveis CSS no :root
    let headerText = tema.headerText || tema.text || '#1e293b';
    let headerBg = tema.headerBg || '#ffffff';

    // Safeguard: Se headerBg e headerText forem iguais ou muito parecidos (ex: ambos brancos), força contraste
    if (headerBg.toLowerCase().trim() === "#ffffff" && headerText.toLowerCase().trim() === "#ffffff") {
        headerText = "#1e293b";
    } else if (headerBg.toLowerCase().trim() === "#000000" && headerText.toLowerCase().trim() === "#000000") {
        headerText = "#ffffff";
    }

    const vars = {
        '--primary': tema.primary,
        '--secondary': tema.secondary || tema.primary,
        '--secondary-rgb': hexToRgb(tema.secondary || tema.primary) || '230, 126, 34',
        '--accent': tema.primary,
        '--bg': tema.bg,
        '--bg-override': tema.gradient || tema.bg,
        '--card-bg': tema.cardBg || '#ffffff',
        '--header-bg': headerBg,
        '--text-primary': tema.text || '#1e293b',
        '--text-muted': tema.textMuted || '#64748b',
        '--border-radius': tema.radius || '16px',
        '--card-shadow': tema.shadow || '0 4px 15px rgba(0,0,0,0.05)',
        '--card-border': tema.border || 'none',
        '--backdrop-blur': tema.blur || 'none',
        '--header-text': headerText,
        '--input-bg': (tema.nome.includes("Dark") || tema.nome.includes("Cyber") || tema.nome.includes("Black")) ? 'rgba(255,255,255,0.05)' : '#f8fafc',
        '--input-border': tema.border || '1px solid rgba(0,0,0,0.08)'
    };

    Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));

    // 2. Aplicar Fundo ao Body
    if (document.body) document.body.style.backgroundAttachment = "fixed";

    // 3. INJEÇÃO DE ESTILO GLOBAL
    let styleTag = document.getElementById('theme-global-overrides');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'theme-global-overrides';
        document.head.appendChild(styleTag);
    }

    styleTag.innerHTML = `
        html, body { 
            background: var(--bg-override) !important; 
            background-color: var(--bg) !important;
            background-attachment: fixed !important;
            color: var(--text-primary) !important;
            transition: background 0.3s ease, background-color 0.3s ease !important;
            min-height: 100vh;
        }
        
        .header-bar, .premium-header { 
            background: var(--glass, var(--header-bg)) !important; 
            backdrop-filter: blur(20px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
            border-bottom: 1px solid ${(tema.nome.includes("Dark") || tema.nome.includes("Cyber") || tema.headerText === "#ffffff") ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'} !important;
        }

        .header-title { color: var(--header-text) !important; }

        .nav-btn, .nav-icons i, .header-actions i, .header-left-nav i, .header-right-nav i {
            color: var(--header-text) !important;
            background: var(--card-bg) !important;
            border: 1px solid rgba(255,255,255,0.05) !important;
            opacity: 0.9;
        }

        .menu-item, .menu-card, .premium-card, .kpi-card, .glass-card, .comp-card, .dashboard-card, .chart-card {
            background: var(--card-bg) !important;
            border-radius: var(--border-radius) !important;
            box-shadow: var(--card-shadow) !important;
            border: var(--card-border) !important;
            color: var(--text-primary) !important;
            backdrop-filter: var(--backdrop-blur) !important;
        }

        .btn-premium, .btn-sync, .apply-btn, .btn-modal-action {
            background: var(--primary) !important;
            border-radius: var(--border-radius) !important;
            color: #ffffff !important;
        }

        .premium-input, .ts-control {
            background: var(--input-bg) !important;
            border: var(--input-border) !important;
            color: var(--text-primary) !important;
            border-radius: 12px !important;
        }
    `;

    if (!previewId) {
        localStorage.setItem('tema_atual_nome', tema.nome);
    }
}

/**
 * Funções do Painel de Temas
 */
function toggleThemePanel() {
    const panel = document.getElementById('themePanel');
    if (!panel) return;
    panel.style.display = (panel.style.display === 'block' ? 'none' : 'block');
    if (panel.style.display === 'block') renderThemeButtons();
}

function renderThemeButtons() {
    const grid = document.getElementById('themeButtonsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    Object.keys(TEMAS_DISPONIVEIS).forEach(id => {
        const tema = TEMAS_DISPONIVEIS[id];
        const btn = document.createElement('button');
        btn.className = 'theme-btn-circ' + (tempThemeId == id ? ' active' : '');
        btn.style.background = tema.gradient || tema.primary;
        if (tema.border) btn.style.border = tema.border;
        btn.onclick = () => {
            tempThemeId = id;
            aplicarPreview(id);
            renderThemeButtons();
        };
        grid.appendChild(btn);
    });
}

function aplicarPreview(id) {
    const tema = TEMAS_DISPONIVEIS[id];
    if (!tema) return;

    // Atualiza o CSS do navegador imediatamente para o preview
    aplicarTemaAtual(id);

    // Live update chart if on index.html
    const chartCanvas = document.getElementById('escalaChart');
    if (chartCanvas && window.currentChart) {
        const color = tema.secondary || tema.primary;
        const ctx = chartCanvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color + '33');
        window.currentChart.data.datasets[0].backgroundColor = gradient;
        window.currentChart.update('none');
    }
}

function confirmarTema() {
    localStorage.setItem('tema_escolhido_id', tempThemeId);
    aplicarTemaAtual();
    setTimeout(() => {
        toggleThemePanel();
    }, 100);
}

// Inicialização segura
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => aplicarTemaAtual());
} else {
    aplicarTemaAtual();
}
