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
        // Criar indicador visual
        this.indicator = document.createElement('div');
        this.indicator.className = 'ptr-indicator';
        this.indicator.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
        `;
        
        // Criar mensagem
        this.message = document.createElement('div');
        this.message.className = 'ptr-message';
        this.message.textContent = 'Solte para atualizar';
        
        // Encontrar o content wrapper
        const contentWrapper = this.container.querySelector('.content') || 
                              this.container.querySelector('main') || 
                              this.container.children[0];
        
        if (contentWrapper) {
            contentWrapper.classList.add('ptr-content');
            contentWrapper.parentNode.insertBefore(this.indicator, contentWrapper);
            contentWrapper.parentNode.insertBefore(this.message, contentWrapper);
        } else {
            this.container.appendChild(this.indicator);
            this.container.appendChild(this.message);
        }
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
        if (!this.indicator) return;
        
        // Atualizar posição do indicador
        const indicatorPosition = -60 + this.pullDistance;
        this.indicator.style.transform = `translateX(-50%) translateY(${indicatorPosition}px)`;
        
        // Atualizar mensagem
        if (this.pullDistance >= this.options.threshold) {
            this.indicator.classList.add('pulled');
            this.showMessage('Solte para atualizar');
        } else {
            this.indicator.classList.remove('pulled');
            this.showMessage('Puxe para atualizar');
        }
        
        // Aplicar transform ao conteúdo
        const content = this.container.querySelector('.ptr-content');
        if (content) {
            content.style.transform = `translateY(${Math.max(0, this.pullDistance - 20)}px)`;
        }
    }
    
    triggerRefresh() {
        if (this.isRefreshing) return;
        
        this.isRefreshing = true;
        this.indicator.classList.remove('pulled');
        this.indicator.classList.add('refreshing');
        this.showMessage('Atualizando...');
        
        // Manter indicador visível
        this.indicator.style.transform = 'translateX(-50%) translateY(20px)';
        
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
        
        this.showMessage(success ? 'Atualizado!' : 'Erro ao atualizar');
        
        setTimeout(() => {
            this.resetPull();
            this.isRefreshing = false;
        }, 1000);
    }
    
    resetPull() {
        this.isPulling = false;
        this.pullDistance = 0;
        
        if (this.indicator) {
            this.indicator.classList.remove('pulled', 'refreshing');
            this.indicator.style.transform = 'translateX(-50%) translateY(-60px)';
        }
        
        this.hideMessage();
        
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
        
        if (this.indicator) {
            this.indicator.remove();
            this.indicator = null;
        }
        
        if (this.message) {
            this.message.remove();
            this.message = null;
        }
        
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
