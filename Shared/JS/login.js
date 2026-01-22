const SCRIPT_URL = APP_CONFIG.SCRIPT_URL;

async function fazerLogin() {
    const user = document.getElementById('usuario').value.trim();
    const pass = document.getElementById('senha').value.trim();
    const errorMsg = document.getElementById('errorMsg');
    const loader = document.getElementById('loader');
    const btn = document.querySelector('.btn-primary');

    if (!user || !pass) {
        mostrarErro("Preencha todos os campos.");
        return;
    }

    loader.style.display = 'block';
    errorMsg.style.display = 'none';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
        const response = await fetch(SCRIPT_URL + "?action=login", {
            method: 'POST',
            body: JSON.stringify({ user, pass })
        });
        const res = await response.json();

        if (res.status === "success") {
            // Salva token completo (Nome, User, Role, etc)
            localStorage.setItem('user_token', JSON.stringify(res.user));
            localStorage.setItem('last_user_name', res.user.Nome); // Backup
            window.location.href = '../../index.html';
        } else {
            mostrarErro("Usuário ou senha incorretos.");
        }
    } catch (e) {
        console.error(e);
        mostrarErro("Erro de conexão. Tente novamente.");
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

// Check if already logged in
window.onload = () => {
    if (localStorage.getItem('user_token')) {
        window.location.href = '../../index.html';
    }
}

// Allow Enter key to login
document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        fazerLogin();
    }
});
