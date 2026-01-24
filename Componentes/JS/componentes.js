/* AS FUNÇÕES ABAIXO PERMANECERAM IGUAIS, APENAS COM AJUSTES NO INNERHTML PARA O NOVO DESIGN */
const SCRIPT_URL = APP_CONFIG.SCRIPT_URL;
let bancoImagens = [];
let dadosMembros = [];

async function iniciar(force = false) {
    const loader = document.getElementById('loader');
    const cachedComp = localStorage.getItem('offline_componentes');
    const cachedImg = localStorage.getItem('offline_imagens');

    if (!force && cachedComp && cachedImg) {
        bancoImagens = JSON.parse(cachedImg);
        const ativos = JSON.parse(cachedComp).filter(c => {
            const funcao = (c.Função || c.Função || c["FunÃ§Ã£o"] || "").toUpperCase();
            const nome = (c.Nome || "").toUpperCase();
            return c.Ativo &&
                c.Ativo.toString().toUpperCase().trim() === "SIM" &&
                !funcao.includes("CONVIDADO") &&
                !nome.includes("CONVIDADO");
        });
        dadosMembros = ativos;
        atualizarDashboards(ativos);
        renderizar(ativos);
        return;
    }

    const btnIcon = document.querySelector('.btn-update i');
    if (btnIcon) btnIcon.classList.add('spin');

    if (loader) loader.style.display = 'block';
    try {
        const [resComp, resImg] = await Promise.all([
            fetch(SCRIPT_URL + "?sheet=Componentes"),
            fetch(SCRIPT_URL + "?action=getImages")
        ]);
        const dataComp = await resComp.json();
        const dataImg = await resImg.json();

        bancoImagens = dataImg.data;
        localStorage.setItem('offline_imagens', JSON.stringify(dataImg.data));

        // FILTRO GLOBAL DE CONVIDADOS
        const ativos = dataComp.data.filter(c => {
            const funcao = (c["Função"] || c["Função"] || c["FunÃ§Ã£o"] || "").toUpperCase();
            const nome = (c.Nome || "").toUpperCase();
            return c.Ativo &&
                c.Ativo.toString().toUpperCase().trim() === "SIM" &&
                !funcao.includes("CONVIDADO") &&
                !nome.includes("CONVIDADO");
        });
        dadosMembros = ativos;
        localStorage.setItem('offline_componentes', JSON.stringify(ativos));

        if (loader) loader.style.display = 'none';
        atualizarDashboards(ativos);
        renderizar(ativos);
    } catch (e) {
        console.error(e);
        if (loader) loader.innerText = "Erro ao carregar dados.";
    } finally {
        if (btnIcon) btnIcon.classList.remove('spin');
    }
}

function atualizarDashboards(ativos) {
    gerarKpisFuncoes(ativos);
    gerarGraficoGenero(ativos);
}

function gerarKpisFuncoes(lista) {
    const iconsMap = {
        "Ministro": "fa-microphone-lines",
        "Back": "fa-microphone",
        "Violão": "fa-guitar",
        "Guitarra": "fa-guitar-electric",
        "Teclado": "fa-keyboard",
        "Baixo": "fa-guitar",
        "Bateria": "fa-drum",
    };

    const counts = {};
    Object.keys(iconsMap).forEach(f => counts[f] = 0);

    lista.forEach(p => {
        const funcaoCol = (p["Função"] || p["FunÃ§Ã£o"] || "").toUpperCase();
        // Convidado jÃ¡ removido globalmente, mas mantemos seguranÃ§a
        if (funcaoCol.includes("CONVIDADO")) return;
        Object.keys(iconsMap).forEach(f => {
            if (funcaoCol.includes(f.toUpperCase())) counts[f]++;
        });
    });

    const container = document.getElementById("kpiFuncoes");

    // Card TODOS
    let html = `
    <div class="kpi-card active-filter" onclick="filtrarPorFuncao('TODOS', this)">
        <div class="kpi-icon"><i class="fas fa-users" style="color:var(--primary)"></i></div>
        <div class="kpi-value">${lista.length}</div>
        <div class="kpi-label">Todos</div>
    </div>
  `;

    html += Object.entries(iconsMap).map(([nome, icone]) => `
    <div class="kpi-card" onclick="filtrarPorFuncao('${nome.toUpperCase()}', this)">
      <div class="kpi-icon"><i class="fas ${icone} ${nome}"></i></div>
      <div class="kpi-value">${counts[nome]}</div>
      <div class="kpi-label">${nome}</div>
    </div>
  `).join('');

    container.innerHTML = html;
}

