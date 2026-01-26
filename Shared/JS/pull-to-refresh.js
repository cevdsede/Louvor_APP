/**
 * Pull-to-Refresh System
 * Implementação de arrastar para baixo para atualizar dados
 */

class PullToRefresh {
    constructor(options = {}) {
        this.options = {
            threshold: 80, // px para ativar
            maxPull: 120, // px máximo de arrasto
            resistance: 2.5, // resistência ao arrasto
            refreshTimeout: 3000, // timeout máximo para refresh
            animationDuration: 300, // ms para animações
            iconPath: 'assets/icons/refresh.svg',
            ...options
        };
        
        this.isPulling = false;
        this.isRefreshing = false;
        this.startY = 0;
        this.currentY = 0;
        this.pullDistance = 0;
        this.container = null;
        this.indicator = null;
        this.refreshCallback = null;
        
        this.init();
    }
    
    init() {
        this.addGlobalStyles();
        this.setupGlobalListeners();
    }
    
    addGlobalStyles() {
        const styleId = 'pull-to-refresh-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .ptr-container {
                position: relative;
                overflow: hidden;
            }
            
            .ptr-indicator {
                position: absolute;
                top: -60px;
                left: 50%;
                transform: translateX(-50%);
                width: 40px;
                height: 40px;
                background: var(--primary, #1e293b);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1000;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .ptr-indicator.pulled {
                top: 20px;
                background: var(--secondary, #3498db);
            }
            
            .ptr-indicator.refreshing {
                top: 20px;
                animation: ptr-spin 1s linear infinite;
            }
            
            .ptr-indicator svg {
                width: 20px;
                height: 20px;
                fill: white;
                transition: transform 0.3s ease;
            }
            
            .ptr-indicator.pulled svg {
                transform: rotate(180deg);
            }
            
            @keyframes ptr-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            .ptr-content {
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .ptr-message {
                position: absolute;
                top: 70px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--primary, #1e293b);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                opacity: 0;
                transition: opacity 0.3s ease;
                z-index: 999;
                white-space: nowrap;
            }
            
            .ptr-message.show {
                opacity: 1;
            }
            
            /* Theme-aware styles */
            [data-theme="dark"] .ptr-indicator {
                background: var(--primary-dark, #2a3f5f);
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            
            [data-theme="dark"] .ptr-indicator.pulled {
                background: var(--secondary-dark, #4a90e2);
            }
            
            [data-theme="dark"] .ptr-message {
                background: var(--primary-dark, #2a3f5f);
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .ptr-indicator {
                    width: 36px;
                    height: 36px;
                }
                
                .ptr-indicator svg {
                    width: 18px;
                    height: 18px;
                }
                
                .ptr-message {
                    font-size: 11px;
                    padding: 6px 12px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupGlobalListeners() {
        // Prevenir scroll padrão durante pull
        document.addEventListener('touchmove', (e) => {
            if (this.isPulling) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    attach(container, refreshCallback) {
        if (!container || typeof refreshCallback !== 'function') {
            console.error('PullToRefresh: Container e callback são obrigatórios');
            return;
        }
        
        this.container = container;
        this.refreshCallback = refreshCallback;
        
        // Adicionar classe ao container
        container.classList.add('ptr-container');
        
        // Criar indicador
        this.createIndicator();
        
        // Adicionar event listeners
        this.addEventListeners();
        
        return {
            destroy: () => this.destroy()
        };
    }
    
    createIndicator() {
        // Não criar indicador visual nem mensagem - apenas executar o callback
        this.indicator = null;
        this.message = null;
    }
    
    addEventListeners() {
        // Touch events
        this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        this.container.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: true });
        
        // Mouse events (para desktop)
        this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    handleTouchStart(e) {
        if (this.isRefreshing) return;
        
        const touch = e.touches[0];
        this.startY = touch.clientY;
        
        // Verificar se está no topo da página
        const scrollTop = this.container.scrollTop || window.pageYOffset;
        if (scrollTop <= 0) {
            this.isPulling = true;
        }
    }
    
    handleTouchMove(e) {
        if (!this.isPulling || this.isRefreshing) return;
        
        e.preventDefault();
        
        const touch = e.touches[0];
        this.currentY = touch.clientY;
        this.pullDistance = (this.currentY - this.startY) / this.options.resistance;
        
        // Limitar pull máximo
        if (this.pullDistance > this.options.maxPull) {
            this.pullDistance = this.options.maxPull;
        }
        
        this.updatePullState();
    }
    
    handleTouchEnd(e) {
        if (!this.isPulling || this.isRefreshing) return;
        
        if (this.pullDistance >= this.options.threshold) {
            this.triggerRefresh();
        } else {
            this.resetPull();
        }
    }
    
    handleTouchCancel(e) {
        this.resetPull();
    }
    
    handleMouseDown(e) {
        if (this.isRefreshing) return;
        
        const scrollTop = this.container.scrollTop || window.pageYOffset;
        if (scrollTop <= 0) {
            this.startY = e.clientY;
            this.isPulling = true;
        }
    }
    
    handleMouseMove(e) {
        if (!this.isPulling || this.isRefreshing) return;
        
        this.currentY = e.clientY;
        this.pullDistance = (this.currentY - this.startY) / this.options.resistance;
        
        if (this.pullDistance > this.options.maxPull) {
            this.pullDistance = this.options.maxPull;
        }
        
        this.updatePullState();
    }
    
    handleMouseUp(e) {
        if (!this.isPulling || this.isRefreshing) return;
        
        if (this.pullDistance >= this.options.threshold) {
            this.triggerRefresh();
        } else {
            this.resetPull();
        }
    }
    
    updatePullState() {
        // Não atualizar indicador visual pois foi desativado
        // Apenas aplicar transform ao conteúdo para feedback tátil
        const content = this.container.querySelector('.ptr-content');
        if (content) {
            content.style.transform = `translateY(${Math.max(0, this.pullDistance - 20)}px)`;
        }
    }
    
    triggerRefresh() {
        if (this.isRefreshing) return;
        
        this.isRefreshing = true;
        
        // Reset do conteúdo
        const content = this.container.querySelector('.ptr-content');
        if (content) {
            content.style.transform = 'translateY(60px)';
        }
        
        // Executar callback
        try {
            const result = this.refreshCallback();
            
            // Suportar promises
            if (result && typeof result.then === 'function') {
                result
                    .then(() => this.completeRefresh(true))
                    .catch(() => this.completeRefresh(false));
            } else {
                // Timeout para simular async
                setTimeout(() => this.completeRefresh(true), 1000);
            }
        } catch (error) {
            console.error('Erro no refresh callback:', error);
            this.completeRefresh(false);
        }
        
        // Timeout de segurança
        setTimeout(() => {
            if (this.isRefreshing) {
                this.completeRefresh(false);
            }
        }, this.options.refreshTimeout);
    }
    
    completeRefresh(success) {
        if (!this.isRefreshing) return;
        
        setTimeout(() => {
            this.resetPull();
            this.isRefreshing = false;
        }, 1000);
    }
    
    resetPull() {
        this.isPulling = false;
        this.pullDistance = 0;
        
        // Reset do conteúdo
        const content = this.container.querySelector('.ptr-content');
        if (content) {
            content.style.transform = 'translateY(0)';
        }
    }
    
    showMessage(text) {
        if (this.message) {
            this.message.textContent = text;
            this.message.classList.add('show');
        }
    }
    
    hideMessage() {
        if (this.message) {
            this.message.classList.remove('show');
        }
    }
    
    destroy() {
        this.resetPull();
        
        if (this.container) {
            this.container.classList.remove('ptr-container');
            
            const content = this.container.querySelector('.ptr-content');
            if (content) {
                content.classList.remove('ptr-content');
                content.style.transform = '';
            }
        }
        
        this.container = null;
        this.refreshCallback = null;
    }
    
    // Métodos públicos
    refresh() {
        if (!this.isRefreshing && this.refreshCallback) {
            this.triggerRefresh();
        }
    }
    
    isActivelyRefreshing() {
        return this.isRefreshing;
    }
}

// Instância global para uso fácil
window.PullToRefresh = {
    create: (options) => new PullToRefresh(options),
    
    // Método de conveniência para attach
    attach: (container, callback, options = {}) => {
        const ptr = new PullToRefresh(options);
        return ptr.attach(container, callback);
    }
};

// Auto-inicialização para páginas principais
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se há elementos com data-ptr-refresh
    const elements = document.querySelectorAll('[data-ptr-refresh]');
    elements.forEach(element => {
        const callbackName = element.dataset.ptrRefresh;
        if (window[callbackName]) {
            window.PullToRefresh.attach(element, window[callbackName]);
        }
    });
});

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PullToRefresh;
}
