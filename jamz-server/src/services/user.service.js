const User = require('../models/user.model');
const PasswordResetToken = require('../models/password-reset-token.model');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const socialAvatarService = require('./social-avatar.service');
const emailService = require('./email.service');

/**
 * User service for handling user-related operations
 */
class UserService {
  // Helper: normalize user JSON before returning to callers
  normalizeUserJson(userJson) {
    if (!userJson) return userJson;
    try {
      // Ensure mfa_methods is an array
      if (userJson.mfa_methods === null || userJson.mfa_methods === undefined) {
        userJson.mfa_methods = [];
      } else if (typeof userJson.mfa_methods === 'string') {
        // Try to parse JSON stored as string, otherwise coerce to empty array
        try {
          const parsed = JSON.parse(userJson.mfa_methods);
          userJson.mfa_methods = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          // fallback: attempt to split common formats or set empty
          userJson.mfa_methods = [];
        }
      } else if (!Array.isArray(userJson.mfa_methods)) {
        // If it's an object or other type, coerce to empty array
        userJson.mfa_methods = [];
      }

      // Ensure preferences is an object
      if (!userJson.preferences || typeof userJson.preferences !== 'object') {
        userJson.preferences = {};
      }

      // Flatten notification preferences for easier frontend access
      if (userJson.preferences.notifications) {
        userJson.email_notifications = userJson.preferences.notifications.email_enabled ?? true;
        userJson.push_notifications = userJson.preferences.notifications.push_enabled ?? true;
        userJson.proximity_alerts = userJson.preferences.notifications.proximity_alerts ?? true;
        userJson.group_invitations = userJson.preferences.notifications.group_invites ?? true;
      } else {
        // Set defaults if notifications object doesn't exist
        userJson.email_notifications = true;
        userJson.push_notifications = true;
        userJson.proximity_alerts = true;
        userJson.group_invitations = true;
      }

      // Add social avatars if available
      if (userJson.social_accounts) {
        // Get social avatars asynchronously (but don't wait for them in normalize)
        // The frontend will handle fetching these when needed
        userJson.social_avatars = [];
        userJson.best_social_avatar = null;

        // For now, just indicate which platforms are connected
        const connectedPlatforms = Object.keys(userJson.social_accounts);
        userJson.connected_social_platforms = connectedPlatforms;
      } else {
        userJson.social_avatars = [];
        userJson.best_social_avatar = null;
        userJson.connected_social_platforms = [];
      }
    } catch (err) {
      // Non-fatal: return as-is if normalization fails
    }
    return userJson;
  }
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} - Newly created user
   */
  async register(userData) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { email: userData.email },
            { username: userData.username }
          ]
        }
      });

      if (existingUser) {
        throw new Error('User with this email or username already exists');
      }

      // Create new user
      const user = await User.create({
        user_id: uuidv4(),
        username: userData.username,
        email: userData.email,
        password_hash: userData.password, // Will be hashed by model hook
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone_number: userData.phone_number,
        gender: userData.gender || null
      });

      // Remove sensitive data
  const userJson = user.toJSON();
  delete userJson.password_hash;
  return this.normalizeUserJson(userJson);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Authenticate a user and generate tokens
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - User data with tokens
   */
  async login(email, password) {
    try {
      console.log('Login attempt for:', email);
    
      // Find user by email
      const user = await User.findOne({ 
        where: { email },
        attributes: ['user_id', 'username', 'email', 'phone_number', 'password_hash', 'first_name', 'last_name', 'profile_image_url', 'gender', 'date_of_birth', 'last_login', 'status', 'preferences', 'mfa_enabled', 'mfa_methods', 'createdAt', 'updatedAt', 'deletedAt']
      });
      console.log('User found:', user ? 'Yes' : 'No');
      
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Validate password
      console.log('Validating password...');
      const isPasswordValid = await user.validatePassword(password);
      console.log('Password validation result:', isPasswordValid ? 'Valid' : 'Invalid');
      
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }
  
      // Update last login timestamp
      user.last_login = new Date();
      await user.save();
  
      // Generate tokens with error handling
      try {
        const tokens = this.generateTokens(user);
        
        // Remove sensitive data
        const userJson = user.toJSON();
        delete userJson.password_hash;

        return {
          user: this.normalizeUserJson(userJson),
          ...tokens
        };
      } catch (tokenError) {
        console.error('Token generation error:', tokenError);
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Generate access and refresh tokens for a user
   * @param {Object} user - User object
   * @returns {Object} - Access and refresh tokens
   */
  generateTokens(user) {
    // Defensive logging: avoid stringifying Sequelize instances (can cause circular errors)
    try {
      const userObj = (user && typeof user.toJSON === 'function') ? user.toJSON() : user;
      console.log('generateTokens - user snapshot:', {
        user_id: userObj && userObj.user_id,
        username: userObj && userObj.username
      });

      // Ensure JWT_SECRET is configured
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not set - cannot sign tokens');
        throw new Error('Server configuration error');
      }

      // Ensure user_id is a string
      const user_id = String(userObj && userObj.user_id);

      // Sign tokens and surface any errors clearly
      let accessToken;
      let refreshToken;
      try {
        accessToken = jwt.sign(
          { sub: user_id, username: userObj && userObj.username, email: userObj && userObj.email },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        refreshToken = jwt.sign(
          { sub: user_id },
          process.env.JWT_SECRET,
          { expiresIn: '30d' }
        );
      } catch (jwtErr) {
        console.error('JWT signing error in generateTokens:', jwtErr);
        throw new Error('Authentication token generation failed');
      }

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer'
      };
    } catch (err) {
      // Bubble up with a clear message for the caller to handle/log
      console.error('generateTokens - fatal error:', err);
      throw err;
    }
  }  

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} - New access token
   */
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      
      // Get user - changed from findByPk to findOne with user_id
      const user = await User.findOne({ 
        where: { user_id: decoded.sub } 
      });
      if (!user) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      return tokens;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Get user by ID
   * @param {string} user_id - User ID
   * @returns {Promise<Object>} - User data
   */
  async getUserById(user_id) {
    try {
      // Changed from findByPk to findOne with user_id
      const user = await User.findOne({ 
        where: { user_id: user_id } 
      });
      if (!user) {
        throw new Error('User not found');
      }

  // Remove sensitive data
  const userJson = user.toJSON();
  delete userJson.password_hash;

  return this.normalizeUserJson(userJson);
    } catch (error) {
      throw error;
    }
  }

   /**
   * Get user by Email
   * @param {string} email - email
   * @returns {Promise<Object>} - User data
   */
   async getUserByEmail(email) {
    try {
      // Changed from findByPk to findOne with email
      const user = await User.findOne({ 
        where: { email: email } 
      });
      if (!user) {
        throw new Error('User not found');
      }

  // Remove sensitive data
  const userJson = user.toJSON();
  delete userJson.password_hash;

  return this.normalizeUserJson(userJson);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} user_id - User ID
   * @param {Object} updateData - Data to update
   * @param {Object} notificationData - Notification settings to update
   * @returns {Promise<Object>} - Updated user data
   */
  async updateUser(user_id, updateData, notificationData = {}) {
    try {
      // Changed from findByPk to findOne with user_id
      const user = await User.findOne({ 
        where: { user_id: user_id } 
      });
      if (!user) {
        throw new Error('User not found');
      }

      // Update allowed fields
      const allowedFields = [
        'first_name', 'last_name', 'profile_image_url', 'phone_number'
      ];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          // Convert empty strings to null for phone_number to avoid validation issues
          if (field === 'phone_number' && updateData[field] === '') {
            user[field] = null;
          } else {
            user[field] = updateData[field];
          }
        }
      }

      // Update notification settings if provided
      if (Object.keys(notificationData).length > 0) {
        user.preferences = {
          ...user.preferences,
          notifications: {
            ...user.preferences.notifications,
            ...notificationData
          }
        };
      }

      await user.save();

      // Remove sensitive data
      const userJson = user.toJSON();
      delete userJson.password_hash;

      return this.normalizeUserJson(userJson);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user preferences
   * @param {string} user_id - User ID
   * @param {Object} preferences - New preferences
   * @returns {Promise<Object>} - Updated preferences
   */
  async updatePreferences(user_id, preferences) {
    try {
      // Changed from findByPk to findOne with user_id
      const user = await User.findOne({ 
        where: { user_id: user_id } 
      });
      if (!user) {
        throw new Error('User not found');
      }

      // Deep merge preferences
      user.preferences = {
        ...user.preferences,
        ...preferences
      };

      await user.save();

      return user.preferences;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} user_id - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} - Success status
   */
  async changePassword(user_id, currentPassword, newPassword) {
    try {
      // Changed from findByPk to findOne with user_id
      const user = await User.findOne({ 
        where: { user_id: user_id } 
      });
      if (!user) {
        throw new Error('User not found');
      }

      // Validate current password
      const isPasswordValid = await user.validatePassword(currentPassword);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password_hash = newPassword; // Will be hashed by model hook
      await user.save();

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<boolean>} - Success status
   */
  async requestPasswordReset(email) {
    try {
      const user = await User.findOne({
        where: { email }
      });

      if (!user) {
        // Don't reveal that the user doesn't exist - return success anyway
        return true;
      }

      // Generate reset token
      const resetToken = uuidv4();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to database
      await PasswordResetToken.create({
        user_id: user.user_id,
        email: email,
        token: resetToken,
        expires_at: expiresAt
      });

      // Send reset email
      console.log('📧 Attempting to send password reset email to:', email);
      await this.sendPasswordResetEmail(email, resetToken);

      return true;
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @param {string} token - Reset token
   * @returns {Promise<void>}
   */
  async sendPasswordResetEmail(email, token) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      
      await emailService.sendPasswordResetEmail(email, resetUrl);
      console.log('✅ Password reset email sent successfully to:', email);
    } catch (error) {
      console.error('❌ Email sending error:', error);
      console.error('❌ Error details:', error.message);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} email - User email
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async resetPassword(token, email, newPassword) {
    try {
      // Find the reset token
      const resetToken = await PasswordResetToken.findOne({
        where: {
          token,
          email,
          used: false
        }
      });

      if (!resetToken) {
        throw new Error('Invalid or expired reset token');
      }

      // Check if token is expired
      if (new Date() > new Date(resetToken.expires_at)) {
        throw new Error('Reset token has expired');
      }

      // Find the user
      const user = await User.findOne({
        where: {
          user_id: resetToken.user_id,
          email: resetToken.email
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Hash the new password
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update user password
      await user.update({
        password_hash: hashedPassword
      });

      // Mark token as used
      await resetToken.update({
        used: true
      });

      console.log('✅ Password reset successfully for user:', email);
    } catch (error) {
      console.error('❌ Password reset error:', error);
      throw error;
    }
  }

  /**
   * Get user by social platform ID
   * @param {string} platform - Social platform (facebook, linkedin, x)
   * @param {string} socialId - Social platform user ID
   * @returns {Promise<Object>} - User data
   */
  async findBySocialId(platform, socialId) {
    try {
      const users = await User.findAll();

      for (const user of users) {
        if (user.social_accounts &&
            user.social_accounts[platform] &&
            user.social_accounts[platform].id === socialId) {
          // Remove sensitive data
          const userJson = user.toJSON();
          delete userJson.password_hash;
          return this.normalizeUserJson(userJson);
        }
      }

      return null;
    } catch (error) {
      throw error;
    }
  }
  async setupMFA(user_id, method) {
    try {
      // Changed from findByPk to findOne with user_id
      const user = await User.findOne({ 
        where: { user_id: user_id } 
      });
      if (!user) {
        throw new Error('User not found');
      }

      // In a real implementation, we would:
      // 1. Generate MFA secrets based on the method
      // 2. Store the MFA configuration
      // 3. Return setup information (e.g., QR code for authenticator)

      user.mfa_enabled = true;
      if (!user.mfa_methods.includes(method)) {
        user.mfa_methods = [...user.mfa_methods, method];
      }
      await user.save();

      return {
        enabled: true,
        method,
        setup_required: true
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify MFA code
   * @param {string} user_id - User ID
   * @param {string} code - MFA code
   * @returns {Promise<boolean>} - Verification result
   */
  async verifyMFA(user_id, code) {
    try {
      // Changed from findByPk to findOne with user_id
      const user = await User.findOne({ 
        where: { user_id: user_id } 
      });
      if (!user || !user.mfa_enabled) {
        throw new Error('MFA not enabled for this user');
      }

      // In a real implementation, we would:
      // 1. Verify the MFA code based on the user's configured method
      // 2. Return the verification result

      // Mock verification for development
      return code === '123456';
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserService();
