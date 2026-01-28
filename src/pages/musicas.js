// Página de Músicas
class Musicas {
    constructor() {
        this.data = {
            repertorio: []
        };
        this.currentView = 'list';
        this.searchTerm = '';
    }

    async render() {
        await this.loadData();
        return this.getTemplate();
    }

    async loadData() {
        try {
            const result = await window.api?.getRepertorio();
            this.data.repertorio = result || [];
        } catch (error) {
            console.error('Erro ao carregar dados das músicas:', error);
        }
    }

    getTemplate() {
        return `
            <div class="app-layout">
                ${window.sidebar?.render()?.outerHTML || ''}
                
                <div class="main-content">
                    ${window.header?.render()?.outerHTML || ''}
                    
                    <div class="content-wrapper">
                        <!-- Header da Página -->
                        <div class="page-header">
                            <h1 class="page-title">Músicas</h1>
                            <p class="page-description">Repertório e acervo do ministério</p>
                        </div>

                        <!-- Controles -->
                        <div class="page-controls">
                            <div class="view-switcher">
                                <button class="view-btn ${this.currentView === 'list' ? 'active' : ''}" 
                                        onclick="window.musicasPage?.switchView('list')">
                                    <i class="fas fa-list"></i>
                                    Lista
                                </button>
                                <button class="view-btn ${this.currentView === 'grid' ? 'active' : ''}" 
                                        onclick="window.musicasPage?.switchView('grid')">
                                    <i class="fas fa-th"></i>
                                    Grid
                                </button>
                                <button class="view-btn ${this.currentView === 'categories' ? 'active' : ''}" 
                                        onclick="window.musicasPage?.switchView('categories')">
                                    <i class="fas fa-folder"></i>
                                    Categorias
                                </button>
                            </div>

                            <div class="search-box">
                                <div class="search-input-wrapper">
                                    <i class="fas fa-search"></i>
                                    <input type="text" 
                                           placeholder="Pesquisar música, cantor ou tom..." 
                                           value="${this.searchTerm}"
                                           onkeyup="window.musicasPage?.handleSearch(this.value)">
                                </div>
                            </div>

                            <div class="action-buttons">
                                <button class="btn btn-primary" onclick="window.musicasPage?.showAddMusicaModal()">
                                    <i class="fas fa-plus"></i>
                                    Nova Música
                                </button>
                                <button class="btn btn-outline" onclick="window.musicasPage?.exportMusicas()">
                                    <i class="fas fa-download"></i>
                                    Exportar
                                </button>
                            </div>
                        </div>

                        <!-- Conteúdo das Views -->
                        <div class="page-content">
                            ${this.renderCurrentView()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderCurrentView() {
        switch (this.currentView) {
            case 'list':
                return this.renderListView();
            case 'grid':
                return this.renderGridView();
            case 'categories':
                return this.renderCategoriesView();
            default:
                return this.renderListView();
        }
    }

    renderListView() {
        const filteredMusicas = this.getFilteredMusicas();

        if (filteredMusicas.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-music"></i>
                    <h3>Nenhuma música encontrada</h3>
                    <p>${this.searchTerm ? 'Tente outra busca' : 'Adicione sua primeira música'}</p>
                    ${!this.searchTerm ? `
                        <button class="btn btn-primary" onclick="window.musicasPage?.showAddMusicaModal()">
                            <i class="fas fa-plus"></i>
                            Adicionar Música
                        </button>
                    ` : ''}
                </div>
            `;
        }

