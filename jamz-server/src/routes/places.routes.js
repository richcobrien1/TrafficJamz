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

// Delete a place
router.delete('/places/:placeId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { placeId } = req.params;
    const requestingUserId = req.user && req.user.user_id;
    await placeService.deletePlace(placeId, requestingUserId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete place error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
