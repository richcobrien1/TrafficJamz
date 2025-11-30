const express = require('express');
const router = express.Router();
const passport = require('passport');

/**
 * Search YouTube for alternative videos
 * GET /api/music/search/youtube?q=search+term&limit=5
 */
router.get('/search/youtube',
  passport.authenticate('jwt', { session: false }),
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
        const errorMsg = data.error?.message || 'YouTube API error';
        console.error('YouTube API error response:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          message: errorMsg
        });
        throw new Error(errorMsg);
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
      
      // Provide helpful error message
      let userMessage = 'Failed to search YouTube';
      if (error.message && error.message.includes('API key')) {
        userMessage = 'YouTube API key is invalid or expired. Please contact support.';
      }
      
      res.status(500).json({
        success: false,
        message: userMessage,
        details: error.message
      });
    }
  }
);

module.exports = router;
