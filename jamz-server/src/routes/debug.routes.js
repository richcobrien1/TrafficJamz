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

// Accept client-side logs for remote debugging
// This endpoint is intentionally development-only to avoid exposing a logging
// channel in production. Clients (mobile browsers) can POST JSON payloads like
// { level: 'info'|'warn'|'error', message: 'text', meta: { ... } }
// The server will print the message and return 204.
router.post('/log', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ success: false, message: 'Debug log endpoint disabled' });
  }

  const { level = 'info', message = '', meta = {} } = req.body || {};

  const clientInfo = {
    ip: req.ip || req.connection && req.connection.remoteAddress,
    origin: req.headers.origin,
    ua: req.headers['user-agent']
  };

  const logPayload = {
    level,
    message,
    meta,
    client: clientInfo,
    timestamp: new Date().toISOString()
  };

  // Pretty-print to server console to make it easy to find
  if (level === 'error') console.error('📱 [client-log][error]', JSON.stringify(logPayload, null, 2));
  else if (level === 'warn') console.warn('📱 [client-log][warn]', JSON.stringify(logPayload, null, 2));
  else console.log('📱 [client-log][info]', JSON.stringify(logPayload, null, 2));

  // Return no-content to callers
  res.status(204).end();
});

// Development-only: send a test invitation email. Accepts JSON body:
// { email: string, groupId?: string }
// If groupId is provided, the endpoint will attempt to use groupService.inviteToGroup
// to create a proper invitation record. Otherwise it will call the email service
// directly to send an ad-hoc invitation email. Returns send result (including
// Ethereal preview URL in dev).
router.post('/send-test-invite', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ success: false, message: 'Test invite endpoint disabled' });
  }

  const { email, groupId } = req.body || {};
  if (!email) return res.status(400).json({ success: false, message: 'Missing email' });

  try {
    if (groupId) {
      // Lazy-require to avoid cycles
      const groupService = require('../services/group.service');
      const inviterId = req.user && req.user.id ? req.user.id : 'debug-inviter';
      const result = await groupService.inviteToGroup(groupId, email, inviterId);
      return res.json({ success: true, result });
    }

    // No group - send a direct test email using email service
    const emailService = require('../services/email.service');
    const front = process.env.FRONTEND_URL || 'http://localhost:5173';
    const invitationLink = `${front}/invitations/debug-test`;
    const sendResult = await emailService.sendInvitationEmail(email, {
      groupName: 'TrafficJamz (Test)',
      inviterName: 'Debug Tester',
      inviterFullName: 'Debug Tester',
      inviterHandle: 'debug-tester',
      invitationLink
    });
    return res.json({ success: true, sendResult, invitationLink });
  } catch (err) {
    console.error('Error in debug send-test-invite:', err);
    return res.status(500).json({ success: false, message: err.message, error: err });
  }
});

module.exports = router;

