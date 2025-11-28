// TrafficJamz Service Worker - Full Offline Support
// Version: 3.0.1 - FIXED: Force cache clear for IndexedDB keyPath fix

const BUILD_VERSION = '3.0.1-' + Date.now(); // Unique version per build
const CACHE_VERSION = 'trafficjamz-v3.1';
const AUDIO_CACHE = 'trafficjamz-audio-v3.1';
const STATIC_CACHE = 'trafficjamz-static-v3.1';
const APP_CACHE = 'trafficjamz-app-v3.1';

// R2 domain for audio files
const R2_DOMAIN = 'pub-3db25e1ebf6d46a38e8cffdd22a48c64.r2.dev';

// Critical app assets to cache for offline use
const APP_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg'
  // JS and CSS will be cached on first load
];

// Install event - cache critical app assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker version:', CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE),
      caches.open(AUDIO_CACHE),
      caches.open(APP_CACHE).then((cache) => {
        console.log('[SW] Caching app shell assets');
        return cache.addAll(APP_ASSETS);
      })
    ]).then(() => {
      console.log('[SW] All caches created successfully');
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
          if (cacheName !== STATIC_CACHE && cacheName !== AUDIO_CACHE && cacheName !== APP_CACHE) {
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

// Fetch event - smart caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Audio files: cache-first strategy
  if (url.hostname === R2_DOMAIN && isAudioFile(url.pathname)) {
    event.respondWith(handleAudioRequest(event.request));
  }
  // App assets (JS, CSS, HTML): network-first with cache fallback
  else if (event.request.destination === 'document' || 
           event.request.destination === 'script' || 
           event.request.destination === 'style' ||
           event.request.destination === 'manifest') {
    event.respondWith(handleAppRequest(event.request));
  }
  // Images and fonts: cache-first
  else if (event.request.destination === 'image' || 
           event.request.destination === 'font') {
    event.respondWith(handleStaticRequest(event.request));
  }
  // Everything else: network only
  else {
    event.respondWith(fetch(event.request));
  }
});

// Handle app assets (HTML, JS, CSS) - NETWORK FIRST with cache fallback
async function handleAppRequest(request) {
  const cache = await caches.open(APP_CACHE);
  
  try {
    // ALWAYS try network first for app assets to prevent stale code
    const networkResponse = await fetch(request, { cache: 'no-cache' });
    
    if (networkResponse.ok) {
      // Only cache successful responses
      cache.put(request, networkResponse.clone());
      console.log('[SW] Cached fresh app asset:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed - try cache as fallback
    console.log('[SW] Network failed for app asset, trying cache:', request.url);
    
    // For document requests (navigation), ALWAYS return index.html for SPA routing
    if (request.destination === 'document') {
      const indexResponse = await cache.match('/index.html') || await cache.match('/');
      
      if (indexResponse) {
        console.log('[SW] 📴 OFFLINE - Serving cached index.html for SPA route:', request.url);
        return indexResponse;
      }
      
      // No cached index.html - this shouldn't happen but show offline page as fallback
      console.error('[SW] ❌ CRITICAL: No cached index.html found!');
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TrafficJamz - Offline</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            h1 { font-size: 2.5rem; margin-bottom: 1rem; }
            p { font-size: 1.2rem; opacity: 0.9; }
            button {
              margin-top: 1.5rem;
              padding: 0.75rem 2rem;
              font-size: 1rem;
              background: white;
              color: #667eea;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎵 TrafficJamz</h1>
            <p>App not cached yet!</p>
            <p>Connect to the internet and reload to cache the app for offline use.</p>
            <button onclick="location.reload()">Retry</button>
          </div>
        </body>
        </html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }
    
    // For JS/CSS assets, try exact cache match
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] ⚠️ OFFLINE MODE - Serving stale app asset from cache:', request.url);
      return cachedResponse;
    }
    
    throw error;
  }
}

// Handle static assets (images, fonts) - cache first
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch static asset:', request.url);
    throw error;
  }
}

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
