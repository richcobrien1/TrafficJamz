const express = require('express');
const router = express.Router();

// These routes are for local debugging and should be mounted early in the
// application lifecycle so they are available even if other middleware rewrites
// or the main routers are registered later.

// Read-only: return whether audio signaling is enabled
router.get('/audio-signaling', (req, res) => {
  // `audioSignalingEnabled` is injected onto `req.app.locals` by the main
  // application. If it's not present, default to true to avoid accidental
  // disabling in production.
  const enabled = typeof req.app.locals.audioSignalingEnabled === 'boolean'
    ? req.app.locals.audioSignalingEnabled
    : true;
  res.json({ enabled });
});

// Toggle: flip the audio signaling flag. This endpoint is intentionally
// restricted: it works only when NODE_ENV === 'development' OR when the
// environment variable ALLOW_DEBUG_TOGGLE is set to 'true'. This prevents
// accidental toggling in production environments.
router.post('/audio-signaling/toggle', (req, res) => {
  const allowed = process.env.NODE_ENV === 'development' || process.env.ALLOW_DEBUG_TOGGLE === 'true';
  if (!allowed) {
    return res.status(403).json({ success: false, message: 'Not allowed in this environment' });
  }

  // Read current value from app.locals, default true
  const current = typeof req.app.locals.audioSignalingEnabled === 'boolean'
    ? req.app.locals.audioSignalingEnabled
    : true;

  const next = !current;
  req.app.locals.audioSignalingEnabled = next;
  console.log('Audio signaling enabled (debug router toggle):', next);
  res.json({ enabled: next });
});

// Simple in-memory metrics for development: rate-limit hits and other counters
router.get('/metrics', (req, res) => {
  const metrics = req.app.locals.rateLimitMetrics || { candidates: 0, musicSync: 0 };
  res.json({ success: true, metrics });
});

module.exports = router;

