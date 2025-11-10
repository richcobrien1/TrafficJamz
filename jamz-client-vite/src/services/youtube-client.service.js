/**
 * Client-side YouTube Music Service
 * Uses YouTube Data API v3 with OAuth 2.0
 */

const YOUTUBE_CLIENT_ID = import.meta.env.VITE_YOUTUBE_CLIENT_ID || 'YOUR_YOUTUBE_CLIENT_ID';
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

class YouTubeClientService {
  constructor() {
    this.accessToken = localStorage.getItem('youtube_access_token');
    this.refreshToken = localStorage.getItem('youtube_refresh_token');
    this.tokenExpiry = localStorage.getItem('youtube_token_expiry');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.accessToken && Date.now() < parseInt(this.tokenExpiry);
  }

  /**
   * Initiate OAuth flow
   */
  async authorize() {
    const redirectUri = 'https://jamz.v2u.us/auth/youtube/callback';
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly'
    ].join(' ');
    
    const codeVerifier = this.generateRandomString(128);
    localStorage.setItem('youtube_code_verifier', codeVerifier);
    
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', YOUTUBE_CLIENT_ID);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', scopes);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    
    window.location.href = authUrl.toString();
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(code) {
    try {
      const codeVerifier = localStorage.getItem('youtube_code_verifier');
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: YOUTUBE_CLIENT_ID,
          grant_type: 'authorization_code',
          code,
          redirect_uri: 'https://jamz.v2u.us/auth/youtube/callback',
          code_verifier: codeVerifier,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get access token');
      }

      const data = await response.json();
      
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);
      
      localStorage.setItem('youtube_access_token', this.accessToken);
      localStorage.setItem('youtube_refresh_token', this.refreshToken);
      localStorage.setItem('youtube_token_expiry', this.tokenExpiry.toString());
      localStorage.removeItem('youtube_code_verifier');
      
      return true;
    } catch (error) {
      console.error('Error handling YouTube callback:', error);
      return false;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: YOUTUBE_CLIENT_ID,
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);
      
      localStorage.setItem('youtube_access_token', this.accessToken);
      localStorage.setItem('youtube_token_expiry', this.tokenExpiry.toString());
      
      return true;
    } catch (error) {
      console.error('Error refreshing YouTube token:', error);
      this.logout();
      return false;
    }
  }

  /**
   * Make authenticated API request
   */
  async makeRequest(endpoint, params = {}) {
    if (!this.isAuthenticated()) {
      if (this.refreshToken) {
        await this.refreshAccessToken();
      } else {
        throw new Error('Not authenticated');
      }
    }

    const url = new URL(`${YOUTUBE_API_BASE}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (response.status === 401) {
      if (await this.refreshAccessToken()) {
        return this.makeRequest(endpoint, params);
      }
      throw new Error('Authentication failed');
    }

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get user's playlists
   */
  async getPlaylists() {
    try {
      const data = await this.makeRequest('/playlists', {
        part: 'snippet,contentDetails',
        mine: true,
        maxResults: 50
      });

      return data.items.map(playlist => ({
        id: playlist.id,
        name: playlist.snippet.title,
        description: playlist.snippet.description,
        tracksCount: playlist.contentDetails.itemCount,
        thumbnail: playlist.snippet.thumbnails?.medium?.url,
        externalUrl: `https://www.youtube.com/playlist?list=${playlist.id}`
      }));
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
      let allTracks = [];
      let pageToken = null;

      do {
        const params = {
          part: 'snippet,contentDetails',
          playlistId: playlistId,
          maxResults: 50
        };
        
        if (pageToken) {
          params.pageToken = pageToken;
        }

        const data = await this.makeRequest('/playlistItems', params);

        const tracks = data.items
          .filter(item => item.snippet.title !== 'Deleted video')
          .map(item => ({
            source: 'youtube',
            id: item.contentDetails.videoId,
            youtubeId: item.contentDetails.videoId,
            title: item.snippet.title,
            artist: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
            album: '',
            duration: 0, // YouTube API doesn't provide duration in playlist items
            albumArt: item.snippet.thumbnails?.medium?.url,
            previewUrl: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`
          }));

        allTracks = allTracks.concat(tracks);
        pageToken = data.nextPageToken;
      } while (pageToken);

      return allTracks;
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
      const data = await this.makeRequest('/search', {
        part: 'snippet',
        q: query,
        type: 'video',
        videoCategoryId: '10', // Music category
        maxResults: limit
      });

      return data.items.map(item => ({
        source: 'youtube',
        id: item.id.videoId,
        youtubeId: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        album: '',
        duration: 0,
        albumArt: item.snippet.thumbnails?.medium?.url,
        previewUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`
      }));
    } catch (error) {
      console.error('Error searching YouTube:', error);
      throw error;
    }
  }

  /**
   * Logout
   */
  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    localStorage.removeItem('youtube_access_token');
    localStorage.removeItem('youtube_refresh_token');
    localStorage.removeItem('youtube_token_expiry');
  }

  /**
   * Generate random string for PKCE
   */
  generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], '');
  }

  /**
   * Generate code challenge for PKCE
   */
  async generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
}

export default new YouTubeClientService();
