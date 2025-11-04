const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const spotifyService = require('../services/spotify.service');
const UserIntegration = require('../models/user-integration.model');
const { authenticateToken } = require('../middleware/auth');

/**
 * Spotify OAuth Routes
 */

// Initiate Spotify OAuth flow
router.get('/auth/spotify', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    
    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store state in session or temporary cache (you may want to use Redis)
    req.session = req.session || {};
    req.session.spotifyState = state;
    req.session.userId = userId;
    
    const authUrl = spotifyService.getAuthorizationUrl(state);
    
    res.json({ authUrl });
  } catch (error) {
    console.error('Error initiating Spotify auth:', error);
    res.status(500).json({ error: 'Failed to initiate Spotify authentication' });
  }
});

// Spotify OAuth callback
router.get('/auth/spotify/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    // Check for OAuth error
    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=${error}`);
    }
    
    // Verify state to prevent CSRF
    if (!req.session || req.session.spotifyState !== state) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=invalid_state`);
    }
    
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=no_user`);
    }
    
    // Exchange code for tokens
    const tokenData = await spotifyService.getAccessToken(code);
    
    // Get user profile from Spotify
    const profile = await spotifyService.getUserProfile(tokenData.accessToken);
    
    // Save or update integration
    await UserIntegration.findOneAndUpdate(
      { userId, platform: 'spotify' },
      {
        userId,
        platform: 'spotify',
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: new Date(Date.now() + tokenData.expiresIn * 1000),
        scope: tokenData.scope ? tokenData.scope.split(' ') : [],
        platformUserId: profile.id,
        platformUserName: profile.displayName
      },
      { upsert: true, new: true }
    );
    
    // Clear session state
    delete req.session.spotifyState;
    delete req.session.userId;
    
    // Redirect back to frontend
    res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?success=spotify`);
  } catch (error) {
    console.error('Error in Spotify callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=auth_failed`);
  }
});

// Refresh Spotify access token
router.post('/auth/spotify/refresh', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const integration = await UserIntegration.findOne({
      userId,
      platform: 'spotify'
    });
    
    if (!integration) {
      return res.status(404).json({ error: 'No Spotify integration found' });
    }
    
    const newTokenData = await spotifyService.refreshAccessToken(integration.refreshToken);
    
    integration.accessToken = newTokenData.accessToken;
    integration.expiresAt = new Date(Date.now() + newTokenData.expiresIn * 1000);
    await integration.save();
    
    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing Spotify token:', error);
    res.status(500).json({ error: 'Failed to refresh Spotify token' });
  }
});

// Disconnect Spotify integration
router.delete('/auth/spotify', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await UserIntegration.deleteOne({ userId, platform: 'spotify' });
    
    res.json({ message: 'Spotify integration disconnected' });
  } catch (error) {
    console.error('Error disconnecting Spotify:', error);
    res.status(500).json({ error: 'Failed to disconnect Spotify' });
  }
});

/**
 * Spotify Data Routes
 */

// Get user's Spotify playlists
router.get('/spotify/playlists', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;
    
    const playlists = await spotifyService.getUserPlaylists(
      userId,
      parseInt(limit),
      parseInt(offset)
    );
    
    res.json({ playlists });
  } catch (error) {
    console.error('Error getting Spotify playlists:', error);
    res.status(500).json({ error: error.message || 'Failed to get Spotify playlists' });
  }
});

// Get tracks from a Spotify playlist
router.get('/spotify/playlists/:playlistId/tracks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { playlistId } = req.params;
    
    const tracks = await spotifyService.getPlaylistTracks(userId, playlistId);
    
    res.json({ tracks });
  } catch (error) {
    console.error('Error getting Spotify playlist tracks:', error);
    res.status(500).json({ error: error.message || 'Failed to get playlist tracks' });
  }
});

// Search Spotify tracks
router.get('/spotify/search', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { q, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const tracks = await spotifyService.searchTracks(userId, q, parseInt(limit));
    
    res.json({ tracks });
  } catch (error) {
    console.error('Error searching Spotify:', error);
    res.status(500).json({ error: error.message || 'Failed to search Spotify' });
  }
});

// Get Spotify track details
router.get('/spotify/tracks/:trackId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { trackId } = req.params;
    
    const track = await spotifyService.getTrack(userId, trackId);
    
    res.json({ track });
  } catch (error) {
    console.error('Error getting Spotify track:', error);
    res.status(500).json({ error: error.message || 'Failed to get track' });
  }
});

// Check Spotify integration status
router.get('/spotify/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const integration = await UserIntegration.findOne({
      userId,
      platform: 'spotify'
    });
    
    if (!integration) {
      return res.json({ connected: false });
    }
    
    res.json({
      connected: true,
      userName: integration.platformUserName,
      expiresAt: integration.expiresAt,
      isExpired: integration.isExpired()
    });
  } catch (error) {
    console.error('Error checking Spotify status:', error);
    res.status(500).json({ error: 'Failed to check Spotify status' });
  }
});

module.exports = router;
