// Service Worker - Carga rápida y caché de la PWA
const CACHE_NAME = 'pwa-catalogo-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/firebase-config.js',
  '/js/app.js'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Estrategia de respuesta: Buscar en caché, si no está, ir a la red
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
