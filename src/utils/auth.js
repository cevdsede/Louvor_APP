// Serviço de Autenticação - Supabase
class AuthService {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            if (!window.APP_CONFIG?.SUPABASE) {
                throw new Error('Configuração do Supabase não encontrada');
            }

            // Inicializar cliente Supabase
            this.supabase = window.supabase.createClient(
                window.APP_CONFIG.SUPABASE.URL,
                window.APP_CONFIG.SUPABASE.ANON_KEY
            );

            // Verificar sessão existente
            await this.checkCurrentSession();
            
            this.isInitialized = true;
            console.log('Serviço de autenticação inicializado');
            
        } catch (error) {
            console.error('Erro ao inicializar autenticação:', error);
            throw error;
        }
    }

    // Login do usuário
    async login(username, password) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Monta o e-mail padrão que criamos no banco
            const email = `${username.toLowerCase()}@cevd.com`;

            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                console.error("Erro ao logar:", error.message);
                throw new Error(error.message);
            }

            console.log("Usuário logado com sucesso:", data.user);
            this.currentUser = data.user;

            // Salvar dados no storage local
            window.storage?.set('auth_user', data.user);
            window.storage?.set('auth_session', data.session);

            // Buscar dados completos do perfil
            const perfil = await this.buscarDadosPerfil();
            if (perfil) {
                window.storage?.set('user_profile', perfil);
            }

            return {
                user: data.user,
                session: data.session,
                profile: perfil
            };
            
        } catch (error) {
            console.error("Erro no login:", error);
            throw error;
        }
    }

    // Função para Buscar os Dados do Membro
    async buscarDadosPerfil() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // 1. Pega o usuário que está logado no momento
            const { data: { user } } = await this.supabase.auth.getUser();

            if (!user) {
                throw new Error('Nenhum usuário logado');
            }

            // 2. Busca na tabela membros usando o ID do Auth
            const { data: perfil, error } = await this.supabase
                .from('membros')
                .select('*')
                .eq('id', user.id) // O vínculo que criamos!
                .single();

            if (error) {
                console.error("Erro ao buscar perfil:", error.message);
                return null;
            }

            return perfil;
            
        } catch (error) {
            console.error("Erro ao buscar perfil:", error);
            return null;
        }
    }

    // Função de Logout (Sair)
    async logout() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const { error } = await this.supabase.auth.signOut();
            
            if (error) {
                console.error("Erro ao sair:", error.message);
                throw error;
            }

            // Limpar dados locais
            this.currentUser = null;
            window.storage?.remove('auth_user');
            window.storage?.remove('auth_session');
            window.storage?.remove('user_profile');

            console.log("Usuário deslogado com sucesso");
            return true;
            
        } catch (error) {
            console.error("Erro no logout:", error);
            throw error;
        }
    }

    // Verificar sessão atual
    async checkCurrentSession() {
        try {
            if (!this.supabase) return null;

            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error("Erro ao verificar sessão:", error.message);
                return null;
            }

            if (session) {
                this.currentUser = session.user;
                
                // Buscar dados do perfil
                const perfil = await this.buscarDadosPerfil();
                
                return {
                    user: session.user,
                    session: session,
                    profile: perfil
                };
            }

            return null;
            
        } catch (error) {
            console.error("Erro ao verificar sessão atual:", error);
            return null;
        }
    }

    // Verificar se usuário está autenticado
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Obter usuário atual
    getCurrentUser() {
        return this.currentUser;
    }

    // Obter perfil do usuário atual
    async getCurrentProfile() {
        if (this.isAuthenticated()) {
            return await this.buscarDadosPerfil();
        }
        return null;
    }

    // Registrar listener de mudanças de autenticação
    onAuthStateChange(callback) {
        if (!this.supabase) return null;

        return this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session);
            
            if (event === 'SIGNED_IN' && session) {
                this.currentUser = session.user;
                window.storage?.set('auth_user', session.user);
                window.storage?.set('auth_session', session);
                
                // Buscar perfil
                this.buscarDadosPerfil().then(perfil => {
                    if (perfil) {
                        window.storage?.set('user_profile', perfil);
                    }
                    callback({ event, session, profile: perfil });
                });
                
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                window.storage?.remove('auth_user');
                window.storage?.remove('auth_session');
                window.storage?.remove('user_profile');
                
                callback({ event, session: null, profile: null });
            }
        });
    }

    // Criar novo usuário (registro)
    async register(username, password, profileData) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const email = `${username.toLowerCase()}@cevd.com`;

            // 1. Criar usuário no Auth
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (authError) {
                throw new Error(authError.message);
            }

            // 2. Criar perfil na tabela membros
            if (authData.user) {
                const { data: profile, error: profileError } = await this.supabase
                    .from('membros')
                    .insert([{
                        id: authData.user.id,
                        username: username,
                        email: email,
                        created_at: new Date().toISOString(),
                        ...profileData
                    }])
                    .select()
                    .single();

                if (profileError) {
                    console.error("Erro ao criar perfil:", profileError);
                    throw new Error(profileError.message);
                }

                return {
                    user: authData.user,
                    profile: profile
                };
            }

            throw new Error('Erro ao registrar usuário');
            
        } catch (error) {
            console.error("Erro no registro:", error);
            throw error;
        }
    }

    // Resetar senha
    async resetPassword(username) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const email = `${username.toLowerCase()}@cevd.com`;

            const { error } = await this.supabase.auth.resetPasswordForEmail(email);

            if (error) {
                throw new Error(error.message);
            }

            return true;
            
        } catch (error) {
            console.error("Erro ao resetar senha:", error);
            throw error;
        }
    }

    // Atualizar perfil
    async updateProfile(profileData) {
        try {
            if (!this.isAuthenticated()) {
                throw new Error('Usuário não autenticado');
            }

            const { data, error } = await this.supabase
                .from('membros')
                .update(profileData)
                .eq('id', this.currentUser.id)
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            // Atualizar storage local
            window.storage?.set('user_profile', data);

            return data;
            
        } catch (error) {
            console.error("Erro ao atualizar perfil:", error);
            throw error;
        }
    }
}

// Criar instância global
window.authService = new AuthService();

// Funções globais para compatibilidade
window.entrarNoSistema = async (username, password) => {
    return await window.authService.login(username, password);
};

window.buscarDadosPerfil = async () => {
    return await window.authService.buscarDadosPerfil();
};

window.sairDoSistema = async () => {
    return await window.authService.logout();
};

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthService;
}
