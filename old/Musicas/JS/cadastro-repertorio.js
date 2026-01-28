const SCRIPT_URL = APP_CONFIG.SCRIPT_URL;
let tsCulto, tsMusica, tsTom, tsMinistro;
let transformData = [];

let userInteracted = false;
let suppressInteractionDepth = 0;

function withSuppressedInteraction(fn) {
    suppressInteractionDepth++;
    try {
        return fn();
    } finally {
        suppressInteractionDepth--;
    }
}

function markUserInteracted() {
    if (suppressInteractionDepth > 0) return;
    userInteracted = true;
}

// Garantir que o TomSelect esteja disponível
function waitForTomSelect(callback, maxAttempts = 50) {
    let attempts = 0;
    const check = () => {
        attempts++;
        if (typeof TomSelect !== 'undefined') {
            callback();
        } else if (attempts < maxAttempts) {
            setTimeout(check, 100);
        } else {
            console.error('TomSelect não carregou após várias tentativas');
        }
    };
    check();
}

function initSelects() {
    if (tsCulto) tsCulto.destroy();
    if (tsMinistro) tsMinistro.destroy();
    if (tsMusica) tsMusica.destroy();
    if (tsTom) tsTom.destroy();

    tsCulto = new TomSelect("#cultoSelect", {
        onChange: (val) => {
            markUserInteracted();
            filtrarEscala(val);
        }
    });
    tsMinistro = new TomSelect("#ministroSelect", {
        onChange: () => markUserInteracted()
    });
    tsMusica = new TomSelect("#musicaSelect", {
        onChange: () => markUserInteracted()
    });
    tsTom = new TomSelect("#tomSelect", {
        onChange: () => markUserInteracted()
    });
}

function ensureSelects() {
    if (!tsCulto || !tsMinistro || !tsMusica || !tsTom) initSelects();
}

