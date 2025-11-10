const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Apple Music Integration Service
 * Handles Apple Music API interactions using MusicKit
 */
class AppleMusicService {
  constructor() {
    this.teamId = process.env.APPLE_TEAM_ID;
    this.keyId = process.env.APPLE_KEY_ID;
    this.privateKeyPath = process.env.APPLE_PRIVATE_KEY_PATH;
    this.baseUrl = 'https://api.music.apple.com/v1';
    
    // Cache developer token (valid for 6 months)
    this.developerToken = null;
    this.tokenExpiresAt = null;
  }

  /**
   * Generate Apple Music Developer Token (JWT)
   * @returns {string} Developer token
   */
  generateDeveloperToken() {
    try {
      // Check if credentials are configured
      if (!this.teamId || !this.keyId || !this.privateKeyPath) {
        throw new Error('Apple Music credentials not configured. Please set APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY_PATH in environment variables.');
      }

      // Check if we have a cached valid token
      if (this.developerToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
        return this.developerToken;
      }

      // Read private key
      const privateKey = fs.readFileSync(
        path.resolve(this.privateKeyPath),
        'utf8'
      );

      // Token expires in 6 months (max allowed by Apple)
      const expiresIn = 15777000; // 6 months in seconds
      const now = Math.floor(Date.now() / 1000);

      const payload = {
        iss: this.teamId,
        iat: now,
        exp: now + expiresIn
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'ES256',
        keyid: this.keyId
      });

      // Cache token
      this.developerToken = token;
      this.tokenExpiresAt = (now + expiresIn) * 1000; // Convert to milliseconds

      return token;
    } catch (error) {
      console.error('Error generating Apple Music developer token:', error);
      throw new Error('Failed to generate Apple Music developer token');
    }
  }

  /**
   * Make authenticated request to Apple Music API
   * @param {string} endpoint - API endpoint
   * @param {string} userToken - User music token (optional)
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} API response
   */
  async makeRequest(endpoint, userToken = null, params = {}) {
    try {
      const developerToken = this.generateDeveloperToken();
      const headers = {
        'Authorization': `Bearer ${developerToken}`
      };

      if (userToken) {
        headers['Music-User-Token'] = userToken;
      }

      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers,
        params
      });

      return response.data;
    } catch (error) {
      console.error('Apple Music API error:', error.response?.data || error.message);
      throw new Error('Failed to make Apple Music API request');
    }
  }

  /**
   * Search Apple Music catalog
   * @param {string} query - Search query
   * @param {string} storefront - Storefront (country code, e.g., 'us')
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} Search results
   */
  async searchCatalog(query, storefront = 'us', limit = 25) {
    try {
      const data = await this.makeRequest(`/catalog/${storefront}/search`, null, {
        term: query,
        types: 'songs',
        limit
      });

      if (!data.results || !data.results.songs) {
        return [];
      }

      return data.results.songs.data.map(track => this.formatTrack(track));
    } catch (error) {
      console.error('Error searching Apple Music:', error);
      throw new Error('Failed to search Apple Music');
    }
  }

  /**
   * Get user's library playlists (requires user token)
   * @param {string} userToken - User music token
   * @returns {Promise<Array>} User playlists
   */
  async getUserPlaylists(userToken) {
    try {
      const data = await this.makeRequest('/me/library/playlists', userToken, {
        limit: 100
      });

      return data.data.map(playlist => ({
        id: playlist.id,
        name: playlist.attributes.name,
        description: playlist.attributes.description?.standard || '',
        artwork: playlist.attributes.artwork?.url || null,
        canEdit: playlist.attributes.canEdit,
        tracksCount: playlist.attributes.trackCount || 0
      }));
    } catch (error) {
      console.error('Error getting Apple Music playlists:', error);
      throw new Error('Failed to get Apple Music playlists');
    }
  }

  /**
   * Get playlist tracks
   * @param {string} playlistId - Playlist ID
   * @param {string} storefront - Storefront (country code)
   * @param {string} userToken - User music token (for library playlists)
   * @returns {Promise<Array>} Playlist tracks
   */
  async getPlaylistTracks(playlistId, storefront = 'us', userToken = null) {
    try {
      // Determine if it's a catalog or library playlist
      const endpoint = playlistId.startsWith('p.')
        ? `/catalog/${storefront}/playlists/${playlistId}/tracks`
        : `/me/library/playlists/${playlistId}/tracks`;

      const data = await this.makeRequest(endpoint, userToken, { limit: 100 });
      
      return data.data.map(track => this.formatTrack(track));
    } catch (error) {
      console.error('Error getting Apple Music playlist tracks:', error);
      throw new Error('Failed to get Apple Music playlist tracks');
    }
  }

  /**
   * Get track details
   * @param {string} trackId - Track ID
   * @param {string} storefront - Storefront (country code)
   * @returns {Promise<Object>} Track details
   */
  async getTrack(trackId, storefront = 'us') {
    try {
      const data = await this.makeRequest(`/catalog/${storefront}/songs/${trackId}`);
      
      if (!data.data || data.data.length === 0) {
        throw new Error('Track not found');
      }

      return this.formatTrack(data.data[0]);
    } catch (error) {
      console.error('Error getting Apple Music track:', error);
      throw new Error('Failed to get Apple Music track');
    }
  }

  /**
   * Format Apple Music track for Jamz
   * @param {Object} appleTrack - Raw Apple Music track object
   * @returns {Object} Formatted track
   */
  formatTrack(appleTrack) {
    const attrs = appleTrack.attributes;
    
    // Replace artwork template URL with actual URL
    let albumArt = null;
    if (attrs.artwork?.url) {
      albumArt = attrs.artwork.url
        .replace('{w}', '600')
        .replace('{h}', '600');
    }

    return {
      source: 'apple_music',
      appleMusicId: appleTrack.id,
      title: attrs.name,
      artist: attrs.artistName,
      album: attrs.albumName,
      duration: Math.floor((attrs.durationInMillis || 0) / 1000), // Convert to seconds
      albumArt,
      appleMusicPreviewUrl: attrs.previews?.[0]?.url || null,
      externalUrl: attrs.url || null,
      isrc: attrs.isrc || null
    };
  }

  /**
   * Get storefront for a user (country)
   * @param {string} userToken - User music token
   * @returns {Promise<string>} Storefront ID
   */
  async getUserStorefront(userToken) {
    try {
      const data = await this.makeRequest('/me/storefront', userToken);
      return data.data[0]?.id || 'us';
    } catch (error) {
      console.error('Error getting user storefront:', error);
      return 'us'; // Default to US
    }
  }
}

module.exports = new AppleMusicService();
