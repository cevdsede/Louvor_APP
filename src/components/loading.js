// Componente de Loading
class Loading {
    constructor() {
        this.element = null;
        this.isVisible = false;
        this.init();
    }

    init() {
        this.createLoading();
    }

    createLoading() {
        const loadingHTML = `
            <div id="loading-overlay" class="loading-overlay hidden">
                <div class="loading-content">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                    </div>
                    <div class="loading-text">Carregando...</div>
                    <div class="loading-progress">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <div class="progress-text">0%</div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', loadingHTML);
        this.element = document.getElementById('loading-overlay');
    }

    // Mostrar loading
    show(options = {}) {
        const {
            text = 'Carregando...',
            showProgress = false,
            timeout = 0
        } = options;

        if (this.isVisible) return;

        this.isVisible = true;

        // Atualizar texto
        const textElement = this.element?.querySelector('.loading-text');
        if (textElement) {
            textElement.textContent = text;
        }

        // Mostrar/ocultar progress bar
        const progressContainer = this.element?.querySelector('.loading-progress');
        if (progressContainer) {
            progressContainer.style.display = showProgress ? 'flex' : 'none';
        }

        // Mostrar loading
        this.element?.classList.remove('hidden');

        // Auto-hide com timeout
        if (timeout > 0) {
            setTimeout(() => this.hide(), timeout);
        }
    }

    // Esconder loading
    hide() {
        if (!this.isVisible) return;

        this.isVisible = false;
        this.element?.classList.add('hidden');

        // Resetar progress
        this.updateProgress(0);
    }

    // Atualizar progresso
    updateProgress(percent) {
        const progressFill = this.element?.querySelector('.progress-fill');
        const progressText = this.element?.querySelector('.progress-text');

        if (progressFill) {
            progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        }

        if (progressText) {
            progressText.textContent = `${Math.round(percent)}%`;
        }
    }

    // Loading com steps
    async showWithSteps(steps, options = {}) {
        this.show({ ...options, showProgress: true });

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            
            // Atualizar texto
            const textElement = this.element?.querySelector('.loading-text');
            if (textElement) {
                textElement.textContent = step.text || 'Processando...';
            }

            // Atualizar progresso
            const progress = ((i + 1) / steps.length) * 100;
            this.updateProgress(progress);

            // Executar step
            if (typeof step.action === 'function') {
                await step.action();
            }

            // Delay entre steps
            if (step.delay) {
                await new Promise(resolve => setTimeout(resolve, step.delay));
            }
        }

        // Completar
        this.updateProgress(100);
        
        // Manter visível por um momento
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.hide();
    }

    // Loading para operações específicas
    showSync() {
        return this.showWithSteps([
            { text: 'Conectando ao servidor...', delay: 500 },
            { text: 'Sincronizando escalas...', action: () => window.api?.getEscalas() },
            { text: 'Sincronizando repertório...', action: () => window.api?.getRepertorio() },
            { text: 'Sincronizando lembretes...', action: () => window.api?.getLembretes() },
            { text: 'Finalizando...', delay: 300 }
        ], { text: 'Sincronizando dados...' });
    }

    showExport() {
        return this.showWithSteps([
            { text: 'Preparando dados...', delay: 300 },
            { text: 'Gerando relatório...', delay: 1000 },
            { text: 'Finalizando exportação...', delay: 500 }
        ], { text: 'Exportando dados...' });
    }

    // Loading inline (para botões, cards, etc.)
    showInline(container, options = {}) {
        const {
            size = 'small',
            text = ''
        } = options;

        const inlineHTML = `
            <div class="inline-loading inline-loading-${size}">
                <div class="inline-spinner"></div>
                ${text ? `<span class="inline-text">${text}</span>` : ''}
            </div>
        `;

        const element = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;

        if (element) {
            element.innerHTML = inlineHTML;
            element.classList.add('loading-inline');
        }

        return () => this.hideInline(element);
    }

    // Esconder loading inline
    hideInline(container) {
        const element = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;

        if (element) {
            element.innerHTML = '';
            element.classList.remove('loading-inline');
        }
    }

    // Skeleton loading (para cards, listas, etc.)
    showSkeleton(container, config = {}) {
        const {
            lines = 3,
            height = '1rem',
            className = ''
        } = config;

        const skeletonHTML = `
            <div class="skeleton-loading ${className}">
                ${Array.from({ length: lines }, (_, i) => `
                    <div class="skeleton-line" style="height: ${height}; width: ${Math.random() * 40 + 60}%"></div>
                `).join('')}
            </div>
        `;

        const element = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;

        if (element) {
            element.innerHTML = skeletonHTML;
        }

        return () => this.hideSkeleton(element);
    }

    // Esconder skeleton
    hideSkeleton(container) {
        const element = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;

        if (element) {
            element.innerHTML = '';
        }
    }

    // Renderizar (para uso no sistema de componentes)
    render() {
        if (!this.element) {
            this.init();
        }
        return this.element;
    }
}

// Criar instância global
window.loading = new Loading();
