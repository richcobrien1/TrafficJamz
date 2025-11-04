const express = require('express');
const router = express.Router();
const passport = require('passport');
const appleMusicService = require('../services/apple-music.service');
const UserIntegration = require('../models/user-integration.model');

/**
 * Apple Music Integration Routes
 */

// Save user's Apple Music token (obtained from MusicKit JS on frontend)
router.post('/auth/apple-music', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.id;
    const { userToken, storefront } = req.body;
    
    if (!userToken) {
      return res.status(400).json({ error: 'User token required' });
    }
    
    // Save or update integration
    // Note: Apple Music user tokens expire after 6 months
    const expiresAt = new Date(Date.now() + 15777000000); // 6 months
    
    await UserIntegration.findOneAndUpdate(
      { userId, platform: 'apple_music' },
      {
        userId,
        platform: 'apple_music',
        accessToken: userToken,
        expiresAt,
        platformUserId: storefront || 'us'
      },
      { upsert: true, new: true }
    );
    
    res.json({ message: 'Apple Music connected successfully' });
  } catch (error) {
    console.error('Error saving Apple Music token:', error);
    res.status(500).json({ error: 'Failed to save Apple Music token' });
  }
});

// Disconnect Apple Music integration
router.delete('/auth/apple-music', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.id;
    
    await UserIntegration.deleteOne({ userId, platform: 'apple_music' });
    
    res.json({ message: 'Apple Music integration disconnected' });
  } catch (error) {
    console.error('Error disconnecting Apple Music:', error);
    res.status(500).json({ error: 'Failed to disconnect Apple Music' });
  }
});

// Get Apple Music developer token (for MusicKit JS initialization)
router.get('/apple-music/developer-token', passport.authenticate('jwt', { session: false }), (req, res) => {
  try {
    const developerToken = appleMusicService.generateDeveloperToken();
    res.json({ developerToken });
  } catch (error) {
    console.error('Error generating Apple Music developer token:', error);
    res.status(500).json({ error: 'Failed to generate developer token' });
  }
});

// Search Apple Music catalog
router.get('/apple-music/search', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { q, storefront = 'us', limit = 25 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const tracks = await appleMusicService.searchCatalog(q, storefront, parseInt(limit));
    
    res.json({ tracks });
  } catch (error) {
    console.error('Error searching Apple Music:', error);
    res.status(500).json({ error: error.message || 'Failed to search Apple Music' });
  }
});

// Get user's Apple Music playlists (requires user token)
router.get('/apple-music/playlists', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.id;
    
    const integration = await UserIntegration.findOne({
      userId,
      platform: 'apple_music'
    });
    
    if (!integration) {
      return res.status(404).json({ error: 'No Apple Music integration found' });
    }
    
    const playlists = await appleMusicService.getUserPlaylists(integration.accessToken);
    
    res.json({ playlists });
  } catch (error) {
    console.error('Error getting Apple Music playlists:', error);
    res.status(500).json({ error: error.message || 'Failed to get playlists' });
  }
});

// Get Apple Music playlist tracks
router.get('/apple-music/playlists/:playlistId/tracks', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.id;
    const { playlistId } = req.params;
    const { storefront = 'us' } = req.query;
    
    // Get user token if available (for library playlists)
    const integration = await UserIntegration.findOne({
      userId,
      platform: 'apple_music'
    });
    
    const userToken = integration?.accessToken || null;
    const tracks = await appleMusicService.getPlaylistTracks(playlistId, storefront, userToken);
    
    res.json({ tracks });
  } catch (error) {
    console.error('Error getting Apple Music playlist tracks:', error);
    res.status(500).json({ error: error.message || 'Failed to get playlist tracks' });
  }
});

// Get Apple Music track details
router.get('/apple-music/tracks/:trackId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { trackId } = req.params;
    const { storefront = 'us' } = req.query;
    
    const track = await appleMusicService.getTrack(trackId, storefront);
    
    res.json({ track });
  } catch (error) {
    console.error('Error getting Apple Music track:', error);
    res.status(500).json({ error: error.message || 'Failed to get track' });
  }
});

// Check Apple Music integration status
router.get('/apple-music/status', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.id;
    
    const integration = await UserIntegration.findOne({
      userId,
      platform: 'apple_music'
    });
    
    if (!integration) {
      return res.json({ connected: false });
    }
    
    res.json({
      connected: true,
      storefront: integration.platformUserId,
      expiresAt: integration.expiresAt,
      isExpired: integration.isExpired()
    });
  } catch (error) {
    console.error('Error checking Apple Music status:', error);
    res.status(500).json({ error: 'Failed to check Apple Music status' });
  }
});

module.exports = router;
