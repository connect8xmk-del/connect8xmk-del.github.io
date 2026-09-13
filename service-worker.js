/*
  A-Z Arcade Service Worker
  ---------------------------------------------------------
  Caches only the app shell (this site's own HTML/manifest/icons)
  so the arcade can be added to a home screen and re-opened
  without a network connection. It does NOT read, store, or
  transmit any of the game's user data - scores and progress
  live in localStorage on the user's device, completely
  separate from this cache.
*/
const CACHE_NAME = 'az-arcade-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isSameOrigin = event.request.url.startsWith(self.location.origin);

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (isSameOrigin && response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      // Same-origin app-shell files: serve from cache first for instant, offline-safe loads.
      // Everything else (fonts, etc.): try the network, fall back to cache if offline.
      return isSameOrigin ? (cached || networkFetch) : networkFetch;
    })
  );
});
