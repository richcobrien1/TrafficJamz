// TrafficJamz Service Worker - Audio Caching for Offline Playback
// Version: 1.0.0

const CACHE_VERSION = 'trafficjamz-v1';
const AUDIO_CACHE = 'trafficjamz-audio-v1';
const STATIC_CACHE = 'trafficjamz-static-v1';

// R2 domain for audio files
const R2_DOMAIN = 'pub-3db25e1ebf6d46a38e8cffdd22a48c64.r2.dev';

// Install event - prepare caches
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker version:', CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE),
      caches.open(AUDIO_CACHE)
    ]).then(() => {
      console.log('[SW] Caches created successfully');
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker version:', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old cache versions
          if (cacheName !== STATIC_CACHE && cacheName !== AUDIO_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service worker activated, claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - intercept audio requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only intercept audio file requests from R2
  if (url.hostname === R2_DOMAIN && isAudioFile(url.pathname)) {
    event.respondWith(handleAudioRequest(event.request));
  } else {
    // Let all other requests pass through
    event.respondWith(fetch(event.request));
  }
});

// Handle audio file requests with cache-first strategy
async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Serving audio from cache:', request.url);
    return cachedResponse;
  }
  
  // Not in cache - fetch from network
  console.log('[SW] Audio not cached, fetching from network:', request.url);
  
  try {
    const networkResponse = await fetch(request);
    
    // Clone response before consuming it
    const responseToCache = networkResponse.clone();
    
    // Cache successful responses
    if (networkResponse.ok) {
      console.log('[SW] Caching audio file:', request.url);
      cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch audio:', request.url, error);
    
    // Return offline fallback or error response
    return new Response('Offline: Audio file not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Check if URL is an audio file
function isAudioFile(pathname) {
  const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];
  return audioExtensions.some(ext => pathname.toLowerCase().endsWith(ext));
}

// Message handler for cache management commands from client
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);
  
  if (event.data && event.data.type === 'CACHE_AUDIO') {
    // Client requesting to cache specific audio file
    const { url } = event.data;
    cacheAudioFile(url).then(() => {
      event.ports[0].postMessage({ success: true, url });
    }).catch((error) => {
      event.ports[0].postMessage({ success: false, url, error: error.message });
    });
  }
  
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    // Client requesting cache size info
    getCacheSize().then((size) => {
      event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_AUDIO_CACHE') {
    // Client requesting to clear audio cache
    clearAudioCache().then(() => {
      event.ports[0].postMessage({ type: 'CACHE_CLEARED', success: true });
    });
  }
  
  if (event.data && event.data.type === 'GET_CACHED_URLS') {
    // Client requesting list of cached audio URLs
    getCachedAudioUrls().then((urls) => {
      event.ports[0].postMessage({ type: 'CACHED_URLS', urls });
    });
  }
});

// Explicitly cache an audio file
async function cacheAudioFile(url) {
  console.log('[SW] Explicit cache request for:', url);
  const cache = await caches.open(AUDIO_CACHE);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  
  await cache.put(url, response);
  console.log('[SW] Successfully cached:', url);
  return true;
}

// Get total size of cached audio
async function getCacheSize() {
  const cache = await caches.open(AUDIO_CACHE);
  const requests = await cache.keys();
  let totalSize = 0;
  
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const blob = await response.blob();
      totalSize += blob.size;
    }
  }
  
  return {
    bytes: totalSize,
    megabytes: (totalSize / (1024 * 1024)).toFixed(2),
    count: requests.length
  };
}

// Clear all cached audio files
async function clearAudioCache() {
  console.log('[SW] Clearing audio cache');
  const cache = await caches.open(AUDIO_CACHE);
  const requests = await cache.keys();
  
  for (const request of requests) {
    await cache.delete(request);
  }
  
  console.log('[SW] Audio cache cleared');
  return true;
}

// Get list of all cached audio URLs
async function getCachedAudioUrls() {
  const cache = await caches.open(AUDIO_CACHE);
  const requests = await cache.keys();
  return requests.map(req => req.url);
}

console.log('[SW] Service worker script loaded');
