// IndexedDB Manager for Track Caching Metadata
// Stores track metadata, download status, and cache info

const DB_NAME = 'TrafficJamzDB';
const DB_VERSION = 2; // Incremented for new playlist store
const STORE_TRACKS = 'cachedTracks';
const STORE_PLAYLISTS = 'playlists';

class IndexedDBManager {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('🔄 Upgrading IndexedDB schema to version', DB_VERSION);

        // Create tracks store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_TRACKS)) {
          const trackStore = db.createObjectStore(STORE_TRACKS, { keyPath: 'trackId' });
          
          // Indexes for querying
          trackStore.createIndex('url', 'url', { unique: true });
          trackStore.createIndex('sessionId', 'sessionId', { unique: false });
          trackStore.createIndex('downloadStatus', 'downloadStatus', { unique: false });
          trackStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          
          console.log('Created cachedTracks object store');
        }

        // Create playlists store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
          const playlistStore = db.createObjectStore(STORE_PLAYLISTS, { keyPath: 'sessionId' });
          
          // Indexes for querying
          playlistStore.createIndex('timestamp', 'timestamp', { unique: false });
          
          console.log('Created playlists object store');
        }
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  async ensureDB() {
    if (!this.db) {
      await this.init();
    }
  }

  /**
   * Add or update track metadata
   */
  async saveTrack(trackData) {
    await this.ensureDB();

    const track = {
      trackId: trackData.trackId || trackData._id || trackData.id,
      title: trackData.title,
      artist: trackData.artist,
      album: trackData.album,
      duration: trackData.duration,
      url: trackData.url,
      sessionId: trackData.sessionId,
      downloadStatus: trackData.downloadStatus || 'pending', // pending, downloading, cached, failed
      downloadProgress: trackData.downloadProgress || 0,
      cachedAt: trackData.cachedAt || Date.now(),
      fileSize: trackData.fileSize || 0,
      metadata: trackData.metadata || {}
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_TRACKS], 'readwrite');
      const store = transaction.objectStore(STORE_TRACKS);
      const request = store.put(track);

      request.onsuccess = () => resolve(track);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get track by ID
   */
  async getTrack(trackId) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_TRACKS], 'readonly');
      const store = transaction.objectStore(STORE_TRACKS);
      const request = store.get(trackId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get track by URL
   */
  async getTrackByUrl(url) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_TRACKS], 'readonly');
      const store = transaction.objectStore(STORE_TRACKS);
      const index = store.index('url');
      const request = index.get(url);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all cached tracks
   */
  async getAllTracks() {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_TRACKS], 'readonly');
      const store = transaction.objectStore(STORE_TRACKS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get tracks by session ID
   */
  async getTracksBySession(sessionId) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_TRACKS], 'readonly');
      const store = transaction.objectStore(STORE_TRACKS);
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get tracks by download status
   */
  async getTracksByStatus(status) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_TRACKS], 'readonly');
      const store = transaction.objectStore(STORE_TRACKS);
      const index = store.index('downloadStatus');
      const request = index.getAll(status);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update track download status
   */
  async updateTrackStatus(trackId, status, progress = 0) {
    const track = await this.getTrack(trackId);
    if (!track) {
      throw new Error(`Track ${trackId} not found in database`);
    }

    track.downloadStatus = status;
    track.downloadProgress = progress;

    if (status === 'cached') {
      track.cachedAt = Date.now();
    }

    return this.saveTrack(track);
  }

  /**
   * Delete track metadata
   */
  async deleteTrack(trackId) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_TRACKS], 'readwrite');
      const store = transaction.objectStore(STORE_TRACKS);
      const request = store.delete(trackId);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all track metadata
   */
  async clearAllTracks() {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_TRACKS], 'readwrite');
      const store = transaction.objectStore(STORE_TRACKS);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🗑️ All track metadata cleared');
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    const tracks = await this.getAllTracks();
    const cachedTracks = tracks.filter(t => t.downloadStatus === 'cached');
    
    const totalSize = cachedTracks.reduce((sum, track) => sum + (track.fileSize || 0), 0);

    return {
      totalTracks: tracks.length,
      cachedTracks: cachedTracks.length,
      pendingTracks: tracks.filter(t => t.downloadStatus === 'pending').length,
      downloadingTracks: tracks.filter(t => t.downloadStatus === 'downloading').length,
      failedTracks: tracks.filter(t => t.downloadStatus === 'failed').length,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
    };
  }

  /**
   * Clean up old cached tracks (older than 30 days)
   */
  async cleanupOldTracks(daysOld = 30) {
    const tracks = await this.getAllTracks();
    const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    const oldTracks = tracks.filter(t => 
      t.downloadStatus === 'cached' && t.cachedAt < cutoffDate
    );

    console.log(`🧹 Cleaning up ${oldTracks.length} tracks older than ${daysOld} days`);

    for (const track of oldTracks) {
      await this.deleteTrack(track.trackId);
    }

    return oldTracks.length;
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('IndexedDB connection closed');
    }
  }

  // ============================================
  // PLAYLIST METHODS
  // ============================================

  /**
   * Save playlist for a session
   */
  async savePlaylist(sessionId, playlist) {
    await this.ensureDB();

    const playlistData = {
      sessionId,
      playlist,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_PLAYLISTS], 'readwrite');
      const store = transaction.objectStore(STORE_PLAYLISTS);
      const request = store.put(playlistData);

      request.onsuccess = () => {
        console.log('💾 [IndexedDB] Saved playlist to IndexedDB:', playlist.length, 'tracks');
        resolve(playlistData);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get playlist for a session
   */
  async getPlaylist(sessionId) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_PLAYLISTS], 'readonly');
      const store = transaction.objectStore(STORE_PLAYLISTS);
      const request = store.get(sessionId);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          console.log('✅ [IndexedDB] Loaded playlist from IndexedDB:', result.playlist.length, 'tracks');
        } else {
          console.log('📭 [IndexedDB] No cached playlist found');
        }
        resolve(result ? result.playlist : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete playlist for a session
   */
  async deletePlaylist(sessionId) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_PLAYLISTS], 'readwrite');
      const store = transaction.objectStore(STORE_PLAYLISTS);
      const request = store.delete(sessionId);

      request.onsuccess = () => {
        console.log('🗑️ [IndexedDB] Deleted playlist for session:', sessionId);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all playlists
   */
  async getAllPlaylists() {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_PLAYLISTS], 'readonly');
      const store = transaction.objectStore(STORE_PLAYLISTS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all playlists
   */
  async clearAllPlaylists() {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_PLAYLISTS], 'readwrite');
      const store = transaction.objectStore(STORE_PLAYLISTS);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🗑️ [IndexedDB] All playlists cleared');
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton instance
export const dbManager = new IndexedDBManager();

// Initialize on import
if (typeof window !== 'undefined') {
  dbManager.init().catch(console.error);
}
