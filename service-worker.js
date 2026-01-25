importScripts('Shared/JS/config.js');
const CACHE_NAME = APP_CONFIG.CACHE_NAME;
const DYNAMIC_CACHE = 'dynamic-cache-v1';
const API_CACHE = 'api-cache-v1';
const CRITICAL_CACHE = 'critical-cache-v1';

// Estratégias de cache
const CACHE_STRATEGIES = {
  networkFirst: async (request) => {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) return cachedResponse;
      throw error;
    }
  },
  
  cacheFirst: async (request) => {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Atualizar cache em background
      fetch(request).then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(DYNAMIC_CACHE);
          cache.put(request, response.clone());
        }
      }).catch(() => {});
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  },
  
  staleWhileRevalidate: async (request) => {
    const cachedResponse = await caches.match(request);
    const fetchPromise = fetch(request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    });
    return cachedResponse || fetchPromise;
  }
};

// Assets críticos para cache imediato
const CRITICAL_ASSETS = [
  './',
  './index.html',
  './Shared/JS/config.js',
  './Shared/JS/performance-core.js',
  './Shared/JS/skeleton-loading.js',
  './Shared/JS/pull-to-refresh.js',
  './Shared/JS/offline-indicator.js',
  './Shared/JS/indexeddb-manager.js',
  './Shared/JS/advanced-dashboard.js',
  './Shared/JS/advanced-service-worker.js',
  './Shared/JS/permissions.js',
  './Shared/JS/sync.js',
  './Shared/HTML/Login.html',
  './Shared/CSS/main.css',
  './manifest.json'
];

// Assets estáticos
const STATIC_ASSETS = [
  './Escalas/HTML/MenuEscalas.html',
  './Musicas/HTML/MenuMusicas.html',
  './Escalas/HTML/Escalas.html',
  './Escalas/HTML/Calendario.html',
  './Musicas/HTML/Musicas.html',
  './Musicas/HTML/Repertorio.html',
  './Escalas/HTML/Limpeza.html',
  './Componentes/HTML/Componentes.html',
  './Musicas/HTML/Cadastro de Musicas.html',
  './Musicas/HTML/Cadastro de Repertorio.html',
  './Utilitarios/HTML/AcessoMesa.html',
  './Musicas/HTML/Historico de Musicas.html',
  './Utilitarios/HTML/Imagens.html',
  './Utilitarios/HTML/Chamada.html',
  './assets/Leão.png',
  './assets/backgroud.png',
  './assets/bootstrap/css/bootstrap.min.css',
  './assets/bootstrap/js/bootstrap.bundle.min.js',
  './assets/Font Awesome/css/all.css',
  'https://html2canvas.hertzen.com/dist/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// API endpoints para cache
const API_ENDPOINTS = [
  `${APP_CONFIG.SCRIPT_URL}?sheet=Transformar`,
  `${APP_CONFIG.SCRIPT_URL}?sheet=Repertório_PWA`,
  `${APP_CONFIG.SCRIPT_URL}?sheet=Musicas`,
  `${APP_CONFIG.SCRIPT_URL}?sheet=Componentes`,
  `${APP_CONFIG.SCRIPT_URL}?sheet=Tema Músicas`,
  `${APP_CONFIG.SCRIPT_URL}?sheet=Lembretes`,
  `${APP_CONFIG.SCRIPT_URL}?sheet=Historico de Músicas`,
  `${APP_CONFIG.SCRIPT_URL}?action=getImages`,
  `${APP_CONFIG.SCRIPT_URL}?action=ping`
];

// 1. Instalação
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache crítico primeiro
      caches.open(CRITICAL_CACHE).then((cache) => {
        console.log('[SW] Cache crítico instalado');
        return cache.addAll(CRITICAL_ASSETS);
      }),
      // Cache estático em background
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Cache estático instalado');
        return cache.addAll(STATIC_ASSETS);
      })
    ])
  );
  
  self.skipWaiting();
});

// 2. Ativação (Limpeza de cache antigo)
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const currentCaches = [CACHE_NAME, DYNAMIC_CACHE, API_CACHE, CRITICAL_CACHE];
      
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service Worker ativado');
      return self.clients.claim();
    })
  );
});

// 3. Background Sync
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync recebido:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(performBackgroundSync());
  } else if (event.tag === 'update-louvor-data') {
    event.waitUntil(updateCriticalData());
  }
});

self.addEventListener('sync', (event) => {
  console.log('[SW] Sync recebido:', event.tag);
  
  if (event.tag === 'one-time-sync') {
    event.waitUntil(processSyncQueue());
  }
});

// 4. Interceptação de Requisições (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Estratégias baseadas no tipo de requisição
  if (isAPIRequest(url)) {
    // Network First para APIs
    event.respondWith(CACHE_STRATEGIES.networkFirst(event.request));
  } else if (isImageRequest(url)) {
    // Cache First para imagens
    event.respondWith(CACHE_STRATEGIES.cacheFirst(event.request));
  } else if (isCriticalAsset(url)) {
    // Stale While Revalidate para assets críticos
    event.respondWith(CACHE_STRATEGIES.staleWhileRevalidate(event.request));
  } else if (isStaticAsset(url)) {
    // Cache First para assets estáticos
    event.respondWith(CACHE_STRATEGIES.cacheFirst(event.request));
  } else {
    // Network First para tudo mais
    event.respondWith(CACHE_STRATEGIES.networkFirst(event.request));
  }
});

