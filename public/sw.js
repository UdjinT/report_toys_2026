const cacheName = 'report-toys-cache-v1';
const assets = ['/', '/admin.html', '/collector.html', '/manifest.webmanifest'];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => {
      return cache.addAll(assets);
    }),
  );
});
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (event.request.method === 'GET' && response.ok) {
          const cloned = response.clone();
          caches.open(cacheName).then((cache) => cache.put(event.request, cloned));
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
