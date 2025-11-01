const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');
const socialAvatarService = require('../services/social-avatar.service');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const s3Service = require('../services/s3.service');

// Middleware to validate request
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @route GET /api/users/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', 
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const user = await userService.getUserById(req.user.user_id);
      res.json({ success: true, user });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route GET /api/users/check-email
 * @desc Check if email exists
 * @access Public
 */
router.get('/check-email', 
  async (req, res) => {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email parameter is required' });
      }
      
      const user = await userService.getUserByEmail(email);
      res.json({ success: true, exists: !!user, user: user ? { user_id: user.user_id, username: user.username } : null });
    } catch (error) {
      // If user not found, return exists: false
      if (error.message === 'User not found') {
        return res.json({ success: true, exists: false });
      }
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route PUT /api/users/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile',
  passport.authenticate('jwt', { session: false }),
  [
    body('first_name').optional(),
    body('last_name').optional(),
    body('profile_image_url').optional().isURL().withMessage('Must be a valid URL'),
    body('phone_number').optional(),
    body('email_notifications').optional().isBoolean().withMessage('Must be a boolean'),
    body('push_notifications').optional().isBoolean().withMessage('Must be a boolean'),
    body('proximity_alerts').optional().isBoolean().withMessage('Must be a boolean'),
    body('group_invitations').optional().isBoolean().withMessage('Must be a boolean'),
    validate
  ],
  async (req, res) => {
    try {
      const updateData = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        profile_image_url: req.body.profile_image_url,
        phone_number: req.body.phone_number
      };

      // Handle notification settings separately
      const notificationData = {};
      if (req.body.email_notifications !== undefined) notificationData.email_enabled = req.body.email_notifications;
      if (req.body.push_notifications !== undefined) notificationData.push_enabled = req.body.push_notifications;
      if (req.body.proximity_alerts !== undefined) notificationData.proximity_alerts = req.body.proximity_alerts;
      if (req.body.group_invitations !== undefined) notificationData.group_invites = req.body.group_invitations;

      const user = await userService.updateUser(req.user.user_id, updateData, notificationData);
      res.json({ success: true, user });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route PUT /api/users/preferences
 * @desc Update user preferences
 * @access Private
 */
router.put('/preferences',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const preferences = req.body;
      const updatedPreferences = await userService.updatePreferences(req.user.user_id, preferences);
      res.json({ success: true, preferences: updatedPreferences });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route PUT /api/users/password
 * @desc Change user password
 * @access Private
 */
router.put('/password',
  passport.authenticate('jwt', { session: false }),
  [
    body('current_password').exists().withMessage('Current password is required'),
    body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long'),
    validate
  ],
  async (req, res) => {
    try {
      const { current_password, new_password } = req.body;
      await userService.changePassword(req.user.user_id, current_password, new_password);
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route GET /api/users/:id
 * @desc Get user by ID
 * @access Private
 */
router.get('/:id',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      // In a real app, we would check if the requesting user has permission to view this user
      const user = await userService.getUserById(req.params.id);
      res.json({ success: true, user });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/users/upload-profile-image
 * @desc Upload profile image
 * @access Private
 */
router.post('/upload-profile-image',
  passport.authenticate('jwt', { session: false }),
  s3Service.upload.single('profile_image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      // Get the file URL based on storage type (S3 or local)
      const imageUrl = s3Service.getFileUrl(req.file.key || req.file.filename);

      // Update user's profile image URL
      const updateData = {
        profile_image_url: imageUrl
      };

      const user = await userService.updateUser(req.user.user_id, updateData);

      res.json({
        success: true,
        message: 'Profile image uploaded successfully',
        image_url: imageUrl,
        user,
        storage_type: s3Service.isS3Configured() ? 's3' : 'local'
      });
    } catch (error) {
      console.error('Profile image upload error:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route GET /api/users/storage-config
 * @desc Get storage configuration status (for debugging)
 * @access Private
 */
router.get('/storage-config',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    try {
      const config = {
        isS3Configured: s3Service.isS3Configured(),
        storageType: s3Service.isS3Configured() ? 'R2/S3' : 'Local',
        hasR2Endpoint: !!process.env.R2_ENDPOINT,
        hasS3Endpoint: !!process.env.S3_ENDPOINT,
        hasR2PublicUrl: !!process.env.R2_PUBLIC_URL,
        hasS3PublicUrl: !!process.env.S3_PUBLIC_URL,
        hasBucket: !!process.env.AWS_S3_BUCKET,
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'auto',
        // Don't expose actual values, just show they exist
        endpoint: process.env.R2_ENDPOINT ? 'SET' : (process.env.S3_ENDPOINT ? 'SET' : 'NOT SET'),
        publicUrl: process.env.R2_PUBLIC_URL ? 'SET' : (process.env.S3_PUBLIC_URL ? 'SET' : 'NOT SET'),
      };

      res.json({
        success: true,
        config
      });
    } catch (error) {
      console.error('Storage config check error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
