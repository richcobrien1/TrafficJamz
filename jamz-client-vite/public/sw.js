// Cache-busting service worker - delete all caches and unregister
self.addEventListener('install', (event) => {
  console.log('[SW] CACHE BUSTER: Installing - deleting all caches');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('[SW] CACHE BUSTER: Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[SW] CACHE BUSTER: All caches deleted, activating immediately');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] CACHE BUSTER: Activating and claiming clients');
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('[SW] CACHE BUSTER: Claimed clients, unregistering self');
      return self.registration.unregister();
    }).then(() => {
      console.log('[SW] CACHE BUSTER: Unregistered, reloading all clients');
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => client.navigate(client.url));
      });
    })
  );
});

// Don't intercept any fetches - let browser go to network
self.addEventListener('fetch', (event) => {
  console.log('[SW] CACHE BUSTER: Passing through fetch:', event.request.url);
  event.respondWith(fetch(event.request));
});
