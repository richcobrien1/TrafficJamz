/**
 * Playlist Cache Utility
 * Stores playlist data in localStorage for instant loading
 */

const CACHE_PREFIX = 'trafficjamz_playlist_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save playlist to localStorage
 * @param {string} sessionId - Audio session ID
 * @param {Array} playlist - Array of track objects
 */
export const savePlaylistToCache = (sessionId, playlist) => {
  try {
    const cacheKey = `${CACHE_PREFIX}${sessionId}`;
    const cacheData = {
      playlist,
      timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log('💾 [PlaylistCache] Saved playlist to cache:', playlist.length, 'tracks');
  } catch (error) {
    console.error('❌ [PlaylistCache] Failed to save to cache:', error);
  }
};

/**
 * Load playlist from localStorage
 * @param {string} sessionId - Audio session ID
 * @returns {Array|null} - Cached playlist or null if not found/expired
 */
export const loadPlaylistFromCache = (sessionId) => {
  try {
    const cacheKey = `${CACHE_PREFIX}${sessionId}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      console.log('📭 [PlaylistCache] No cached playlist found');
      return null;
    }
    
    const cacheData = JSON.parse(cached);
    const age = Date.now() - cacheData.timestamp;
    
    // Check if cache is expired
    if (age > CACHE_EXPIRY) {
      console.log('⏰ [PlaylistCache] Cache expired, removing');
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    console.log('✅ [PlaylistCache] Loaded playlist from cache:', cacheData.playlist.length, 'tracks');
    return cacheData.playlist;
  } catch (error) {
    console.error('❌ [PlaylistCache] Failed to load from cache:', error);
    return null;
  }
};

/**
 * Clear cached playlist for a session
 * @param {string} sessionId - Audio session ID
 */
export const clearPlaylistCache = (sessionId) => {
  try {
    const cacheKey = `${CACHE_PREFIX}${sessionId}`;
    localStorage.removeItem(cacheKey);
    console.log('🗑️ [PlaylistCache] Cleared cache for session:', sessionId);
  } catch (error) {
    console.error('❌ [PlaylistCache] Failed to clear cache:', error);
  }
};

/**
 * Clear all cached playlists
 */
export const clearAllPlaylistCaches = () => {
  try {
    const keys = Object.keys(localStorage);
    const playlistKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    
    playlistKeys.forEach(key => localStorage.removeItem(key));
    console.log('🗑️ [PlaylistCache] Cleared all playlist caches:', playlistKeys.length);
  } catch (error) {
    console.error('❌ [PlaylistCache] Failed to clear all caches:', error);
  }
};

/**
 * Add track to cached playlist (optimistic update)
 * @param {string} sessionId - Audio session ID
 * @param {Object} track - Track to add
 */
export const addTrackToCache = (sessionId, track) => {
  try {
    const cached = loadPlaylistFromCache(sessionId);
    if (cached) {
      const updatedPlaylist = [...cached, track];
      savePlaylistToCache(sessionId, updatedPlaylist);
      console.log('➕ [PlaylistCache] Added track to cache:', track.title);
      return updatedPlaylist;
    }
    return null;
  } catch (error) {
    console.error('❌ [PlaylistCache] Failed to add track to cache:', error);
    return null;
  }
};

/**
 * Remove track from cached playlist (optimistic update)
 * @param {string} sessionId - Audio session ID
 * @param {string} trackId - Track ID to remove
 */
export const removeTrackFromCache = (sessionId, trackId) => {
  try {
    const cached = loadPlaylistFromCache(sessionId);
    if (cached) {
      const updatedPlaylist = cached.filter(t => t.id !== trackId);
      savePlaylistToCache(sessionId, updatedPlaylist);
      console.log('➖ [PlaylistCache] Removed track from cache:', trackId);
      return updatedPlaylist;
    }
    return null;
  } catch (error) {
    console.error('❌ [PlaylistCache] Failed to remove track from cache:', error);
    return null;
  }
};
