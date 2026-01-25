/**
 * Skeleton Loading System
 * Placeholders animados para melhor UX durante carregamento
 */

class SkeletonLoader {
    constructor() {
        this.templates = new Map();
        this.activeSkeletons = new Set();
        this.init();
    }
    
    init() {
        this.registerDefaultTemplates();
        this.addGlobalStyles();
    }
    
    registerDefaultTemplates() {
        // Template para lista de músicas
        this.templates.set('music-list', () => {
            const container = document.createElement('div');
            container.className = 'skeleton-music-list';
            container.innerHTML = `
                <div class="skeleton-item">
                    <div class="skeleton-avatar"></div>
                    <div class="skeleton-content">
                        <div class="skeleton-title"></div>
                        <div class="skeleton-subtitle"></div>
                    </div>
                </div>
            `.repeat(5);
            return container;
        });
        
        // Template para lista de escalas
        this.templates.set('scale-list', () => {
            const container = document.createElement('div');
            container.className = 'skeleton-scale-list';
            container.innerHTML = `
                <div class="skeleton-card">
                    <div class="skeleton-header">
                        <div class="skeleton-date"></div>
                        <div class="skeleton-culto"></div>
                    </div>
                    <div class="skeleton-participants">
                        ${'<div class="skeleton-participant"></div>'.repeat(4)}
                    </div>
                </div>
            `.repeat(3);
            return container;
        });
        
        // Template para cards
        this.templates.set('card-grid', () => {
            const container = document.createElement('div');
            container.className = 'skeleton-card-grid';
            container.innerHTML = `
                <div class="skeleton-card">
                    <div class="skeleton-card-header"></div>
                    <div class="skeleton-card-body">
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                </div>
            `.repeat(6);
            return container;
        });
        
        // Template para tabela
        this.templates.set('table', () => {
            const container = document.createElement('div');
            container.className = 'skeleton-table';
            container.innerHTML = `
                <div class="skeleton-table-header">
                    ${'<div class="skeleton-header-cell"></div>'.repeat(4)}
                </div>
                ${'<div class="skeleton-table-row">' + 
                    '<div class="skeleton-cell"></div>'.repeat(4) + 
                  '</div>'.repeat(5)}
            `;
            return container;
        });
        
        // Template para gráfico
        this.templates.set('chart', () => {
            const container = document.createElement('div');
            container.className = 'skeleton-chart';
            container.innerHTML = `
                <div class="skeleton-chart-bars">
                    ${'<div class="skeleton-bar"></div>'.repeat(8)}
                </div>
                <div class="skeleton-chart-axis">
                    <div class="skeleton-axis-line"></div>
                </div>
            `;
            return container;
        });
        
        // Template para perfil
        this.templates.set('profile', () => {
            const container = document.createElement('div');
            container.className = 'skeleton-profile';
            container.innerHTML = `
                <div class="skeleton-avatar-large"></div>
                <div class="skeleton-profile-info">
                    <div class="skeleton-name"></div>
                    <div class="skeleton-role"></div>
                    <div class="skeleton-stats">
                        ${'<div class="skeleton-stat"></div>'.repeat(3)}
                    </div>
                </div>
            `;
            return container;
        });
    }
    
    addGlobalStyles() {
        const styleId = 'skeleton-loading-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Skeleton Loading Animations */
            .skeleton {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s infinite;
            }
            
            @keyframes skeleton-loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            
            /* Base Skeleton Item */
            .skeleton-item {
                display: flex;
                align-items: center;
                padding: 12px;
                border-bottom: 1px solid #f0f0f0;
            }
            
            .skeleton-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #e0e0e0;
                margin-right: 12px;
            }
            
            .skeleton-avatar-large {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: #e0e0e0;
                margin: 0 auto 16px;
            }
            
            .skeleton-content {
                flex: 1;
            }
            
            .skeleton-title {
                height: 16px;
                background: #e0e0e0;
                border-radius: 4px;
                margin-bottom: 8px;
                width: 70%;
            }
            
            .skeleton-subtitle {
                height: 12px;
                background: #e0e0e0;
                border-radius: 4px;
                width: 40%;
            }
            
