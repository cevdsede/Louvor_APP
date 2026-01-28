// Página de Login
class LoginPage {
    constructor() {
        this.isLoading = false;
    }

    async render() {
        return this.getTemplate();
    }

    getTemplate() {
        return `
            <div class="login-container">
                <div class="login-card">
                    <!-- Logo e Título -->
                    <div class="login-header">
                        <div class="login-logo">
                            <i class="fas fa-cross"></i>
                        </div>
                        <h1 class="login-title">Louvor CEVD</h1>
                        <p class="login-subtitle">Sistema de Gestão do Ministério</p>
                    </div>

                    <!-- Formulário de Login -->
                    <form class="login-form" onsubmit="window.loginPage?.handleLogin(event)">
                        <div class="form-group">
                            <label for="username" class="form-label">
                                <i class="fas fa-user"></i>
                                Usuário
                            </label>
                            <input 
                                type="text" 
                                id="username" 
                                name="username" 
                                class="form-input" 
                                placeholder="Digite seu usuário"
                                required
                                autocomplete="username"
                            >
                        </div>

                        <div class="form-group">
                            <label for="password" class="form-label">
                                <i class="fas fa-lock"></i>
                                Senha
                            </label>
                            <div class="password-input-wrapper">
                                <input 
                                    type="password" 
                                    id="password" 
                                    name="password" 
                                    class="form-input" 
                                    placeholder="Digite sua senha"
                                    required
                                    autocomplete="current-password"
                                >
                                <button type="button" class="password-toggle" onclick="window.loginPage?.togglePassword()">
                                    <i class="fas fa-eye" id="password-icon"></i>
                                </button>
                            </div>
                        </div>

                        <div class="form-options">
                            <label class="checkbox-label">
                                <input type="checkbox" id="remember" name="remember">
                                <span class="checkmark"></span>
                                Lembrar-me
                            </label>
                            <a href="#" class="forgot-password" onclick="window.loginPage?.handleForgotPassword()">
                                Esqueci minha senha
                            </a>
                        </div>

                        <button type="submit" class="login-btn" id="login-btn">
                            <span class="btn-text">Entrar</span>
                            <div class="btn-loading" style="display: none;">
                                <div class="spinner"></div>
                            </div>
                        </button>
                    </form>

                    <!-- Links Adicionais -->
                    <div class="login-footer">
                        <p class="login-help">
                            Precisa de ajuda? 
                            <a href="#" onclick="window.loginPage?.showHelp()">Clique aqui</a>
                        </p>
                        <p class="login-version">
                            Versão ${window.APP_CONFIG?.APP?.VERSION || '2.0.0'}
                        </p>
                    </div>
                </div>

                <!-- Background Elements -->
                <div class="login-background">
                    <div class="bg-shape bg-shape-1"></div>
                    <div class="bg-shape bg-shape-2"></div>
                    <div class="bg-shape bg-shape-3"></div>
                </div>
            </div>
        `;
    }

    async handleLogin(event) {
        event.preventDefault();
        
        if (this.isLoading) return;

        const formData = new FormData(event.target);
        const username = formData.get('username');
        const password = formData.get('password');
        const remember = formData.get('remember');

        try {
            this.setLoading(true);

            // Tentar login com Supabase
            const result = await window.authService?.login(username, password);

            if (result) {
                // Salvar preferência de lembrar
                if (remember) {
                    window.storage?.set('remember_username', username);
                } else {
                    window.storage?.remove('remember_username');
                }

                // Mostrar sucesso
                window.toast?.success('Login realizado com sucesso!');

                // Redirecionar para dashboard
                setTimeout(() => {
                    window.router?.navigate('/dashboard');
                }, 1000);
            } else {
                throw new Error('Falha no login');
            }

        } catch (error) {
            console.error('Erro no login:', error);
            window.toast?.error(error.message || 'Usuário ou senha incorretos');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        const btn = document.getElementById('login-btn');
        const btnText = btn?.querySelector('.btn-text');
        const btnLoading = btn?.querySelector('.btn-loading');

        if (btn && btnText && btnLoading) {
            if (loading) {
                btn.disabled = true;
                btnText.style.display = 'none';
                btnLoading.style.display = 'block';
            } else {
                btn.disabled = false;
                btnText.style.display = 'block';
                btnLoading.style.display = 'none';
            }
        }
    }

    togglePassword() {
        const passwordInput = document.getElementById('password');
        const passwordIcon = document.getElementById('password-icon');

        if (passwordInput && passwordIcon) {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;

            // Trocar ícone
            if (type === 'text') {
                passwordIcon.classList.remove('fa-eye');
                passwordIcon.classList.add('fa-eye-slash');
            } else {
                passwordIcon.classList.remove('fa-eye-slash');
                passwordIcon.classList.add('fa-eye');
            }
        }
    }

    async handleForgotPassword() {
        const username = prompt('Digite seu usuário para recuperar a senha:');
        
        if (!username) return;

        try {
            this.setLoading(true);
            
            await window.authService?.resetPassword(username);
            
            window.toast?.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
            
        } catch (error) {
            console.error('Erro ao recuperar senha:', error);
            window.toast?.error('Erro ao enviar email de recuperação');
        } finally {
            this.setLoading(false);
        }
    }

    showHelp() {
        const helpContent = `
            <div class="help-content">
                <h3>Ajuda - Login</h3>
                <div class="help-section">
                    <h4>Como fazer login:</h4>
                    <ol>
                        <li>Digite seu usuário (sem @cevd.com)</li>
                        <li>Digite sua senha</li>
                        <li>Clique em "Entrar"</li>
                    </ol>
                </div>
                <div class="help-section">
                    <h4>Problemas comuns:</h4>
                    <ul>
                        <li><strong>Usuário não encontrado:</strong> Verifique se digitou corretamente</li>
                        <li><strong>Senha incorreta:</strong> Use "Esqueci minha senha"</li>
                        <li><strong>Conta não ativada:</strong> Verifique seu email</li>
                    </ul>
                </div>
                <div class="help-section">
                    <h4>Contato:</h4>
                    <p>Se precisar de ajuda adicional, entre em contato com o administrador do sistema.</p>
                </div>
            </div>
        `;

        this.showModal('Ajuda - Login', helpContent);
    }

    showModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
                        Fechar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Inicializar página
    async init() {
        // Verificar se já está logado
        const session = await window.authService?.checkCurrentSession();
        
        if (session) {
            // Já está logado, redirecionar
            window.router?.navigate('/dashboard');
            return;
        }

        // Preencher usuário se estiver salvo
        const rememberedUsername = window.storage?.get('remember_username');
        if (rememberedUsername) {
            const usernameInput = document.getElementById('username');
            const rememberCheckbox = document.getElementById('remember');
            
            if (usernameInput) usernameInput.value = rememberedUsername;
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }

        // Focar no campo apropriado
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        if (usernameInput && !usernameInput.value) {
            usernameInput.focus();
        } else if (passwordInput) {
            passwordInput.focus();
        }
    }
}

// Registrar página
window.LoginPage = LoginPage;
