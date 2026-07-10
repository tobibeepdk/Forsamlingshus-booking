const CACHE = 'hjortemosen-pwa-v1.3';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=1.3',
  './app.js?v=1.3',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './kontrakt-1000.pdf?v=1.3',
  './kontrakt-1000.docx?v=1.3',
  './kontrakt-1500.pdf?v=1.3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isDocument = /kontrakt-(1000|1500)\.(pdf|docx)$/i.test(url.pathname);

  if (isDocument) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Filen er ikke tilgængelig offline.', {
          status: 503,
          headers: {'Content-Type': 'text/plain; charset=utf-8'}
        });
      });
    })
  );
});
