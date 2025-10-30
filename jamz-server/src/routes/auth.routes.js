// auth.routes.js
// This file contains the authentication routes for user registration, login, and MFA setup.

const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');
const passport = require('passport');
const { body, validationResult } = require('express-validator');

// Initialize social auth strategies
require('../config/social-auth');

// Middleware to validate request
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', [
  body('username').isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
  body('email').isEmail().withMessage('Must be a valid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  validate
], async (req, res) => {
  try {
    const userData = {
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      phone_number: req.body.phone_number
    };

    const user = await userService.register(userData);

    // Generate tokens for the newly created user so the frontend can
    // behave the same as a login (store token, set user).
    try {
      const tokens = userService.generateTokens(user);
      return res.status(201).json({
        success: true,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        user
      });
    } catch (tokenErr) {
      // If token generation fails, still return created user but warn
      console.error('Registration token generation failed:', tokenErr);
      return res.status(201).json({ success: true, message: user });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Authenticate user & get token
 * @access Public
 */
router.post('/login', [
  body('email').isEmail().withMessage('Must be a valid email address'),
  body('password').exists().withMessage('Password is required'),
  validate
], async (req, res) => {
  try {
    console.log('Login attempt for:', req.body.email);
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
      POSTGRES_HOST: process.env.POSTGRES_HOST
    });

    const { email, password } = req.body;
    console.log('Calling userService.login with email:', email);

    const result = await userService.login(email, password);
    console.log('Login successful for:', email);

    res.status(200).json({
      success: true,
      access_token: result.access_token,       // ✅ renamed for frontend compatibility
      refresh_token: result.refresh_token,
      token_type: result.token_type,
      user: result.user
    });
  } catch (error) {
    console.error('Login error details:', error);
    res.status(401).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/auth/refresh-token
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh-token', [
  body('refresh_token').exists().withMessage('Refresh token is required'),
  validate
], async (req, res) => {
  try {
    const { refresh_token } = req.body;
    const tokens = await userService.refreshToken(refresh_token);
    res.json({ success: true, ...tokens });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset
 * @access Public
 */
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Must be a valid email address'),
  validate
], async (req, res) => {
  try {
    const { email } = req.body;
    await userService.requestPasswordReset(email);
    res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent' });
  }
});

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password', [
  body('token').exists().withMessage('Reset token is required'),
  body('email').isEmail().withMessage('Must be a valid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  validate
], async (req, res) => {
  try {
    const { token, email, password } = req.body;
    await userService.resetPassword(token, email, password);
    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/auth/verify-mfa
 * @desc Verify MFA code
 * @access Private
 */
router.post('/verify-mfa', 
  passport.authenticate('jwt', { session: false }),
  [
    body('code').exists().withMessage('MFA code is required'),
    validate
  ], 
  async (req, res) => {
    try {
      const { code } = req.body;
      const isValid = await userService.verifyMFA(req.user.user_id, code);
      
      if (isValid) {
        res.json({ success: true, message: 'MFA verification successful' });
      } else {
        res.status(401).json({ success: false, message: 'Invalid MFA code' });
      }
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/auth/logout
 * @desc Logout user (client-side token removal is primary, this is for server-side cleanup)
 * @access Private
 */
router.post('/logout', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    // For JWT, logout is primarily handled client-side by removing the token
    // This endpoint can be used for server-side cleanup if needed (e.g., token blacklisting)
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

/**
 * @route GET /api/auth/check-user/:email
 * @desc Check if user exists (diagnostic endpoint)
 * @access Public
 */
router.get('/check-user/:email', async (req, res) => {
  try {
    const user = await userService.getUserByEmail(req.params.email);
    res.json({ 
      success: true, 
      exists: !!user,
      username: user?.username,
      user_id: user?.user_id
    });
  } catch (error) {
    res.json({ success: true, exists: false, error: error.message });
  }
});

/**
 * SOCIAL AUTHENTICATION ROUTES
 */

/**
 * @route GET /api/auth/facebook
 * @desc Initiate Facebook OAuth login
 * @access Public
 */
router.get('/facebook',
  passport.authenticate('facebook', { scope: ['email', 'public_profile'] })
);

/**
 * @route GET /api/auth/facebook/callback
 * @desc Facebook OAuth callback
 * @access Public
 */
router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login?error=facebook_auth_failed' }),
  async (req, res) => {
    try {
      // Generate tokens for the authenticated user
      const tokens = userService.generateTokens(req.user);

      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/auth/callback?` +
        `access_token=${tokens.access_token}&` +
        `refresh_token=${tokens.refresh_token}&` +
        `provider=facebook`;

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Facebook callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5174'}/login?error=token_generation_failed`);
    }
  }
);

/**
 * @route GET /api/auth/linkedin
 * @desc Initiate LinkedIn OAuth login
 * @access Public
 */
router.get('/linkedin',
  passport.authenticate('linkedin')
);

/**
 * @route GET /api/auth/linkedin/callback
 * @desc LinkedIn OAuth callback
 * @access Public
 */
router.get('/linkedin/callback',
  passport.authenticate('linkedin', { failureRedirect: '/login?error=linkedin_auth_failed' }),
  async (req, res) => {
    try {
      // Generate tokens for the authenticated user
      const tokens = userService.generateTokens(req.user);

      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/auth/callback?` +
        `access_token=${tokens.access_token}&` +
        `refresh_token=${tokens.refresh_token}&` +
        `provider=linkedin`;

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('LinkedIn callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5174'}/login?error=token_generation_failed`);
    }
  }
);

/**
 * @route GET /api/auth/x
 * @desc Initiate X (Twitter) OAuth login
 * @access Public
 */
router.get('/x',
  passport.authenticate('twitter')
);

/**
 * @route GET /api/auth/x/callback
 * @desc X (Twitter) OAuth callback
 * @access Public
 */
router.get('/x/callback',
  passport.authenticate('twitter', { failureRedirect: '/login?error=x_auth_failed' }),
  async (req, res) => {
    try {
      // Generate tokens for the authenticated user
      const tokens = userService.generateTokens(req.user);

      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/auth/callback?` +
        `access_token=${tokens.access_token}&` +
        `refresh_token=${tokens.refresh_token}&` +
        `provider=x`;

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('X callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5174'}/login?error=token_generation_failed`);
    }
  }
);

/**
 * @route POST /api/auth/link-social
 * @desc Link social account to existing user
 * @access Private
 */
router.post('/link-social',
  passport.authenticate('jwt', { session: false }),
  [
    body('provider').isIn(['facebook', 'linkedin', 'x']).withMessage('Invalid provider'),
    body('access_token').exists().withMessage('Access token is required'),
    validate
  ],
  async (req, res) => {
    try {
      const { provider, access_token, profile_data } = req.body;
      const user_id = req.user.user_id;

      // Update user's social accounts
      const user = await userService.getUserById(user_id);
      user.social_accounts = {
        ...user.social_accounts,
        [provider]: {
          ...profile_data,
          access_token,
          last_updated: new Date()
        }
      };
      await user.save();

      res.json({ success: true, message: `${provider} account linked successfully` });
    } catch (error) {
      console.error('Link social account error:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route DELETE /api/auth/unlink-social
 * @desc Unlink social account from user
 * @access Private
 */
router.delete('/unlink-social',
  passport.authenticate('jwt', { session: false }),
  [
    body('provider').isIn(['facebook', 'linkedin', 'x']).withMessage('Invalid provider'),
    validate
  ],
  async (req, res) => {
    try {
      const { provider } = req.body;
      const user_id = req.user.user_id;

      // Remove social account
      const user = await userService.getUserById(user_id);
      if (user.social_accounts && user.social_accounts[provider]) {
        delete user.social_accounts[provider];
        await user.save();
      }

      res.json({ success: true, message: `${provider} account unlinked successfully` });
    } catch (error) {
      console.error('Unlink social account error:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
