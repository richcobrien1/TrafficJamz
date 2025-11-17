// Service Worker Registration and Management
// Handles SW lifecycle, caching commands, and status updates

class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.isSupported = 'serviceWorker' in navigator;
    this.statusCallbacks = [];
  }

  /**
   * Register the service worker
   */
  async register() {
    if (!this.isSupported) {
      console.warn('Service Workers not supported in this browser');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('✅ Service Worker registered:', this.registration.scope);

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        console.log('🔄 Service Worker update found');
        const newWorker = this.registration.installing;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('✨ New Service Worker available - page reload recommended');
            this.notifyStatusChange('update-available');
          }
        });
      });

      // Check for updates periodically
      setInterval(() => {
        this.registration.update();
      }, 60000); // Check every minute

      return true;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * Send message to service worker with response channel
   */
  async sendMessage(message) {
    if (!this.registration || !navigator.serviceWorker.controller) {
      throw new Error('Service Worker not active');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };

      navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
    });
  }

  /**
   * Cache a specific audio file
   */
  async cacheAudioFile(url) {
    console.log('📥 Requesting cache for:', url);
    const result = await this.sendMessage({ type: 'CACHE_AUDIO', url });
    return result.success;
  }

  /**
   * Get cache size information
   */
  async getCacheSize() {
    const result = await this.sendMessage({ type: 'GET_CACHE_SIZE' });
    return result.size;
  }

  /**
   * Clear all cached audio
   */
  async clearCache() {
    console.log('🗑️ Clearing audio cache');
    const result = await this.sendMessage({ type: 'CLEAR_AUDIO_CACHE' });
    return result.success;
  }

  /**
   * Get list of cached audio URLs
   */
  async getCachedUrls() {
    const result = await this.sendMessage({ type: 'GET_CACHED_URLS' });
    return result.urls || [];
  }

  /**
   * Check if specific URL is cached
   */
  async isUrlCached(url) {
    const cachedUrls = await this.getCachedUrls();
    return cachedUrls.includes(url);
  }

  /**
   * Register status change callback
   */
  onStatusChange(callback) {
    this.statusCallbacks.push(callback);
  }

  /**
   * Notify all callbacks of status change
   */
  notifyStatusChange(status) {
    this.statusCallbacks.forEach(callback => callback(status));
  }

  /**
   * Unregister service worker (for debugging)
   */
  async unregister() {
    if (this.registration) {
      await this.registration.unregister();
      console.log('Service Worker unregistered');
    }
  }
}

// Export singleton instance
export const swManager = new ServiceWorkerManager();

// Auto-register on import
if (typeof window !== 'undefined') {
  swManager.register().catch(console.error);
}
