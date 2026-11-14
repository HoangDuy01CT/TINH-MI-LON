const CACHE_NAME='tinh-mi-lon-mobile-V186-npc';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest?v=181-no-game',
  './song-city.mp3',
  './song-10k-years.mp3',
  './icons/icon-192-v8.png',
  './icons/icon-512-v8.png',
  './icons/apple-touch-icon-v8.png',
  './icons/favicon-32-v8.png',
  './icons/splash-1290x2796-v8.png',
  './app.js?v=181-no-game',
  // NPC trợ lý (V186)
  './npc/config/npc.config.js?v=186',
  './npc/config/npc.guide.vi.js?v=186',
  './npc/dist/tinh-mi-lon-npc.js?v=186',
  './npc/sprites/idle/00.png',
  './npc/sprites/idle/01.png',
  './npc/sprites/idle/02.png',
  './npc/sprites/idle/03.png',
  './npc/sprites/interact/00.png',
  './npc/sprites/interact/01.png',
  './npc/sprites/interact/02.png',
  './npc/sprites/interact/03.png',
  './npc/sprites/jump/down/00.png',
  './npc/sprites/jump/down/01.png',
  './npc/sprites/jump/down/02.png',
  './npc/sprites/jump/left/00.png',
  './npc/sprites/jump/left/01.png',
  './npc/sprites/jump/left/02.png',
  './npc/sprites/jump/left/03.png',
  './npc/sprites/jump/right/00.png',
  './npc/sprites/jump/right/01.png',
  './npc/sprites/jump/right/02.png',
  './npc/sprites/jump/right/03.png',
  './npc/sprites/jump/up/00.png',
  './npc/sprites/jump/up/01.png',
  './npc/sprites/jump/up/02.png',
  './npc/sprites/jump/up/03.png',
  './npc/sprites/lie/00.png',
  './npc/sprites/lie/01.png',
  './npc/sprites/lie/02.png',
  './npc/sprites/run/down/00.png',
  './npc/sprites/run/down/01.png',
  './npc/sprites/run/down/02.png',
  './npc/sprites/run/down/03.png',
  './npc/sprites/run/left/00.png',
  './npc/sprites/run/left/01.png',
  './npc/sprites/run/left/02.png',
  './npc/sprites/run/left/03.png',
  './npc/sprites/run/right/00.png',
  './npc/sprites/run/right/01.png',
  './npc/sprites/run/right/02.png',
  './npc/sprites/run/right/03.png',
  './npc/sprites/run/up/00.png',
  './npc/sprites/run/up/01.png',
  './npc/sprites/run/up/02.png',
  './npc/sprites/run/up/03.png',
  './npc/sprites/sit/00.png',
  './npc/sprites/sit/01.png',
  './npc/sprites/sit/02.png',
  './npc/sprites/sit/03.png',
  './npc/sprites/walk/down/00.png',
  './npc/sprites/walk/down/01.png',
  './npc/sprites/walk/down/02.png',
  './npc/sprites/walk/left/00.png',
  './npc/sprites/walk/left/01.png',
  './npc/sprites/walk/left/02.png',
  './npc/sprites/walk/left/03.png',
  './npc/sprites/walk/right/00.png',
  './npc/sprites/walk/right/01.png',
  './npc/sprites/walk/right/02.png',
  './npc/sprites/walk/right/03.png',
  './npc/sprites/walk/up/00.png',
  './npc/sprites/walk/up/01.png',
  './npc/sprites/walk/up/02.png',
  './npc/sprites/walk/up/03.png',
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
