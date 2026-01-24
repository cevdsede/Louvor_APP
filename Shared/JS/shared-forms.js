/**
 * Logic for native modals (Repertoire and Music)
 * To be included in Escalas.html and Calendario.html
 */

let tsCultoNative, tsMusicaNative, tsTomNative, tsMinistroNative;
let tsTemaNative, tsEstiloNative;

// Toast Notification System
function showToast(message, type = 'success', duration = 3000) {
    // Remove existing toast if any
    const existingToast = document.getElementById('globalToast');
    if (existingToast) existingToast.remove();

    // Create toast element
    const toast = document.createElement('div');
    toast.id = 'globalToast';
    
    // Define icon and color based on type
    const configs = {
        success: { icon: 'fa-check-circle', color: '#10b981', bgColor: '#d1fae5' },
        error: { icon: 'fa-exclamation-circle', color: '#ef4444', bgColor: '#fee2e2' },
        warning: { icon: 'fa-exclamation-triangle', color: '#f59e0b', bgColor: '#fef3c7' },
        info: { icon: 'fa-info-circle', color: '#3b82f6', bgColor: '#dbeafe' }
    };
    
    const config = configs[type] || configs.success;
    
    // Apply styles
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: config.bgColor,
        color: config.color,
        padding: '16px 20px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        zIndex: '99999',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '300px',
        maxWidth: '400px',
        fontSize: '14px',
        fontWeight: '500',
        border: `1px solid ${config.color}20`,
        backdropFilter: 'blur(10px)',
        transform: 'translateX(100%)',
        transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
    });
    
    // Create content
    toast.innerHTML = `
        <i class="fas ${config.icon}" style="font-size: 18px; flex-shrink: 0;"></i>
        <span style="flex: 1;">${message}</span>
        <i class="fas fa-times" style="cursor: pointer; opacity: 0.6; font-size: 12px; flex-shrink: 0;" onclick="this.parentElement.remove()"></i>
    `;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

function initNativeForms() {
    // 1. REPERTÓRIO FORM
    if (tsCultoNative) tsCultoNative.destroy();
    if (tsMinistroNative) tsMinistroNative.destroy();
    if (tsMusicaNative) tsMusicaNative.destroy();
    if (tsTomNative) tsTomNative.destroy();

    tsCultoNative = new TomSelect("#cultoSelectNative", {
        onChange: (val) => filtrarEscalaNative(val)
    });
    tsMinistroNative = new TomSelect("#ministroSelectNative");
    tsMusicaNative = new TomSelect("#musicaSelectNative");
    tsTomNative = new TomSelect("#tomSelectNative");

    // 2. MÚSICA FORM
    if (tsTemaNative) tsTemaNative.destroy();
    if (tsEstiloNative) tsEstiloNative.destroy();

    tsTemaNative = new TomSelect("#temaSelectNative", {
        placeholder: "Selecione o tema...",
        create: false
    });
    tsEstiloNative = new TomSelect("#estiloSelectNative", {
        placeholder: "Selecione o estilo...",
        create: false
    });

    loadNativeFormData();
}

async function loadNativeFormData() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Usa os dados globais da página pai (globalEscalas, globalRepertorio já devem existir)
    // Se não existirem, usa o localStorage
    const escalas = (typeof globalEscalas !== 'undefined' && globalEscalas.length > 0)
        ? globalEscalas
        : JSON.parse(localStorage.getItem('offline_escala') || '[]');

    // Cultos
    const cultosMap = new Map();
    escalas.forEach(item => {
        if (!item["Nome dos Cultos"] || !item.Data) return;
        const uniqueKey = item["Nome dos Cultos"] + "|" + item.Data;
        if (!cultosMap.has(uniqueKey) && new Date(item.Data) >= hoje) {
            const d = new Date(item.Data);
            const dataDisplay = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            cultosMap.set(uniqueKey, { value: uniqueKey, text: `${item["Nome dos Cultos"]} (${dataDisplay})` });
        }
    });
    tsCultoNative.clearOptions();
    cultosMap.forEach(opt => tsCultoNative.addOption(opt));

    // Músicas (do Cache)
    const musicasData = JSON.parse(localStorage.getItem('offline_musicas') || '[]');
    tsMusicaNative.clearOptions();
    musicasData.forEach(m => {
        // Suporta tanto o formato vindo do servidor quanto o formato salvo localmente via formulário
        const nomeFinal = m.MusicaCorigida || m.Musica;
        const cantorFinal = m["Cantor Corrigido"] || m.Cantor;

        if (nomeFinal) {
            let txt = nomeFinal + (cantorFinal ? " - " + cantorFinal : "");
            tsMusicaNative.addOption({ value: txt, text: txt });
        }
    });

    // Temas (do Cache)
    const temasData = JSON.parse(localStorage.getItem('offline_temas') || '[]');
    tsTemaNative.clearOptions();
    temasData.forEach(item => {
        let nomeTema = Object.values(item)[0];
        if (nomeTema && nomeTema !== "Tema") {
            tsTemaNative.addOption({ value: nomeTema, text: nomeTema });
        }
    });
}

