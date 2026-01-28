// Sistema de Toast Notifications
class Toast {
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.defaultOptions = {
            duration: 5000,
            position: 'top-right',
            closable: true,
            pauseOnHover: true
        };
        this.init();
    }

    init() {
        this.createContainer();
    }

    createContainer() {
        const containerHTML = `
            <div id="toast-container" class="toast-container"></div>
        `;
        document.body.insertAdjacentHTML('beforeend', containerHTML);
        this.container = document.getElementById('toast-container');
    }

    // Mostrar toast
    show(message, type = 'info', options = {}) {
        const config = { ...this.defaultOptions, ...options };
        const id = this.generateId();

        const toast = this.createToast(id, message, type, config);
        this.addToast(id, toast, config);

        return id;
    }

    // Criar elemento toast
    createToast(id, message, type, config) {
        const toastHTML = `
            <div id="toast-${id}" class="toast toast-${type}" data-toast-id="${id}">
                <div class="toast-icon">
                    ${this.getIcon(type)}
                </div>
                <div class="toast-content">
                    <div class="toast-message">${message}</div>
                    ${config.description ? `<div class="toast-description">${config.description}</div>` : ''}
                </div>
                <div class="toast-actions">
                    ${config.closable ? `<button class="toast-close">&times;</button>` : ''}
                    ${config.action ? `<button class="toast-action">${config.action.text}</button>` : ''}
                </div>
                ${config.duration > 0 ? `<div class="toast-progress"></div>` : ''}
            </div>
        `;

        const toast = document.createElement('div');
        toast.innerHTML = toastHTML.trim();
        return toast.firstElementChild;
    }

    // Adicionar toast ao container
    addToast(id, toast, config) {
        // Adicionar ao container
        this.container.appendChild(toast);

        // Salvar referência
        this.toasts.set(id, {
            element: toast,
            config: config,
            timer: null,
            progressTimer: null
        });

        // Animar entrada
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Configurar eventos
        this.setupToastEvents(id);

        // Auto-remover
        if (config.duration > 0) {
            this.setAutoRemove(id);
        }

        // Progress bar
        if (config.duration > 0) {
            this.startProgress(id);
        }
    }

    // Configurar eventos do toast
    setupToastEvents(id) {
        const toastData = this.toasts.get(id);
        if (!toastData) return;

        const { element, config } = toastData;

        // Close button
        const closeBtn = element.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.remove(id));
        }

        // Action button
        const actionBtn = element.querySelector('.toast-action');
        if (actionBtn && config.action) {
            actionBtn.addEventListener('click', () => {
                config.action.handler();
                this.remove(id);
            });
        }

        // Pause on hover
        if (config.pauseOnHover) {
            element.addEventListener('mouseenter', () => this.pauseTimer(id));
            element.addEventListener('mouseleave', () => this.resumeTimer(id));
        }

        // Click to remove
        element.addEventListener('click', (e) => {
            if (e.target === element || e.target.closest('.toast-content')) {
                this.remove(id);
            }
        });
    }

    // Auto-remover
    setAutoRemove(id) {
        const toastData = this.toasts.get(id);
        if (!toastData) return;

        toastData.timer = setTimeout(() => {
            this.remove(id);
        }, toastData.config.duration);
    }

    // Iniciar progress bar
    startProgress(id) {
        const toastData = this.toasts.get(id);
        if (!toastData) return;

        const progressBar = toastData.element.querySelector('.toast-progress');
        if (!progressBar) return;

        let progress = 0;
        const duration = toastData.config.duration;
        const interval = 50; // Update every 50ms
        const increment = (interval / duration) * 100;

        toastData.progressTimer = setInterval(() => {
            progress += increment;
            if (progress >= 100) {
                clearInterval(toastData.progressTimer);
                progressBar.style.width = '100%';
            } else {
                progressBar.style.width = `${progress}%`;
            }
        }, interval);
    }

    // Pausar timer
    pauseTimer(id) {
        const toastData = this.toasts.get(id);
        if (!toastData || !toastData.timer) return;

        clearTimeout(toastData.timer);
        toastData.timer = null;

        // Pausar progress
        if (toastData.progressTimer) {
            clearInterval(toastData.progressTimer);
        }
    }

    // Resumir timer
    resumeTimer(id) {
        const toastData = this.toasts.get(id);
        if (!toastData || toastData.timer) return;

        this.setAutoRemove(id);
        this.startProgress(id);
    }

    // Remover toast
    remove(id) {
        const toastData = this.toasts.get(id);
        if (!toastData) return;

        const { element, timer, progressTimer } = toastData;

        // Limpar timers
        if (timer) clearTimeout(timer);
        if (progressTimer) clearInterval(progressTimer);

        // Animar saída
        element.classList.add('remove');

        // Remover do DOM após animação
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.toasts.delete(id);
        }, 300);
    }

    // Remover todos os toasts
    clear() {
        for (const [id] of this.toasts) {
            this.remove(id);
        }
    }

    // Obter ícone baseado no tipo
    getIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        return icons[type] || icons.info;
    }

    // Gerar ID único
    generateId() {
        return 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Métodos de conveniência
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', { ...options, duration: 8000 });
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', { ...options, duration: 6000 });
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    // Toast com ação
    confirm(message, actionText, actionHandler, options = {}) {
        return this.show(message, 'info', {
            ...options,
            duration: 0, // Não auto-remove
            action: {
                text: actionText,
                handler: actionHandler
            }
        });
    }

    // Renderizar (para uso no sistema de componentes)
    render() {
        if (!this.container) {
            this.init();
        }
        return this.container;
    }
}

// Criar instância global
window.toast = new Toast();
