const { clerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../models/user.model');

/**
 * Service for syncing Clerk users with internal TrafficJamz user records
 */
class ClerkUserService {
  /**
   * Find or create internal user from Clerk user data
   * @param {string} clerkUserId - Clerk user ID
   * @param {Object} clerkUserData - Clerk user data from session claims
   * @returns {Promise<Object>} Internal user record
   */
  async findOrCreateUser(clerkUserId, clerkUserData = {}) {
    try {
      // Try to find by Clerk ID first
      let user = await User.findOne({ 
        where: { clerk_user_id: clerkUserId } 
      });

      if (user) {
        // Update last login
        await user.update({ last_login: new Date() });
        return user;
      }

      // If email provided, check if user exists with that email
      if (clerkUserData.email) {
        user = await User.findOne({ 
          where: { email: clerkUserData.email } 
        });

        if (user) {
          // Link existing user to Clerk
          await user.update({ 
            clerk_user_id: clerkUserId,
            last_login: new Date()
          });
          console.log(`Linked existing user ${user.user_id} to Clerk ID ${clerkUserId}`);
          return user;
        }
      }

      // Create new user
      const userData = {
        clerk_user_id: clerkUserId,
        email: clerkUserData.email || `clerk_${clerkUserId}@temp.local`,
        username: this.generateUsername(clerkUserData.email, clerkUserId),
        first_name: clerkUserData.firstName || null,
        last_name: clerkUserData.lastName || null,
        profile_image_url: clerkUserData.imageUrl || null,
        phone_number: clerkUserData.phoneNumber || null,
        status: 'active',
        last_login: new Date()
      };

      user = await User.create(userData);
      console.log(`Created new user ${user.user_id} from Clerk ID ${clerkUserId}`);
      return user;
    } catch (error) {
      console.error('Error in findOrCreateUser:', error);
      throw error;
    }
  }

  /**
   * Sync user data from Clerk to internal database
   * @param {string} clerkUserId - Clerk user ID
   * @returns {Promise<Object>} Updated user record
   */
  async syncUserFromClerk(clerkUserId) {
    try {
      // Fetch user from Clerk
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      
      const clerkData = {
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        phoneNumber: clerkUser.phoneNumbers?.[0]?.phoneNumber
      };

      return await this.findOrCreateUser(clerkUserId, clerkData);
    } catch (error) {
      console.error('Error syncing user from Clerk:', error);
      throw error;
    }
  }

  /**
   * Link existing user account to Clerk user
   * @param {string} internalUserId - Internal user UUID
   * @param {string} clerkUserId - Clerk user ID
   * @returns {Promise<Object>} Updated user record
   */
  async linkUserToClerk(internalUserId, clerkUserId) {
    try {
      const user = await User.findByPk(internalUserId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.clerk_user_id && user.clerk_user_id !== clerkUserId) {
        throw new Error('User already linked to different Clerk account');
      }

      await user.update({ clerk_user_id: clerkUserId });
      console.log(`Linked user ${internalUserId} to Clerk ID ${clerkUserId}`);
      
      return user;
    } catch (error) {
      console.error('Error linking user to Clerk:', error);
      throw error;
    }
  }

  /**
   * Get internal user by Clerk user ID
   * @param {string} clerkUserId - Clerk user ID
   * @returns {Promise<Object|null>} Internal user record or null
   */
  async getUserByClerkId(clerkUserId) {
    return await User.findOne({ 
      where: { clerk_user_id: clerkUserId } 
    });
  }

  /**
   * Generate unique username from email or Clerk ID
   * @param {string} email - User email
   * @param {string} clerkUserId - Clerk user ID
   * @returns {string} Generated username
   */
  generateUsername(email, clerkUserId) {
    if (email) {
      const baseUsername = email.split('@')[0].replace(/[^a-z0-9]/gi, '_');
      return `${baseUsername}_${Date.now()}`;
    }
    return `user_${clerkUserId.substring(5, 15)}`;
  }

  /**
   * Migrate existing users to Clerk (batch operation)
   * @param {Array<Object>} users - Array of user records
   * @returns {Promise<Object>} Migration results
   */
  async migrateUsersToClerk(users) {
    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    for (const user of users) {
      try {
        // Skip if already has Clerk ID
        if (user.clerk_user_id) {
          results.skipped.push({ userId: user.user_id, reason: 'Already linked' });
          continue;
        }

        // Create Clerk user
        const clerkUser = await clerkClient.users.createUser({
          emailAddress: [user.email],
          firstName: user.first_name,
          lastName: user.last_name,
          phoneNumber: user.phone_number ? [user.phone_number] : undefined,
          skipPasswordChecks: true, // They'll reset password via Clerk
          publicMetadata: {
            internalUserId: user.user_id,
            migratedAt: new Date().toISOString()
          }
        });

        // Link internal user to Clerk
        await user.update({ clerk_user_id: clerkUser.id });
        
        results.success.push({ 
          userId: user.user_id, 
          clerkUserId: clerkUser.id 
        });
      } catch (error) {
        results.failed.push({ 
          userId: user.user_id, 
          error: error.message 
        });
      }
    }

    return results;
  }
}

module.exports = new ClerkUserService();
