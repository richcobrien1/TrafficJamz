// Audio Download Manager
// Handles downloading tracks, caching via Service Worker, and managing download queue

import { swManager } from './serviceWorkerManager';
import { dbManager } from './indexedDBManager';

class AudioDownloadManager {
  constructor() {
    this.downloadQueue = [];
    this.activeDownloads = new Map(); // trackId -> AbortController
    this.maxConcurrentDownloads = 3;
    this.downloadCallbacks = [];
  }

  /**
   * Add track to download queue
   */
  async queueDownload(track) {
    // Check if already cached
    const cachedTrack = await dbManager.getTrack(track.trackId || track._id || track.id);
    if (cachedTrack && cachedTrack.downloadStatus === 'cached') {
      console.log('Track already cached:', track.title);
      return { success: true, cached: true };
    }

    // Save track metadata as pending
    await dbManager.saveTrack({
      ...track,
      trackId: track.trackId || track._id || track.id,
      downloadStatus: 'pending',
      downloadProgress: 0
    });

    // Add to queue if not already there
    const trackId = track.trackId || track._id || track.id;
    if (!this.downloadQueue.includes(trackId)) {
      this.downloadQueue.push(trackId);
      console.log('📥 Added to download queue:', track.title);
    }

    // Start processing queue
    this.processQueue();

    return { success: true, queued: true };
  }

  /**
   * Queue multiple tracks for download
   */
  async queueMultiple(tracks) {
    console.log(`📥 Queuing ${tracks.length} tracks for download`);
    const results = [];

    for (const track of tracks) {
      const result = await this.queueDownload(track);
      results.push(result);
    }

    return results;
  }

  /**
   * Process download queue
   */
  async processQueue() {
    // Don't start new downloads if at max concurrent
    if (this.activeDownloads.size >= this.maxConcurrentDownloads) {
      return;
    }

    // Get next pending track
    while (this.downloadQueue.length > 0 && this.activeDownloads.size < this.maxConcurrentDownloads) {
      const trackId = this.downloadQueue.shift();
      
      // Skip if already downloading
      if (this.activeDownloads.has(trackId)) {
        continue;
      }

      // Start download
      this.downloadTrack(trackId).catch(error => {
        console.error('Download failed for track:', trackId, error);
      });
    }
  }

  /**
   * Download and cache a single track
   */
  async downloadTrack(trackId) {
    const track = await dbManager.getTrack(trackId);
    if (!track) {
      console.error('Track not found in database:', trackId);
      return { success: false, error: 'Track not found' };
    }

    console.log('⬇️ Downloading:', track.title);

    // Create abort controller for cancellation
    const abortController = new AbortController();
    this.activeDownloads.set(trackId, abortController);

    try {
      // Update status to downloading
      await dbManager.updateTrackStatus(trackId, 'downloading', 0);
      this.notifyProgress(trackId, 'downloading', 0);

      // Use Service Worker to cache the audio file
      const success = await swManager.cacheAudioFile(track.url);

      if (success) {
        // Get file size from Service Worker cache
        const cacheSize = await swManager.getCacheSize();
        
        // Update track as cached
        await dbManager.updateTrackStatus(trackId, 'cached', 100);
        const cachedTrack = await dbManager.getTrack(trackId);
        cachedTrack.fileSize = cacheSize.bytes / cacheSize.count; // Rough estimate
        await dbManager.saveTrack(cachedTrack);

        console.log('✅ Cached successfully:', track.title);
        this.notifyProgress(trackId, 'cached', 100);

        return { success: true, trackId };
      } else {
        throw new Error('Service Worker caching failed');
      }

    } catch (error) {
      console.error('❌ Download failed:', track.title, error);
      await dbManager.updateTrackStatus(trackId, 'failed', 0);
      this.notifyProgress(trackId, 'failed', 0);

      return { success: false, trackId, error: error.message };

    } finally {
      // Remove from active downloads
      this.activeDownloads.delete(trackId);

      // Continue processing queue
      this.processQueue();
    }
  }

  /**
   * Cancel download for specific track
   */
  async cancelDownload(trackId) {
    const abortController = this.activeDownloads.get(trackId);
    if (abortController) {
      abortController.abort();
      this.activeDownloads.delete(trackId);
      console.log('Download cancelled:', trackId);
    }

    // Remove from queue
    this.downloadQueue = this.downloadQueue.filter(id => id !== trackId);

    // Update status
    await dbManager.updateTrackStatus(trackId, 'pending', 0);
  }

  /**
   * Cancel all active downloads
   */
  async cancelAll() {
    console.log('Cancelling all downloads');
    
    // Abort all active downloads
    for (const [trackId, abortController] of this.activeDownloads) {
      abortController.abort();
      await dbManager.updateTrackStatus(trackId, 'pending', 0);
    }

    this.activeDownloads.clear();
    this.downloadQueue = [];
  }

  /**
   * Clear all cached tracks
   */
  async clearAllCache() {
    console.log('🗑️ Clearing all cached audio');

    // Clear Service Worker cache
    await swManager.clearCache();

    // Clear IndexedDB metadata
    await dbManager.clearAllTracks();

    this.notifyProgress('all', 'cleared', 0);

    return { success: true };
  }

  /**
   * Get download status for track
   */
  async getTrackStatus(trackId) {
    const track = await dbManager.getTrack(trackId);
    if (!track) {
      return { status: 'not-cached', progress: 0 };
    }

    return {
      status: track.downloadStatus,
      progress: track.downloadProgress,
      cachedAt: track.cachedAt
    };
  }

  /**
   * Check if track is cached
   */
  async isTrackCached(trackId) {
    const status = await this.getTrackStatus(trackId);
    return status.status === 'cached';
  }

  /**
   * Get all cached tracks
   */
  async getCachedTracks() {
    return await dbManager.getTracksByStatus('cached');
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    const [dbStats, cacheSize] = await Promise.all([
      dbManager.getStorageStats(),
      swManager.getCacheSize()
    ]);

    return {
      ...dbStats,
      cacheSizeBytes: cacheSize.bytes,
      cacheSizeMB: cacheSize.megabytes,
      cachedFilesCount: cacheSize.count
    };
  }

  /**
   * Register callback for download progress updates
   */
  onProgress(callback) {
    this.downloadCallbacks.push(callback);
  }

  /**
   * Notify all callbacks of progress update
   */
  notifyProgress(trackId, status, progress) {
    this.downloadCallbacks.forEach(callback => {
      callback({ trackId, status, progress });
    });
  }

  /**
   * Estimate storage quota usage
   */
  async checkStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentUsed = quota > 0 ? ((usage / quota) * 100).toFixed(2) : 0;

      return {
        usageBytes: usage,
        usageMB: (usage / (1024 * 1024)).toFixed(2),
        quotaBytes: quota,
        quotaMB: (quota / (1024 * 1024)).toFixed(2),
        percentUsed: parseFloat(percentUsed),
        available: quota - usage,
        availableMB: ((quota - usage) / (1024 * 1024)).toFixed(2)
      };
    }

    return null;
  }

  /**
   * Check if enough storage available for download
   */
  async hasEnoughStorage(estimatedSizeMB = 100) {
    const quota = await this.checkStorageQuota();
    if (!quota) return true; // Can't check, assume yes

    const availableMB = parseFloat(quota.availableMB);
    return availableMB >= estimatedSizeMB;
  }
}

// Export singleton instance
export const downloadManager = new AudioDownloadManager();
