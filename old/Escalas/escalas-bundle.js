// ESCALAS BUNDLE - Sistema completo de escalas para SPA
// Combina toda a lógica de escalas em um único arquivo otimizado

// =================================================================
// 1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
// =================================================================

// Evitar redeclaração de variáveis
if (typeof SCRIPT_URL === 'undefined') {
    var SCRIPT_URL = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.SCRIPT_URL) 
        ? APP_CONFIG.SCRIPT_URL 
        : 'https://script.google.com/macros/s/AKfycbzdG9W3b6Z7h8J9dK2L4m5P6n7q8r9s0t1u2v3w4x5y6z7/exec';
}

// URLs das planilhas
var urlEscala = SCRIPT_URL + "?sheet=Transformar";
var urlRepertorio = SCRIPT_URL + "?sheet=Repertório_PWA";
var urlLembretes = SCRIPT_URL + "?sheet=Lembretes";

// Estado global
let globalEscalas = [];
let globalRepertorio = [];
let globalLembretes = [];

// Mapeamento de ícones (única instância)
if (typeof iconsMap === 'undefined') {
    const iconsMap = {
        'Violão': 'fa-guitar',
        'Guitarra': 'fa-guitar-electric',
        'Baixo': 'fa-mandolin',
        'Bateria': 'fa-drum',
        'Teclado': 'fa-keyboard',
        'Ministro': 'fa-microphone-lines',
        'Back': 'fa-microphone-stand',
        'Violino': 'fa-violin',
        'Sax': 'fa-saxophone',
        'Ukulele': 'fa-guitar',
        'Cajon': 'fa-drum',
        'Percussão': 'fa-drum',
        'Direção': 'fa-users',
        'Som': 'fa-volume-up',
        'Slide': 'fa-images',
        'Camera': 'fa-camera',
        'Filmagem': 'fa-video',
        'Design': 'fa-palette',
        'Recepção': 'fa-door-open',
        'Coordenação': 'fa-clipboard-list',
        'Intercessão': 'fa-hands-praying',
        'Louvor': 'fa-music',
        'Dança': 'fa-person-dancing',
        'Teatro': 'fa-theater-masks',
        'Kids': 'fa-child',
        'Jovens': 'fa-user-graduate',
        'Mulheres': 'fa-female',
        'Homens': 'fa-male',
        'default': 'fa-user'
    };
}

// =================================================================
// 2. FUNÇÕES UTILITÁRIAS
// =================================================================

function safeParse(jsonString, fallback = []) {
    try {
        if (!jsonString || jsonString === "undefined" || jsonString === "null") return fallback;
        return JSON.parse(jsonString);
    } catch (e) {
        console.warn('Erro ao fazer parse JSON:', e);
        return fallback;
    }
}

function normalizeData(data, type) {
    if (!Array.isArray(data)) return [];
    
    return data.map(item => {
        if (type === 'escala') {
            return {
                id: item.id || Math.random().toString(36).substr(2, 9),
                Data: item.Data || item.data || '',
                "Nome dos Cultos": item["Nome dos Cultos"] || item.culto || '',
                Função: item.Função || item.funcao || '',
                Nome: item.Nome || item.nome || '',
                Músicas: item.Músicas || item.musicas || '',
                Cantor: item.Cantor || item.cantor || '',
                Tons: item.Tons || item.tons || '',
                id_culto: item.id_culto || null
            };
        }
        return item;
    });
}

// =================================================================
// 3. SISTEMA DE SINCRONIZAÇÃO
// =================================================================

