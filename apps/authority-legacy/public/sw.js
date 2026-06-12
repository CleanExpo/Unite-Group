// Unite Group Empire — Service Worker v2
// Forces cache invalidation of all old versions
const CACHE_NAME = 'unite-group-empire-v2';

// On install — skip waiting immediately, take control
self.addEventListener('install', () => {
  self.skipWaiting();
});

// On activate — delete ALL old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, no caching for authenticated app
self.addEventListener('fetch', event => {
  // Skip non-GET and non-HTTP requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;
  
  // For app routes — always go to network (private CRM, never cache)
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
