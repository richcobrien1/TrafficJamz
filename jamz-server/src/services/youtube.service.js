const { google } = require('googleapis');

/**
 * YouTube Integration Service
 * Handles YouTube Data API interactions for music discovery
 */
class YouTubeService {
  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });
  }

  /**
   * Search for music videos
   * @param {string} query - Search query
   * @param {number} maxResults - Number of results (default: 25)
   * @returns {Promise<Array>} Search results
   */
  async searchVideos(query, maxResults = 25) {
    try {
      const response = await this.youtube.search.list({
        part: 'snippet',
        q: query,
        type: 'video',
        videoCategoryId: '10', // Music category
        maxResults,
        order: 'relevance'
      });

      const videoIds = response.data.items.map(item => item.id.videoId).join(',');
      
      // Get video details including duration
      const detailsResponse = await this.youtube.videos.list({
        part: 'contentDetails,snippet',
        id: videoIds
      });

      return detailsResponse.data.items.map(video => this.formatVideo(video));
    } catch (error) {
      console.error('Error searching YouTube videos:', error);
      throw new Error('Failed to search YouTube videos');
    }
  }

  /**
   * Get video details
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} Video details
   */
  async getVideo(videoId) {
    try {
      const response = await this.youtube.videos.list({
        part: 'snippet,contentDetails',
        id: videoId
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Video not found');
      }

      return this.formatVideo(response.data.items[0]);
    } catch (error) {
      console.error('Error getting YouTube video:', error);
      throw new Error('Failed to get YouTube video');
    }
  }

  /**
   * Get playlist details
   * @param {string} playlistId - YouTube playlist ID
   * @returns {Promise<Object>} Playlist details
   */
  async getPlaylist(playlistId) {
    try {
      const response = await this.youtube.playlists.list({
        part: 'snippet,contentDetails',
        id: playlistId
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Playlist not found');
      }

      const playlist = response.data.items[0];
      return {
        id: playlist.id,
        name: playlist.snippet.title,
        description: playlist.snippet.description,
        thumbnail: playlist.snippet.thumbnails.high?.url || playlist.snippet.thumbnails.default.url,
        channelTitle: playlist.snippet.channelTitle,
        itemCount: playlist.contentDetails.itemCount
      };
    } catch (error) {
      console.error('Error getting YouTube playlist:', error);
      throw new Error('Failed to get YouTube playlist');
    }
  }

  /**
   * Get tracks from a playlist
   * @param {string} playlistId - YouTube playlist ID
   * @param {number} maxResults - Max items to fetch (default: 50)
   * @returns {Promise<Array>} Playlist items
   */
  async getPlaylistItems(playlistId, maxResults = 50) {
    try {
      let allItems = [];
      let nextPageToken = null;

      do {
        const response = await this.youtube.playlistItems.list({
          part: 'snippet,contentDetails',
          playlistId,
          maxResults: Math.min(maxResults - allItems.length, 50),
          pageToken: nextPageToken
        });

        const videoIds = response.data.items
          .map(item => item.contentDetails.videoId)
          .join(',');

        // Get video durations
        const detailsResponse = await this.youtube.videos.list({
          part: 'contentDetails,snippet',
          id: videoIds
        });

        const formattedItems = detailsResponse.data.items.map(video => this.formatVideo(video));
        allItems = allItems.concat(formattedItems);

        nextPageToken = response.data.nextPageToken;
      } while (nextPageToken && allItems.length < maxResults);

      return allItems;
    } catch (error) {
      console.error('Error getting YouTube playlist items:', error);
      throw new Error('Failed to get YouTube playlist items');
    }
  }

  /**
   * Parse ISO 8601 duration to seconds
   * @param {string} duration - ISO 8601 duration (e.g., PT4M20S)
   * @returns {number} Duration in seconds
   */
  parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Format YouTube video for Jamz
   * @param {Object} video - Raw YouTube video object
   * @returns {Object} Formatted track
   */
  formatVideo(video) {
    const duration = this.parseDuration(video.contentDetails.duration);
    const title = video.snippet.title;
    
    // Try to extract artist and song from title (format: "Artist - Song Title")
    let artist = video.snippet.channelTitle;
    let songTitle = title;
    
    const dashIndex = title.indexOf(' - ');
    if (dashIndex > 0) {
      artist = title.substring(0, dashIndex).trim();
      songTitle = title.substring(dashIndex + 3).trim();
    }

    return {
      source: 'youtube',
      youtubeId: video.id,
      youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
      title: songTitle,
      artist: artist,
      album: '', // YouTube doesn't provide album info
      duration,
      albumArt: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
      externalUrl: `https://www.youtube.com/watch?v=${video.id}`
    };
  }
}

module.exports = new YouTubeService();
