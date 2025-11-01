// src/utils/avatar.utils.js
// Utility functions for handling user avatars across the application

/**
 * Get the appropriate avatar content for a user with proper fallback logic
 * @param {Object} user - User object with profile data
 * @returns {string|null} Avatar URL or null for fallback
 */
export const getAvatarContent = (user) => {
  // First priority: user's actual profile image (but ignore generated placeholder URLs)
  if (user?.profile_image_url && 
      !user.profile_image_url.includes('ui-avatars.com') &&
      !user.profile_image_url.includes('api.dicebear.com')) {
    return user.profile_image_url;
  }

  // Second priority: social platform avatars (in order of preference)
  if (user?.social_accounts) {
    // Facebook avatar
    if (user.social_accounts.facebook?.profile_data?.picture?.data?.url) {
      return user.social_accounts.facebook.profile_data.picture.data.url;
    }

    // LinkedIn avatar (from profile data)
    if (user.social_accounts.linkedin?.profile_data?.profilePicture?.displayImage) {
      const images = user.social_accounts.linkedin.profile_data.profilePicture.displayImage;
      if (images && images.length > 0) {
        return images[images.length - 1].data['com.linkedin.digitalmedia.mediaartifact.StillImage'].storageSize.large.url;
      }
    }

    // X avatar
    if (user.social_accounts.x?.profile_data?.profile_image_url_https) {
      return user.social_accounts.x.profile_data.profile_image_url_https;
    }
  }

  // Third priority: generate avatar from name using DiceBear
  const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  if (name) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
  }

  // Final fallback: return null to let Avatar component handle the fallback
  return null;
};

/**
 * Get the fallback content for avatar (initials or emoji)
 * @param {Object} user - User object
 * @returns {string} Fallback content
 */
export const getAvatarFallback = (user) => {
  // Try to get initials from name
  const firstInitial = user?.first_name?.[0]?.toUpperCase();
  const lastInitial = user?.last_name?.[0]?.toUpperCase();

  if (firstInitial && lastInitial) {
    return `${firstInitial}${lastInitial}`;
  }

  if (firstInitial) {
    return firstInitial;
  }

  // Fallback to username initial or emoji
  return user?.username?.[0]?.toUpperCase() || '👤';
};
