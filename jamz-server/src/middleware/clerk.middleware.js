// Clerk authentication middleware for Express
const { ClerkExpressRequireAuth, ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const User = require('../models/user.model');

/**
 * Middleware that maps Clerk user to internal TrafficJamz user.
 * Attaches req.user with internal user_id for compatibility with existing routes.
 * Creates user record if doesn't exist (first-time Clerk login).
 */
const attachInternalUser = async (req, res, next) => {
  try {
    if (!req.auth || !req.auth.userId) {
      return next();
    }

    const clerkUserId = req.auth.userId;
    const clerkEmail = req.auth.sessionClaims?.email;
    
    // Find or create internal user
    let user = await User.findOne({ 
      where: { clerk_user_id: clerkUserId } 
    });

    if (!user && clerkEmail) {
      // Try to find by email (existing user migrating to Clerk)
      user = await User.findOne({ 
        where: { email: clerkEmail } 
      });

      if (user) {
        // Link existing user to Clerk
        await user.update({ clerk_user_id: clerkUserId });
        console.log(`Linked existing user ${user.user_id} to Clerk ID ${clerkUserId}`);
      } else {
        // Create new user from Clerk data
        const userData = {
          clerk_user_id: clerkUserId,
          email: clerkEmail,
          username: clerkEmail.split('@')[0] + '_' + Date.now(), // Generate unique username
          first_name: req.auth.sessionClaims?.firstName || null,
          last_name: req.auth.sessionClaims?.lastName || null,
          profile_image_url: req.auth.sessionClaims?.imageUrl || null,
          status: 'active'
        };

        user = await User.create(userData);
        console.log(`Created new user ${user.user_id} from Clerk ID ${clerkUserId}`);
      }
    }

    if (user) {
      // Update last login
      await user.update({ last_login: new Date() });
      
      // Attach user to request (compatible with existing code)
      req.user = user;
      req.internalUserId = user.user_id;
    }

    next();
  } catch (error) {
    console.error('Error attaching internal user:', error);
    next(error);
  }
};

/**
 * Middleware that requires authentication.
 * Blocks requests without valid Clerk session token.
 * Use this for protected routes.
 * 
 * Usage:
 *   app.get('/api/protected', requireAuth(), (req, res) => {
 *     const userId = req.user.user_id; // Internal user_id
 *     // ... handle request
 *   });
 */
const requireAuth = () => {
  return [
    ClerkExpressRequireAuth({
      onError: (error) => {
        console.error('Clerk auth error:', error);
        return {
          status: 401,
          message: 'Unauthorized - Please sign in'
        };
      }
    }),
    attachInternalUser
  ];
};

/**
 * Middleware that optionally attaches auth data.
 * Allows requests through whether authenticated or not.
 * Use this for routes that have different behavior for logged-in users.
 * 
 * Usage:
 *   app.get('/api/optional', withAuth(), (req, res) => {
 *     const userId = req.user?.user_id; // May be undefined
 *     // ... handle request
 *   });
 */
const withAuth = () => {
  return [
    ClerkExpressWithAuth(),
    attachInternalUser
  ];
};

/**
 * Extract user info from request.
 * Works with both Clerk auth and attached internal user.
 * 
 * @param {Object} req - Express request object
 * @returns {Object|null} User info object or null if not authenticated
 */
const getUserInfo = (req) => {
  if (!req.user) {
    return null;
  }

  return {
    userId: req.user.user_id, // Internal UUID
    clerkUserId: req.user.clerk_user_id, // Clerk ID
    email: req.user.email,
    username: req.user.username,
    firstName: req.user.first_name,
    lastName: req.user.last_name,
    sessionId: req.auth?.sessionId
  };
};

module.exports = {
  requireAuth,
  withAuth,
  getUserInfo,
  attachInternalUser
};

