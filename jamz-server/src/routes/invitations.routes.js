const express = require('express');
const router = express.Router();
const groupService = require('../services/group.service');
const Group = require('../models/group.model'); // Add this import
const { body, param, validationResult } = require('express-validator');

// Middleware to validate request
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @route GET /api/invitations/debug
 * @desc Debug route
 * @access Public
 */
router.get('/debug', (req, res) => {
  res.json({
    success: true,
    message: 'Invitations route is working',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route GET /api/invitations/:groupId/:invitationIndex
 * @desc Show invitation acceptance page
 * @access Public
 */
router.get('/:groupId/:invitationIndex',
  [
    param('groupId').isLength({ min: 1 }).withMessage('Group ID is required'),
    param('invitationIndex').isInt({ min: 0 }).withMessage('Invalid invitation index'),
    validate
  ],
  async (req, res) => {
    try {
      const { groupId, invitationIndex } = req.params;
      const index = parseInt(invitationIndex);

      console.log(`Looking for invitation: groupId=${groupId}, index=${index}`);

      // TEMP: Use direct MongoDB query instead of service
      console.log('Finding group directly in MongoDB...');
      const group = await Group.findById(groupId);
      console.log('Direct MongoDB result:', group ? 'found' : 'not found');

      if (!group) {
        console.log('Group not found in database');
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }

      console.log('Group raw data:', {
        id: group._id,
        name: group.group_name,
        hasInvitations: !!group.invitations,
        invitationsCount: group.invitations ? group.invitations.length : 0
      });

      // Check if invitation exists at the specified index
      if (!group.invitations || index >= group.invitations.length) {
        console.log(`Invitation not found at index ${index}`);
        return res.status(404).json({
          success: false,
          message: `Invitation not found at index ${index}`,
          debug: {
            hasInvitations: !!group.invitations,
            invitationsLength: group.invitations ? group.invitations.length : 0,
            requestedIndex: index
          }
        });
      }

      const invitation = group.invitations[index];
      console.log('Raw invitation data:', invitation);

      // Check if invitation is pending
      if (invitation.status !== 'pending') {
        console.log(`Invitation status is ${invitation.status}`);
        return res.status(400).json({
          success: false,
          message: `Invitation has already been ${invitation.status}`
        });
      }

      // Check if invitation is expired
      if (invitation.expires_at < new Date()) {
        console.log('Invitation has expired');
        return res.status(400).json({
          success: false,
          message: 'Invitation has expired'
        });
      }

      console.log('Invitation is valid, returning data...');

      // Return invitation details
      res.json({
        success: true,
        invitationId: invitation._id.toString(),
        invitation: {
          id: invitation._id.toString(),
          email: invitation.email,
          invited_by: invitation.invited_by,
          invited_at: invitation.invited_at,
          expires_at: invitation.expires_at
        },
        group: {
          id: group._id.toString(),
          name: group.group_name,
          description: group.group_description,
          avatar_url: group.avatar_url
        }
      });

    } catch (error) {
      console.error('Error fetching invitation:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(500).json({
        success: false,
        message: 'Failed to load invitation',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/invitations/:invitationId/accept
 * @desc Accept group invitation
 * @access Private (for registered users) or Public (for new users with form data)
 */
router.post('/:invitationId/accept',
  (req, res, next) => {
    // If token is provided, authenticate; otherwise, allow for new users
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });
        req.user = user;
        next();
      })(req, res, next);
    } else {
      // No token, proceed for new users (validation will check required fields)
      next();
    }
  },
  [
    param('invitationId').isLength({ min: 1 }).withMessage('Invitation ID is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('firstName').optional().isLength({ min: 1 }).withMessage('First name is required'),
    body('lastName').optional().isLength({ min: 1 }).withMessage('Last name is required'),
    body('mobilePhone').optional().isLength({ min: 1 }).withMessage('Mobile phone is required'),
    validate
  ],
  async (req, res) => {
    try {
      const { invitationId } = req.params;
      const { firstName, lastName, mobilePhone, email } = req.body;

      console.log(`Accepting invitation: ${invitationId}`);
      console.log(`Request body:`, { firstName, lastName, mobilePhone, email });
      console.log(`Authenticated user:`, req.user ? req.user.username : 'None');

      let userData = { firstName, lastName, mobilePhone, email };

      // If user is authenticated, use their data and override
      if (req.user) {
        userData = {
          firstName: req.user.first_name,
          lastName: req.user.last_name,
          mobilePhone: req.user.phone_number,
          email: req.user.email
        };
        console.log('Using authenticated user data:', userData);
      } else {
        // For new users, ensure required fields are provided
        if (!firstName || !lastName || !mobilePhone) {
          return res.status(400).json({
            success: false,
            message: 'First name, last name, and mobile phone are required for new users'
          });
        }
      }

      // Use the existing acceptInvitation method from groupService
      groupService.acceptInvitation(req, res, userData);

    } catch (error) {
      console.error('Error accepting invitation:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to accept invitation',
        error: error.message
      });
    }
  }
);

module.exports = router;