const CACHE_NAME = 'louvor-app-v37';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './config.js',
  './permissions.js',
  './sync.js',
  './Login.html',
  './MenuEscalas.html',
  './MenuMusicas.html',
  './Escalas.html',
  './Escala Calendario.html',
  './Musicas.html',
  './Repertorio.html',
  './Limpeza.html',
  './Componentes.html',
  './Cadastro de Musicas.html',
  './Cadastro de Repertorio.html',
  './AcessoMesa.html',
  './Historico de Musicas.html',
  './Imagens.html',
  './assets/Leão.png',
  './assets/backgroud.png',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css',
  'https://html2canvas.hertzen.com/dist/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// 1. Instalação
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// 2. Ativação (Limpeza de cache antigo)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    })
  );
  self.clients.claim();
});

// 3. EVENTO DE SINCRONIZAÇÃO PERIÓDICA (Corrigido: Fora do fetch)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-louvor-data') {
    event.waitUntil(backgroundFetchLogic());
  }
});

// Função para atualizar dados em segundo plano
async function backgroundFetchLogic() {
  console.log('[SW] Iniciando atualização periódica...');
  try {
    // Aqui você pode forçar o navegador a baixar os JSONs das planilhas 
    // e atualizar o cache para que, quando o usuário abrir o app, já esteja tudo lá.
    const cache = await caches.open(CACHE_NAME);
    const urlsToUpdate = [
      `${APP_CONFIG.SCRIPT_URL}?sheet=Transformar`,
      `${APP_CONFIG.SCRIPT_URL}?sheet=Repertório`,
      `${APP_CONFIG.SCRIPT_URL}?sheet=Musicas`
    ];

    return Promise.all(urlsToUpdate.map(url =>
      fetch(url).then(response => cache.put(url, response))
    ));
  } catch (error) {
    console.error('[SW] Falha no Periodic Sync:', error);
  }
}

// 4. Interceptação de Requisições (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Estratégia Cache First para Imagens
  if (/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(url.pathname) || url.pathname.includes('/drive-viewer/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
          return networkResponse;
        });
      })
    );
    return;
  }

  // Estratégia Network First para o restante (Scripts, HTML, APIs)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});