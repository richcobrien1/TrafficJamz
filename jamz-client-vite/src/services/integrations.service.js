import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://trafficjamz.v2u.us';

/**
 * Music Platform Integrations Service
 * Handles API calls for Spotify, YouTube, and Apple Music integrations
 */

// Get auth token from localStorage
const getAuthToken = () => {
  const token = localStorage.getItem('token');
  return token;
};

// Create axios instance with auth header
const createAuthHeaders = () => {
  const token = getAuthToken();
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

/**
 * Spotify Integration
 */
export const spotify = {
  // Initiate OAuth flow
  async initiateAuth() {
    const response = await axios.get(
      `${API_URL}/api/integrations/auth/spotify`,
      createAuthHeaders()
    );
    return response.data;
  },

  // Check connection status
  async getStatus() {
    const response = await axios.get(
      `${API_URL}/api/integrations/spotify/status`,
      createAuthHeaders()
    );
    return response.data;
  },

  // Disconnect integration
  async disconnect() {
    const response = await axios.delete(
      `${API_URL}/api/integrations/auth/spotify`,
      createAuthHeaders()
    );
    return response.data;
  },

  // Get user playlists
  async getPlaylists(limit = 50, offset = 0) {
    const response = await axios.get(
      `${API_URL}/api/integrations/spotify/playlists`,
      {
        ...createAuthHeaders(),
        params: { limit, offset }
      }
    );
    return response.data.playlists;
  },

  // Get playlist tracks
  async getPlaylistTracks(playlistId) {
    const response = await axios.get(
      `${API_URL}/api/integrations/spotify/playlists/${playlistId}/tracks`,
      createAuthHeaders()
    );
    return response.data.tracks;
  },

  // Search tracks
  async searchTracks(query, limit = 20) {
    const response = await axios.get(
      `${API_URL}/api/integrations/spotify/search`,
      {
        ...createAuthHeaders(),
        params: { q: query, limit }
      }
    );
    return response.data.tracks;
  },

  // Get track details
  async getTrack(trackId) {
    const response = await axios.get(
      `${API_URL}/api/integrations/spotify/tracks/${trackId}`,
      createAuthHeaders()
    );
    return response.data.track;
  }
};

/**
 * YouTube Integration
 */
export const youtube = {
  // Search videos
  async searchVideos(query, maxResults = 25) {
    const response = await axios.get(
      `${API_URL}/api/integrations/youtube/search`,
      {
        ...createAuthHeaders(),
        params: { q: query, maxResults }
      }
    );
    return response.data.videos;
  },

  // Get video details
  async getVideo(videoId) {
    const response = await axios.get(
      `${API_URL}/api/integrations/youtube/videos/${videoId}`,
      createAuthHeaders()
    );
    return response.data.video;
  },

  // Get playlist details
  async getPlaylist(playlistId) {
    const response = await axios.get(
      `${API_URL}/api/integrations/youtube/playlists/${playlistId}`,
      createAuthHeaders()
    );
    return response.data.playlist;
  },

  // Get playlist items
  async getPlaylistItems(playlistId, maxResults = 50) {
    const response = await axios.get(
      `${API_URL}/api/integrations/youtube/playlists/${playlistId}/items`,
      {
        ...createAuthHeaders(),
        params: { maxResults }
      }
    );
    return response.data.items;
  }
};

/**
 * Apple Music Integration
 */
export const appleMusic = {
  // Save user token (obtained from MusicKit JS)
  async saveToken(userToken, storefront = 'us') {
    const response = await axios.post(
      `${API_URL}/api/integrations/auth/apple-music`,
      { userToken, storefront },
      createAuthHeaders()
    );
    return response.data;
  },

  // Check connection status
  async getStatus() {
    const response = await axios.get(
      `${API_URL}/api/integrations/apple-music/status`,
      createAuthHeaders()
    );
    return response.data;
  },

  // Disconnect integration
  async disconnect() {
    const response = await axios.delete(
      `${API_URL}/api/integrations/auth/apple-music`,
      createAuthHeaders()
    );
    return response.data;
  },

  // Get developer token
  async getDeveloperToken() {
    const response = await axios.get(
      `${API_URL}/api/integrations/apple-music/developer-token`,
      createAuthHeaders()
    );
    return response.data.developerToken;
  },

  // Search catalog
  async searchCatalog(query, storefront = 'us', limit = 25) {
    const response = await axios.get(
      `${API_URL}/api/integrations/apple-music/search`,
      {
        ...createAuthHeaders(),
        params: { q: query, storefront, limit }
      }
    );
    return response.data.tracks;
  },

  // Get user playlists
  async getPlaylists() {
    const response = await axios.get(
      `${API_URL}/api/integrations/apple-music/playlists`,
      createAuthHeaders()
    );
    return response.data.playlists;
  },

  // Get playlist tracks
  async getPlaylistTracks(playlistId, storefront = 'us') {
    const response = await axios.get(
      `${API_URL}/api/integrations/apple-music/playlists/${playlistId}/tracks`,
      {
        ...createAuthHeaders(),
        params: { storefront }
      }
    );
    return response.data.tracks;
  },

  // Get track details
  async getTrack(trackId, storefront = 'us') {
    const response = await axios.get(
      `${API_URL}/api/integrations/apple-music/tracks/${trackId}`,
      {
        ...createAuthHeaders(),
        params: { storefront }
      }
    );
    return response.data.track;
  }
};

/**
 * General integration functions
 */
export const integrations = {
  // Get all integration statuses
  async getAllStatuses() {
    try {
      const [spotifyStatus, appleMusicStatus] = await Promise.allSettled([
        spotify.getStatus(),
        appleMusic.getStatus()
      ]);

      return {
        spotify: spotifyStatus.status === 'fulfilled' ? spotifyStatus.value : { connected: false },
        appleMusic: appleMusicStatus.status === 'fulfilled' ? appleMusicStatus.value : { connected: false },
        youtube: { connected: true } // YouTube doesn't require connection
      };
    } catch (error) {
      console.error('Error getting integration statuses:', error);
      return {
        spotify: { connected: false },
        appleMusic: { connected: false },
        youtube: { connected: true }
      };
    }
  }
};

export default {
  spotify,
  youtube,
  appleMusic,
  integrations
};
