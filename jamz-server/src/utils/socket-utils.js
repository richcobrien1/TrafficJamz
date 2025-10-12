// Utility helpers for socket handling
function requireSessionId(data, opts = {}) {
  const { socketId, logger } = opts;
  if (!data || (!data.sessionId && !data.session_id)) {
    // Log truncated payload for diagnostics (avoid logging large or sensitive data)
    try {
      const s = JSON.stringify(data);
      const truncated = s.length > 200 ? s.slice(0, 200) + '...[truncated]' : s;
      (logger || console).warn(`Malformed socket payload${socketId ? ' from ' + socketId : ''} (no sessionId):`, truncated);
    } catch (e) {
      (logger || console).warn(`Malformed socket payload${socketId ? ' from ' + socketId : ''}: [unserializable]`);
    }
    return null;
  }
  return data.sessionId || data.session_id;
}

module.exports = { requireSessionId };
