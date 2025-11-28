// IndexedDB Manager for Track Caching Metadata
// Stores track metadata, download status, and cache info

const DB_NAME = 'TrafficJamzDB';
const DB_VERSION = 8; // Bumped for groups_cache keyPath fix ('id' - from API response)
const STORE_TRACKS = 'cachedTracks';
const STORE_PLAYLISTS = 'playlists';
const STORE_INVITATIONS = 'group_invitations';
const STORE_LOCATIONS = 'member_locations';
const STORE_PLACES = 'saved_places';
const STORE_AVATARS = 'avatar_cache';
const STORE_OFFLINE_QUEUE = 'offline_queue';
const STORE_GROUPS = 'groups_cache';

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

        // Create group invitations store
        if (!db.objectStoreNames.contains(STORE_INVITATIONS)) {
          const invitationsStore = db.createObjectStore(STORE_INVITATIONS, { keyPath: 'id' });
          invitationsStore.createIndex('groupId', 'groupId', { unique: false });
          invitationsStore.createIndex('email', 'email', { unique: false });
          invitationsStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          console.log('Created group_invitations object store');
        }

        // Create member locations store
        if (!db.objectStoreNames.contains(STORE_LOCATIONS)) {
          const locationsStore = db.createObjectStore(STORE_LOCATIONS, { keyPath: 'id', autoIncrement: true });
          locationsStore.createIndex('groupId', 'groupId', { unique: false });
          locationsStore.createIndex('userId', 'userId', { unique: false });
          locationsStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('Created member_locations object store');
        }

        // Create saved places store
        if (!db.objectStoreNames.contains(STORE_PLACES)) {
          const placesStore = db.createObjectStore(STORE_PLACES, { keyPath: '_id' });
          placesStore.createIndex('groupId', 'groupId', { unique: false });
          placesStore.createIndex('name', 'name', { unique: false });
          console.log('Created saved_places object store');
        }

        // Create avatar cache store
        if (!db.objectStoreNames.contains(STORE_AVATARS)) {
          const avatarsStore = db.createObjectStore(STORE_AVATARS, { keyPath: 'url' });
          avatarsStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          console.log('Created avatar_cache object store');
        }

        // Create offline queue store
        if (!db.objectStoreNames.contains(STORE_OFFLINE_QUEUE)) {
          const queueStore = db.createObjectStore(STORE_OFFLINE_QUEUE, { keyPath: 'id', autoIncrement: true });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('type', 'type', { unique: false });
          queueStore.createIndex('status', 'status', { unique: false });
          console.log('Created offline_queue object store');
        }

        // Create groups cache store
        if (!db.objectStoreNames.contains(STORE_GROUPS)) {
          const groupsStore = db.createObjectStore(STORE_GROUPS, { keyPath: 'id' });
          groupsStore.createIndex('name', 'name', { unique: false });
          groupsStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          console.log('Created groups_cache object store');
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

  // ============================================
  // GROUP INVITATIONS METHODS
  // ============================================

  async saveInvitations(groupId, invitations) {
    await this.ensureDB();
    const transaction = this.db.transaction([STORE_INVITATIONS], 'readwrite');
    const store = transaction.objectStore(STORE_INVITATIONS);

    // Clear existing invitations for this group
    const index = store.index('groupId');
    const range = IDBKeyRange.only(groupId);
    const deleteRequest = index.openCursor(range);

    deleteRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Add new invitations
    for (const inv of invitations) {
      store.put({ ...inv, groupId, cachedAt: Date.now() });
    }

    return new Promise((resolve) => {
      transaction.oncomplete = () => {
        console.log('💾 Cached invitations for group:', groupId);
        resolve(true);
      };
    });
  }

  async getInvitations(groupId) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_INVITATIONS], 'readonly');
      const store = transaction.objectStore(STORE_INVITATIONS);
      const index = store.index('groupId');
      const request = index.getAll(groupId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // MEMBER LOCATIONS METHODS
  // ============================================

  async saveLocations(groupId, locations) {
    await this.ensureDB();
    const transaction = this.db.transaction([STORE_LOCATIONS], 'readwrite');
    const store = transaction.objectStore(STORE_LOCATIONS);

    // Clear old locations for this group
    const index = store.index('groupId');
    const range = IDBKeyRange.only(groupId);
    const deleteRequest = index.openCursor(range);

    deleteRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Add new locations
    for (const loc of locations) {
      store.put({ ...loc, groupId, timestamp: loc.timestamp || Date.now() });
    }

    return new Promise((resolve) => {
      transaction.oncomplete = () => {
        console.log('💾 Cached locations for group:', groupId);
        resolve(true);
      };
    });
  }

  async getLocations(groupId) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_LOCATIONS], 'readonly');
      const store = transaction.objectStore(STORE_LOCATIONS);
      const index = store.index('groupId');
      const request = index.getAll(groupId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // SAVED PLACES METHODS
  // ============================================

  async savePlaces(groupId, places) {
    await this.ensureDB();
    const transaction = this.db.transaction([STORE_PLACES], 'readwrite');
    const store = transaction.objectStore(STORE_PLACES);

    for (const place of places) {
      store.put({ ...place, groupId });
    }

    return new Promise((resolve) => {
      transaction.oncomplete = () => {
        console.log('💾 Cached places for group:', groupId);
        resolve(true);
      };
    });
  }

  async getPlaces(groupId) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_PLACES], 'readonly');
      const store = transaction.objectStore(STORE_PLACES);
      const index = store.index('groupId');
      const request = index.getAll(groupId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // AVATAR CACHE METHODS
  // ============================================

  async saveAvatar(url, blob) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_AVATARS], 'readwrite');
      const store = transaction.objectStore(STORE_AVATARS);
      const request = store.put({ url, blob, cachedAt: Date.now() });

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async getAvatar(url) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_AVATARS], 'readonly');
      const store = transaction.objectStore(STORE_AVATARS);
      const request = store.get(url);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // OFFLINE QUEUE METHODS
  // ============================================

  async queueRequest(type, url, data, method = 'POST') {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_OFFLINE_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORE_OFFLINE_QUEUE);
      const request = store.add({
        type,
        url,
        data,
        method,
        timestamp: Date.now(),
        status: 'pending'
      });

      request.onsuccess = () => {
        console.log('📤 Queued offline request:', type);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingRequests() {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_OFFLINE_QUEUE], 'readonly');
      const store = transaction.objectStore(STORE_OFFLINE_QUEUE);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateRequestStatus(id, status) {
    await this.ensureDB();
    const transaction = this.db.transaction([STORE_OFFLINE_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORE_OFFLINE_QUEUE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (record) {
        record.status = status;
        store.put(record);
      }
    };
  }

  async clearProcessedRequests() {
    await this.ensureDB();
    const transaction = this.db.transaction([STORE_OFFLINE_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORE_OFFLINE_QUEUE);
    const index = store.index('status');
    const request = index.openCursor(IDBKeyRange.only('completed'));

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }

  // ============================================
  // GROUPS CACHE METHODS
  // ============================================

  /**
   * Save groups to IndexedDB (permanent cache fallback)
   */
  async saveGroups(groupsArray) {
    await this.ensureDB();
    const transaction = this.db.transaction([STORE_GROUPS], 'readwrite');
    const store = transaction.objectStore(STORE_GROUPS);
    
    // Clear existing groups first
    await store.clear();
    
    // Add each group with timestamp
    const promises = groupsArray.map(group => {
      return new Promise((resolve, reject) => {
        const request = store.add({
          ...group,
          cachedAt: Date.now()
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    console.log('💾 Saved', groupsArray.length, 'groups to IndexedDB');
  }

  /**
   * Get all cached groups from IndexedDB
   */
  async getGroups() {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_GROUPS], 'readonly');
      const store = transaction.objectStore(STORE_GROUPS);
      const request = store.getAll();

      request.onsuccess = () => {
        const groups = request.result || [];
        console.log('📦 Retrieved', groups.length, 'groups from IndexedDB');
        resolve(groups);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get single group by ID from IndexedDB
   */
  async getGroup(groupId) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_GROUPS], 'readonly');
      const store = transaction.objectStore(STORE_GROUPS);
      // MongoDB uses string _id, don't parseInt
      const request = store.get(groupId);

      request.onsuccess = () => {
        console.log('📦 Retrieved group', groupId, 'from IndexedDB');
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cached groups
   */
  async clearGroups() {
    await this.ensureDB();
    const transaction = this.db.transaction([STORE_GROUPS], 'readwrite');
    const store = transaction.objectStore(STORE_GROUPS);
    await store.clear();
    console.log('🗑️ Cleared groups cache from IndexedDB');
  }
}

// Export singleton instance
export const dbManager = new IndexedDBManager();

// Initialize on import
if (typeof window !== 'undefined') {
  dbManager.init().catch(console.error);
}
