const express = require('express');
const router = express.Router();
const Notification = require('../models/notification.model');
const passport = require('passport');
const { param, validationResult } = require('express-validator');

// Middleware to validate request
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @route GET /api/notifications
 * @desc Get all notifications for current user
 * @access Private
 */
router.get('/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const notifications = await Notification.find({ 
        user_id: req.user.user_id 
      }).sort({ createdAt: -1 });
      
      res.json({ success: true, notifications });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route GET /api/notifications/unread
 * @desc Get unread notifications for current user
 * @access Private
 */
router.get('/unread',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const notifications = await Notification.findUnreadByUserId(req.user.user_id);
      res.json({ success: true, notifications });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route GET /api/notifications/type/:type
 * @desc Get notifications by type for current user
 * @access Private
 */
router.get('/type/:type',
  passport.authenticate('jwt', { session: false }),
  [
    param('type').isIn(['group_invite', 'proximity_alert', 'subscription', 'system']).withMessage('Invalid notification type'),
    validate
  ],
  async (req, res) => {
    try {
      const notifications = await Notification.findByUserIdAndType(req.user.user_id, req.params.type);
      res.json({ success: true, notifications });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route PUT /api/notifications/:id/read
 * @desc Mark notification as read
 * @access Private
 */
router.put('/:id/read',
  passport.authenticate('jwt', { session: false }),
  [
    param('id').isMongoId().withMessage('Invalid notification ID'),
    validate
  ],
  async (req, res) => {
    try {
      const notification = await Notification.findById(req.params.id);
      
      if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }
      
      if (notification.user_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Permission denied' });
      }
      
      notification.read = true;
      await notification.save();
      
      res.json({ success: true, notification });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route PUT /api/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private
 */
router.put('/read-all',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      await Notification.markAllAsRead(req.user.user_id);
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route DELETE /api/notifications/:id
 * @desc Delete notification
 * @access Private
 */
router.delete('/:id',
  passport.authenticate('jwt', { session: false }),
  [
    param('id').isMongoId().withMessage('Invalid notification ID'),
    validate
  ],
  async (req, res) => {
    try {
      const notification = await Notification.findById(req.params.id);
      
      if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }
      
      if (notification.user_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Permission denied' });
      }
      
      await Notification.deleteOne({ _id: req.params.id });
      
      res.json({ success: true, message: 'Notification deleted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
