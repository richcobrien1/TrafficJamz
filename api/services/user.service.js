const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

/**
 * User service for handling user-related operations
 */
class UserService {
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
        phone_number: userData.phone_number
      });

      // Remove sensitive data
      const userJson = user.toJSON();
      delete userJson.password_hash;

      return userJson;
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
      // Find user by email
      const user = await User.findOne({ 
        where: { email } 
      });
      if (!user) {
        throw new Error('Invalid email or password');
      }
  
      // Validate password
      const isPasswordValid = await user.validatePassword(password);
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
          user: userJson,
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
    // Add logging to debug
    console.log('User object in generateTokens:', JSON.stringify(user));
    console.log('user_id type:', typeof user.user_id);
    
    // Ensure user_id is a string
    const user_id = String(user.user_id);
    
    const accessToken = jwt.sign(
      { sub: user_id, username: user.username },
      process.env.JWT_SECRET,
      // { expiresIn: process.env.JWT_ACCESS_EXPIRATION || '24h' }
      { expiresIn: '24h' }
    );
  
    const refreshToken = jwt.sign(
      { sub: user_id },
      process.env.JWT_SECRET,
      // { expiresIn: process.env.JWT_REFRESH_EXPIRATION || '30d' }
      { expiresIn: '30d' }
    );
  
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer'
    };
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

      return userJson;
    } catch (error) {
      throw error;
    }
  }

   /**
   * Get user by Email
   * @param {string} email - email
   * @returns {Promise<Object>} - User data
   */
   async getUserByEmail(req) {

    console.log('===========================>  Requested Email: ' + req.query.email)

    try {
      // Changed from findByPk to findOne with email
      const user = await User.findOne({ 
        where: { email: req.query.email } 
      });
      if (!user) {
        throw new Error('User not found');
      }

      // Remove sensitive data
      const userJson = user.toJSON();
      delete userJson.password_hash;

      return userJson;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} user_id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated user data
   */
  async updateUser(user_id, updateData) {
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
          user[field] = updateData[field];
        }
      }

      await user.save();

      // Remove sensitive data
      const userJson = user.toJSON();
      delete userJson.password_hash;

      return userJson;
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
        // Don't reveal that the user doesn't exist
        return true;
      }

      // In a real implementation, we would:
      // 1. Generate a reset token
      // 2. Store it with an expiration
      // 3. Send an email with the reset link

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} email - User email
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} - Success status
   */
  async resetPassword(token, email, newPassword) {
    try {
      const user = await User.findOne({ 
        where: { email } 
      });
      if (!user) {
        throw new Error('Invalid reset request');
      }

      // In a real implementation, we would:
      // 1. Verify the token is valid and not expired
      // 2. Update the password

      // Update password
      user.password_hash = newPassword; // Will be hashed by model hook
      await user.save();

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Setup multi-factor authentication
   * @param {string} user_id - User ID
   * @param {string} method - MFA method
   * @returns {Promise<Object>} - MFA setup information
   */
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
