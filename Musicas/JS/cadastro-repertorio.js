const SCRIPT_URL = APP_CONFIG.SCRIPT_URL;
let tsCulto, tsMusica, tsTom, tsMinistro;
let transformData = [];

function initSelects() {
    if (tsCulto) tsCulto.destroy();
    if (tsMinistro) tsMinistro.destroy();
    if (tsMusica) tsMusica.destroy();
    if (tsTom) tsTom.destroy();

    tsCulto = new TomSelect("#cultoSelect", {
        onChange: (val) => filtrarEscala(val)
    });
    tsMinistro = new TomSelect("#ministroSelect");
    tsMusica = new TomSelect("#musicaSelect");
    tsTom = new TomSelect("#tomSelect");
}

async function carregarDados() {
    try {
        initSelects();
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // Carregar do Cache se disponÃ­vel
        const cachedEscala = localStorage.getItem('offline_escala');
        const cachedMusicas = localStorage.getItem('offline_musicas');

        let transformDataTemp = [];
        let musicasDataTemp = [];

        // LOAD TRANSFORM
        if (cachedEscala) {
            transformDataTemp = JSON.parse(cachedEscala);
        } else {
            const resT = await fetch(SCRIPT_URL + "?sheet=Transformar");
            const jsonT = await resT.json();
            transformDataTemp = jsonT.data;
            localStorage.setItem('offline_escala', JSON.stringify(transformDataTemp));
        }
        transformData = transformDataTemp; // Global var usage

        // Add Cultos
        // Gerar lista única baseada em "Nome dos Cultos" + "Data"
        // Formato da chave para o Select: "Nome|DataOriginal"
        const cultosMap = new Map();

        transformData.forEach(item => {
            // Validação para evitar undefined
            if (!item["Nome dos Cultos"] || !item.Data) return;

            // Chave única composta
            const uniqueKey = item["Nome dos Cultos"] + "|" + item.Data;

            if (!cultosMap.has(uniqueKey) && new Date(item.Data) >= hoje) {
                // Formatar para exibição: "Nome (DD/MM)"
                const d = new Date(item.Data);
                const dataDisplay = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                const textDisplay = `${item["Nome dos Cultos"]} (${dataDisplay})`;

                cultosMap.set(uniqueKey, { value: uniqueKey, text: textDisplay });
            }
        });

        tsCulto.clearOptions();
        cultosMap.forEach(opt => {
            tsCulto.addOption(opt);
        });

        // LOAD MUSICAS
        if (cachedMusicas) {
            musicasDataTemp = JSON.parse(cachedMusicas);
        } else {
            const resM = await fetch(SCRIPT_URL + "?sheet=Musicas");
            const jsonM = await resM.json();
            musicasDataTemp = jsonM.data;
            localStorage.setItem('offline_musicas', JSON.stringify(musicasDataTemp));
        }

        musicasDataTemp.forEach(m => {
            if (m.MusicaCorigida) {
                let txt = m.MusicaCorigida + " - " + m["Cantor Corrigido"];
                tsMusica.addOption({ value: txt, text: txt });
            }
        });

        // AUTO-SELECT CULTO FROM URL
        const urlParams = new URLSearchParams(window.location.search);
        const autoCulto = urlParams.get('culto');
        if (autoCulto) {
            tsCulto.setValue(autoCulto);
        }

    } catch (e) { console.error(e); }
}

