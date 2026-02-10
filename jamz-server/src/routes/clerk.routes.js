const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/clerk.middleware');
const clerkUserService = require('../services/clerk-user.service');
const User = require('../models/user.model');

/**
 * @route GET /api/clerk/sync
 * @desc Sync current Clerk user with internal database
 * @access Private (Clerk authenticated)
 */
router.get('/sync', ...requireAuth(), async (req, res) => {
  try {
    const clerkUserId = req.auth.userId;
    const user = await clerkUserService.syncUserFromClerk(clerkUserId);
    
    res.json({ 
      success: true, 
      user: {
        user_id: user.user_id,
        clerk_user_id: user.clerk_user_id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        profile_image_url: user.profile_image_url
      }
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to sync user',
      error: error.message 
    });
  }
});

/**
 * @route GET /api/clerk/profile
 * @desc Get current user profile
 * @access Private (Clerk authenticated)
 */
router.get('/profile', ...requireAuth(), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({ 
      success: true, 
      user: {
        user_id: req.user.user_id,
        clerk_user_id: req.user.clerk_user_id,
        email: req.user.email,
        username: req.user.username,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        profile_image_url: req.user.profile_image_url,
        phone_number: req.user.phone_number,
        status: req.user.status,
        preferences: req.user.preferences,
        last_login: req.user.last_login
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch profile',
      error: error.message 
    });
  }
});

/**
 * @route POST /api/clerk/link
 * @desc Link existing account to Clerk user
 * @access Private (Clerk authenticated)
 */
router.post('/link', ...requireAuth(), async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password required' 
      });
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with that email' 
      });
    }

    // Verify password
    const isValid = await user.validatePassword(password);
    
    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid password' 
      });
    }

    // Check if already linked to different Clerk account
    if (user.clerk_user_id && user.clerk_user_id !== req.auth.userId) {
      return res.status(409).json({ 
        success: false, 
        message: 'Account already linked to different Clerk user' 
      });
    }

    // Link to Clerk
    await user.update({ clerk_user_id: req.auth.userId });
    
    res.json({ 
      success: true, 
      message: 'Account successfully linked',
      user: {
        user_id: user.user_id,
        clerk_user_id: user.clerk_user_id,
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Error linking account:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to link account',
      error: error.message 
    });
  }
});

/**
 * @route GET /api/clerk/status
 * @desc Check Clerk integration status
 * @access Public
 */
router.get('/status', async (req, res) => {
  try {
    const totalUsers = await User.count();
    const clerkLinkedUsers = await User.count({ 
      where: { clerk_user_id: { [require('sequelize').Op.ne]: null } } 
    });
    
    res.json({ 
      success: true,
      clerkEnabled: true,
      stats: {
        totalUsers,
        clerkLinkedUsers,
        unlinkedUsers: totalUsers - clerkLinkedUsers,
        migrationProgress: totalUsers > 0 ? ((clerkLinkedUsers / totalUsers) * 100).toFixed(2) + '%' : '0%'
      }
    });
  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check status',
      error: error.message 
    });
  }
});

module.exports = router;