// 5. Mensagens do cliente
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'sync-started':
      console.log('[SW] Sync iniciado pelo cliente');
      break;
      
    case 'sync-completed':
      console.log('[SW] Sync concluído pelo cliente');
      notifyAllClients('background-sync-completed', data);
      break;
      
    case 'skip-waiting':
      self.skipWaiting();
      break;
      
    case 'get-cache-info':
      getCacheInfo().then(info => {
        event.ports[0].postMessage({ type: 'cache-info', data: info });
      });
      break;
      
    case 'clear-cache':
      clearCache(data.cacheName).then(() => {
        event.ports[0].postMessage({ type: 'cache-cleared' });
      });
      break;
      
    default:
      console.log('[SW] Mensagem não reconhecida:', type);
  }
});

// ========== FUNÇÕES AUXILIARES ==========

function isAPIRequest(url) {
  return url.hostname.includes('script.google.com') || 
         url.searchParams.has('sheet') || 
         url.searchParams.has('action');
}

function isImageRequest(url) {
  return /\.(png|jpg|jpeg|webp|gif|svg|ico)$/i.test(url.pathname) || 
         url.pathname.includes('/drive-viewer/');
}

function isCriticalAsset(url) {
  return CRITICAL_ASSETS.some(asset => url.pathname.includes(asset.replace('./', '')));
}

function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.pathname.includes(asset.replace('./', ''))) ||
         /\.(css|js|woff|woff2|ttf|eot)$/i.test(url.pathname);
}

async function performBackgroundSync() {
  console.log('[SW] Executando background sync...');
  
  try {
    const cache = await caches.open(API_CACHE);
    const results = await Promise.allSettled(
      API_ENDPOINTS.map(async (url) => {
        const response = await fetch(url, { cache: 'no-store' });
        if (response.ok) {
          await cache.put(url, response);
          return { url, status: 'success' };
        }
        throw new Error(`HTTP ${response.status}`);
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`[SW] Background sync concluído: ${successful} sucesso, ${failed} falhas`);
    
    // Notificar clientes
    notifyAllClients('background-sync-completed', {
      successful,
      failed,
      timestamp: Date.now()
    });
    
    // Limpar cache antigo
    await cleanupOldCache();
    
  } catch (error) {
    console.error('[SW] Erro no background sync:', error);
    notifyAllClients('background-sync-error', { error: error.message });
  }
}

async function updateCriticalData() {
  console.log('[SW] Atualizando dados críticos...');
  
  try {
    const cache = await caches.open(API_CACHE);
    const criticalUrls = API_ENDPOINTS.slice(0, 5); // Primeiros 5 endpoints
    
    await Promise.all(
      criticalUrls.map(url => 
        fetch(url, { cache: 'no-store' }).then(response => {
          if (response.ok) {
            return cache.put(url, response);
          }
        })
      )
    );
    
    console.log('[SW] Dados críticos atualizados');
  } catch (error) {
    console.error('[SW] Erro ao atualizar dados críticos:', error);
  }
}

async function processSyncQueue() {
  console.log('[SW] Processando fila de sincronização...');
  
  try {
    // Implementar lógica de processamento da fila
    // Isso seria integrado com o IndexedDB sync queue
    console.log('[SW] Fila de sincronização processada');
  } catch (error) {
    console.error('[SW] Erro ao processar fila:', error);
  }
}

async function cleanupOldCache() {
  try {
    const cacheNames = await caches.keys();
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
    
    for (const name of cacheNames) {
      if (name.includes('dynamic') || name.includes('api')) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const dateHeader = response.headers.get('date');
            if (dateHeader) {
              const responseDate = new Date(dateHeader).getTime();
              if (now - responseDate > maxAge) {
                await cache.delete(request);
              }
            }
          }
        }
      }
    }
    
    console.log('[SW] Cache antigo limpo');
  } catch (error) {
    console.error('[SW] Erro ao limpar cache antigo:', error);
  }
}

async function getCacheInfo() {
  const cacheNames = await caches.keys();
  const cacheInfo = [];
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    let totalSize = 0;
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
    
    cacheInfo.push({
      name,
      entries: keys.length,
      size: totalSize,
      formattedSize: formatBytes(totalSize)
    });
  }
  
  return cacheInfo;
}

async function clearCache(cacheName) {
  if (cacheName) {
    await caches.delete(cacheName);
    console.log(`[SW] Cache ${cacheName} limpo`);
  } else {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('[SW] Todos os caches limpos');
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function notifyAllClients(type, data) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type, data });
    });
  });
}

// Verificar cota de armazenamento
async function checkStorageQuota() {
  if ('storage' in self && 'estimate' in self.storage) {
    try {
      const estimate = await self.storage.estimate();
      const usagePercentage = (estimate.usage / estimate.quota * 100).toFixed(2);
      
      console.log(`[SW] Uso de armazenamento: ${usagePercentage}%`);
      
      if (usagePercentage > 80) {
        console.warn('[SW] Cota de armazenamento quase esgotada');
        notifyAllClients('storage-quota-exceeded', {
          usage: estimate.usage,
          quota: estimate.quota,
          percentage: usagePercentage
        });
        
        // Limpar cache automaticamente
        await cleanupOldCache();
      }
    } catch (error) {
      console.error('[SW] Erro ao verificar cota de armazenamento:', error);
    }
  }
}

// Verificar cota periodicamente
setInterval(checkStorageQuota, 5 * 60 * 1000); // A cada 5 minutos