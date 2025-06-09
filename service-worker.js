// Basic service worker

self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  // Add caching logic here later
});

self.addEventListener('fetch', (event) => {
  console.log('Fetching:', event.request.url);
  // Add caching and network strategies here later
  event.respondWith(fetch(event.request));
});
