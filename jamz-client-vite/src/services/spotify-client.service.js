/**
 * Client-side Spotify Service
 * Uses Spotify Web API with PKCE (no backend required)
 */

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || 'f8c4e1d2b3a4f5e6d7c8b9a0f1e2d3c4'; // Replace with your Spotify app's client ID
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

class SpotifyClientService {
  constructor() {
    this.accessToken = localStorage.getItem('spotify_access_token');
    this.refreshToken = localStorage.getItem('spotify_refresh_token');
    this.tokenExpiry = localStorage.getItem('spotify_token_expiry');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    // Always read fresh values from localStorage
    const token = localStorage.getItem('spotify_access_token');
    const expiry = localStorage.getItem('spotify_token_expiry');
    
    if (!token || !expiry) {
      return false;
    }
    
    const isValid = Date.now() < parseInt(expiry);
    console.log('🔐 [Spotify] isAuthenticated check:', {
      hasToken: !!token,
      expiry: new Date(parseInt(expiry)).toISOString(),
      now: new Date().toISOString(),
      isValid
    });
    
    return isValid;
  }

  /**
   * Initiate OAuth flow
   */
  async authorize() {
    const redirectUri = 'https://jamz.v2u.us/auth/spotify/callback';
    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'playlist-read-collaborative',
      'user-library-read'
    ].join(' ');
    
    const codeVerifier = this.generateRandomString(128);
    localStorage.setItem('spotify_code_verifier', codeVerifier);
    
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.append('client_id', SPOTIFY_CLIENT_ID);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', scopes);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('code_challenge', codeChallenge);
    
    window.location.href = authUrl.toString();
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(code) {
    try {
      const codeVerifier = localStorage.getItem('spotify_code_verifier');
      
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: SPOTIFY_CLIENT_ID,
          grant_type: 'authorization_code',
          code,
          redirect_uri: 'https://jamz.v2u.us/auth/spotify/callback',
          code_verifier: codeVerifier,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get access token');
      }

      const data = await response.json();
      
      // Store tokens
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);
      
      localStorage.setItem('spotify_access_token', this.accessToken);
      localStorage.setItem('spotify_refresh_token', this.refreshToken);
      localStorage.setItem('spotify_token_expiry', this.tokenExpiry.toString());
      localStorage.removeItem('spotify_code_verifier');
      
      return true;
    } catch (error) {
      console.error('Error handling Spotify callback:', error);
      return false;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: SPOTIFY_CLIENT_ID,
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
      
      localStorage.setItem('spotify_access_token', this.accessToken);
      localStorage.setItem('spotify_token_expiry', this.tokenExpiry.toString());
      
      return true;
    } catch (error) {
      console.error('Error refreshing Spotify token:', error);
      this.logout();
      return false;
    }
  }

  /**
   * Make authenticated API request
   */
  async makeRequest(endpoint, options = {}) {
    // Read fresh token from localStorage
    const accessToken = localStorage.getItem('spotify_access_token');
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    
    if (!this.isAuthenticated()) {
      if (refreshToken) {
        await this.refreshAccessToken();
      } else {
        throw new Error('Not authenticated');
      }
    }

    const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired, try refresh
      if (await this.refreshAccessToken()) {
        // Retry request
        return this.makeRequest(endpoint, options);
      }
      throw new Error('Authentication failed');
    }

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get user's playlists
   */
  async getPlaylists(limit = 50, offset = 0) {
    try {
      console.log('🎵 [Spotify] Fetching playlists...');
      const data = await this.makeRequest(`/me/playlists?limit=${limit}&offset=${offset}`);
      console.log('🎵 [Spotify] Raw response:', data);
      console.log('🎵 [Spotify] Number of playlists:', data.items?.length || 0);
      
      if (!data.items || data.items.length === 0) {
        console.log('⚠️ [Spotify] No playlists in response');
        return [];
      }
      
      const playlists = data.items.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        owner: playlist.owner.display_name,
        tracksCount: playlist.tracks.total,
        images: playlist.images,
        externalUrl: playlist.external_urls.spotify,
      }));
      
      console.log('🎵 [Spotify] Mapped playlists:', playlists);
      return playlists;
    } catch (error) {
      console.error('❌ [Spotify] Error fetching playlists:', error);
      throw error;
    }
  }

  /**
   * Get playlist tracks
   */
  async getPlaylistTracks(playlistId) {
    let allTracks = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const data = await this.makeRequest(
        `/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}&fields=items(track(id,name,artists,album,duration_ms,preview_url)),next`
      );

      const tracks = data.items
        .filter(item => item.track)
        .map(item => ({
          source: 'spotify',
          id: item.track.id,
          spotifyId: item.track.id,
          title: item.track.name,
          artist: item.track.artists.map(a => a.name).join(', '),
          album: item.track.album.name,
          duration: Math.floor(item.track.duration_ms / 1000),
          albumArt: item.track.album.images[0]?.url || null,
          previewUrl: item.track.preview_url,
        }));

      allTracks = allTracks.concat(tracks);
      hasMore = !!data.next;
      offset += limit;
    }

    return allTracks;
  }

  /**
   * Search tracks
   */
  async searchTracks(query, limit = 20) {
    const data = await this.makeRequest(
      `/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`
    );

    return data.tracks.items.map(track => ({
      source: 'spotify',
      id: track.id,
      spotifyId: track.id,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      duration: Math.floor(track.duration_ms / 1000),
      albumArt: track.album.images[0]?.url || null,
      previewUrl: track.preview_url,
    }));
  }

  /**
   * Logout
   */
  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expiry');
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

export default new SpotifyClientService();
