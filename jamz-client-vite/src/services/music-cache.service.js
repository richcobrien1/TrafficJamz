/**
 * Music Cache Service - IndexedDB-based offline music storage
 * Supports both web browsers and Capacitor native apps
 */

class MusicCacheService {
  constructor() {
    this.dbName = 'TrafficJamzMusicCache';
    this.dbVersion = 1;
    this.storeName = 'tracks';
    this.db = null;
    this.maxCacheSize = 50; // Maximum number of tracks to cache
    this.initPromise = this.init();
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    if (this.db) return this.db;

    // Mobile detection
    const isAndroid = /Android/.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isMobile = isAndroid || isIOS;
    
    if (isMobile) {
      console.log(`📱 Mobile device detected (${isAndroid ? 'Android' : 'iOS'}) - initializing music cache`);
    }

    return new Promise((resolve, reject) => {
      // Mobile: Check if IndexedDB is available
      if (!window.indexedDB) {
        console.error('❌ IndexedDB not supported on this device');
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('❌ Failed to open music cache database:', request.error);
        if (isMobile) {
          console.error('❌ Mobile IndexedDB error - this may affect music caching');
        }
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ Music cache database opened successfully');
        if (isMobile) {
          console.log(`✅ Mobile music cache ready (${isAndroid ? 'Android' : 'iOS'})`);
        }
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store for music tracks
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
          objectStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          objectStore.createIndex('lastPlayed', 'lastPlayed', { unique: false });
          objectStore.createIndex('playCount', 'playCount', { unique: false });
          console.log('✅ Music cache object store created');
          if (isMobile) {
            console.log('✅ Mobile music cache schema initialized');
          }
        }
      };
    });
  }

  /**
   * Cache a music track from URL
   * @param {string} trackId - Unique track identifier
   * @param {string} url - Track URL to fetch and cache
   * @param {object} metadata - Track metadata (title, artist, etc.)
   * @returns {Promise<Blob>} - The cached audio blob
   */
  async cacheTrack(trackId, url, metadata = {}) {
    try {
      await this.initPromise;

      console.log(`💾 Caching track: ${metadata.title || trackId}`);

      // Fetch the audio file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch track: ${response.status}`);
      }

      const blob = await response.blob();
      const cachedAt = Date.now();

      // Store in IndexedDB
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);

      const cacheEntry = {
        id: trackId,
        blob: blob,
        url: url,
        metadata: metadata,
        cachedAt: cachedAt,
        lastPlayed: cachedAt,
        playCount: 1,
        size: blob.size
      };

      await new Promise((resolve, reject) => {
        const request = objectStore.put(cacheEntry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log(`✅ Track cached: ${metadata.title || trackId} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);

      // Clean up old cache entries if needed
      await this.cleanupCache();

      return blob;
    } catch (error) {
      console.error('❌ Failed to cache track:', error);
      throw error;
    }
  }

  /**
   * Get cached track or fetch from URL if not cached
   * @param {string} trackId - Unique track identifier
   * @param {string} url - Fallback URL if not cached
   * @param {object} metadata - Track metadata
   * @returns {Promise<Blob>} - The audio blob
   */
  async getTrack(trackId, url, metadata = {}) {
    try {
      await this.initPromise;

      // Try to get from cache first
      const cached = await this.getCachedTrack(trackId);
      
      if (cached) {
        console.log(`🎵 Playing from cache: ${metadata.title || trackId}`);
        
        // Update last played timestamp and play count
        await this.updatePlayStats(trackId);
        
        return cached.blob;
      }

      // Not cached - fetch and cache it
      console.log(`🌐 Track not cached, fetching: ${metadata.title || trackId}`);
      return await this.cacheTrack(trackId, url, metadata);

    } catch (error) {
      console.error('❌ Failed to get track:', error);
      
      // Fallback: try to fetch directly without caching
      try {
        const response = await fetch(url);
        return await response.blob();
      } catch (fetchError) {
        console.error('❌ Direct fetch also failed:', fetchError);
        throw fetchError;
      }
    }
  }

  /**
   * Get cached track by ID
   * @param {string} trackId
   * @returns {Promise<object|null>}
   */
  async getCachedTrack(trackId) {
    try {
      await this.initPromise;

      // Safety check: if no trackId, return null immediately
      if (!trackId) {
        return null;
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const objectStore = transaction.objectStore(this.storeName);
        const request = objectStore.get(trackId);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ Failed to get cached track:', error);
      return null;
    }
  }

  /**
   * Update play statistics for a track
   * @param {string} trackId
   */
  async updatePlayStats(trackId) {
    try {
      await this.initPromise;

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get(trackId);

      request.onsuccess = () => {
        const track = request.result;
        if (track) {
          track.lastPlayed = Date.now();
          track.playCount = (track.playCount || 0) + 1;
          objectStore.put(track);
        }
      };
    } catch (error) {
      console.error('❌ Failed to update play stats:', error);
    }
  }

  /**
   * Clean up old cache entries (LRU - Least Recently Used)
   */
  async cleanupCache() {
    try {
      await this.initPromise;

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const countRequest = objectStore.count();

      countRequest.onsuccess = async () => {
        const count = countRequest.result;
        
        if (count > this.maxCacheSize) {
          const toDelete = count - this.maxCacheSize;
          console.log(`🧹 Cache cleanup: removing ${toDelete} old tracks`);

          // Get all tracks sorted by lastPlayed
          const tracks = await this.getAllTracks();
          tracks.sort((a, b) => a.lastPlayed - b.lastPlayed);

          // Delete the oldest ones
          const deleteTransaction = this.db.transaction([this.storeName], 'readwrite');
          const deleteStore = deleteTransaction.objectStore(this.storeName);

          for (let i = 0; i < toDelete; i++) {
            deleteStore.delete(tracks[i].id);
            console.log(`🗑️ Removed old track: ${tracks[i].metadata?.title || tracks[i].id}`);
          }
        }
      };
    } catch (error) {
      console.error('❌ Failed to cleanup cache:', error);
    }
  }

  /**
   * Get all cached tracks
   * @returns {Promise<Array>}
   */
  async getAllTracks() {
    try {
      await this.initPromise;

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const objectStore = transaction.objectStore(this.storeName);
        const request = objectStore.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ Failed to get all tracks:', error);
      return [];
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<object>}
   */
  async getCacheStats() {
    try {
      const tracks = await this.getAllTracks();
      const totalSize = tracks.reduce((sum, track) => sum + (track.size || 0), 0);

      return {
        trackCount: tracks.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        tracks: tracks.map(t => ({
          id: t.id,
          title: t.metadata?.title,
          artist: t.metadata?.artist,
          sizeMB: ((t.size || 0) / 1024 / 1024).toFixed(2),
          cachedAt: new Date(t.cachedAt).toLocaleString(),
          lastPlayed: new Date(t.lastPlayed).toLocaleString(),
          playCount: t.playCount
        }))
      };
    } catch (error) {
      console.error('❌ Failed to get cache stats:', error);
      return { trackCount: 0, totalSize: 0, totalSizeMB: '0', tracks: [] };
    }
  }

  /**
   * Clear all cached tracks
   */
  async clearCache() {
    try {
      await this.initPromise;

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      
      await new Promise((resolve, reject) => {
        const request = objectStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('✅ Music cache cleared');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Delete a specific cached track
   * @param {string} trackId
   */
  async deleteTrack(trackId) {
    try {
      await this.initPromise;

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      
      await new Promise((resolve, reject) => {
        const request = objectStore.delete(trackId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log(`✅ Track deleted from cache: ${trackId}`);
    } catch (error) {
      console.error('❌ Failed to delete track:', error);
      throw error;
    }
  }

  /**
   * Check if track is cached
   * @param {string} trackId
   * @returns {Promise<boolean>}
   */
  async isCached(trackId) {
    const track = await this.getCachedTrack(trackId);
    return track !== null;
  }

  /**
   * Preload multiple tracks (useful for "Download Playlist" feature)
   * @param {Array} tracks - Array of {id, url, metadata} objects
   * @param {Function} progressCallback - Optional callback(current, total)
   */
  async preloadTracks(tracks, progressCallback = null) {
    console.log(`📥 Preloading ${tracks.length} tracks...`);
    
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      
      try {
        // Check if already cached
        const isCached = await this.isCached(track.id);
        if (!isCached) {
          await this.cacheTrack(track.id, track.url, track.metadata);
        } else {
          console.log(`⏭️ Skipping already cached: ${track.metadata?.title || track.id}`);
        }
      } catch (error) {
        console.error(`❌ Failed to preload track ${track.id}:`, error);
      }

      if (progressCallback) {
        progressCallback(i + 1, tracks.length);
      }
    }

    console.log('✅ Preload complete');
  }
}

// Export singleton instance
const musicCacheService = new MusicCacheService();
export default musicCacheService;
