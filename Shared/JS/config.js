// Configuração centralizada do App
var VERSION = '2.8';
var APP_CONFIG = {
    VERSION,
    CACHE_NAME: `louvor-app-v${VERSION}`,
    SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwjwn6-sdv8f4BLLwaqQWPc4yNI8CS40gO8J77GrJDqLncENJncWIfAV-FBkZuZP6k/exec",
    SUPABASE_URL: "https://ipdrbhkzluuwjulkhjkd.supabase.co",
    SUPABASE_KEY: "sb_publishable_SVVAGw8jBQUOksd73d_zvQ_z_SacS65"
};

// Helper global para Supabase
async function supabaseFetch(table, query = "", options = {}) {
    const url = `${APP_CONFIG.SUPABASE_URL}/rest/v1/${table}${query}`;
    const defaultHeaders = {
        'apikey': APP_CONFIG.SUPABASE_KEY,
        'Authorization': `Bearer ${APP_CONFIG.SUPABASE_KEY}`,
        'Content-Type': 'application/json'
    };

    const fetchOptions = {
        method: options.method || 'GET',
        headers: { ...defaultHeaders, ...options.headers }
    };

    if (options.body) {
        fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erro Supabase (${table}): ${response.statusText} - ${error}`);
    }

    // DELETE e POST (com return=minimal) podem não retornar JSON
    if (response.status === 204) return null;

    return await response.json();
}

// Helper para normalizar dados do Supabase para o formato legado esperado pelo app
function normalizeData(data, type) {
    if (!data || !Array.isArray(data)) return data;
    return data.map(item => {
        const normalized = { ...item };
        if (type === 'escala') {
            normalized.Nome = item.nome;
            normalized.Data = item.data;
            normalized.Função = item.funcao;
            normalized["Nome dos Cultos"] = item.nome_culto;
            normalized["Culto Completo"] = item.culto_completo;
            normalized.Cultos = item.nome_culto; // Fallback
        } else if (type === 'lembrete') {
            normalized.id_Lembrete = item.id_lembrete;
            normalized.Componente = item.componente;
            normalized.Data = item.data;
            normalized.Culto = item.culto;
            normalized.Info = item.info;
        } else if (type === 'membro') {
            normalized.Nome = item.nome;
            normalized["Função"] = item.funcao;
            normalized.Perfil = item.perfil;
            normalized.Ativo = item.ativo;
        } else if (type === 'musica') {
            normalized.Musica = item.musica;
            normalized.Cantor = item.cantor;
            normalized.Tema = item.tema;
            normalized.Estilo = item.estilo;
        } else if (type === 'culto') {
            normalized.id_Culto = item.id;
            normalized.Data = item.data;
            normalized.Nome = item.nome;
        } else if (type === 'evento') {
            // Antiga Consagração
            normalized.id_Aula = item.id_evento || item.id;
            normalized.Data = item.data;
            normalized.Tema = item.tema;
            normalized.Status = item.status;
        } else if (type === 'tema') {
            normalized.Nome = item.nome_tema;
        } else if (type === 'nome_culto') {
            normalized.Nome = item.nome_culto;
        }
        return normalized;
    });
}