function applyCultosFromTransformData(data, preserveValue = true) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const previousValue = preserveValue && tsCulto ? tsCulto.getValue() : '';

    // Gerar lista única baseada em "Nome dos Cultos" + "Data"
    // Formato da chave para o Select: "Nome|DataOriginal"
    const cultosMap = new Map();

    data.forEach(item => {
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

    withSuppressedInteraction(() => {
        // Evita seleção "órfã" após limpar opções
        tsCulto.clear(true);
        tsCulto.clearOptions();
        cultosMap.forEach(opt => {
            tsCulto.addOption(opt);
        });
        tsCulto.refreshOptions(false);
    });

    if (previousValue) {
        withSuppressedInteraction(() => {
            tsCulto.setValue(previousValue, true);
        });
    }
}

function applyMusicasOptions(musicasData, preserveValue = true) {
    const previousValue = preserveValue && tsMusica ? tsMusica.getValue() : '';

    withSuppressedInteraction(() => {
        tsMusica.clear(true);
        tsMusica.clearOptions();
        musicasData.forEach(m => {
            if (m.MusicaCorigida) {
                const txt = m.MusicaCorigida + " - " + m["Cantor Corrigido"];
                tsMusica.addOption({ value: txt, text: txt });
            }
        });
        tsMusica.refreshOptions(false);
    });

    if (previousValue) {
        withSuppressedInteraction(() => {
            tsMusica.setValue(previousValue, true);
        });
    }
}

function maybeAutoSelectCultoFromUrl() {
    // Se o usuário já tem seleção, não sobrescreve
    if (tsCulto && tsCulto.getValue()) return;

    const urlParams = new URLSearchParams(window.location.search);
    const autoCulto = urlParams.get('culto');
    if (!autoCulto) return;

    // Não marcar como interação do usuário (é programático)
    withSuppressedInteraction(() => {
        tsCulto.setValue(autoCulto, true);
    });
}

async function silentSyncDados() {
    try {
        ensureSelects();
        
        // Tentar carregar dados online, mas não falhar se CORS bloquear
        let transformDataTemp = [];
        let musicasDataTemp = [];
        
        try {
            const [resT, resM] = await Promise.all([
                fetch(SCRIPT_URL + "?sheet=Transformar"),
                fetch(SCRIPT_URL + "?sheet=Musicas")
            ]);
            const [jsonT, jsonM] = await Promise.all([resT.json(), resM.json()]);
            
            transformDataTemp = jsonT.data;
            musicasDataTemp = jsonM.data;
            
            localStorage.setItem('offline_escala', JSON.stringify(transformDataTemp));
            localStorage.setItem('offline_musicas', JSON.stringify(musicasDataTemp));
        } catch (corsError) {
            // Se CORS bloquear, usar apenas cache local
            console.warn('CORS bloqueou sync, usando cache local:', corsError);
            transformDataTemp = JSON.parse(localStorage.getItem('offline_escala') || '[]');
            musicasDataTemp = JSON.parse(localStorage.getItem('offline_musicas') || '[]');
        }

        // Só atualiza a UI automaticamente se o usuário ainda não mexeu
        if (!userInteracted) {
            transformData = transformDataTemp;

            applyCultosFromTransformData(transformDataTemp, true);
            applyMusicasOptions(musicasDataTemp, true);

            // Se tiver culto selecionado, re-aplica filtro/escala
            const cultoAtual = tsCulto.getValue();
            if (cultoAtual) {
                withSuppressedInteraction(() => filtrarEscala(cultoAtual));
            } else {
                // Se não tem seleção, tenta auto-select por URL (se houver)
                maybeAutoSelectCultoFromUrl();
            }
        }
    } catch (e) {
        console.log("Silent sync failed - usando apenas cache local");
    }
}

async function carregarDados(force = false) {
    const btnIcon = document.querySelector('.nav-btn.fa-sync-alt, .header-right-nav i.fa-sync-alt, .header-right i.fa-sync-alt');
    const cachedEscala = localStorage.getItem('offline_escala');
    const cachedMusicas = localStorage.getItem('offline_musicas');

    // Spinner só quando forçado ou quando não há cache suficiente
    const shouldSpin = !!force || !cachedEscala || !cachedMusicas;
    if (btnIcon && shouldSpin) btnIcon.classList.add('fa-spin');
    try {
        ensureSelects();

        let transformDataTemp = [];
        let musicasDataTemp = [];

        // LOAD TRANSFORM
        if (!force && cachedEscala) {
            transformDataTemp = JSON.parse(cachedEscala);
        } else {
            try {
                if (force) await new Promise(r => setTimeout(r, 500)); // Tempo mínimo de giro
                const resT = await fetch(SCRIPT_URL + "?sheet=Transformar");
                const jsonT = await resT.json();
                transformDataTemp = jsonT.data;
                localStorage.setItem('offline_escala', JSON.stringify(transformDataTemp));
            } catch (corsError) {
                console.warn('CORS bloqueou carregamento de Transformar, usando cache:', corsError);
                transformDataTemp = JSON.parse(cachedEscala || '[]');
                if (!cachedEscala) {
                    // Criar dados de exemplo para desenvolvimento
                    transformDataTemp = [
                        {
                            "Nome dos Cultos": "Culto de Domingo",
                            "Data": new Date().toISOString().split('T')[0],
                            "Função": "Ministro",
                            "Nome": "Ministro Exemplo"
                        }
                    ];
                    localStorage.setItem('offline_escala', JSON.stringify(transformDataTemp));
                    status.innerHTML = "<span class='btn-premium' style='background:var(--accent-yellow); display:inline-block; padding:10px 20px; border-radius:8px;'>📝 Usando dados de exemplo (sem conexão)</span>";
                    status.style.display = "block";
                }
            }
        }
        transformData = transformDataTemp; // Global var usage

        // LOAD MUSICAS
        if (!force && cachedMusicas) {
            musicasDataTemp = JSON.parse(cachedMusicas);
        } else {
            try {
                const resM = await fetch(SCRIPT_URL + "?sheet=Musicas");
                const jsonM = await resM.json();
                musicasDataTemp = jsonM.data;
                localStorage.setItem('offline_musicas', JSON.stringify(musicasDataTemp));
            } catch (corsError) {
                console.warn('CORS bloqueou carregamento de Musicas, usando cache:', corsError);
                musicasDataTemp = JSON.parse(cachedMusicas || '[]');
                if (!cachedMusicas) {
                    // Criar dados de exemplo para desenvolvimento
                    musicasDataTemp = [
                        {
                            "MusicaCorigida": "Grande é o Senhor",
                            "Cantor Corrigido": "Fernandinho"
                        },
                        {
                            "MusicaCorigida": "Espírito Santo",
                            "Cantor Corrigido": "Diante do Trono"
                        },
                        {
                            "MusicaCorigida": "Me Rende",
                            "Cantor Corrigido": "Gabriela Rocha"
                        }
                    ];
                    localStorage.setItem('offline_musicas', JSON.stringify(musicasDataTemp));
                    status.innerHTML = "<span class='btn-premium' style='background:var(--accent-yellow); display:inline-block; padding:10px 20px; border-radius:8px;'>📝 Usando dados de exemplo (sem conexão)</span>";
                    status.style.display = "block";
                }
            }
        }
        applyCultosFromTransformData(transformDataTemp, true);
        applyMusicasOptions(musicasDataTemp, true);

        // AUTO-SELECT CULTO FROM URL
        maybeAutoSelectCultoFromUrl();

        // Se carregou via cache (não forçado), sincroniza silenciosamente em background
        if (!force && cachedEscala && cachedMusicas) {
            setTimeout(() => silentSyncDados(), 500);
        }

    } catch (e) {
        console.error(e);
    } finally {
        if (btnIcon && shouldSpin) btnIcon.classList.remove('fa-spin');
    }
}

// FunÃ§Ã£o que filtra os Ministros baseada no Culto selecionado
function filtrarEscala(cultoNome) {
    tsMinistro.clear();
    tsMinistro.clearOptions();

    // Atualiza link de Adicionar MÃºsica para manter o estado
    const link = document.getElementById('linkAddMusica');
    if (link) {
        // Agora o link abre no mesmo iframe ou informa o pai
        link.onclick = (e) => {
            e.preventDefault();
            const isModal = document.body.classList.contains('is-modal') || new URLSearchParams(window.location.search).get('modal') === 'true';
            let nextUrl = `Cadastro de Musicas.html?culto=${encodeURIComponent(cultoNome || '')}&source=Cadastro%20de%20Repertorio.html`;
            if (isModal) nextUrl += '&modal=true';
            window.location.href = nextUrl;
        };
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

document.getElementById('repertorioForm').addEventListener('submit', async function (e) {
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
    // Verificar duplicatas localmente antes de enviar
    const cachedRepertorio = JSON.parse(localStorage.getItem('offline_repertorio') || '[]');
    const musica = formData.Músicas?.trim();
    const cantor = formData.Cantor?.trim();
    const culto = formData.Culto?.trim();
    const data = formData.Data?.trim();
    
    // Verificar se já existe localmente
    const duplicataLocal = cachedRepertorio.some(item => {
        return String(item.Músicas || "").trim() === musica &&
               String(item.Cantor || "").trim() === cantor &&
               String(item.Culto || "").trim() === culto &&
               String(item.Data || "").trim() === data;
    });
    
    if (duplicataLocal) {
        console.log("🚫 Duplicata local encontrada, mostrando toast de aviso");
        if (typeof showToast === 'function') {
            console.log("✅ showToast disponível, mostrando toast de duplicata");
            showToast("⚠️ Esta música já está no repertório para este culto!", 'warning', 5000);
        } else {
            console.log("❌ showToast não disponível para duplicata");
        }
        return; // Não continua com o envio
    }
    
    // Usar sempre SyncManager para consistência
    console.log('📤 Adicionando ao SyncManager...');
    SyncManager.addToQueue(payload);
    
    // Feedback com toast
    console.log("🍞 Tentando mostrar toast de sucesso...");
    if (typeof showToast === 'function') {
        console.log("✅ showToast disponível, mostrando toast de sucesso");
        showToast("✅ Música adicionada à fila de sincronização!", 'success', 3000);
    } else {
        console.log("❌ showToast não disponível para sucesso");
    }
    
    // Reseta campos
    tsMusica.clear();
    tsTom.clear();
    
    // Notifica a página pai
    if (window.parent) {
        window.parent.postMessage({ action: 'saved' }, '*');
    }
});

waitForTomSelect(() => {
    window.addEventListener('load', () => carregarDados(false));
});

// Monitora eventos de duplicata bloqueada para mostrar feedback correto
window.addEventListener('syncItemBlocked', (event) => {
    const { musica, cantor, culto, data } = event.detail;
    console.log("🚫 Duplicata bloqueada - Atualizando UI (cadastro repertório)");
    
    // Mostrar aviso de duplicata apenas com toast
    if (typeof showToast === 'function') {
        showToast(`⚠️ "${musica}" já está no repertório para este culto!`, 'warning', 5000);
    }
});

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

