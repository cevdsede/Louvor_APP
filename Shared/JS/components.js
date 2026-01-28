// Sistema de Componentes Reutilizáveis
class Component {
    constructor(name, template, styles = '', scripts = '') {
        this.name = name;
        this.template = template;
        this.styles = styles;
        this.scripts = scripts;
        this.mounted = false;
        this.data = {};
    }

    // Renderizar template com dados
    render(data = {}) {
        this.data = { ...this.data, ...data };
        let html = this.template;

        // Substituir variáveis {{variable}}
        Object.keys(this.data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(regex, this.data[key]);
        });

        // Substituir condicionais {{#if condition}}...{{/if}}
        html = this.processConditionals(html);

        return html;
    }

    // Processar condicionais no template
    processConditionals(html) {
        const ifRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
        
        return html.replace(ifRegex, (match, condition, content) => {
            const value = this.data[condition];
            return value ? content : '';
        });
    }

    // Montar componente no DOM
    mount(selector, data = {}) {
        const element = typeof selector === 'string' 
            ? document.querySelector(selector) 
            : selector;

        if (!element) {
            console.error(`Element not found for component ${this.name}`);
            return false;
        }

        const html = this.render(data);
        element.innerHTML = html;

        // Adicionar estilos se não existirem
        if (this.styles && !document.getElementById(`style-${this.name}`)) {
            const styleElement = document.createElement('style');
            styleElement.id = `style-${this.name}`;
            styleElement.textContent = this.styles;
            document.head.appendChild(styleElement);
        }

        // Executar scripts após montagem
        this.executeScripts(element);

        this.mounted = true;
        this.onMounted(element);

        return element;
    }

    // Desmontar componente
    unmount() {
        if (this.mounted) {
            this.onUnmounted();
            this.mounted = false;
        }
    }

    // Atualizar dados e re-renderizar
    update(data = {}) {
        if (this.mounted) {
            const element = document.querySelector(`[data-component="${this.name}"]`);
            if (element) {
                element.innerHTML = this.render(data);
                this.executeScripts(element);
                this.onUpdated(element);
            }
        }
    }

    // Executar scripts do componente
    executeScripts(container) {
        if (!this.scripts) return;

        try {
            // Criar função com escopo seguro
            const scriptFunction = new Function('element', 'data', `
                ${this.scripts}
            `);

            scriptFunction(container, this.data);
        } catch (error) {
            console.error(`Error executing scripts for component ${this.name}:`, error);
        }
    }

    // Lifecycle hooks
    onMounted(element) {
        // Sobrescrever em subclasses
    }

    onUpdated(element) {
        // Sobrescrever em subclasses
    }

    onUnmounted() {
        // Sobrescrever em subclasses
    }
}

// Registro de componentes
class ComponentRegistry {
    constructor() {
        this.components = new Map();
    }

    // Registrar componente
    register(name, component) {
        this.components.set(name, component);
    }

    // Obter componente
    get(name) {
        return this.components.get(name);
    }

    // Criar componente a partir de template string
    createFromTemplate(name, template, options = {}) {
        const component = new Component(name, template, options.styles, options.scripts);
        this.register(name, component);
        return component;
    }
}

// Instância global do registro
window.componentRegistry = new ComponentRegistry();

// Componentes pré-definidos
const predefinedComponents = {
    // Card de estatística
    statCard: new Component('statCard', `
        <div class="stat-card {{#if loading}}loading{{/if}}" data-component="statCard">
            <div class="stat-icon" style="background: {{iconBg}}; color: {{iconColor}}">
                <i class="{{icon}}"></i>
            </div>
            <div class="stat-content">
                <div class="stat-label">{{label}}</div>
                <div class="stat-value">{{value}}</div>
                {{#if trend}}
                <div class="stat-trend {{trendClass}}">
                    <i class="fas fa-{{trendIcon}}"></i>
                    {{trendValue}}
                </div>
                {{/if}}
            </div>
        </div>
    `, `
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 16px;
            transition: transform 0.2s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
        }
        
        .stat-card.loading {
            opacity: 0.6;
            pointer-events: none;
        }
        
        .stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }
        
        .stat-content {
            flex: 1;
        }
        
        .stat-label {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
        }
        
        .stat-trend {
            font-size: 12px;
            margin-top: 4px;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .stat-trend.positive {
            color: #10b981;
        }
        
        .stat-trend.negative {
            color: #ef4444;
        }
    `),

    // Botão de ação
    actionButton: new Component('actionButton', `
        <button class="action-btn {{#if loading}}loading{{/if}} {{variant}}" 
                data-component="actionButton"
                onclick="{{onclick}}">
            {{#if loading}}
            <i class="fas fa-spinner fa-spin"></i>
            {{else}}
            <i class="{{icon}}"></i>
            {{#if text}}
            <span>{{text}}</span>
            {{/if}}
            {{/if}}
        </button>
    `, `
        .action-btn {
            background: var(--primary, #3b82f6);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 20px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .action-btn:hover {
            background: var(--primary-dark, #2563eb);
            transform: translateY(-1px);
        }
        
        .action-btn.secondary {
            background: #f1f5f9;
            color: #475569;
        }
        
        .action-btn.secondary:hover {
            background: #e2e8f0;
        }
        
        .action-btn.danger {
            background: #ef4444;
        }
        
        .action-btn.danger:hover {
            background: #dc2626;
        }
        
        .action-btn.loading {
            opacity: 0.7;
            cursor: not-allowed;
        }
    `),

    // Modal
    modal: new Component('modal', `
        <div class="modal-overlay {{#if show}}show{{/if}}" data-component="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>{{title}}</h3>
                    <button class="modal-close" onclick="closeModal('{{name}}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    {{content}}
                </div>
                {{#if footer}}
                <div class="modal-footer">
                    {{footer}}
                </div>
                {{/if}}
            </div>
        </div>
    `, `
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        
        .modal-overlay.show {
            opacity: 1;
            visibility: visible;
        }
        
        .modal-content {
            background: white;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            transform: scale(0.9);
            transition: transform 0.3s ease;
        }
        
        .modal-overlay.show .modal-content {
            transform: scale(1);
        }
        
        .modal-header {
            padding: 20px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #6b7280;
            padding: 4px;
            border-radius: 4px;
        }
        
        .modal-close:hover {
            background: #f3f4f6;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .modal-footer {
            padding: 20px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }
    `, `
        // Função global para fechar modal
        window.closeModal = function(name) {
            const modal = document.querySelector('[data-component="modal"]');
            if (modal) {
                modal.classList.remove('show');
                setTimeout(() => {
                    if (typeof modal.remove === 'function') {
                        modal.remove();
                    }
                }, 300);
            }
        };
    `)
};

// Registrar componentes pré-definidos
Object.entries(predefinedComponents).forEach(([name, component]) => {
    window.componentRegistry.register(name, component);
});

// Funções utilitárias globais
window.createComponent = function(name, selector, data = {}) {
    const component = window.componentRegistry.get(name);
    if (component) {
        return component.mount(selector, data);
    } else {
        console.error(`Component ${name} not found`);
        return null;
    }
};

window.updateComponent = function(name, data = {}) {
    const component = window.componentRegistry.get(name);
    if (component) {
        component.update(data);
    } else {
        console.error(`Component ${name} not found`);
    }
};

// Exportar classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Component, ComponentRegistry };
}
