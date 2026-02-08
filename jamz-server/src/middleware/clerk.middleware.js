// Clerk authentication middleware for Express
const { ClerkExpressRequireAuth, ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');

/**
 * Middleware that requires authentication.
 * Blocks requests without valid Clerk session token.
 * Use this for protected routes.
 * 
 * Usage:
 *   app.get('/api/protected', requireAuth(), (req, res) => {
 *     const userId = req.auth.userId;
 *     // ... handle request
 *   });
 */
const requireAuth = () => {
  return ClerkExpressRequireAuth({
    // Optional: customize unauthorized response
    onError: (error) => {
      console.error('Clerk auth error:', error);
      return {
        status: 401,
        message: 'Unauthorized - Please sign in'
      };
    }
  });
};

/**
 * Middleware that optionally attaches auth data.
 * Allows requests through whether authenticated or not.
 * Use this for routes that have different behavior for logged-in users.
 * 
 * Usage:
 *   app.get('/api/optional', withAuth(), (req, res) => {
 *     const userId = req.auth?.userId; // May be undefined
 *     // ... handle request
 *   });
 */
const withAuth = () => {
  return ClerkExpressWithAuth();
};

/**
 * Extract user info from Clerk auth object.
 * Call this after requireAuth() or withAuth() middleware.
 * 
 * @param {Object} req - Express request object
 * @returns {Object|null} User info object or null if not authenticated
 */
const getUserInfo = (req) => {
  if (!req.auth || !req.auth.userId) {
    return null;
  }

  return {
    userId: req.auth.userId,
    sessionId: req.auth.sessionId,
    claims: req.auth.sessionClaims
  };
};

module.exports = {
  requireAuth,
  withAuth,
  getUserInfo
};
