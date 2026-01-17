/**
 * Gerenciador de Temas Mensais - Louvor CEVD
 */
function aplicarPaletaMensal() {
    const mesAtual = new Date().getMonth();
    const root = document.documentElement;

    const paletas = [
        { nome: "Janeiro Branco", primary: "#64748b", dark: "#0f172a", light: "#f8fafc", accent: "#94a3b8" },
        { nome: "Fevereiro Roxo", primary: "#8b5cf6", dark: "#4c1d95", light: "#f5f3ff", accent: "#a78bfa" },
        { nome: "Março Lilás", primary: "#a855f7", dark: "#581c87", light: "#faf5ff", accent: "#c084fc" },
        { nome: "Abril Azul", primary: "#0ea5e9", dark: "#0c4a6e", light: "#f0f9ff", accent: "#38bdf8" },
        { nome: "Maio Amarelo", primary: "#eab308", dark: "#713f12", light: "#fefce8", accent: "#facc15" },
        { nome: "Junho Vermelho", primary: "#ef4444", dark: "#7f1d1d", light: "#fef2f2", accent: "#f87171" },
        { nome: "Julho Amarelo", primary: "#f59e0b", dark: "#78350f", light: "#fffbeb", accent: "#fbbf24" },
        { nome: "Agosto Dourado", primary: "#b45309", dark: "#451a03", light: "#fff7ed", accent: "#d97706" },
        { nome: "Setembro Amarelo", primary: "#fbbf24", dark: "#451a03", light: "#fffcf0", accent: "#fcd34d" },
        { nome: "Outubro Rosa", primary: "#db2777", dark: "#831843", light: "#fdf2f8", accent: "#f472b6" },
        { nome: "Novembro Azul", primary: "#2563eb", dark: "#1e3a8a", light: "#eff6ff", accent: "#60a5fa" },
        { nome: "Dezembro Vermelho", primary: "#dc2626", dark: "#450a0a", light: "#fef2f2", accent: "#f87171" }
    ];

    const p = paletas[mesAtual];

    // Aplica as variáveis ao CSS
    root.style.setProperty('--theme-primary', p.primary);
    root.style.setProperty('--theme-dark', p.dark);
    root.style.setProperty('--theme-light', p.light);
    root.style.setProperty('--theme-accent', p.accent);
    root.style.setProperty('--theme-soft', p.primary + "1A"); // 10% de opacidade para fundos suaves

    // Opcional: Log no console para saberes qual tema está ativo
    console.log(`%c Tema Mensal: ${p.nome} `, `background: ${p.primary}; color: #fff; border-radius: 4px; padding: 2px 5px;`);
}

// Executa assim que o script é carregado para evitar "pulo" de cores
aplicarPaletaMensal();