function gerarGraficoGenero(lista) {
    let masc = 0, fem = 0;
    lista.forEach(p => {
        // Tenta vÃ¡rias colunas comuns
        const g = (p.Genero || p["Gênero"] || p["GÃªnero"] || p.Sexo || "").toString().toUpperCase().trim();
        if (g.includes("HOMEM") || g.includes("MASC") || g === "M") masc++;
        else if (g.includes("MULHER") || g.includes("FEM") || g === "F") fem++;
    });

    const total = masc + fem || 1;
    const pMasc = Math.round((masc / total) * 100);
    const pFem = Math.round((fem / total) * 100);

    const bMasc = document.getElementById('barMasc');
    const tMasc = document.getElementById('txtMasc');
    const bFem = document.getElementById('barFem');
    const tFem = document.getElementById('txtFem');

    if (bMasc && tMasc) {
        bMasc.style.width = pMasc + "%";
        tMasc.innerText = `Masculino - ${pMasc}% (${masc})`;
    }
    if (bFem && tFem) {
        bFem.style.width = pFem + "%";
        tFem.innerText = `Feminino - ${pFem}% (${fem})`;
    }
}

// 2. Nova função para abrir o modal e carregar os dados
function abrirDetalhes(nome, foto, funcao, tel, wpp, fallback) {
    const modal = document.getElementById('modalPerfilComp');
    modal.style.display = 'flex';

    // Cabeçalho alinhado à esquerda com foto (tenta local, depois drive/avatar)
    document.getElementById('detalheCabecalho').innerHTML = `
    <div style="display: flex; align-items: center; gap: 15px;">
        <img src="${foto}" 
             onerror="this.onerror=null; this.src='${fallback}';"
             onclick="abrirFotoExpandida(this.src, event)"
             style="width:60px; height:60px; border-radius:50%; border: 2px solid var(--primary); object-fit:cover; box-shadow: var(--card-shadow); cursor: pointer;">
        <div>
            <h3 style="margin:0; font-size: 1.1rem; color: var(--text-primary);">${nome}</h3>
            <small style="color: var(--text-muted); font-weight: 600;">${funcao}</small>
        </div>
    </div>
`;

    // Botões de ação no padrão do app
    document.getElementById('modalAcoes').innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <a href="tel:${tel}" class="btn-icon btn-tel" style="border-radius:10px; padding:10px;"><i class="fas fa-phone"></i> Ligar</a>
        <a href="${wpp}" target="_blank" class="btn-icon btn-wpp" style="border-radius:10px; padding:10px;"><i class="fab fa-whatsapp"></i> WhatsApp</a>
    </div>
`;

    // Inicia buscas nos boxes do modal
    buscarEscalasNoModal(nome);
    buscarHistoricoNoModal(nome, funcao);
    buscarAvisosGeraisNoModal(nome);
}

// Busca Escalas focada no Modal (CORRIGIDA)
async function buscarEscalasNoModal(nome) {
    const box = document.getElementById('modalEscalas');
    box.innerHTML = '<div style="text-align:center; padding:10px; color:var(--text-muted);">Carregando...</div>';

    try {
        const cached = localStorage.getItem('offline_escala');
        if (!cached) {
            box.innerHTML = "<small>Sem dados offline.</small>";
            return;
        }

        const data = JSON.parse(cached);
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

        const filtrado = data
            .filter(e => {
                const d = new Date(e.Data);
                return e.Nome && e.Nome.toLowerCase().trim() === nome.toLowerCase().trim() && d >= hoje;
            })
            .sort((a, b) => new Date(a.Data) - new Date(b.Data))
            .slice(0, 3);

        if (filtrado.length > 0) {
            box.innerHTML = filtrado.map(e => `
        <div class="detail-item">
          <div class="detail-top">
            <span class="detail-culto">${e["Nome dos Cultos"]}</span>
            <span class="detail-date">${new Date(e.Data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
          </div>
          <span class="detail-funcoes"><i class="fas fa-tag"></i> ${e.Função}</span>
        </div>
      `).join('');
        } else {
            box.innerHTML = '<div style="padding:10px; text-align:center; color:var(--text-muted); font-size:0.8rem;">Nenhuma escala futura.</div>';
        }
    } catch (e) { box.innerHTML = "Erro ao carregar."; console.log(e); }
}

// Busca Histórico focado no Modal (CORRIGIDA)
async function buscarHistoricoNoModal(nome, funcao) {
    const box = document.getElementById('modalHistorico');

    const f = funcao.toUpperCase();
    const container = document.getElementById('modalHistoricoContainer');
    if (!f.includes("MINISTRO") && !f.includes("BACK")) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'block';

    box.innerHTML = '<div style="text-align:center; padding:10px; color:var(--text-muted);">Carregando...</div>';

    try {
        const cached = localStorage.getItem('offline_historico');
        const data = cached ? JSON.parse(cached) : [];

        // Filtra pelo cantor
        const hist = data.filter(h => h.Cantor && h.Cantor.toLowerCase().trim() === nome.toLowerCase().trim());

        // Pega os Ãºltimos 5
        const ultimos = hist.reverse().slice(0, 5);

        if (ultimos.length > 0) {
            box.innerHTML = ultimos.map(h => {
                const mNome = h.Músicas || h.Musica || h.Música || h.MÃºsica || h.MÃºsicas || 'Sem Título';
                const mTom = h.Tom || h.Tons || h.tom || '';
                return `
          <div class="detail-item">
            <div class="detail-top">
              <span class="detail-culto">${mNome}</span>
              <span class="detail-date">${mTom}</span>
            </div>
          </div>
        `;
            }).join('');
        } else {
            box.innerHTML = '<div style="padding:10px; text-align:center; color:var(--text-muted); font-size:0.8rem;">Nenhum registro recente.</div>';
        }
    } catch (e) { box.innerHTML = "Erro ao carregar."; }
}

// Função para salvar imagem no cache do navegador (simula download local)
async function cacheImage(url, name) {
    if (!url || !url.startsWith('http')) return url;
    try {
        const cache = await caches.open('louvor-fotos-cache');
        const cachedResponse = await cache.match(url);
        if (cachedResponse) return url; // Já está em cache

        // Faz o "download" e guarda no cache
        const response = await fetch(url);
        if (response.ok) {
            await cache.put(url, response.clone());
            console.log(`Foto de ${name} salva no cache local.`);
        }
        return url;
    } catch (e) { return url; }
}

function renderizar(lista) {
    const container = document.getElementById('listaComponentes');
    container.innerHTML = ''; // Limpa o container

    // Filtra para remover convidados
    const listaFiltrada = lista.filter(item => {
        const funcao = (item["Função"] || item["Função"] || item["FunÃ§Ã£o"] || "").toUpperCase();
        const nome = (item.Nome || "").toUpperCase();
        return !funcao.includes("CONVIDADO") && !nome.includes("CONVIDADO");
    });

    container.innerHTML = listaFiltrada.map(item => {
        const nomeLimpo = item.Nome.trim();
        const urlLocal = `../../assets/equipe/${nomeLimpo}.png`;

        // Busca reserva no Drive caso a local falhe
        let nomeArquivo = "";
        if (item.Foto) {
            const urlParts = item.Foto.split('/');
            nomeArquivo = urlParts.pop() || urlParts.pop();
            if (nomeArquivo.includes('id=')) {
                nomeArquivo = nomeArquivo.split('id=').pop().split('&')[0];
            }
        }

        // SMART SEARCH: Tenta encontrar a foto de forma inteligente
        const fotoObj = bancoImagens.find(img => {
            // 1. Match exato por ID (da planilha) ou Nome do Arquivo (puro)
            if (nomeArquivo && (img.id === nomeArquivo || img.nome === nomeArquivo)) return true;

            // 2. Match por link direto
            if (item.Foto && img.id && item.Foto.includes(img.id)) return true;

            // 3. Match Inteligente por Nome (Ignora .Foto.123, .png, etc)
            const nomeMembroNorm = nomeLimpo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            const nomeFotoNorm = (img.nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .split('.foto.')[0].split('.')[0].replace(/[-_]/g, ' ').trim();

            if (!nomeFotoNorm || !nomeMembroNorm) return false;

            // Match exato apÃ³s normalizaÃ§Ã£o (Evita "Gabriel" match "Anne Gabrielly")
            return nomeFotoNorm === nomeMembroNorm;
        });

        const urlFallback = fotoObj ? fotoObj.url : `https://ui-avatars.com/api/?name=${encodeURIComponent(nomeLimpo)}&background=random&color=fff&size=200`;

        // Dispara o "download" para o cache em background se for link externo
        if (fotoObj && !urlLocal.includes('assets/equipe')) {
            cacheImage(fotoObj.url, nomeLimpo);
        }

        return `
  <div class="premium-card text-center" style="padding: 20px 10px; cursor: pointer;" onclick="abrirDetalhes('${nomeLimpo}', '${urlLocal}', '${item.Função}', '${item["Tel sem Espaço"]}', '${item.Whatsapp?.link || '#'}', '${urlFallback}')">
    <div class="avatar-wrapper">
      <img src="${urlLocal}" class="avatar" 
           onerror="this.onerror=null; this.src='${urlFallback}';"
           onclick="abrirFotoExpandida(this.src, event)" 
           title="Clique para ampliar" 
           style="width: 70px; height: 70px; border-radius: 20px; border: none; box-shadow: var(--shadow-md);">
    </div>
    <div class="comp-name font-heading" style="font-size: 0.95rem; margin-top: 5px;">${nomeLimpo}</div>
    <div class="comp-role" style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">${item.Função || item["FunÃ§Ã£o"]}</div>
  </div>
`;
    }).join('');
}
function fecharModalDetalhesExterno(e) {
    if (e.target.id === 'modalPerfilComp') {
        document.getElementById('modalPerfilComp').style.display = 'none';
    }
}
function filtrarPorFuncao(categoria, elemento) {
    // Reset visual do filtro de genero
    document.querySelectorAll('.gender-bar-container').forEach(p => {
        p.style.opacity = '1';
        p.style.transform = 'scale(1)';
    });

    // UI: Troca a classe active no elemento clicado (agora Ã© o card)
    document.querySelectorAll('.kpi-card').forEach(p => p.classList.remove('active-filter'));
    if (elemento) elemento.classList.add('active-filter');

    // LÃ³gica: Filtra a lista original
    if (categoria === 'TODOS') {
        renderizar(dadosMembros);
    } else {
        const filtrados = dadosMembros.filter(m => {
            const f = (m["Função"] || m["FunÃ§Ã£o"] || "").toUpperCase();
            return f.includes(categoria);
        });
        renderizar(filtrados);
    }
}

