const CACHE_NAME='tinh-mi-lon-mobile-v57';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest?v=22',
  './song-city.m4a',
  './song-10k-years.m4a',
  './icons/icon-192-v8.png',
  './icons/icon-512-v8.png',
  './icons/apple-touch-icon-v8.png',
  './icons/favicon-32-v8.png',
  './icons/splash-1290x2796-v8.png'
];

async function cacheResponse(request, response) {
  if (!response || !response.ok || response.type === 'opaque') return response;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch (_) {}
  return response;
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('tinh-mi-lon-mobile-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // HTML: network-first, so online users receive the latest app; cache is the offline fallback.
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        await cacheResponse(request, response);
        return response;
      } catch (_) {
        return (await caches.match(request)) || (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Versioned local assets: cache-first avoids repeated background requests after the first load.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      return await cacheResponse(request, response);
    } catch (_) {
      return Response.error();
    }
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