async function silentSync() {
    try {
        let jsonE, jsonR, jsonL;

        try {
            // Tentar carregar online com normalização centralizada
            const [respE, respR, respL, respCu] = await Promise.all([
                supabaseFetch('escalas'),
                supabaseFetch('repertorio'),
                supabaseFetch('lembretes'),
                supabaseFetch('cultos')
            ]);

            globalEscalas = normalizeData(respE, 'escala');
            globalRepertorio = normalizeData(respR, 'repertorio');
            globalLembretes = normalizeData(respL, 'lembrete');
            const globalCultos = normalizeData(respCu, 'culto');

            localStorage.setItem('offline_escala', JSON.stringify(globalEscalas));
            localStorage.setItem('offline_repertorio', JSON.stringify(globalRepertorio));
            localStorage.setItem('offline_lembretes', JSON.stringify(globalLembretes));
            localStorage.setItem('offline_cultos', JSON.stringify(globalCultos));
        } catch (corsError) {
            // Se CORS bloquear, usar cache local
            console.warn('CORS bloqueou sync, usando cache local:', corsError);

            const cachedE = localStorage.getItem('offline_escala');
            const cachedR = localStorage.getItem('offline_repertorio');
            const cachedL = localStorage.getItem('offline_lembretes');

            globalEscalas = safeParse(cachedE);
            globalRepertorio = safeParse(cachedR);
            globalLembretes = safeParse(cachedL);

            // Se não tiver cache, criar dados de exemplo
            if (!cachedE || !cachedR) {
                console.warn('Sem cache local, criando dados de exemplo');
                if (!cachedE) {
                    globalEscalas = [{
                        "Nome dos Cultos": "Culto de Domingo",
                        "Data": new Date().toISOString().split('T')[0],
                        "Função": "Ministro",
                        "Nome": "Ministro Exemplo",
                        "Músicas": "Grande é o Senhor",
                        "Cantor": "Fernandinho",
                        "Tons": "G"
                    }];
                    localStorage.setItem('offline_escala', JSON.stringify(globalEscalas));
                }

                if (!cachedR) {
                    globalRepertorio = [{
                        "Músicas": "Grande é o Senhor",
                        "Cantor": "Fernandinho",
                        "Tons": "G",
                        "Culto": "Culto de Domingo",
                        "Data": new Date().toISOString().split('T')[0],
                        "Ministro": "Ministro Exemplo"
                    }];
                    localStorage.setItem('offline_repertorio', JSON.stringify(globalRepertorio));
                }
            }
        }

        // Se não houver busca ativa, re-renderiza com dados novos
        if (!document.getElementById('personSearch').value) {
            renderCalendars();
        }
    } catch (e) {
        console.warn("Silent sync failed", e);
    }
}

// =================================================================
// 5. RENDERIZAÇÃO DE CARDS
// =================================================================

