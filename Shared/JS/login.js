const SCRIPT_URL = APP_CONFIG.SCRIPT_URL;

async function fazerLogin() {
    const userField = document.getElementById('usuario');
    const passField = document.getElementById('senha');
    const errorMsg = document.getElementById('errorMsg');
    const loader = document.getElementById('loader');
    const btn = document.querySelector('.btn-primary');

    const user = userField.value.trim();
    const pass = passField.value.trim();

    if (!user || !pass) {
        mostrarErro("Preencha todos os campos.");
        return;
    }

    console.log("🚀 Iniciando Login...");
    console.log("📤 Enviando pedido para buscar aba: Acesso");

    loader.style.display = 'block';
    errorMsg.style.display = 'none';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
        const SUPABASE_URL = APP_CONFIG.SUPABASE_URL;
        const SUPABASE_KEY = APP_CONFIG.SUPABASE_KEY;

        // Usamos ilike para o username ser case-insensitive, mantendo o comportamento legado
        const url = `${SUPABASE_URL}/rest/v1/acesso?username=ilike.${encodeURIComponent(user)}&password=eq.${encodeURIComponent(pass)}`;
        console.log("🌐 URL de Chamada Supabase (Auth)");

        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("📥 Resposta de Auth recebida:", data);

        if (data && data.length > 0) {
            const usuarioValido = data[0];
            console.log("✅ Usuário autenticado com sucesso:", usuarioValido.nome);

            // Mapeamento para o formato legado esperado pelo app
            const sessionData = {
                Nome: usuarioValido.nome,
                User: usuarioValido.username,
                Role: usuarioValido.perfil || "User",
                Perfil: usuarioValido.perfil || "User"
            };

            localStorage.setItem('user_token', JSON.stringify(sessionData));
            localStorage.setItem('last_user_name', usuarioValido.nome);

            window.location.href = '../../index.html';
        } else {
            console.warn("⚠️ Falha no login: Usuário ou senha incorretos.");
            mostrarErro("Usuário ou senha incorretos.");
        }
    } catch (e) {
        console.error("❌ Erro fatal no Login:", e);
        mostrarErro("Erro de conexão. Verifique o console (F12).");
    } finally {
        loader.style.display = 'none';
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

function mostrarErro(msg) {
    const el = document.getElementById('errorMsg');
    el.innerText = msg;
    el.style.display = 'block';
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 500);
}

window.onload = () => {
    if (localStorage.getItem('user_token')) {
        window.location.href = '../../index.html';
    }
}

document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        fazerLogin();
    }
});
