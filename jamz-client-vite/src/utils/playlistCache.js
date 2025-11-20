/**
 * Playlist Cache Utility
 * Stores playlist data in IndexedDB for instant loading (no size limits like localStorage)
 */

import { dbManager } from '../services/indexedDBManager';

const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save playlist to IndexedDB
 * @param {string} sessionId - Audio session ID
 * @param {Array} playlist - Array of track objects
 */
export const savePlaylistToCache = async (sessionId, playlist) => {
  try {
    await dbManager.savePlaylist(sessionId, playlist);
    console.log('💾 [PlaylistCache] Saved playlist to IndexedDB cache:', playlist.length, 'tracks');
  } catch (error) {
    console.error('❌ [PlaylistCache] Failed to save to IndexedDB cache:', error);
  }
};

/**
 * Load playlist from IndexedDB
 * @param {string} sessionId - Audio session ID
 * @returns {Array|null} - Cached playlist or null if not found/expired
 */
export const loadPlaylistFromCache = async (sessionId) => {
  try {
    const playlist = await dbManager.getPlaylist(sessionId);
    
    if (!playlist) {
      console.log('📭 [PlaylistCache] No cached playlist found in IndexedDB');
      return null;
    }
    
    console.log('✅ [PlaylistCache] Loaded playlist from IndexedDB cache:', playlist.length, 'tracks');
    return playlist;
  } catch (error) {
    console.error('❌ [PlaylistCache] Failed to load from IndexedDB cache:', error);
    return null;
  }
};

/**
 * Clear cached playlist for a session
 * @param {string} sessionId - Audio session ID
 */
export const clearPlaylistCache = async (sessionId) => {
  try {
    await dbManager.deletePlaylist(sessionId);
    console.log('🗑️ [PlaylistCache] Cleared IndexedDB cache for session:', sessionId);
  } catch (error) {
    console.error('❌ [PlaylistCache] Failed to clear IndexedDB cache:', error);
  }
};

/**
 * Clear all cached playlists
 */
export const clearAllPlaylistCaches = async () => {
  try {
    await dbManager.clearAllPlaylists();
    console.log('🗑️ [PlaylistCache] Cleared all playlist caches from IndexedDB');
  } catch (error) {
    console.error('❌ [PlaylistCache] Failed to clear all IndexedDB caches:', error);
  }
};

/**
 * Add track to cached playlist (optimistic update)
 * @param {string} sessionId - Audio session ID
 * @param {Object} track - Track to add
 */
export const addTrackToCache = async (sessionId, track) => {
  try {
    const cached = await loadPlaylistFromCache(sessionId);
    if (cached) {
      const updatedPlaylist = [...cached, track];
      await savePlaylistToCache(sessionId, updatedPlaylist);
      console.log('➕ [PlaylistCache] Added track to IndexedDB cache:', track.title);
      return updatedPlaylist;
    }
    return null;
  } catch (error) {
    console.error('❌ [PlaylistCache] Failed to add track to IndexedDB cache:', error);
    return null;
  }
};

/**
 * Remove track from cached playlist (optimistic update)
 * @param {string} sessionId - Audio session ID
 * @param {string} trackId - Track ID to remove
 */
export const removeTrackFromCache = async (sessionId, trackId) => {
  try {
    const cached = await loadPlaylistFromCache(sessionId);
    if (cached) {
      const updatedPlaylist = cached.filter(t => t.id !== trackId);
      await savePlaylistToCache(sessionId, updatedPlaylist);
      console.log('➖ [PlaylistCache] Removed track from IndexedDB cache:', trackId);
      return updatedPlaylist;
    }
    return null;
  } catch (error) {
    console.error('❌ [PlaylistCache] Failed to remove track from IndexedDB cache:', error);
    return null;
  }
};
