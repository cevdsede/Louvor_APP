/**
 * Lista de 12 Temas Visuais - Louvor CEVD
 * Centraliza as paletas e configurações de cada estilo com cantos arredondados.
 */
const TEMAS_DISPONIVEIS = {
    1: {
        nome: "Glassmorphism Blue",
        primary: "#2563eb",
        secondary: "#3b82f6",
        bg: "#f0f9ff",
        cardBg: "rgba(255, 255, 255, 0.7)",
        headerBg: "rgba(255, 255, 255, 0.8)",
        text: "#1e293b",
        radius: "25px",
        blur: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.3)",
        gradient: "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)"
    },
    2: {
        nome: "Elegant Dark",
        primary: "#f59e0b",
        secondary: "#d97706",
        bg: "#0f172a",
        cardBg: "#1e293b",
        headerBg: "#1e293b",
        text: "#f8fafc",
        textMuted: "#94a3b8",
        radius: "25px",
        border: "1px solid #334155"
    },
    3: {
        nome: "Minimalist Clean",
        primary: "#1e293b",
        secondary: "#475569",
        bg: "#ffffff",
        cardBg: "#f8fafc",
        headerBg: "#ffffff",
        text: "#1e293b",
        radius: "25px",
        border: "1px solid #e2e8f0"
    },
    4: {
        nome: "Nature Green",
        primary: "#10b981",
        secondary: "#059669",
        bg: "#f0fdf4",
        cardBg: "#ffffff",
        headerBg: "#ffffff",
        text: "#064e3b",
        radius: "20px"
    },
    5: {
        nome: "Sunset Gradient",
        primary: "#f43f5e",
        secondary: "#e11d48",
        bg: "#fff1f2",
        cardBg: "#ffffff",
        headerBg: "#ffffff",
        text: "#4c0519",
        radius: "25px",
        gradient: "linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)"
    },
    6: {
        nome: "Cyber Neon",
        primary: "#06b6d4",
        secondary: "#0891b2",
        bg: "#000000",
        cardBg: "#083344",
        headerBg: "#083344",
        text: "#ccfbf1",
        radius: "25px",
        border: "1px solid #06b6d4",
        shadow: "0 0 15px rgba(6, 182, 212, 0.3)"
    },
    7: {
        nome: "Soft Pastel",
        primary: "#8b5cf6",
        secondary: "#7c3aed",
        bg: "#f5f3ff",
        cardBg: "#ffffff",
        headerBg: "#ffffff",
        text: "#2e1065",
        radius: "25px"
    },
    8: {
        nome: "Royal Gold",
        primary: "#b91c1c",
        secondary: "#991b1b",
        bg: "#fef2f2",
        cardBg: "#ffffff",
        headerBg: "#ffffff",
        text: "#450a0a",
        radius: "25px",
        border: "1px solid #fee2e2"
    },
    9: {
        nome: "Oceanic Teal",
        primary: "#0d9488",
        secondary: "#0f766e",
        bg: "#f0fdfa",
        cardBg: "#ffffff",
        headerBg: "#ffffff",
        text: "#042f2e",
        radius: "16px"
    },
    10: {
        nome: "Neumorphic Light",
        primary: "#6366f1",
        secondary: "#4f46e5",
        bg: "#e0e5ec",
        cardBg: "#e0e5ec",
        headerBg: "#e0e5ec",
        text: "#2d3436",
        radius: "25px",
        shadow: "9px 9px 16px rgba(163,177,198,0.6), -9px -9px 16px rgba(255,255,255, 0.6)"
    },
    11: {
        nome: "Bold Black & White",
        primary: "#000000",
        secondary: "#333333",
        bg: "#f3f3f3",
        cardBg: "#ffffff",
        headerBg: "#000000",
        text: "#000000",
        headerText: "#ffffff",
        radius: "25px",
        border: "2px solid #000"
    },
    12: {
        nome: "Futuristic Purple",
        primary: "#a855f7",
        secondary: "#9333ea",
        bg: "#faf5ff",
        cardBg: "#ffffff",
        headerBg: "#ffffff",
        text: "#3b0764",
        radius: "25px",
        gradient: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)"
    },
    13: {
        nome: "Command Center Pro",
        primary: "#1e293b",
        secondary: "#3b82f6",
        bg: "#f3f4f6",
        cardBg: "#ffffff",
        headerBg: "#ffffff",
        text: "#1e293b",
        radius: "25px",
        border: "1px solid rgba(0,0,0,0.05)",
        shadow: "0 10px 25px rgba(0,0,0,0.05)"
    }
};