function filtrarPorGenero(genero, elemento) {
    // Reset visual dos KPIs
    document.querySelectorAll('.kpi-card').forEach(p => p.classList.remove('active-filter'));

    // UI: Feedback visual na barra clicada
    document.querySelectorAll('.gender-bar-container').forEach(p => {
        p.style.opacity = '0.4';
        p.style.transform = 'scale(0.98)';
    });
    if (elemento) {
        elemento.style.opacity = '1';
        elemento.style.transform = 'scale(1.02)';
    }

    const filtrados = dadosMembros.filter(m => {
        const g = (m.Genero || m["GÃªnero"] || "").toString().toUpperCase().trim();
        if (genero === 'MASC') return g.includes("HOMEM") || g.includes("MASC");
        return g.includes("MULHER") || g.includes("FEM");
    });
    renderizar(filtrados);
}
async function buscarAvisosGeraisNoModal(nome) {
    const container = document.getElementById('modalAvisosGeraisContainer');
    const box = document.getElementById('modalAvisosGerais');
    const userToken = JSON.parse(localStorage.getItem('user_token') || '{}');
    const isAdmin = userToken.Role === "Admin" || userToken.Role === "Lider";

    if (!isAdmin) {
        container.style.display = 'none';
        return;
    }

    box.innerHTML = '<div style="text-align:center; padding:10px; color:var(--text-muted);">Carregando...</div>';

    try {
        const cached = localStorage.getItem('offline_lembretes');
        const lembretes = cached ? JSON.parse(cached) : [];

        const normalize = str => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const nomeNormalizado = normalize(nome);

        const avisos = lembretes.filter(l =>
            l.Culto === "AVISO_LIDER" &&
            (normalize(l.Componente).includes(nomeNormalizado) || nomeNormalizado.includes(normalize(l.Componente)))
        );

        if (avisos.length > 0) {
            container.style.display = 'block';
            box.innerHTML = avisos.map(a => `
        <div style="background:rgba(0,0,0,0.02); border-left:3px solid var(--secondary); padding:8px; border-radius:5px; margin-top:8px; font-size:0.8rem; position:relative; color:var(--text-primary);">
        <div style="font-weight:bold; margin-bottom:3px; display:flex; justify-content:space-between;">
          <span>${a.Componente}</span>
          <span style="font-size:0.7rem; color:var(--text-muted);">${new Date(a.Data).toLocaleDateString('pt-BR')}</span>
        </div>
        <div style="color:var(--text-primary); opacity:0.9;">${a.Info}</div>
        <i class="fas fa-trash-alt" onclick="excluirAviso('${a.id_Lembrete}', event)" style="position:absolute; right:8px; bottom:8px; color:var(--text-muted); cursor:pointer; font-size:0.75rem;" title="Remover"></i>
        </div>
    `).join('');
        } else {
            container.style.display = 'none';
        }
    } catch (e) { console.log(e); }
}

