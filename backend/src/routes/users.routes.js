const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');
const passport = require('passport');
const { body, validationResult } = require('express-validator');

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
      const user = await userService.getUserById(req.user.id);
      res.json({ success: true, user });
    } catch (error) {
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

      const user = await userService.updateUser(req.user.id, updateData);
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
      const updatedPreferences = await userService.updatePreferences(req.user.id, preferences);
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
      await userService.changePassword(req.user.id, current_password, new_password);
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

module.exports = router;
