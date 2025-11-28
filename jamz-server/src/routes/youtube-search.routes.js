const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

/**
 * Search YouTube for alternative videos
 * GET /api/music/search/youtube?q=search+term&limit=5
 */
router.get('/search/youtube',
  auth,
  async (req, res) => {
    try {
      const { q, limit = 5 } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query required'
        });
      }

      const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
      
      if (!YOUTUBE_API_KEY) {
        return res.status(500).json({
          success: false,
          message: 'YouTube API not configured'
        });
      }

      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=${limit}&key=${YOUTUBE_API_KEY}`;
      
      const response = await fetch(searchUrl);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'YouTube API error');
      }

      const results = data.items.map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        publishedAt: item.snippet.publishedAt
      }));

      res.json({
        success: true,
        results
      });
    } catch (error) {
      console.error('YouTube search error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to search YouTube'
      });
    }
  }
);

module.exports = router;
