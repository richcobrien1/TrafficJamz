const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');
const passport = require('passport');
const { body, validationResult } = require('express-validator');

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
    res.status(201).json({ success: true, message: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /auth/login
 * @desc Authenticate user & get token
 * @access Public
 */
router.post('/login', [
  body('email').isEmail().withMessage('Must be a valid email address'),
  body('password').exists().withMessage('Password is required'),
  validate
], async (req, res) => {
  try {
    // Add debug logging here
    console.log('Login attempt for:', req.body.email);
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
      POSTGRES_HOST: process.env.POSTGRES_HOST
    });
    
    const { email, password } = req.body; // Extract from request body
    
    // Additional debug logging before calling userService
    console.log('Calling userService.login with email:', email);
    
    const result = await userService.login(email, password);
    
    // Log successful login
    console.log('Login successful for:', email);
    
    res.json({ success: true, ...result });
  } catch (error) {
    // Log login failure with error details
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
    // Always return success to prevent email enumeration
    res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent' });
  } catch (error) {
    // Log error but don't expose it to client
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
 * @route POST /api/auth/setup-mfa
 * @desc Setup MFA for user
 * @access Private
 */
router.post('/setup-mfa',
  passport.authenticate('jwt', { session: false }),
  [
    body('method').isIn(['app', 'sms', 'email']).withMessage('Invalid MFA method'),
    validate
  ],
  async (req, res) => {
    try {
      const { method } = req.body;
      const result = await userService.setupMFA(req.user.user_id, method);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
