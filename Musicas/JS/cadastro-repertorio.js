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

    // Split Music - Singer
    const musicaFull = tsMusica.getValue();
    if (musicaFull) {
        const separatorIndex = musicaFull.lastIndexOf(" - ");
        if (separatorIndex !== -1) {
            document.getElementById('hiddenMusica').value = musicaFull.substring(0, separatorIndex).trim();
            document.getElementById('hiddenCantor').value = musicaFull.substring(separatorIndex + 3).trim();
        } else {
            document.getElementById('hiddenMusica').value = musicaFull;
            document.getElementById('hiddenCantor').value = "";
        }
    }

    // Handle Tons
    const tonsVal = tsTom.getValue();
    document.getElementById('hiddenTons').value = tonsVal;

    const btn = document.getElementById('btnSubmit');
    const status = document.getElementById('status');

    const formData = {};
    new FormData(this).forEach((v, k) => {
        // ESTA LINHA Ã‰ A CURA:
        // 1. Converte para string
        // 2. Troca o espaÃ§o invisÃ­vel (\u00a0) por espaÃ§o normal
        // 3. Troca espaÃ§os duplos ou triplos por um Ãºnico espaÃ§o
        // 4. Limpa as pontas (trim)
        formData[k] = v.toString()
            .replace(/\u00a0/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    });

    // Construir o payload correto para o servidor (Aninhado)
    const payload = {
        action: formData.action || "addRow",
        sheet: formData.sheet || "Repertório_PWA",
        data: formData
    };

    // 1. Atualiza UI/Cache local imediatamente (Usa objeto plano)
    SyncManager.updateLocalCache("Repertório_PWA", "add", formData);

    // 2. Adiciona Ã  fila de sincronizaÃ§Ã£o (Usa payload aninhado)
    SyncManager.addToQueue(payload);

    // 3. Feedback visual imediato
    status.innerHTML = "<span class='btn-premium' style='background:var(--accent-green); position:static;'>✅ Salvo com Sucesso!</span>";
    status.style.display = "block";

    // Limpa os campos apÃ³s salvar
    tsMusica.clear();
    tsTom.clear();
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
