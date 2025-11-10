const SpotifyWebApi = require('spotify-web-api-node');
const UserIntegration = require('../models/user-integration.model');

/**
 * Spotify Integration Service
 * Handles Spotify OAuth and API interactions
 */
class SpotifyService {
  constructor() {
    this.spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI
    });
    
    // OAuth scopes required for playlist access
    this.scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'playlist-read-collaborative',
      'user-library-read'
    ];

    // Check if credentials are configured
    this.isConfigured = !!(
      process.env.SPOTIFY_CLIENT_ID &&
      process.env.SPOTIFY_CLIENT_SECRET &&
      process.env.SPOTIFY_REDIRECT_URI
    );

    if (!this.isConfigured) {
      console.warn('⚠️  Spotify credentials not configured. Spotify integration will not be available.');
    }
  }

  /**
   * Check if Spotify is configured
   */
  checkConfiguration() {
    if (!this.isConfigured) {
      throw new Error('Spotify is not configured. Please set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REDIRECT_URI in environment variables.');
    }
  }

  /**
   * Generate authorization URL for OAuth flow
   * @param {string} state - CSRF protection state parameter
   * @returns {string} Authorization URL
   */
  getAuthorizationUrl(state) {
    this.checkConfiguration();
    return this.spotifyApi.createAuthorizeURL(this.scopes, state, true); // true = show dialog
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from callback
   * @returns {Promise<Object>} Token data
   */
  async getAccessToken(code) {
    try {
      const data = await this.spotifyApi.authorizationCodeGrant(code);
      return {
        accessToken: data.body.access_token,
        refreshToken: data.body.refresh_token,
        expiresIn: data.body.expires_in, // seconds
        scope: data.body.scope
      };
    } catch (error) {
      console.error('Error getting Spotify access token:', error);
      throw new Error('Failed to obtain Spotify access token');
    }
  }

  /**
   * Refresh expired access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New token data
   */
  async refreshAccessToken(refreshToken) {
    try {
      this.spotifyApi.setRefreshToken(refreshToken);
      const data = await this.spotifyApi.refreshAccessToken();
      return {
        accessToken: data.body.access_token,
        expiresIn: data.body.expires_in
      };
    } catch (error) {
      console.error('Error refreshing Spotify token:', error);
      throw new Error('Failed to refresh Spotify access token');
    }
  }

  /**
   * Get or refresh valid access token for user
   * @param {string} userId - User ID
   * @returns {Promise<string>} Valid access token
   */
  async getValidAccessToken(userId) {
    const integration = await UserIntegration.findOne({
      userId,
      platform: 'spotify'
    });

    if (!integration) {
      throw new Error('No Spotify integration found for user');
    }

    // Check if token is expired or expires soon
    if (integration.expiresWithin(5)) {
      console.log('Spotify token expired or expiring soon, refreshing...');
      const newTokenData = await this.refreshAccessToken(integration.refreshToken);
      
      // Update integration with new token
      integration.accessToken = newTokenData.accessToken;
      integration.expiresAt = new Date(Date.now() + newTokenData.expiresIn * 1000);
      await integration.save();
      
      return newTokenData.accessToken;
    }

    return integration.accessToken;
  }

  /**
   * Get user's Spotify profile
   * @param {string} accessToken - Spotify access token
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile(accessToken) {
    try {
      this.spotifyApi.setAccessToken(accessToken);
      const data = await this.spotifyApi.getMe();
      return {
        id: data.body.id,
        displayName: data.body.display_name,
        email: data.body.email,
        images: data.body.images
      };
    } catch (error) {
      console.error('Error getting Spotify user profile:', error);
      throw new Error('Failed to get Spotify user profile');
    }
  }

  /**
   * Get user's playlists
   * @param {string} userId - User ID
   * @param {number} limit - Number of playlists to fetch
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} User playlists
   */
  async getUserPlaylists(userId, limit = 50, offset = 0) {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      this.spotifyApi.setAccessToken(accessToken);
      
      const data = await this.spotifyApi.getUserPlaylists({ limit, offset });
      return data.body.items.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        owner: playlist.owner.display_name,
        tracksCount: playlist.tracks.total,
        images: playlist.images,
        externalUrl: playlist.external_urls.spotify,
        public: playlist.public
      }));
    } catch (error) {
      console.error('Error getting Spotify playlists:', error);
      throw new Error('Failed to get Spotify playlists');
    }
  }

  /**
   * Get tracks from a playlist
   * @param {string} userId - User ID
   * @param {string} playlistId - Spotify playlist ID
   * @returns {Promise<Array>} Playlist tracks
   */
  async getPlaylistTracks(userId, playlistId) {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      this.spotifyApi.setAccessToken(accessToken);
      
      // Fetch all tracks (handle pagination)
      let allTracks = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;
      
      while (hasMore) {
        const data = await this.spotifyApi.getPlaylistTracks(playlistId, {
          offset,
          limit,
          fields: 'items(track(id,name,artists,album,duration_ms,preview_url,external_urls,external_ids)),next'
        });
        
        const tracks = data.body.items
          .filter(item => item.track) // Filter out null tracks
          .map(item => this.formatTrack(item.track));
        
        allTracks = allTracks.concat(tracks);
        hasMore = !!data.body.next;
        offset += limit;
      }
      
      return allTracks;
    } catch (error) {
      console.error('Error getting Spotify playlist tracks:', error);
      throw new Error('Failed to get Spotify playlist tracks');
    }
  }

  /**
   * Search for tracks
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} Search results
   */
  async searchTracks(userId, query, limit = 20) {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      this.spotifyApi.setAccessToken(accessToken);
      
      const data = await this.spotifyApi.searchTracks(query, { limit });
      return data.body.tracks.items.map(track => this.formatTrack(track));
    } catch (error) {
      console.error('Error searching Spotify tracks:', error);
      throw new Error('Failed to search Spotify tracks');
    }
  }

  /**
   * Get track details
   * @param {string} userId - User ID
   * @param {string} trackId - Spotify track ID
   * @returns {Promise<Object>} Track details
   */
  async getTrack(userId, trackId) {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      this.spotifyApi.setAccessToken(accessToken);
      
      const data = await this.spotifyApi.getTrack(trackId);
      return this.formatTrack(data.body);
    } catch (error) {
      console.error('Error getting Spotify track:', error);
      throw new Error('Failed to get Spotify track');
    }
  }

  /**
   * Format Spotify track for Jamz
   * @param {Object} spotifyTrack - Raw Spotify track object
   * @returns {Object} Formatted track
   */
  formatTrack(spotifyTrack) {
    return {
      source: 'spotify',
      spotifyId: spotifyTrack.id,
      title: spotifyTrack.name,
      artist: spotifyTrack.artists.map(a => a.name).join(', '),
      album: spotifyTrack.album.name,
      duration: Math.floor(spotifyTrack.duration_ms / 1000), // Convert to seconds
      albumArt: spotifyTrack.album.images[0]?.url || null,
      spotifyPreviewUrl: spotifyTrack.preview_url,
      externalUrl: spotifyTrack.external_urls.spotify,
      isrc: spotifyTrack.external_ids?.isrc || null
    };
  }
}

module.exports = new SpotifyService();