        return `
            <div class="musicas-list">
                <div class="musicas-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Música</th>
                                <th>Cantor</th>
                                <th>Tom</th>
                                <th>Categoria</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredMusicas.map(musica => this.renderMusicaRow(musica)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderGridView() {
        const filteredMusicas = this.getFilteredMusicas();

        return `
            <div class="musicas-grid">
                ${filteredMusicas.map(musica => this.renderMusicaCard(musica)).join('')}
            </div>
        `;
    }

    renderCategoriesView() {
        const categories = this.getCategories();

        return `
            <div class="categories-view">
                ${categories.map(category => this.renderCategoryCard(category)).join('')}
            </div>
        `;
    }

    renderMusicaRow(musica) {
        return `
            <tr>
                <td>
                    <div class="musica-info">
                        <div class="musica-name">${musica.Músicas || 'Sem nome'}</div>
                        ${musica.Cantor ? `<div class="musica-cantor">${musica.Cantor}</div>` : ''}
                    </div>
                </td>
                <td>${musica.Cantor || '-'}</td>
                <td>
                    ${musica.Tons ? `<span class="tone-badge">${musica.Tons}</span>` : '-'}
                </td>
                <td>${musica.Categoria || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="window.musicasPage?.viewMusica('${musica.Músicas}')" title="Ver">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="window.musicasPage?.editMusica('${musica.Músicas}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="window.musicasPage?.deleteMusica('${musica.Músicas}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    renderMusicaCard(musica) {
        return `
            <div class="musica-card" onclick="window.musicasPage?.viewMusica('${musica.Músicas}')">
                <div class="musica-header">
                    <div class="musica-icon">
                        <i class="fas fa-music"></i>
                    </div>
                    <div class="musica-info">
                        <h3 class="musica-title">${musica.Músicas || 'Sem nome'}</h3>
                        <p class="musica-cantor">${musica.Cantor || 'Cantor não informado'}</p>
                    </div>
                </div>
                <div class="musica-details">
                    ${musica.Tons ? `
                        <div class="musica-tone">
                            <i class="fas fa-music-note"></i>
                            <span>${musica.Tons}</span>
                        </div>
                    ` : ''}
                    ${musica.Categoria ? `
                        <div class="musica-category">
                            <i class="fas fa-tag"></i>
                            <span>${musica.Categoria}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="musica-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); window.musicasPage?.editMusica('${musica.Músicas}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `;
    }

    renderCategoryCard(category) {
        return `
            <div class="category-card" onclick="window.musicasPage?.filterByCategory('${category.name}')">
                <div class="category-header">
                    <div class="category-icon" style="background: ${category.color}">
                        <i class="fas ${category.icon}"></i>
                    </div>
                    <div class="category-info">
                        <h3 class="category-name">${category.name}</h3>
                        <p class="category-count">${category.count} música${category.count > 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div class="category-preview">
                    ${category.preview.slice(0, 3).map(musica => `
                        <div class="preview-item">
                            <i class="fas fa-music"></i>
                            <span>${musica}</span>
                        </div>
                    `).join('')}
                    ${category.count > 3 ? `
                        <div class="preview-more">+${category.count - 3} mais</div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Métodos utilitários
    getFilteredMusicas() {
        if (!this.searchTerm) return this.data.repertorio;

        const term = this.searchTerm.toLowerCase();
        return this.data.repertorio.filter(musica => 
            musica.Músicas?.toLowerCase().includes(term) ||
            musica.Cantor?.toLowerCase().includes(term) ||
            musica.Tons?.toLowerCase().includes(term) ||
            musica.Categoria?.toLowerCase().includes(term)
        );
    }

    getCategories() {
        const categories = {};
        this.data.repertorio.forEach(musica => {
            const category = musica.Categoria || 'Sem categoria';
            if (!categories[category]) {
                categories[category] = {
                    name: category,
                    count: 0,
                    preview: [],
                    icon: 'fa-music',
                    color: '#3b82f6'
                };
            }
            categories[category].count++;
            if (categories[category].preview.length < 5) {
                categories[category].preview.push(musica.Músicas);
            }
        });

        // Definir cores e ícones específicos
        const categoryConfig = {
            'Adoração': { icon: 'fa-heart', color: '#ef4444' },
            'Louvor': { icon: 'fa-star', color: '#f59e0b' },
            'Ceia': { icon: 'fa-cross', color: '#8b5cf6' },
            'Kids': { icon: 'fa-child', color: '#10b981' },
            'Jovens': { icon: 'fa-user-graduate', color: '#06b6d4' }
        };

        Object.keys(categories).forEach(name => {
            const config = categoryConfig[name];
            if (config) {
                categories[name].icon = config.icon;
                categories[name].color = config.color;
            }
        });

        return Object.values(categories);
    }

    // Métodos de interação
    switchView(view) {
        this.currentView = view;
        window.router?.renderComponent(window.musicasPage);
    }

    handleSearch(term) {
        this.searchTerm = term;
        window.router?.renderComponent(window.musicasPage);
    }

    viewMusica(musicaName) {
        console.log('Ver música:', musicaName);
    }

    editMusica(musicaName) {
        console.log('Editar música:', musicaName);
    }

    deleteMusica(musicaName) {
        if (confirm(`Tem certeza que deseja excluir "${musicaName}"?`)) {
            console.log('Excluir música:', musicaName);
        }
    }

    showAddMusicaModal() {
        console.log('Adicionar nova música');
    }

    exportMusicas() {
        console.log('Exportar músicas');
    }

    filterByCategory(categoryName) {
        this.searchTerm = categoryName;
        this.currentView = 'list';
        window.router?.renderComponent(window.musicasPage);
    }
}

// Registrar página
window.MusicasPage = Musicas;
