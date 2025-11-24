// src/utils/avatar.utils.js
// Utility functions for handling user avatars across the application

/**
 * Get the appropriate avatar content for a user with proper fallback logic
 * @param {Object} user - User object with profile data
 * @returns {string|null} Avatar URL or null for fallback
 */
export const getAvatarContent = (user) => {
  // First priority: user's actual uploaded profile image from Supabase Storage or R2
  // Only ignore old ui-avatars.com URLs (legacy placeholders)
  if (user?.profile_image_url && 
      !user.profile_image_url.includes('ui-avatars.com')) {
    // Check if it's a real storage URL (Supabase or R2)
    // R2 patterns: public.v2u.us, .r2.cloudflarestorage.com, pub-*.r2.dev
    // Supabase pattern: supabase.co/storage
    if (user.profile_image_url.includes('supabase.co/storage') ||
        user.profile_image_url.includes('public.v2u.us') ||
        user.profile_image_url.includes('.r2.cloudflarestorage.com') ||
        user.profile_image_url.includes('.r2.dev') ||
        user.profile_image_url.includes('https://') && 
        (user.profile_image_url.includes('/profiles/') || user.profile_image_url.includes('/profile-'))) {
      console.log('✅ Using profile image URL:', user.profile_image_url.substring(0, 80) + '...');
      return user.profile_image_url;
    } else {
      console.warn('⚠️ Profile image URL exists but doesn\'t match known storage patterns:', user.profile_image_url.substring(0, 80));
    }
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

  // Third priority: gender-specific avatar silhouettes
  const gender = user?.gender?.toLowerCase();
  const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || 'User';
  
  if (gender === 'male' || gender === 'm') {
    // Male avatar silhouette using DiceBear's avataaars style with male characteristics
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=90caf9&style=circle`;
  } else if (gender === 'female' || gender === 'f') {
    // Female avatar silhouette using DiceBear's avataaars style with female characteristics  
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=f48fb1&style=circle`;
  }
  
  // No gender specified - return null to show initials
  return null;
};

/**
 * Get the fallback content for avatar (initials or default avatar)
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

  // Fallback to username initial or generic initials
  return user?.username?.[0]?.toUpperCase() || 'U';
};
