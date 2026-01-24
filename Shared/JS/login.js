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
        const url = SCRIPT_URL + "?sheet=Acesso";
        console.log("🌐 URL de Chamada:", url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }

        const json = await response.json();
        console.log("📥 Resposta recebida do servidor:", json);

        if (!json.data || !Array.isArray(json.data)) {
            console.error("❌ Formato de dados inválido. Esperado 'data' como Array.");
            mostrarErro("Erro na resposta do servidor.");
            return;
        }

        const usuarioValido = json.data.find(c => {
            const loginPlanilha = String(c.User || "").trim().toLowerCase();
            const senhaPlanilha = String(c.Senha || "").trim();
            return loginPlanilha === user.toLowerCase() && senhaPlanilha === pass;
        });

        if (usuarioValido) {
            console.log("✅ Usuário autenticado com sucesso:", usuarioValido.Nome);
            // Normaliza o Perfil/Role
            usuarioValido.Role = usuarioValido.Perfil || usuarioValido.Role || "User";

            localStorage.setItem('user_token', JSON.stringify(usuarioValido));
            localStorage.setItem('last_user_name', usuarioValido.Nome);

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