            /* Skeleton Cards */
            .skeleton-card {
                background: white;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .skeleton-card-header {
                height: 20px;
                background: #e0e0e0;
                border-radius: 4px;
                margin-bottom: 12px;
                width: 60%;
            }
            
            .skeleton-card-body {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .skeleton-line {
                height: 12px;
                background: #e0e0e0;
                border-radius: 4px;
            }
            
            .skeleton-line.short {
                width: 60%;
            }
            
            /* Skeleton Scale List */
            .skeleton-scale-list .skeleton-card {
                padding: 20px;
            }
            
            .skeleton-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 16px;
            }
            
            .skeleton-date {
                width: 80px;
                height: 24px;
                background: #e0e0e0;
                border-radius: 6px;
            }
            
            .skeleton-culto {
                width: 120px;
                height: 24px;
                background: #e0e0e0;
                border-radius: 6px;
            }
            
            .skeleton-participants {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .skeleton-participant {
                width: 100px;
                height: 20px;
                background: #e0e0e0;
                border-radius: 4px;
            }
            
            /* Skeleton Card Grid */
            .skeleton-card-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 16px;
            }
            
            /* Skeleton Table */
            .skeleton-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .skeleton-table-header {
                display: flex;
                border-bottom: 2px solid #e0e0e0;
                padding-bottom: 8px;
                margin-bottom: 8px;
            }
            
            .skeleton-header-cell {
                flex: 1;
                height: 16px;
                background: #e0e0e0;
                border-radius: 4px;
                margin-right: 8px;
            }
            
            .skeleton-table-row {
                display: flex;
                padding: 8px 0;
                border-bottom: 1px solid #f0f0f0;
            }
            
            .skeleton-cell {
                flex: 1;
                height: 14px;
                background: #e0e0e0;
                border-radius: 4px;
                margin-right: 8px;
            }
            
            /* Skeleton Chart */
            .skeleton-chart {
                padding: 20px;
                height: 300px;
                display: flex;
                flex-direction: column;
            }
            
            .skeleton-chart-bars {
                display: flex;
                align-items: flex-end;
                justify-content: space-around;
                flex: 1;
                margin-bottom: 20px;
            }
            
            .skeleton-bar {
                width: 30px;
                background: linear-gradient(90deg, #e0e0e0 25%, #d0d0d0 50%, #e0e0e0 75%);
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s infinite;
                border-radius: 4px 4px 0 0;
            }
            
            .skeleton-bar:nth-child(1) { height: 60%; }
            .skeleton-bar:nth-child(2) { height: 80%; }
            .skeleton-bar:nth-child(3) { height: 45%; }
            .skeleton-bar:nth-child(4) { height: 90%; }
            .skeleton-bar:nth-child(5) { height: 70%; }
            .skeleton-bar:nth-child(6) { height: 55%; }
            .skeleton-bar:nth-child(7) { height: 85%; }
            .skeleton-bar:nth-child(8) { height: 40%; }
            
            .skeleton-chart-axis {
                height: 2px;
                background: #e0e0e0;
                position: relative;
            }
            
            .skeleton-axis-line {
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, #e0e0e0 25%, #d0d0d0 50%, #e0e0e0 75%);
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s infinite;
            }
            
            /* Skeleton Profile */
            .skeleton-profile {
                text-align: center;
                padding: 20px;
            }
            
            .skeleton-profile-info {
                max-width: 300px;
                margin: 0 auto;
            }
            
            .skeleton-name {
                height: 24px;
                background: #e0e0e0;
                border-radius: 4px;
                margin-bottom: 8px;
                width: 80%;
                margin-left: auto;
                margin-right: auto;
            }
            
            .skeleton-role {
                height: 16px;
                background: #e0e0e0;
                border-radius: 4px;
                margin-bottom: 20px;
                width: 60%;
                margin-left: auto;
                margin-right: auto;
            }
            
            .skeleton-stats {
                display: flex;
                justify-content: space-around;
                margin-top: 20px;
            }
            
            .skeleton-stat {
                width: 60px;
                height: 40px;
                background: #e0e0e0;
                border-radius: 8px;
            }
            
            /* Theme-aware skeletons */
            [data-theme="dark"] .skeleton,
            .dark .skeleton {
                background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
                background-size: 200% 100%;
            }
            
            [data-theme="dark"] .skeleton-avatar,
            [data-theme="dark"] .skeleton-avatar-large,
            .dark .skeleton-avatar,
            .dark .skeleton-avatar-large {
                background: #3a3a3a;
            }
            
            [data-theme="dark"] .skeleton-title,
            [data-theme="dark"] .skeleton-subtitle,
            [data-theme="dark"] .skeleton-line,
            .dark .skeleton-title,
            .dark .skeleton-subtitle,
            .dark .skeleton-line {
                background: #3a3a3a;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .skeleton-card-grid {
                    grid-template-columns: 1fr;
                }
                
                .skeleton-chart-bars {
                    gap: 4px;
                }
                
                .skeleton-bar {
                    width: 20px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Métodos públicos
    show(container, templateName = 'default') {
        if (!container) return;
        
        // Limpar container
        container.innerHTML = '';
        
        // Criar skeleton
        let skeleton;
        if (this.templates.has(templateName)) {
            skeleton = this.templates.get(templateName)();
        } else {
            // Template genérico
            skeleton = this.createGenericSkeleton();
        }
        
        // Adicionar classe de animação
        skeleton.querySelectorAll('*').forEach(el => {
            if (el.style.background && !el.style.background.includes('gradient')) {
                el.classList.add('skeleton');
            }
        });
        
        container.appendChild(skeleton);
        this.activeSkeletons.add(container);
        
        // Adicionar classe ao container para estilização
        container.classList.add('skeleton-loading');
    }
    
    hide(container) {
        if (!container) return;
        
        container.classList.remove('skeleton-loading');
        this.activeSkeletons.delete(container);
        
        // Não remover conteúdo, apenas limpar a classe
        // O conteúdo real será inserido por quem chamou
    }
    
    hideAll() {
        this.activeSkeletons.forEach(container => {
            this.hide(container);
        });
    }
    
    createGenericSkeleton() {
        const container = document.createElement('div');
        container.className = 'skeleton-generic';
        container.innerHTML = `
            <div class="skeleton-item">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-content">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-subtitle"></div>
                </div>
            </div>
        `.repeat(3);
        return container;
    }
    
    // Template customizado
    registerTemplate(name, templateFunction) {
        this.templates.set(name, templateFunction);
    }
    
    // Skeleton para loading de imagem
    showImageSkeleton(imgElement) {
        if (!imgElement) return;
        
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-image';
        skeleton.style.cssText = `
            width: ${imgElement.offsetWidth || 100}px;
            height: ${imgElement.offsetHeight || 100}px;
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: skeleton-loading 1.5s infinite;
            border-radius: 4px;
        `;
        
        // Substituir imagem temporariamente
        imgElement.style.display = 'none';
        imgElement.parentNode.insertBefore(skeleton, imgElement);
        
        // Guardar referência
        imgElement._skeleton = skeleton;
        
        // Remover quando imagem carregar
        imgElement.onload = () => {
            if (imgElement._skeleton) {
                imgElement._skeleton.remove();
                delete imgElement._skeleton;
            }
            imgElement.style.display = '';
        };
        
        imgElement.onerror = () => {
            if (imgElement._skeleton) {
                imgElement._skeleton.remove();
                delete imgElement._skeleton;
            }
            imgElement.style.display = '';
        };
    }
    
    // Skeleton para loading de conteúdo dinâmico
    showContentSkeleton(container, options = {}) {
        const {
            type = 'list',
            count = 5,
            height = 60
        } = options;
        
        const skeleton = document.createElement('div');
        skeleton.className = `skeleton-${type}`;
        
        if (type === 'list') {
            skeleton.innerHTML = Array(count).fill().map(() => `
                <div class="skeleton-item" style="height: ${height}px;">
                    <div class="skeleton-content">
                        <div class="skeleton-title"></div>
                        <div class="skeleton-subtitle"></div>
                    </div>
                </div>
            `).join('');
        } else if (type === 'grid') {
            skeleton.style.display = 'grid';
            skeleton.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
            skeleton.style.gap = '16px';
            
            skeleton.innerHTML = Array(count).fill().map(() => `
                <div class="skeleton-card">
                    <div class="skeleton-card-header"></div>
                    <div class="skeleton-card-body">
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                </div>
            `).join('');
        }
        
        container.innerHTML = '';
        container.appendChild(skeleton);
        this.activeSkeletons.add(container);
    }
}

// Instância global
window.SkeletonLoader = new SkeletonLoader();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SkeletonLoader;
}
