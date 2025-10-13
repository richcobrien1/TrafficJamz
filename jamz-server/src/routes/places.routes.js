const express = require('express');
const router = express.Router();
const passport = require('passport');
const placeService = require('../services/place.service');

// Create a place for a group
router.post('/groups/:groupId/places', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, type, latitude, longitude, address } = req.body;
    const createdBy = req.user && req.user.user_id;
    if (!name || !latitude || !longitude) return res.status(400).json({ success: false, message: 'name, latitude and longitude are required' });
    const place = await placeService.createPlace({ name, description, type, latitude, longitude, address, groupId, createdBy });
    res.status(201).json({ success: true, place });
  } catch (error) {
    console.error('Create place error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// List places for a group
router.get('/groups/:groupId/places', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { groupId } = req.params;
    const places = await placeService.listPlacesForGroup(groupId);
    res.json({ success: true, places });
  } catch (error) {
    console.error('List places error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update a place
router.put('/places/:placeId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { placeId } = req.params;
    const { name, description, latitude, longitude } = req.body;
    const requestingUserId = req.user && req.user.user_id;
    const updatedPlace = await placeService.updatePlace(placeId, { name, description, latitude, longitude }, requestingUserId);
    res.json({ success: true, place: updatedPlace });
  } catch (error) {
    console.error('Update place error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
