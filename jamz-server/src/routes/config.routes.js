const express = require('express');
const router = express.Router();
const passport = require('passport');

// Get client configuration
router.get('/client-config', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const config = {
      mapboxToken: process.env.VITE_MAPBOX_TOKEN
    };
    res.json({ success: true, config });
  } catch (error) {
    console.error('Get client config error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;