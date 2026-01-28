// Exemplos de Uso do Novo Sistema SPA

// =================================================================
// 1. NAVEGAÇÃO PROGRAMÁTICA
// =================================================================

// Navegar para uma página
window.router.navigate('escalas');

// Navegar com callback
window.router.navigate('musicas', true).then(() => {
    console.log('Navegação concluída');
});

// Obter rota atual
const currentRoute = window.router.getCurrentRoute();
console.log('Rota atual:', currentRoute);

// =================================================================
// 2. GERENCIAMENTO DE ESTADO
// =================================================================

// Definir estado global
window.store.setState('user.name', 'João Silva');
window.store.setState('escalas', [{ id: 1, name: 'Escala Domingo' }]);

// Obter estado
const userName = window.store.getState('user.name');
const allEscalas = window.store.getState('escalas');

// Atualizar estado com função
window.store.updateState('user.notifications', (notifications) => [
    ...notifications,
    { id: Date.now(), message: 'Nova notificação', read: false }
]);

// Assinar mudanças de estado
const unsubscribe = window.store.subscribe('user.name', (newValue, oldValue) => {
    console.log(`Nome mudou de ${oldValue} para ${newValue}`);
});

// Assinar múltiplas chaves
const unsubscribeMultiple = window.store.subscribeMultiple(
    ['user.name', 'user.email'],
    (value) => console.log('Dados do usuário atualizados:', value)
);

// Cancelar subscrição
unsubscribe();
unsubscribeMultiple();

// =================================================================
// 3. COMPONENTES REUTILIZÁVEIS
// =================================================================

// Criar componente stat card
const statCard = window.createComponent('statCard', '#stats-container', {
    label: 'Total de Membros',
    value: '150',
    icon: 'fa-users',
    iconBg: '#3b82f6',
    iconColor: 'white',
    trend: 'positive',
    trendValue: '+12%',
    trendIcon: 'arrow-up'
});

// Criar botão de ação
const actionButton = window.createComponent('actionButton', '#actions-container', {
    text: 'Adicionar Membro',
    icon: 'fa-plus',
    variant: 'primary',
    onclick: 'showAddMemberModal()'
});

// Criar modal
const modal = window.createComponent('modal', 'body', {
    name: 'confirmModal',
    title: 'Confirmar Ação',
    content: 'Tem certeza que deseja continuar?',
    footer: `
        <button class="btn-secondary" onclick="closeModal('confirmModal')">Cancelar</button>
        <button class="btn-primary" onclick="confirmAction()">Confirmar</button>
    `
});

// Atualizar componente
window.updateComponent('statCard', {
    value: '160',
    trendValue: '+15%'
});

// =================================================================
// 4. CONFIGURAÇÃO DA APLICAÇÃO
// =================================================================

// Obter configuração
const theme = window.getConfig('ui.theme.default');
const sidebarWidth = window.getConfig('ui.layout.sidebarWidth');
const isFeatureEnabled = window.isFeatureEnabled('spaNavigation');

// Definir configuração
window.setConfig('ui.theme.default', 'dark');

// Obter configuração de módulo
const escalasConfig = window.getModuleConfig('escalas');
console.log('Configuração das escalas:', escalasConfig);

// Verificar se módulo está habilitado
if (window.isModuleEnabled('musicas')) {
    console.log('Módulo de músicas está habilitado');
}

// =================================================================
// 5. EVENTOS DO SISTEMA SPA
// =================================================================

// Escutar eventos de navegação
document.addEventListener('spa:navigation', (event) => {
    const { page, route } = event.detail;
    console.log(`Navegou para: ${page}`);
    console.log('Configuração da rota:', route);
    
    // Executar ações específicas da página
    switch (page) {
        case 'escalas':
            loadEscalaData();
            break;
        case 'musicas':
            loadMusicasData();
            break;
    }
});

// =================================================================
// 6. EXEMPLOS PRÁTICOS
// =================================================================

// Exemplo: Carregar dados da página atual
async function loadPageData() {
    const currentPage = window.router.getCurrentRoute();
    
    try {
        // Mostrar loading
        window.store.setState('loading', true);
        
        // Carregar dados específicos da página
        switch (currentPage) {
            case 'escalas':
                const escalas = await fetchEscalas();
                window.store.setState('escalas', escalas);
                break;
            case 'musicas':
                const musicas = await fetchMusicas();
                window.store.setState('musicas', musicas);
                break;
        }
        
        // Atualizar UI com componentes
        updatePageUI(currentPage);
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        window.showToast('Erro ao carregar dados', 'error');
    } finally {
        window.store.setState('loading', false);
    }
}

// Exemplo: Atualizar UI baseada no estado
function updatePageUI(page) {
    switch (page) {
        case 'escalas':
            const escalas = window.store.getState('escalas');
            const statsCard = window.createComponent('statCard', '#escalas-stats', {
                label: 'Total de Escalas',
                value: escalas.length,
                icon: 'fa-calendar-check',
                iconBg: '#3b82f6',
                iconColor: 'white'
            });
            break;
    }
}

// Exemplo: Sistema de notificações
function setupNotifications() {
    // Assinar mudanças no estado de notificações
    window.store.subscribe('notifications', (notifications) => {
        const unreadCount = notifications.filter(n => !n.read).length;
        
        // Atualizar badge
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
        
        // Mostrar toast para novas notificações
        const newNotifications = notifications.filter(n => !n.read);
        newNotifications.forEach(notification => {
            window.showToast(notification.message, 'info');
        });
    });
}

// Exemplo: Sistema de tema
function setupThemeSystem() {
    // Assinar mudanças no tema
    window.store.subscribe('theme', (theme) => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('app_theme', theme);
    });
    
    // Carregar tema salvo
    const savedTheme = localStorage.getItem('app_theme') || 'light';
    window.store.setState('theme', savedTheme);
}

// Exemplo: Sistema de autenticação
function setupAuthSystem() {
    // Verificar autenticação ao carregar
    const token = localStorage.getItem('user_token');
    if (!token) {
        window.router.navigate('/login');
        return;
    }
    
    // Parse e armazenar dados do usuário
    try {
        const userData = JSON.parse(token);
        window.store.setState('user', userData);
    } catch (error) {
        console.error('Token inválido:', error);
        localStorage.removeItem('user_token');
        window.router.navigate('/login');
    }
    
    // Assinar mudanças no usuário
    window.store.subscribe('user', (user) => {
        if (!user) {
            window.router.navigate('/login');
        }
    });
}

// =================================================================
// 7. INICIALIZAÇÃO DA APLICAÇÃO
// =================================================================

// Inicializar sistemas quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando aplicação SPA...');
    
    // Setup dos sistemas
    setupAuthSystem();
    setupThemeSystem();
    setupNotifications();
    
    // Carregar dados da página atual
    loadPageData();
    
    // Setup de eventos globais
    setupGlobalEvents();
    
    console.log('✅ Aplicação SPA inicializada com sucesso!');
});

function setupGlobalEvents() {
    // Evento de online/offline
    window.addEventListener('online', () => {
        window.store.setState('connection.online', true);
        window.showToast('Conexão restaurada', 'success');
    });
    
    window.addEventListener('offline', () => {
        window.store.setState('connection.online', false);
        window.showToast('Sem conexão com a internet', 'warning');
    });
    
    // Evento de visibilidade da página
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // Recarregar dados quando a página ficar visível
            loadPageData();
        }
    });
}

// Exportar funções para uso global
window.spaExamples = {
    loadPageData,
    updatePageUI,
    setupNotifications,
    setupThemeSystem,
    setupAuthSystem
};
