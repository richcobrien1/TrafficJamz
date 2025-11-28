/**
 * Client-side YouTube Music Service
 * Uses backend OAuth flow for secure token management
 */

import api from './api';

class YouTubeClientService {
  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    try {
      const response = await api.get('/integrations/youtube/status');
      return response.data.connected && !response.data.isExpired;
    } catch (error) {
      return false;
    }
  }

  /**
   * Initiate OAuth flow - returns authUrl from backend
   */
  async authorize() {
    try {
      const response = await api.get('/integrations/auth/youtube');
      return response.data.authUrl;
    } catch (error) {
      console.error('Error initiating YouTube auth:', error);
      throw new Error('Failed to initiate YouTube authentication');
    }
  }

  /**
   * Handle OAuth callback - sends code to backend
   */
  async handleCallback(code) {
    try {
      const response = await api.post('/integrations/auth/youtube/callback', { code });
      return response.data.success;
    } catch (error) {
      console.error('Error handling YouTube callback:', error);
      throw error;
    }
  }

  /**
   * Get user's playlists
   */
  async getPlaylists() {
    try {
      const response = await api.get('/integrations/youtube/playlists');
      return response.data.playlists;
    } catch (error) {
      console.error('Error fetching YouTube playlists:', error);
      throw error;
    }
  }

  /**
   * Get playlist tracks
   */
  async getPlaylistTracks(playlistId) {
    try {
      const response = await api.get(`/integrations/youtube/playlists/${playlistId}/tracks`);
      return response.data.tracks;
    } catch (error) {
      console.error('Error fetching YouTube playlist tracks:', error);
      throw error;
    }
  }

  /**
   * Search videos
   */
  async searchTracks(query, limit = 20) {
    try {
      const response = await api.get('/integrations/youtube/search', {
        params: { q: query, maxResults: limit }
      });
      return response.data.videos;
    } catch (error) {
      console.error('Error searching YouTube:', error);
      throw error;
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await api.delete('/integrations/auth/youtube');
    } catch (error) {
      console.error('Error disconnecting YouTube:', error);
    }
  }
}

export default new YouTubeClientService();
