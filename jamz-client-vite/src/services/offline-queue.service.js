// Offline Queue Service - Handle write operations when offline
// Queues POST/PUT/DELETE requests and syncs when connection returns

import { dbManager } from './indexedDBManager';
import api from './api';

class OfflineQueueService {
  constructor() {
    this.processing = false;
    this.listeners = [];
    this.setupConnectionListener();
  }

  setupConnectionListener() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored - processing offline queue');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Connection lost - requests will be queued');
    });
  }

  /**
   * Check if currently online
   */
  isOnline() {
    return navigator.onLine;
  }

  /**
   * Queue a request to be executed when online
   */
  async queueRequest(type, url, data, method = 'POST') {
    try {
      const id = await dbManager.queueRequest(type, url, data, method);
      console.log(`📤 Queued ${method} ${type} request (ID: ${id})`);
      
      this.notifyListeners({ type: 'queued', requestType: type });
      
      // Try to process immediately if online
      if (this.isOnline()) {
        this.processQueue();
      }
      
      return { success: true, queued: true, id };
    } catch (error) {
      console.error('Failed to queue request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process all pending requests in queue
   */
  async processQueue() {
    if (this.processing) {
      console.log('Queue already processing...');
      return;
    }

    if (!this.isOnline()) {
      console.log('Still offline - skipping queue processing');
      return;
    }

    this.processing = true;
    console.log('🔄 Processing offline queue...');

    try {
      const pending = await dbManager.getPendingRequests();
      console.log(`Found ${pending.length} pending requests`);

      for (const request of pending) {
        try {
          await this.executeRequest(request);
          await dbManager.updateRequestStatus(request.id, 'completed');
          console.log(`✅ Completed queued request: ${request.type}`);
          
          this.notifyListeners({ 
            type: 'completed', 
            requestType: request.type,
            requestId: request.id 
          });
        } catch (error) {
          console.error(`Failed to execute queued request ${request.id}:`, error);
          await dbManager.updateRequestStatus(request.id, 'failed');
          
          this.notifyListeners({ 
            type: 'failed', 
            requestType: request.type,
            requestId: request.id,
            error: error.message 
          });
        }
      }

      // Clean up completed requests
      await dbManager.clearProcessedRequests();
      console.log('✅ Offline queue processed');
      
      this.notifyListeners({ type: 'queue-completed' });
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Execute a queued request
   */
  async executeRequest(request) {
    const { method, url, data } = request;

    switch (method) {
      case 'POST':
        return await api.post(url, data);
      case 'PUT':
        return await api.put(url, data);
      case 'DELETE':
        return await api.delete(url, { data });
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  /**
   * Get pending request count
   */
  async getPendingCount() {
    const pending = await dbManager.getPendingRequests();
    return pending.length;
  }

  /**
   * Register listener for queue events
   */
  onQueueEvent(callback) {
    this.listeners.push(callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event) {
    this.listeners.forEach(cb => cb(event));
  }

  /**
   * Helper: Queue invitation
   */
  async queueInvitation(groupId, email) {
    return this.queueRequest(
      'invitation',
      `/groups/${groupId}/invitations`,
      { email },
      'POST'
    );
  }

  /**
   * Helper: Queue location update
   */
  async queueLocationUpdate(locationData) {
    return this.queueRequest(
      'location-update',
      '/location/update',
      locationData,
      'POST'
    );
  }

  /**
   * Helper: Queue place creation
   */
  async queuePlaceCreation(groupId, placeData) {
    return this.queueRequest(
      'place-create',
      `/groups/${groupId}/places`,
      placeData,
      'POST'
    );
  }

  /**
   * Helper: Queue place deletion
   */
  async queuePlaceDeletion(placeId) {
    return this.queueRequest(
      'place-delete',
      `/places/${placeId}`,
      {},
      'DELETE'
    );
  }

  /**
   * Helper: Queue member removal
   */
  async queueMemberRemoval(groupId, userId) {
    return this.queueRequest(
      'member-remove',
      `/groups/${groupId}/members/${userId}`,
      {},
      'DELETE'
    );
  }
}

// Export singleton
export const offlineQueue = new OfflineQueueService();
export default offlineQueue;
