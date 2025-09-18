const express = require('express');
const router = express.Router();
const locationService = require('../services/location.service');
const passport = require('passport');
const { body, param, validationResult } = require('express-validator');

// Middleware to validate request
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @route POST /api/location/update
 * @desc Update user location
 * @access Private
 */
router.post('/update',
  passport.authenticate('jwt', { session: false }),
  [
    body('coordinates').isObject().withMessage('Coordinates are required'),
    body('coordinates.latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
    body('coordinates.longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
    body('device_id').optional(),
    body('battery_level').optional().isFloat({ min: 0, max: 100 }).withMessage('Battery level must be between 0 and 100'),
    body('connection_type').optional().isIn(['wifi', 'cellular', 'offline']).withMessage('Invalid connection type'),
    validate
  ],
  async (req, res) => {
    try {
      const locationData = {
        coordinates: {
          latitude: req.body.coordinates.latitude,
          longitude: req.body.coordinates.longitude,
          altitude: req.body.coordinates.altitude,
          accuracy: req.body.coordinates.accuracy,
          altitude_accuracy: req.body.coordinates.altitude_accuracy,
          heading: req.body.coordinates.heading,
          speed: req.body.coordinates.speed
        },
        device_id: req.body.device_id,
        battery_level: req.body.battery_level,
        connection_type: req.body.connection_type
      };

      const location = await locationService.updateUserLocation(req.user.user_id, locationData);
      res.status(201).json({ success: true, location });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route GET /api/location/group/:groupId
 * @desc Get group members' locations
 * @access Private
 */
router.get('/group/:groupId',
  passport.authenticate('jwt', { session: false }),
  [
    param('groupId').isMongoId().withMessage('Valid group ID is required'),
    validate
  ],
  async (req, res) => {
    try {
      const locations = await locationService.getGroupMembersLocations(req.params.groupId, req.user.user_id);
      console.log(`GET /api/location/group/${req.params.groupId} -> returning ${locations.length} locations`);
      res.json({ success: true, locations });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route GET /api/location/user/:user_id
 * @desc Get user location
 * @access Private
 */
router.get('/user/:user_id',
  passport.authenticate('jwt', { session: false }),
  [
    param('user_id').exists().withMessage('Valid user ID is required'),
    validate
  ],
  async (req, res) => {
    try {
      const location = await locationService.getUserLocation(req.params.user_id, req.user.user_id);
      res.json({ success: true, location });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route GET /api/location/history/:user_id
 * @desc Get user location history
 * @access Private
 */
router.get('/history/:user_id',
  passport.authenticate('jwt', { session: false }),
  [
    param('user_id').exists().withMessage('Valid user ID is required'),
    validate
  ],
  async (req, res) => {
    try {
      const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
      const groupId = req.query.group_id;

      const history = await locationService.getUserLocationHistory(
        req.params.user_id,
        startDate,
        endDate,
        groupId,
        req.user.user_id
      );
      res.json({ success: true, history });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route PUT /api/location/privacy
 * @desc Set location privacy
 * @access Private
 */
router.put('/privacy',
  passport.authenticate('jwt', { session: false }),
  [
    body('privacy_level').isIn(['precise', 'approximate', 'hidden']).withMessage('Invalid privacy level'),
    body('shared_with_group_ids').optional().isArray().withMessage('Shared with group IDs must be an array'),
    validate
  ],
  async (req, res) => {
    try {
      const settings = await locationService.setLocationPrivacy(
        req.user.user_id,
        req.body.privacy_level,
        req.body.shared_with_group_ids
      );
      res.json({ success: true, settings });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/location/proximity-alerts
 * @desc Create proximity alert
 * @access Private
 */
router.post('/proximity-alerts',
  passport.authenticate('jwt', { session: false }),
  [
    body('group_id').isMongoId().withMessage('Valid group ID is required'),
    body('target_user_id').exists().withMessage('Target user ID is required'),
    body('distance_threshold').optional().isInt({ min: 10, max: 10000 }).withMessage('Distance threshold must be between 10 and 10000 meters'),
    validate
  ],
  async (req, res) => {
    try {
      const alert = await locationService.createProximityAlert(
        req.body.group_id,
        req.body.target_user_id,
        req.body.distance_threshold,
        req.user.user_id
      );
      res.status(201).json({ success: true, alert });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route GET /api/location/proximity-alerts/group/:groupId
 * @desc Get proximity alerts for a group
 * @access Private
 */
router.get('/proximity-alerts/group/:groupId',
  passport.authenticate('jwt', { session: false }),
  [
    param('groupId').isMongoId().withMessage('Valid group ID is required'),
    validate
  ],
  async (req, res) => {
    try {
      const alerts = await locationService.getProximityAlerts(req.params.groupId, req.user.user_id);
      res.json({ success: true, alerts });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route PUT /api/location/proximity-alerts/:alertId
 * @desc Update proximity alert
 * @access Private
 */
router.put('/proximity-alerts/:alertId',
  passport.authenticate('jwt', { session: false }),
  [
    param('alertId').isMongoId().withMessage('Valid alert ID is required'),
    body('distance_threshold').optional().isInt({ min: 10, max: 10000 }).withMessage('Distance threshold must be between 10 and 10000 meters'),
    body('status').optional().isIn(['active', 'dismissed']).withMessage('Invalid status'),
    validate
  ],
  async (req, res) => {
    try {
      const updateData = {
        distance_threshold: req.body.distance_threshold,
        status: req.body.status
      };

      const alert = await locationService.updateProximityAlert(req.params.alertId, updateData, req.user.user_id);
      res.json({ success: true, alert });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route DELETE /api/location/proximity-alerts/:alertId
 * @desc Delete proximity alert
 * @access Private
 */
router.delete('/proximity-alerts/:alertId',
  passport.authenticate('jwt', { session: false }),
  [
    param('alertId').isMongoId().withMessage('Valid alert ID is required'),
    validate
  ],
  async (req, res) => {
    try {
      await locationService.deleteProximityAlert(req.params.alertId, req.user.user_id);
      res.json({ success: true, message: 'Proximity alert deleted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
