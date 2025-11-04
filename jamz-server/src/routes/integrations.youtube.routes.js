const express = require('express');
const router = express.Router();
const youtubeService = require('../services/youtube.service');
const { authenticateToken } = require('../middleware/auth');

/**
 * YouTube Integration Routes
 * Note: YouTube doesn't require OAuth for public data
 */

// Search YouTube videos
router.get('/youtube/search', authenticateToken, async (req, res) => {
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

// Get YouTube video details
router.get('/youtube/videos/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const video = await youtubeService.getVideo(videoId);
    
    res.json({ video });
  } catch (error) {
    console.error('Error getting YouTube video:', error);
    res.status(500).json({ error: error.message || 'Failed to get video' });
  }
});

// Get YouTube playlist details
router.get('/youtube/playlists/:playlistId', authenticateToken, async (req, res) => {
  try {
    const { playlistId } = req.params;
    
    const playlist = await youtubeService.getPlaylist(playlistId);
    
    res.json({ playlist });
  } catch (error) {
    console.error('Error getting YouTube playlist:', error);
    res.status(500).json({ error: error.message || 'Failed to get playlist' });
  }
});

// Get YouTube playlist items
router.get('/youtube/playlists/:playlistId/items', authenticateToken, async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { maxResults = 50 } = req.query;
    
    const items = await youtubeService.getPlaylistItems(playlistId, parseInt(maxResults));
    
    res.json({ items });
  } catch (error) {
    console.error('Error getting YouTube playlist items:', error);
    res.status(500).json({ error: error.message || 'Failed to get playlist items' });
  }
});

module.exports = router;
