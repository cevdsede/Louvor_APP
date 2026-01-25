/**
 * Performance Core Module
 * Sistema de Lazy Loading, Virtual Scrolling e Cache Inteligente
 */

class PerformanceManager {
    constructor() {
        this.cache = new Map();
        this.observers = new Map();
        this.virtualLists = new Map();
        this.imageCache = new Map();
        this.requestQueue = [];
        this.isProcessingQueue = false;
        
        // Configurações
        this.config = {
            lazyLoadThreshold: 200, // px antes do elemento entrar na tela
            virtualScrollItemHeight: 60, // px
            virtualScrollBufferSize: 5, // itens extras antes/depois
            imageCacheMaxSize: 100, // máximo de imagens em cache
            debounceDelay: 300, // ms para debounce de search
            batchSize: 20 // itens por batch no lazy loading
        };
        
        this.init();
    }
    
    init() {
        this.setupIntersectionObserver();
        this.setupImageCache();
        this.setupVirtualScrolling();
    }
    
    // ========== LAZY LOADING ==========
    
    setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: `${this.config.lazyLoadThreshold}px`,
            threshold: 0.1
        };
        
        this.lazyLoadObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadElement(entry.target);
                    this.lazyLoadObserver.unobserve(entry.target);
                }
            });
        }, options);
    }
    
    observeElement(element) {
        if (element && this.lazyLoadObserver) {
            this.lazyLoadObserver.observe(element);
        }
    }
    
    async loadElement(element) {
        const dataType = element.dataset.lazyType;
        const dataSrc = element.dataset.lazySrc;
        
        try {
            switch (dataType) {
                case 'image':
                    await this.loadImage(element, dataSrc);
                    break;
                case 'list':
                    await this.loadListData(element, dataSrc);
                    break;
                case 'component':
                    await this.loadComponent(element, dataSrc);
                    break;
            }
        } catch (error) {
            console.error('Erro no lazy loading:', error);
            element.classList.add('lazy-error');
        }
    }
    
    async loadImage(element, src) {
        if (this.imageCache.has(src)) {
            const cachedImage = this.imageCache.get(src);
            element.src = cachedImage.src;
            element.classList.add('lazy-loaded');
            return;
        }
        
        const img = new Image();
        img.onload = () => {
            element.src = src;
            element.classList.add('lazy-loaded');
            this.cacheImage(src, img);
        };
        img.onerror = () => {
            element.classList.add('lazy-error');
        };
        img.src = src;
    }
    
    async loadListData(element, config) {
        const { sheet, limit = this.config.batchSize, offset = 0 } = JSON.parse(config);
        const data = await this.fetchDataBatch(sheet, limit, offset);
        this.renderListData(element, data);
    }
    
    async loadComponent(element, componentName) {
        // Carregar componentes dinamicamente
        try {
            const module = await import(`./components/${componentName}.js`);
            const component = module.default;
            component.render(element);
            element.classList.add('lazy-loaded');
        } catch (error) {
            console.error('Erro ao carregar componente:', error);
        }
    }
    
    // ========== VIRTUAL SCROLLING ==========
    
    setupVirtualScrolling() {
        // Configuração para listas virtuais
    }
    
    createVirtualList(container, data, renderItem) {
        const listId = `virtual-${Date.now()}`;
        const virtualList = {
            id: listId,
            container,
            data,
            renderItem,
            scrollTop: 0,
            visibleStart: 0,
            visibleEnd: 0,
            itemHeight: this.config.virtualScrollItemHeight
        };
        
        this.virtualLists.set(listId, virtualList);
        this.setupVirtualScrollListeners(virtualList);
        this.renderVirtualList(virtualList);
        
        return listId;
    }
    
    setupVirtualScrollListeners(virtualList) {
        const { container } = virtualList;
        
        container.addEventListener('scroll', this.debounce(() => {
            virtualList.scrollTop = container.scrollTop;
            this.renderVirtualList(virtualList);
        }, this.config.debounceDelay));
    }
    
    renderVirtualList(virtualList) {
        const { container, data, renderItem, itemHeight, scrollTop } = virtualList;
        const containerHeight = container.clientHeight;
        
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - this.config.virtualScrollBufferSize);
        const endIndex = Math.min(
            data.length - 1,
            Math.ceil((scrollTop + containerHeight) / itemHeight) + this.config.virtualScrollBufferSize
        );
        
        virtualList.visibleStart = startIndex;
        virtualList.visibleEnd = endIndex;
        
        // Limpar container
        container.innerHTML = '';
        
        // Espaço superior
        const topSpacer = document.createElement('div');
        topSpacer.style.height = `${startIndex * itemHeight}px`;
        container.appendChild(topSpacer);
        
        // Renderizar itens visíveis
        for (let i = startIndex; i <= endIndex; i++) {
            const item = data[i];
            const itemElement = renderItem(item, i);
            itemElement.style.height = `${itemHeight}px`;
            itemElement.style.position = 'absolute';
            itemElement.style.top = `${i * itemHeight}px`;
            itemElement.style.width = '100%';
            container.appendChild(itemElement);
        }
        
        // Espaço inferior
        const bottomSpacer = document.createElement('div');
        bottomSpacer.style.height = `${(data.length - endIndex - 1) * itemHeight}px`;
        container.appendChild(bottomSpacer);
    }
    
    // ========== CACHE INTELIGENTE ==========
    
    setupImageCache() {
        // Limpar cache periodicamente
        setInterval(() => {
            this.cleanupImageCache();
        }, 60000); // 1 minuto
    }
    
    cacheImage(src, img) {
        if (this.imageCache.size >= this.config.imageCacheMaxSize) {
            // Remover imagem mais antiga (LRU)
            const firstKey = this.imageCache.keys().next().value;
            this.imageCache.delete(firstKey);
        }
        
        this.imageCache.set(src, {
            src,
            img,
            timestamp: Date.now()
        });
    }
    
    cleanupImageCache() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutos
        
        for (const [src, cached] of this.imageCache.entries()) {
            if (now - cached.timestamp > maxAge) {
                this.imageCache.delete(src);
            }
        }
    }
    
    // ========== DATA FETCHING ==========
    
    async fetchDataBatch(sheet, limit, offset) {
        const cacheKey = `${sheet}-${limit}-${offset}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            const response = await fetch(`${APP_CONFIG.SCRIPT_URL}?sheet=${encodeURIComponent(sheet)}&limit=${limit}&offset=${offset}`);
            const data = await response.json();
            
            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            throw error;
        }
    }
    
    // ========== SEARCH AVANÇADO ==========
    
    createAdvancedSearch(inputElement, dataList, options = {}) {
        const {
            searchFields = ['nome', 'titulo'],
            fuzzyThreshold = 0.6,
            maxResults = 50,
            renderSuggestion
        } = options;
        
        let searchResults = [];
        let selectedIndex = -1;
        
        const debouncedSearch = this.debounce((query) => {
            searchResults = this.performSearch(query, dataList, searchFields, fuzzyThreshold);
            selectedIndex = -1;
            this.showSearchResults(inputElement, searchResults, renderSuggestion, maxResults);
        }, this.config.debounceDelay);
        
        inputElement.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                debouncedSearch(query);
            } else {
                this.hideSearchResults();
            }
        });
        
        inputElement.addEventListener('keydown', (e) => {
            this.handleSearchKeyboard(e, searchResults, selectedIndex, inputElement);
        });
        
        // Fechar resultados ao clicar fora
        document.addEventListener('click', (e) => {
            if (!inputElement.contains(e.target)) {
                this.hideSearchResults();
            }
        });
    }
    
    performSearch(query, dataList, searchFields, fuzzyThreshold) {
        const normalizedQuery = this.normalizeText(query);
        const results = [];
        
        for (const item of dataList) {
            let bestScore = 0;
            let bestMatch = '';
            
            for (const field of searchFields) {
                const fieldValue = item[field] || '';
                const normalizedValue = this.normalizeText(fieldValue);
                
                // Exact match
                if (normalizedValue.includes(normalizedQuery)) {
                    bestScore = 1.0;
                    bestMatch = fieldValue;
                    break;
                }
                
                // Fuzzy match
                const similarity = this.calculateSimilarity(normalizedQuery, normalizedValue);
                if (similarity > fuzzyThreshold && similarity > bestScore) {
                    bestScore = similarity;
                    bestMatch = fieldValue;
                }
            }
            
            if (bestScore > 0) {
                results.push({
                    item,
                    score: bestScore,
                    match: bestMatch
                });
            }
        }
        
        return results.sort((a, b) => b.score - a.score);
    }
    
    normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }
    
    calculateSimilarity(str1, str2) {
        // Implementação simplificada de Levenshtein distance
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0) return len2 === 0 ? 1 : 0;
        if (len2 === 0) return 0;
        
        for (let i = 0; i <= len2; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= len1; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= len2; i++) {
            for (let j = 1; j <= len1; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        const distance = matrix[len2][len1];
        return 1 - (distance / Math.max(len1, len2));
    }
    
    showSearchResults(inputElement, results, renderSuggestion, maxResults) {
        this.hideSearchResults();
        
        if (results.length === 0) return;
        
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results';
        resultsContainer.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
            max-height: 300px;
            overflow-y: auto;
            z-index: 1000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        
        const limitedResults = results.slice(0, maxResults);
        
        limitedResults.forEach((result, index) => {
            const suggestionElement = document.createElement('div');
            suggestionElement.className = 'search-suggestion';
            suggestionElement.style.cssText = `
                padding: 10px;
                cursor: pointer;
                border-bottom: 1px solid #f0f0f0;
            `;
            
            if (renderSuggestion) {
                suggestionElement.innerHTML = renderSuggestion(result);
            } else {
                suggestionElement.textContent = result.match;
            }
            
            suggestionElement.addEventListener('click', () => {
                inputElement.value = result.match;
                this.hideSearchResults();
                inputElement.dispatchEvent(new Event('change'));
            });
            
            suggestionElement.addEventListener('mouseenter', () => {
                suggestionElement.style.background = '#f0f0f0';
            });
            
            suggestionElement.addEventListener('mouseleave', () => {
                suggestionElement.style.background = 'white';
            });
            
            resultsContainer.appendChild(suggestionElement);
        });
        
        inputElement.parentElement.style.position = 'relative';
        inputElement.parentElement.appendChild(resultsContainer);
    }
    
    hideSearchResults() {
        const existingResults = document.querySelector('.search-results');
        if (existingResults) {
            existingResults.remove();
        }
    }
    
    handleSearchKeyboard(e, results, selectedIndex, inputElement) {
        const suggestions = document.querySelectorAll('.search-suggestion');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (selectedIndex < suggestions.length - 1) {
                    if (selectedIndex >= 0) {
                        suggestions[selectedIndex].style.background = 'white';
                    }
                    selectedIndex++;
                    suggestions[selectedIndex].style.background = '#f0f0f0';
                }
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                if (selectedIndex > 0) {
                    suggestions[selectedIndex].style.background = 'white';
                    selectedIndex--;
                    suggestions[selectedIndex].style.background = '#f0f0f0';
                }
                break;
                
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                    suggestions[selectedIndex].click();
                }
                break;
                
            case 'Escape':
                this.hideSearchResults();
                break;
        }
    }
    
    // ========== UTILITÁRIOS ==========
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    renderListData(element, data) {
        // Implementação padrão para renderizar dados da lista
        element.innerHTML = '';
        
        if (data && data.data) {
            data.data.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'list-item';
                itemElement.textContent = JSON.stringify(item);
                element.appendChild(itemElement);
            });
        }
        
        element.classList.add('lazy-loaded');
    }
}

// Instância global
window.PerformanceManager = new PerformanceManager();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceManager;
}