function filtrarEscalaNative(cultoKey) {
    tsMinistroNative.clear();
    tsMinistroNative.clearOptions();
    if (!cultoKey) return;

    const [nomeTarget, dataTarget] = cultoKey.split('|');
    const escalas = (typeof globalEscalas !== 'undefined') ? globalEscalas : JSON.parse(localStorage.getItem('offline_escala') || '[]');

    // Atualiza campos ocultos
    const infoCulto = escalas.find(i => i["Nome dos Cultos"] === nomeTarget && i.Data === dataTarget);
    if (infoCulto) {
        const parts = infoCulto.Data.split('T')[0].split('-');
        document.getElementById('hiddenDataNative').value = `${parts[2]}/${parts[1]}/${parts[0]}`;
        document.getElementById('hiddenNomeCultoNative').value = infoCulto["Nome dos Cultos"];
    }

    const funcoesPermitidas = ["Ministro", "Back", "Violão"];
    const escalados = escalas.filter(item =>
        item["Nome dos Cultos"] === nomeTarget &&
        item.Data === dataTarget &&
        funcoesPermitidas.includes(item.Função)
    );

    if (escalados.length > 0) {
        escalados.forEach(pessoa => {
            tsMinistroNative.addOption({ value: pessoa.Nome, text: pessoa.Nome + " (" + pessoa.Função + ")" });
        });
    }
}

// Alternar entre painéis do Modal
function showNativeForm(formId) {
    document.getElementById('panelRepertorioNative').style.display = (formId === 'repertorio') ? 'block' : 'none';
    document.getElementById('panelMusicaNative').style.display = (formId === 'musica') ? 'block' : 'none';
    document.getElementById('modalFormTitleNative').innerText = (formId === 'repertorio') ? 'Montar Repertório' : 'Cadastrar Nova Música';
}

function closeNativeModal() {
    document.getElementById('modalNativeContainer').style.display = 'none';
}

function openNativeRepertorio(cultoKey) {
    document.getElementById('modalNativeContainer').style.display = 'flex';
    showNativeForm('repertorio');
    initNativeForms();
    if (cultoKey) {
        tsCultoNative.setValue(cultoKey);
    }
}

// Auxiliares de Formatação
function toTitleCase(str) {
    if (!str) return "";
    return str.toLowerCase().split(' ').map(word => {
        if (word.length <= 2 && ["de", "da", "do", "dos", "das", "e"].includes(word)) return word;
        return (word.charAt(0).toUpperCase() + word.slice(1));
    }).join(' ');
}

// EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    // REPERTÓRIO SUBMIT
    const formRep = document.getElementById('repertorioFormNative');
    if (formRep) {
        formRep.addEventListener('submit', function (e) {
            e.preventDefault();
            const musicaFull = tsMusicaNative.getValue();
            const status = document.getElementById('statusRepNative');

            const separatorIndex = musicaFull.lastIndexOf(" - ");
            document.getElementById('hiddenMusicaNative').value = (separatorIndex !== -1) ? musicaFull.substring(0, separatorIndex).trim() : musicaFull.trim();
            document.getElementById('hiddenCantorNative').value = (separatorIndex !== -1) ? musicaFull.substring(separatorIndex + 3).trim() : "";
            document.getElementById('hiddenTonsNative').value = tsTomNative.getValue();

            const formData = {};
            new FormData(this).forEach((v, k) => formData[k] = v.toString().trim());

            const payload = { action: "addRow", sheet: "Repertório_PWA", data: formData };
            SyncManager.updateLocalCache("Repertório_PWA", "add", formData);
            SyncManager.addToQueue(payload);

            status.innerHTML = "✅ Música Salva!";
            status.style.display = "block";
            tsMusicaNative.clear();
            tsTomNative.clear();

            // Atualiza a visualização no fundo
            if (typeof loadAll === 'function') loadAll(true);
            if (typeof loadData === 'function') loadData(true);
        });
    }

    // MÚSICA SUBMIT
    const formMus = document.getElementById('musicFormNative');
    if (formMus) {
        formMus.addEventListener('submit', function (e) {
            e.preventDefault();
            const status = document.getElementById('statusMusNative');
            const data = {};
            new FormData(this).forEach((v, k) => {
                let val = v.toString().trim();
                // Formatação: Primeira letra maiúscula de cada palavra
                if (k === "Musica" || k === "Cantor") val = toTitleCase(val);
                data[k] = val;
            });

            // VALIDAÇÃO DE DUPLICATAS
            const musicasExistentes = JSON.parse(localStorage.getItem('offline_musicas') || '[]');
            const jaExiste = musicasExistentes.find(m =>
                (m.Musica || m.MusicaCorigida || "").toLowerCase().trim() === data.Musica.toLowerCase().trim() &&
                (m.Cantor || m["Cantor Corrigido"] || "").toLowerCase().trim() === data.Cantor.toLowerCase().trim()
            );

            if (jaExiste) {
                alert("⚠️ Esta música já está cadastrada para este cantor!");
                return;
            }

            data.action = "addRow";
            data.sheet = "Musicas";

            SyncManager.updateLocalCache("Musicas", "add", data);
            SyncManager.addToQueue(data);

            status.innerText = "✅ Música salva!";
            status.style.display = "block";

            setTimeout(() => {
                showNativeForm('repertorio');
                loadNativeFormData();
            }, 500);
        });
    }
});
