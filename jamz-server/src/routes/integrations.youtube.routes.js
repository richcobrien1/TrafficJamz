const express = require('express');
const router = express.Router();
const passport = require('passport');
const crypto = require('crypto');
const axios = require('axios');
const youtubeService = require('../services/youtube.service');
const UserIntegration = require('../models/user-integration.model');

/**
 * YouTube Integration Routes
 */

// Initiate YouTube OAuth flow
router.get('/auth/youtube', passport.authenticate('jwt', { session: false }), (req, res) => {
  try {
    const userId = req.user.id;
    
    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store state in session
    req.session = req.session || {};
    req.session.youtubeState = state;
    req.session.userId = userId;
    
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const redirectUri = `${process.env.FRONTEND_URL}/auth/youtube/callback`;
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly'
    ].join(' ');
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    
    res.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('Error initiating YouTube auth:', error);
    res.status(500).json({ error: 'Failed to initiate YouTube authentication' });
  }
});

// YouTube OAuth callback - exchanges code for tokens
router.post('/auth/youtube/callback', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }
    
    // Exchange authorization code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      redirect_uri: `${process.env.FRONTEND_URL}/auth/youtube/callback`,
      grant_type: 'authorization_code'
    });
    
    const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;
    
    // Save or update integration
    await UserIntegration.findOneAndUpdate(
      { userId, platform: 'youtube' },
      {
        userId,
        platform: 'youtube',
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        scope: scope ? scope.split(' ') : []
      },
      { upsert: true, new: true }
    );
    
    res.json({ success: true, message: 'YouTube connected successfully' });
  } catch (error) {
    console.error('Error in YouTube callback:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to complete YouTube authentication' });
  }
});

// Check YouTube integration status
router.get('/youtube/status', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.id;
    
    const integration = await UserIntegration.findOne({
      userId,
      platform: 'youtube'
    });
    
    if (!integration) {
      return res.json({ connected: false });
    }
    
    res.json({
      connected: true,
      expiresAt: integration.expiresAt,
      isExpired: integration.isExpired()
    });
  } catch (error) {
    console.error('Error checking YouTube status:', error);
    res.status(500).json({ error: 'Failed to check YouTube status' });
  }
});

// Disconnect YouTube integration
router.delete('/auth/youtube', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.id;
    
    await UserIntegration.deleteOne({ userId, platform: 'youtube' });
    
    res.json({ message: 'YouTube integration disconnected' });
  } catch (error) {
    console.error('Error disconnecting YouTube:', error);
    res.status(500).json({ error: 'Failed to disconnect YouTube' });
  }
});

// Search YouTube videos
router.get('/youtube/search', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { q, maxResults = 25 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const videos = await youtubeService.searchVideos(q, parseInt(maxResults));
    
    res.json({ videos });
  } catch (error) {
    console.error('Error searching YouTube:', error);
    res.status(500).json({ error: error.message || 'Failed to search YouTube' });
  }
});

// Get user's YouTube playlists (requires OAuth)
router.get('/youtube/playlists', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.id;
    
    const integration = await UserIntegration.findOne({
      userId,
      platform: 'youtube'
    });
    
    if (!integration) {
      return res.status(404).json({ error: 'No YouTube integration found. Please connect your YouTube account first.' });
    }
    
    // Use the YouTube Data API with user's access token
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: integration.accessToken });
    
    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });
    
    const response = await youtube.playlists.list({
      part: 'snippet,contentDetails',
      mine: true,
      maxResults: 50
    });
    
    const playlists = response.data.items.map(playlist => ({
      id: playlist.id,
      name: playlist.snippet.title,
      description: playlist.snippet.description,
      tracksCount: playlist.contentDetails.itemCount,
      thumbnail: playlist.snippet.thumbnails?.medium?.url,
      externalUrl: `https://www.youtube.com/playlist?list=${playlist.id}`
    }));
    
    res.json({ playlists });
  } catch (error) {
    console.error('Error getting YouTube playlists:', error);
    res.status(500).json({ error: error.message || 'Failed to get YouTube playlists' });
  }
});

// Get user's YouTube playlist tracks (requires OAuth)
router.get('/youtube/playlists/:playlistId/tracks', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.id;
    const { playlistId } = req.params;
    
    const integration = await UserIntegration.findOne({
      userId,
      platform: 'youtube'
    });
    
    if (!integration) {
      return res.status(404).json({ error: 'No YouTube integration found' });
    }
    
    // Use the YouTube Data API with user's access token
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: integration.accessToken });
    
    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });
    
    const items = await youtubeService.getPlaylistItems(playlistId, 50);
    
    res.json({ tracks: items });
  } catch (error) {
    console.error('Error getting YouTube playlist tracks:', error);
    res.status(500).json({ error: error.message || 'Failed to get playlist tracks' });
  }
});

// Get YouTube video details
router.get('/youtube/videos/:videoId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const video = await youtubeService.getVideo(videoId);
    
    res.json({ video });
  } catch (error) {
    console.error('Error getting YouTube video:', error);
    res.status(500).json({ error: error.message || 'Failed to get video' });
  }
});

module.exports = router;
