const CACHE_NAME = 'pwa-catalogo-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/firebase-config.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