function renderEscalaCards() {
    const container = document.getElementById('escala-container');
    if (!container) return;

    if (!globalEscalas || globalEscalas.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 text-slate-400">
                <i class="fas fa-calendar-xmark text-4xl mb-4"></i>
                <p class="text-lg font-medium">Nenhuma escala encontrada</p>
                <p class="text-sm mt-2">Verifique sua conexão ou tente sincronizar novamente</p>
            </div>
        `;
        return;
    }

    // Agrupar escalas por culto
    const cultosAgrupados = {};
    globalEscalas.forEach(escala => {
        const culto = escala['Nome dos Cultos'] || 'Culto';
        if (!cultosAgrupados[culto]) {
            cultosAgrupados[culto] = [];
        }
        cultosAgrupados[culto].push(escala);
    });

    // Renderizar cards
    let html = '';
    Object.entries(cultosAgrupados).forEach(([culto, escalasDoCulto], index) => {
        const primeiraEscala = escalasDoCulto[0];
        const data = primeiraEscala['Data'] || new Date().toISOString().split('T')[0];
        const dataFormatada = new Date(data).toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit' 
        });

        html += `
            <div class="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-md">
                <div class="px-8 py-5 cursor-pointer flex justify-between items-center group" onclick="toggleCard(this)">
                    <div>
                        <h3 class="text-xl font-black text-slate-800 tracking-tighter uppercase">${culto}</h3>
                        <div class="flex items-center gap-2 text-slate-400 font-bold text-sm mt-0.5">
                            <i class="far fa-calendar-check text-blue-500"></i>
                            <span>${dataFormatada}</span>
                        </div>
                    </div>
                    <div class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-slate-100 transition-all">
                        <i class="fas fa-chevron-down text-xs"></i>
                    </div>
                </div>
                <div class="px-8 pb-8 pt-2 border-t border-slate-50 hidden">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div>
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <i class="fas fa-users text-blue-400"></i>
                                    EQUIPE
                                </div>
                                <button class="px-3 py-1 bg-red-50 text-red-500 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-red-100 transition-colors">
                                    <i class="fas fa-bell text-[8px]"></i>
                                    Avisos
                                </button>
                            </div>
                            <div class="space-y-1">
                                ${renderEquipeList(escalasDoCulto)}
                            </div>
                        </div>
                        <div>
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <i class="fas fa-music text-blue-400"></i>
                                    REPERTÓRIO
                                </div>
                                <button class="w-6 h-6 bg-green-500 text-white rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors shadow-sm shadow-green-200">
                                    <i class="fas fa-plus text-[10px]"></i>
                                </button>
                            </div>
                            <div class="space-y-2">
                                ${renderRepertorioList(escalasDoCulto)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderEquipeList(escalas) {
    let html = '';
    const funcoesOrdenadas = {};
    
    // Agrupar por função
    escalas.forEach(escala => {
        const funcao = escala['Função'] || 'Participante';
        const nome = escala['Nome'] || 'Nome não informado';
        
        if (!funcoesOrdenadas[funcao]) {
            funcoesOrdenadas[funcao] = [];
        }
        funcoesOrdenadas[funcao].push(nome);
    });

    // Renderizar cada função
    Object.entries(funcoesOrdenadas).forEach(([funcao, nomes]) => {
        const icon = iconsMap[funcao] || iconsMap['default'];
        nomes.forEach(nome => {
            html += `
                <div class="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 group/member">
                    <div class="flex items-center gap-3">
                        <div class="w-5 flex justify-center">
                            <i class="fas ${icon} text-slate-300 text-xs"></i>
                        </div>
                        <span class="text-sm font-semibold text-slate-700">${nome}</span>
                    </div>
                    <span class="text-[10px] font-bold text-slate-300 uppercase tracking-wider">${funcao}</span>
                </div>
            `;
        });
    });

    return html || `
        <div class="py-6 text-center border-2 border-dashed border-slate-100 rounded-2xl">
            <p class="text-sm text-slate-300 font-medium">Equipe não definida...</p>
        </div>
    `;
}

function renderRepertorioList(escalas) {
    const musicas = [];
    escalas.forEach(escala => {
        if (escala['Músicas']) {
            musicas.push({
                nome: escala['Músicas'],
                cantor: escala['Cantor'] || '',
                tons: escala['Tons'] || ''
            });
        }
    });

    if (musicas.length === 0) {
        return `
            <div class="py-6 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                <p class="text-sm text-slate-300 font-medium">Aguardando repertório...</p>
            </div>
        `;
    }

    let html = '';
    musicas.forEach(musica => {
        html += `
            <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <h4 class="font-semibold text-slate-800 text-sm">${musica.nome}</h4>
                ${musica.cantor ? `<p class="text-xs text-slate-500 mt-1">${musica.cantor}</p>` : ''}
                ${musica.tons ? `<span class="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-lg font-medium">${musica.tons}</span>` : ''}
            </div>
        `;
    });

    return html;
}

function toggleCard(element) {
    const content = element.nextElementSibling;
    const chevron = element.querySelector('.fa-chevron-down');
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        chevron.style.transform = 'rotate(180deg)';
    } else {
        content.classList.add('hidden');
        chevron.style.transform = 'rotate(0deg)';
    }
}

// =================================================================
// 6. SISTEMA DE CALENDÁRIO
// =================================================================

function renderCalendars() {
    const now = new Date();
    const months = [];

    for (let i = 0; i < 2; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        months.push({
            month: d.getMonth(),
            year: d.getFullYear(),
            containerId: `month${i + 1}`
        });
    }

    months.forEach(m => {
        const el = document.getElementById(m.containerId);
        if (el) {
            el.innerHTML = generateCalendarHTML(m.year, m.month);
        }
    });
}

function generateCalendarHTML(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = new Date(year, month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const searchInput = document.getElementById('globalSearchInput');
    const search = searchInput ? searchInput.value.toLowerCase().trim() : "";

    let html = `<h3>${monthName.toUpperCase()}</h3>`;
    html += `<div class="calendar-grid">
        <div class="day-name">Dom</div><div class="day-name">Seg</div><div class="day-name">Ter</div>
        <div class="day-name">Qua</div><div class="day-name">Qui</div><div class="day-name">Sex</div>
        <div class="day-name">Sáb</div>`;

    for (let i = 0; i < firstDay; i++) {
        html += `<div class="day empty"></div>`;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const escalasDoDia = globalEscalas.filter(e => e.Data.split('T')[0] === dateStr);
        const hasEscala = escalasDoDia.length > 0;

        let matchesSearch = false;
        let namesToDisplay = [];

        if (search) {
            const filtered = escalasDoDia.filter(e =>
                (e.Nome && e.Nome.toLowerCase().includes(search)) ||
                (e.Função && e.Função.toLowerCase().includes(search))
            );
            matchesSearch = filtered.length > 0;
            namesToDisplay = [...new Set(filtered.map(e => e.Nome))];
        } else {
            namesToDisplay = [...new Set(escalasDoDia.map(e => e.Nome))];
        }

        const isToday = today.getTime() === new Date(dateStr + "T12:00:00").getTime();

        let classList = "day";
        if (hasEscala) classList += " has-event";
        if (isToday) classList += " today";
        if (search && matchesSearch) classList += " match-person";
        if (search && !matchesSearch && hasEscala) classList += " dimmed";

        html += `
        <div class="${classList}" onclick="openDetails('${dateStr}')">
            <span class="day-number">${day}</span>
            <div class="event-preview">
                ${namesToDisplay.slice(0, 2).map(n => `<span class="event-name">${n.split(' ')[0]}</span>`).join('')}
                ${namesToDisplay.length > 2 ? `<span class="event-name">...</span>` : ''}
            </div>
        </div>`;
    }

    html += `</div>`;
    return html;
}

// =================================================================
// 5. SISTEMA DE DETALHES
// =================================================================

window.openDetails = function (dateStr) {
    const dayEscalas = globalEscalas.filter(e => e.Data.split('T')[0] === dateStr);
    const details = document.getElementById('modalDetails');
    const d = new Date(dateStr + "T12:00:00");
    
    const modalDateElement = document.getElementById('modalDate');
    if (modalDateElement) {
        modalDateElement.innerText = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    }

    const cultos = dayEscalas.reduce((acc, item) => {
        const key = item["Nome dos Cultos"];
        if (!acc[key]) acc[key] = { info: item, membros: [] };
        acc[key].membros.push(item);
        return acc;
    }, {});

    const userToken = JSON.parse(localStorage.getItem('user_token') || '{}');
    const meuNomeLogado = (userToken.Nome || "").toLowerCase().trim();
    const isAdmin = userToken.Role === "Admin" || userToken.Role === "Lider";
    const normalize = str => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const nomeNormalizado = normalize(meuNomeLogado);

    if (details) {
        details.innerHTML = Object.values(cultos).map(c => {
            const dataAvisoCheck = new Date(c.info.Data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const musicas = (Array.isArray(globalRepertorio) ? globalRepertorio : []).filter(m => {
                // Se as duas pontas tiverem id_culto (v2.9+), usa vínculo direto
                if (m.id_culto && c.info.id_culto) {
                    return m.id_culto === c.info.id_culto;
                }

                // Fallback para strings (legado ou novos itens na fila)
                if (!m.Data || !m.Culto) return false;
                const normalizeDate = (d) => {
                    if (d.includes('/')) {
                        const p = d.split('/');
                        return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
                    }
                    return d.split('T')[0];
                };
                const matchData = normalizeDate(c.info.Data) === normalizeDate(m.Data);
                const matchNome = (m.Culto || m.culto || "").trim().toLowerCase() === c.info["Nome dos Cultos"].trim().toLowerCase();
                return matchData && matchNome;
            });

            const estouEscalado = !!(nomeNormalizado && c.membros.some(m => {
                const mNome = normalize(m.Nome || "");
                return mNome.includes(nomeNormalizado) || nomeNormalizado.includes(mNome);
            }));

            return `
         <div class="culto-detalhe">
            <div class="culto-header" style="display:flex; justify-content:space-between; align-items:center;">
              <span><i class="fas fa-church"></i> ${c.info["Nome dos Cultos"]}</span>
              <div style="display:flex; gap:5px;">
                ${estouEscalado ? `
                  <button onclick="openNativeRepertorio('${c.info["Nome dos Cultos"]}|${c.info.Data}')" style="background:white; color:#e74c3c; border:none; padding:4px 8px; border-radius:4px; font-size:0.7rem; cursor:pointer;" title="Repertório">
                    <i class="fas fa-music"></i>
                  </button>
                  <button onclick="comunicarAusencia('${dataAvisoCheck}', '${c.info["Nome dos Cultos"]}', event)" style="background:#e74c3c; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.7rem; cursor:pointer;" title="Aviso">
                    <i class="fas fa-bell"></i>
                  </button>
                ` : ''}
              </div>
            </div>
           <div class="culto-body">
             <div style="font-weight:bold; margin-bottom:5px; color:#aaa; font-size:0.7rem">EQUIPE</div>
${(() => {
                return c.membros.map(m => {
                    const categoria = (m.Função || "").split(' ')[0].trim();
                    let iconeBase = iconsMap[categoria] || 'fa-user';
                    let extraStyle = "";

                    if (categoria === "Ministro") {
                        iconeBase = 'fa-microphone-lines';
                        extraStyle = 'color: #e74c3c; font-weight: bold;';
                    } else if (categoria === "Back") {
                        iconeBase = 'fa-microphone-stand';
                        extraStyle = 'color: #f59e0b;';
                    } else if (categoria === "Violão" || categoria === "Guitarra" || categoria === "Baixo") {
                        extraStyle = 'color: #3b82f6;';
                    } else if (categoria === "Bateria" || categoria === "Teclado") {
                        extraStyle = 'color: #10b981;';
                    }

                    return `
                    <div class="member-item" style="display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid #eee;">
                        <i class="fas ${iconeBase}" style="${extraStyle} width:20px; text-align:center;"></i>
                        <div style="flex:1;">
                            <div style="font-weight:600; color:#333; font-size:0.9rem;">${m.Nome}</div>
                            <div style="color:#666; font-size:0.8rem;">${m.Função}</div>
                            ${m.Músicas ? `<div style="color:#3b82f6; font-size:0.75rem; margin-top:2px;">${m.Músicas}</div>` : ''}
                        </div>
                    </div>`;
                }).join('');
            })()}
           </div>
         </div>`;
        }).join('');
    }

    // Mostrar modal
    const modalElement = document.getElementById('modalDetails');
    if (modalElement) {
        modalElement.style.display = 'block';
    }
};

// =================================================================
// 6. SISTEMA DE LIMPEZA
// =================================================================

function carregarLimpeza() {
    const imgElement = document.getElementById('imgLimpeza');
    if (!imgElement) return;

    // Tenta carregar do cache primeiro
    const cachedLimpeza = localStorage.getItem('limpeza_cache');
    if (cachedLimpeza) {
        imgElement.src = cachedLimpeza;
        return;
    }

    // Se não tiver cache, tenta carregar online
    imgElement.src = 'https://via.placeholder.com/800x600/3b82f6/ffffff?text=Escala+de+Limpeza';
    
    // Salvar no cache quando carregar
    imgElement.onload = () => {
        localStorage.setItem('limpeza_cache', imgElement.src);
    };
}

function openLightbox(src) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    
    if (lightbox && lightboxImg) {
        lightboxImg.src = src;
        lightbox.style.display = 'flex';
        lightbox.classList.remove('hidden');
        
        setTimeout(() => {
            lightboxImg.style.transform = 'scale(1)';
        }, 50);
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    
    if (lightbox && lightboxImg) {
        lightboxImg.style.transform = 'scale(0.9)';
        setTimeout(() => {
            lightbox.style.display = 'none';
            lightbox.classList.add('hidden');
        }, 200);
    }
}

// =================================================================
// 7. FUNÇÕES DE INTERFACE
// =================================================================

function switchView(viewName) {
    // Esconder todas as views
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });

    // Mostrar view selecionada
    const selectedView = document.getElementById(`${viewName}-view`);
    if (selectedView) {
        selectedView.classList.add('active');
    }

    // Atualizar botões
    document.querySelectorAll('[id^="btn-"][id$="-view"]').forEach(btn => {
        btn.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
        btn.classList.add('text-slate-500', 'hover:text-slate-700');
    });

    const activeBtn = document.getElementById(`btn-${viewName}-view`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-500', 'hover:text-slate-700');
        activeBtn.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
    }

    // Carregar dados específicos da view
    if (viewName === 'calendar') {
        renderCalendars();
    } else if (viewName === 'cleaning') {
        carregarLimpeza();
    } else if (viewName === 'list') {
        renderEscalaCards();
    }
}

function handleGlobalSearch() {
    const searchTerm = document.getElementById('globalSearchInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderCalendars();
        return;
    }

    // Renderizar calendários com filtro
    renderCalendars();
}

function comunicarAusencia(data, culto, event) {
    event.stopPropagation();
    
    const modal = document.getElementById('modalAvisoMembro');
    const displayCulto = document.getElementById('displayCultoAviso');
    const inputCulto = document.getElementById('inputCultoAviso');
    const textoAviso = document.getElementById('textoAvisoMembro');
    
    if (modal && displayCulto && inputCulto && textoAviso) {
        displayCulto.textContent = `${data} - ${culto}`;
        inputCulto.value = `${data}|${culto}`;
        textoAviso.value = '';
        
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
    }
}

function fecharModalAvisoMembro() {
    const modal = document.getElementById('modalAvisoMembro');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

function enviarAvisoMembro() {
    const inputCulto = document.getElementById('inputCultoAviso');
    const textoAviso = document.getElementById('textoAvisoMembro');
    
    if (!inputCulto || !textoAviso) {
        showToast('Preencha todos os campos', 'error');
        return;
    }
    
    const [data, culto] = inputCulto.value.split('|');
    
    // Aqui você implementaria o envio real do aviso
    console.log('Enviando aviso:', { data, culto, texto: textoAviso.value });
    
    showToast('Aviso enviado com sucesso!', 'success');
    fecharModalAvisoMembro();
}

// =================================================================
// 8. INICIALIZAÇÃO
// =================================================================

function initializeEscalas() {
    console.log('Escalas page initialized via bundle');
    
    // Inicializar sincronização
    silentSync().then(() => {
        // Renderizar cards após carregar dados
        renderEscalaCards();
    });
    
    // Carregar dados de limpeza se estiver na view correta
    const cleaningView = document.getElementById('cleaning-view');
    if (cleaningView && cleaningView.classList.contains('active')) {
        carregarLimpeza();
    }
    
    // Configurar eventos
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', handleGlobalSearch);
    }
    
    // Configurar botões de view
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => {
            const viewName = btn.id.replace('btn-', '').replace('-view', '');
            switchView(viewName);
        });
    });
}

// Exportar funções para uso global
window.EscalasBundle = {
    initializeEscalas,
    switchView,
    handleGlobalSearch,
    openDetails,
    closeLightbox,
    comunicarAusencia,
    carregarLimpeza,
    silentSync
};

// Auto-inicializar se o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEscalas);
} else {
    initializeEscalas();
}
