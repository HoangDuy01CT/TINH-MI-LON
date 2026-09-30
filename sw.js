const CACHE_NAME='tinh-mi-lon-mobile-v89-menu-fix';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest?v=89',
  './song-city.mp3',
  './song-10k-years.mp3',
  './icons/icon-192-v8.png',
  './icons/icon-512-v8.png',
  './icons/apple-touch-icon-v8.png',
  './icons/favicon-32-v8.png',
  './icons/splash-1290x2796-v8.png',
  './game.js',
  './game/images/background_crystal_v79.png',
  './game/images/gem_0_red.png',
  './game/images/gem_1_orange.png',
  './game/images/gem_2_yellow.png',
  './game/images/gem_3_green.png',
  './game/images/gem_4_blue.png',
  './game/images/gem_5_purple.png',
  './game/images/gem_6_pearl.png',
  './game/images/select.wav',
  './game/images/swap.wav',
  './game/images/match.wav',
  './game/images/combo.wav',
  './game/images/special.wav',
  './game/images/error.wav'
];

async function cacheResponse(request, response) {
  if (!response || !response.ok || response.type === 'opaque') return response;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch (_) {}
  return response;
}

async function responseForRange(request, cached) {
  const range = request.headers.get('range');
  if (!range || !cached) return cached;
  const match = /^bytes=(\d+)-(\d*)$/i.exec(range.trim());
  if (!match) return cached;
  const total = Number(cached.headers.get('content-length')) || (await cached.clone().arrayBuffer()).byteLength;
  let start = Number(match[1]);
  let end = match[2] ? Number(match[2]) : total - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= total) {
    return new Response(null, {status: 416, headers: {'Content-Range': 'bytes */' + total}});
  }
  end = Math.min(end, total - 1);
  const body = await cached.clone().arrayBuffer();
  const slice = body.slice(start, end + 1);
  const headers = new Headers(cached.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + total);
  headers.set('Content-Length', String(slice.byteLength));
  headers.set('Content-Type', cached.headers.get('Content-Type') || 'audio/mpeg');
  return new Response(slice, {status: 206, statusText: 'Partial Content', headers});
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

  // Let the browser handle audio requests and HTTP Range headers natively.
  // Custom cached 206 responses can break HTML5 audio in some browsers/PWAs.
  const isAudio = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|weba|webm)(\?|$)/i.test(url.pathname);
  if (isAudio) {
    event.respondWith(fetch(request).catch(() => Response.error()));
    return;
  }

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
