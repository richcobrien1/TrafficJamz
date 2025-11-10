/**
 * Client-side Apple Music Service
 * Uses MusicKit JS for user authentication
 */

class AppleMusicClientService {
  constructor() {
    this.music = null;
    this.isInitialized = false;
  }

  /**
   * Initialize MusicKit
   */
  async initialize() {
    if (this.isInitialized) return true;

    try {
      // Wait for MusicKit to load
      if (!window.MusicKit) {
        throw new Error('MusicKit not loaded');
      }

      // Configure MusicKit
      await window.MusicKit.configure({
        developerToken: import.meta.env.VITE_APPLE_MUSIC_DEVELOPER_TOKEN,
        app: {
          name: 'TrafficJamz',
          build: '1.0.0'
        }
      });

      this.music = window.MusicKit.getInstance();
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing Apple Music:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.music && this.music.isAuthorized;
  }

  /**
   * Authorize user
   */
  async authorize() {
    try {
      await this.initialize();
      const musicUserToken = await this.music.authorize();
      localStorage.setItem('apple_music_token', musicUserToken);
      return true;
    } catch (error) {
      console.error('Error authorizing Apple Music:', error);
      throw new Error('Failed to authorize Apple Music');
    }
  }

  /**
   * Unauthorize user
   */
  async unauthorize() {
    try {
      if (this.music) {
        await this.music.unauthorize();
      }
      localStorage.removeItem('apple_music_token');
    } catch (error) {
      console.error('Error unauthorizing Apple Music:', error);
    }
  }

  /**
   * Get user's playlists
   */
  async getPlaylists() {
    try {
      await this.initialize();
      
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated');
      }

      const playlists = await this.music.api.music('/v1/me/library/playlists', {
        limit: 100
      });

      return playlists.data.map(playlist => ({
        id: playlist.id,
        name: playlist.attributes.name,
        description: playlist.attributes.description?.standard || '',
        tracksCount: playlist.attributes.trackCount || 0,
        artwork: playlist.attributes.artwork?.url
          ?.replace('{w}', '300')
          ?.replace('{h}', '300'),
        externalUrl: playlist.attributes.url
      }));
    } catch (error) {
      console.error('Error fetching Apple Music playlists:', error);
      throw error;
    }
  }

  /**
   * Get playlist tracks
   */
  async getPlaylistTracks(playlistId) {
    try {
      await this.initialize();
      
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated');
      }

      const playlist = await this.music.api.music(`/v1/me/library/playlists/${playlistId}/tracks`, {
        limit: 100
      });

      return playlist.data.map(track => ({
        source: 'apple-music',
        id: track.id,
        appleMusicId: track.id,
        title: track.attributes.name,
        artist: track.attributes.artistName,
        album: track.attributes.albumName,
        duration: Math.floor(track.attributes.durationInMillis / 1000),
        albumArt: track.attributes.artwork?.url
          ?.replace('{w}', '300')
          ?.replace('{h}', '300'),
        previewUrl: track.attributes.previews?.[0]?.url
      }));
    } catch (error) {
      console.error('Error fetching Apple Music tracks:', error);
      throw error;
    }
  }

  /**
   * Search tracks
   */
  async searchTracks(query, limit = 20) {
    try {
      await this.initialize();

      const results = await this.music.api.music('/v1/catalog/us/search', {
        term: query,
        types: 'songs',
        limit: limit
      });

      return results.songs.data.map(track => ({
        source: 'apple-music',
        id: track.id,
        appleMusicId: track.id,
        title: track.attributes.name,
        artist: track.attributes.artistName,
        album: track.attributes.albumName,
        duration: Math.floor(track.attributes.durationInMillis / 1000),
        albumArt: track.attributes.artwork?.url
          ?.replace('{w}', '300')
          ?.replace('{h}', '300'),
        previewUrl: track.attributes.previews?.[0]?.url
      }));
    } catch (error) {
      console.error('Error searching Apple Music:', error);
      throw error;
    }
  }
}

export default new AppleMusicClientService();
