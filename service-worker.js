const CACHE_NAME = 'louvor-app-v22';
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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Strategy: Stale-While-Revalidate for most things, Network First for API
  const url = new URL(event.request.url);

  // If it's the Google Script API, try network first, then fall back to cache? 
  // Actually, usually we want fresh data. If offline, maybe cache?
  // For simplicity, let's use Network First for everything to ensure freshness, 
  // falling back to cache if offline.

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response to store in cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
