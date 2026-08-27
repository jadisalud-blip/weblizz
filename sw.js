const CACHE_NAME = 'beauty-shop-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/admin.html',
  '/catalogo.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/catalogo.js',
  '/js/admin.js',
  '/js/firebase-config.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