// FunÃ§Ã£o que filtra os Ministros baseada no Culto selecionado
function filtrarEscala(cultoNome) {
    tsMinistro.clear();
    tsMinistro.clearOptions();

    // Atualiza link de Adicionar MÃºsica para manter o estado
    const link = document.getElementById('linkAddMusica');
    if (link) {
        // Pega query params atuais
        const urlParams = new URLSearchParams(window.location.search);
        const source = urlParams.get('source');

        if (source) {
            const currentUrl = `Cadastro de Repertorio.html?culto=${encodeURIComponent(cultoNome || '')}&source=${encodeURIComponent(source)}`;
            link.href = `Cadastro de Musicas.html?culto=${encodeURIComponent(cultoNome || '')}&source=${encodeURIComponent(currentUrl)}`;
        } else {
            link.href = `Cadastro de Musicas.html?culto=${encodeURIComponent(cultoNome || '')}&source=Cadastro%20de%20Repertorio.html`;
        }
    }

    if (!cultoNome) return;

    // Localiza a data e nome do culto para os campos ocultos
    // A chave agora é "Nome|Data"
    if (!cultoNome.includes('|')) return;

    const [nomeTarget, dataTarget] = cultoNome.split('|');

    const infoCulto = transformData.find(i =>
        i["Nome dos Cultos"] === nomeTarget &&
        i.Data === dataTarget
    );

    if (infoCulto) {
        // Formatar data YYYY-MM-DD para DD/MM/YYYY
        const parts = infoCulto.Data.split('T')[0].split('-');
        const dataBR = `${parts[2]}/${parts[1]}/${parts[0]}`;

        document.getElementById('hiddenData').value = dataBR;
        document.getElementById('hiddenNomeCulto').value = infoCulto["Nome dos Cultos"];
    }

    // Filtra pessoas da aba Transformar para este culto com as funÃ§Ãµes desejadas
    const funcoesPermitidas = ["Ministro", "Back", "Violão"];

    const escalados = transformData.filter(item =>
        item["Nome dos Cultos"] === nomeTarget &&
        item.Data === dataTarget &&
        funcoesPermitidas.includes(item.Função)
    );

    if (escalados.length > 0) {
        escalados.forEach(pessoa => {
            tsMinistro.addOption({ value: pessoa.Nome, text: pessoa.Nome + " (" + pessoa.Função + ")" });
        });
    } else {
        tsMinistro.addOption({ value: "", text: "Ninguém escalado com estas funções", disabled: true });
    }
}

document.getElementById('repertorioForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const musicaFull = tsMusica.getValue();
    const status = document.getElementById('status');

    if (musicaFull) {
        // Usa lastIndexOf para pegar o ÚLTIMO " - " caso o nome da música tenha hífen
        const separatorIndex = musicaFull.lastIndexOf(" - ");

        if (separatorIndex !== -1) {
            // Define Músicas e Cantor separadamente
            document.getElementById('hiddenMusica').value = musicaFull.substring(0, separatorIndex).trim();
            document.getElementById('hiddenCantor').value = musicaFull.substring(separatorIndex + 3).trim();
        } else {
            document.getElementById('hiddenMusica').value = musicaFull.trim();
            document.getElementById('hiddenCantor').value = "";
        }
    }

    // Sincroniza o Tom selecionado com o input hidden
    document.getElementById('hiddenTons').value = tsTom.getValue();

    // Captura os dados do formulário
    const formData = {};
    const rawData = new FormData(this);

    rawData.forEach((v, k) => {
        // Limpeza de espaços e caracteres especiais (non-breaking spaces)
        formData[k] = v.toString().replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    });

    // IMPORTANTE: Como removemos o name do select do Culto para não duplicar, 
    // garantimos que o Culto e Data formatados estão no objeto
    // (Eles já são preenchidos na função filtrarEscala)

    const payload = {
        action: "addRow",
        sheet: "Repertório_PWA",
        data: formData
    };

    // Sincronização e Feedback
    SyncManager.updateLocalCache("Repertório_PWA", "add", formData);
    SyncManager.addToQueue(payload);

    status.innerHTML = "<span class='btn-premium' style='background:var(--accent-green); display:inline-block; padding:10px 20px; border-radius:8px;'>✅ Música Salva!</span>";
    status.style.display = "block";

    // Reseta apenas os campos de música para permitir adicionar a próxima rápido
    tsMusica.clear();
    tsTom.clear();

    // Rola para o topo do status para confirmação
    status.scrollIntoView({ behavior: 'smooth' });
});

window.onload = carregarDados;

// No local theme scripts needed, uses temas-core.js

function handleBack() {
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('source');
    if (source) {
        window.location.href = source;
    } else {
        window.location.href = 'MenuMusicas.html';
    }
}
