// social-avatar.service.js
// Service for fetching and managing social media avatars

const axios = require('axios');

class SocialAvatarService {
  /**
   * Get avatar URL from Facebook
   * @param {string} accessToken - Facebook access token
   * @param {string} userId - Facebook user ID
   * @returns {Promise<string|null>} - Avatar URL or null
   */
  async getFacebookAvatar(accessToken, userId) {
    try {
      const response = await axios.get(`https://graph.facebook.com/${userId}/picture`, {
        params: {
          access_token: accessToken,
          type: 'large',
          redirect: false
        }
      });

      if (response.data && response.data.data && response.data.data.url) {
        return response.data.data.url;
      }

      return null;
    } catch (error) {
      console.error('Facebook avatar fetch error:', error.message);
      return null;
    }
  }

  /**
   * Get avatar URL from LinkedIn
   * @param {string} accessToken - LinkedIn access token
   * @returns {Promise<string|null>} - Avatar URL or null
   */
  async getLinkedInAvatar(accessToken) {
    try {
      const response = await axios.get('https://api.linkedin.com/v2/people/~:(profilePicture(displayImage~:playableStreams))', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      if (response.data && response.data.profilePicture && response.data.profilePicture.displayImage) {
        // Get the highest resolution image
        const images = response.data.profilePicture.displayImage;
        if (images.length > 0) {
          return images[images.length - 1].data['com.linkedin.digitalmedia.mediaartifact.StillImage'].storageSize.large.url;
        }
      }

      return null;
    } catch (error) {
      console.error('LinkedIn avatar fetch error:', error.message);
      return null;
    }
  }

  /**
   * Get avatar URL from X (Twitter)
   * @param {string} accessToken - X access token
   * @param {string} accessTokenSecret - X access token secret
   * @param {string} userId - X user ID
   * @returns {Promise<string|null>} - Avatar URL or null
   */
  async getXAvatar(accessToken, accessTokenSecret, userId) {
    try {
      // For X/Twitter, we can use the profile data stored during auth
      // The avatar URL is typically available in the profile data
      // For now, return null as we need to implement proper OAuth 2.0 for X
      console.log('X avatar fetching not yet implemented - needs OAuth 2.0 setup');
      return null;
    } catch (error) {
      console.error('X avatar fetch error:', error.message);
      return null;
    }
  }

  /**
   * Get all available social avatars for a user
   * @param {Object} socialAccounts - User's social accounts data
   * @returns {Promise<Array>} - Array of avatar objects with platform and URL
   */
  async getAllSocialAvatars(socialAccounts) {
    const avatars = [];

    if (!socialAccounts) return avatars;

    // Facebook avatar
    if (socialAccounts.facebook && socialAccounts.facebook.access_token && socialAccounts.facebook.id) {
      const avatarUrl = await this.getFacebookAvatar(
        socialAccounts.facebook.access_token,
        socialAccounts.facebook.id
      );
      if (avatarUrl) {
        avatars.push({
          platform: 'facebook',
          url: avatarUrl,
          priority: 1 // Facebook has highest priority
        });
      }
    }

    // LinkedIn avatar
    if (socialAccounts.linkedin && socialAccounts.linkedin.access_token) {
      const avatarUrl = await this.getLinkedInAvatar(socialAccounts.linkedin.access_token);
      if (avatarUrl) {
        avatars.push({
          platform: 'linkedin',
          url: avatarUrl,
          priority: 2
        });
      }
    }

    // X avatar (placeholder for now)
    if (socialAccounts.x && socialAccounts.x.profile_data && socialAccounts.x.profile_data.profile_image_url_https) {
      avatars.push({
        platform: 'x',
        url: socialAccounts.x.profile_data.profile_image_url_https,
        priority: 3
      });
    }

    // Sort by priority (lower number = higher priority)
    return avatars.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get the best available social avatar for a user
   * @param {Object} socialAccounts - User's social accounts data
   * @returns {Promise<string|null>} - Best avatar URL or null
   */
  async getBestSocialAvatar(socialAccounts) {
    const avatars = await this.getAllSocialAvatars(socialAccounts);
    return avatars.length > 0 ? avatars[0].url : null;
  }
}

module.exports = new SocialAvatarService();