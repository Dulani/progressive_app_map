// Service worker: precaches the app shell and caches viewed map tiles for offline use.

const SHELL_CACHE = 'shell-v1';
const TILE_CACHE = 'tiles-v1';
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
        keys.filter((key) => key !== SHELL_CACHE && key !== TILE_CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isOsmTile(url) {
  return url.hostname === 'tile.openstreetmap.org';
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
  } else if (url.origin === self.location.origin || SHELL_ASSETS.includes(request.url)) {
    event.respondWith(handleShell(request));
  }
  // Everything else (weather, radar, Overpass) goes straight to the network.
});
