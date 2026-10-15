// Service worker: precaches the app shell and caches viewed map tiles for offline use.

const SHELL_CACHE = 'shell-v2';
const TILE_CACHE = 'tiles-v1';
const DATA_CACHE = 'data-v1';
const MAX_DATA_RESPONSES = 300;
const MAX_TILES = 2000; // OSM tile policy forbids bulk prefetch; only cache tiles the user has viewed.

const SHELL_ASSETS = [
  './',
  './index.html',
  './script.js',
  './style.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  'https://unpkg.com/@tmcw/togeojson@5.8.1/dist/togeojson.umd.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => ![SHELL_CACHE, TILE_CACHE, DATA_CACHE].includes(key)).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isOsmTile(url) {
  return url.hostname === 'tile.openstreetmap.org';
}

// Overpass (mailbox) queries. The app snaps query areas to a grid, so the same area is
// always the same URL and can be served from cache when offline or when servers are down.
function isOverpassQuery(url) {
  return url.pathname.endsWith('/api/interpreter') && url.searchParams.has('data');
}

// Cache key ignores which mirror answered, so a response from any server can be reused.
function overpassCacheKey(url) {
  return 'https://overpass.cache/?data=' + encodeURIComponent(url.searchParams.get('data'));
}

// Mailbox data: network-first, falling back to the last response for the same area.
async function handleOverpass(request) {
  const cache = await caches.open(DATA_CACHE);
  const key = overpassCacheKey(new URL(request.url));
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(key, response.clone());
      trimCache(DATA_CACHE, MAX_DATA_RESPONSES);
      return response;
    }
    const cached = await cache.match(key);
    return cached || response;
  } catch (error) {
    const cached = await cache.match(key);
    if (cached) return cached;
    throw error;
  }
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - maxEntries; i++) {
    await cache.delete(keys[i]);
  }
}

// Tiles: cache-first, falling back to network and storing the result.
async function handleTile(request) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    trimCache(TILE_CACHE, MAX_TILES);
  }
  return response;
}

// App shell: network-first so new deploys show up promptly, falling back to cache when offline.
async function handleShell(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const index = await cache.match('./index.html');
      if (index) return index;
    }
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (isOsmTile(url)) {
    event.respondWith(handleTile(request));
  } else if (isOverpassQuery(url)) {
    event.respondWith(handleOverpass(request));
  } else if (url.origin === self.location.origin || SHELL_ASSETS.includes(request.url)) {
    event.respondWith(handleShell(request));
  }
  // Everything else (weather, radar) goes straight to the network.
});