async function excluirAviso(id, event) {
    if (event) event.stopPropagation();
    if (!confirm("Deseja realmente excluir este aviso?")) return;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "delete", sheet: "Lembretes", id_Lembrete: id })
        });
        const res = await response.json();
        if (res.status === "success") {
            alert("Aviso excluído!");
            // Atualiza localmente
            let lembretes = JSON.parse(localStorage.getItem('offline_lembretes') || '[]');
            lembretes = lembretes.filter(l => l.id_Lembrete !== id);
            localStorage.setItem('offline_lembretes', JSON.stringify(lembretes));

            // Recarrega se o modal ainda estiver aberto
            const modal = document.getElementById('modalPerfilComp');
            if (modal.style.display === 'flex') {
                // Aqui precisaria do nome, mas vamos apenas sumir com o item do DOM pra ser mais rÃ¡pido
                const el = event.target.closest('div');
                if (el) el.remove();
            }
        } else {
            alert("Erro ao excluir: " + res.message);
        }
    } catch (e) { alert("Erro de conexão."); }
}

function abrirFotoExpandida(url, event) {
    if (event) event.stopPropagation();
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    img.src = url;
    lb.style.display = 'flex';
}

function fecharLightbox() {
    document.getElementById('lightbox').style.display = 'none';
}

/* Redundant theme redefinitions removed - now using global temas-core.js */

window.onload = () => iniciar();
