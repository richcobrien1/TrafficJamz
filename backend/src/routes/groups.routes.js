const express = require('express');
const router = express.Router();
const groupService = require('../services/group.service');
const passport = require('passport');
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
 * @route GET /api/groups
 * @desc Get all groups for current user
 * @access Private
 */
router.get('/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const filters = {
        status: req.query.status,
        role: req.query.role
      };
      
      const groups = await groupService.getGroupsByUserId(req.user.user_id, filters);
      res.json({ success: true, groups });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/groups
 * @desc Create a new group
 * @access Private
 */
router.post('/',
  passport.authenticate('jwt', { session: false }),
  [
    body('name').isLength({ min: 3, max: 50 }).withMessage('Group name must be between 3 and 50 characters'),
    body('description').optional(),
    body('privacy_level').optional().isIn(['public', 'private', 'secret']).withMessage('Invalid privacy level'),
    body('max_members').optional().isInt({ min: 2, max: 100 }).withMessage('Max members must be between 2 and 100'),
    body('settings').optional().isObject().withMessage('Settings must be an object'),
    validate
  ],
  async (req, res) => {
    try {
      const groupData = {
        group_name: req.body.name,
        group_description: req.body.description,
        privacy_level: req.body.privacy_level,
        max_members: req.body.max_members,
        settings: req.body.settings,
        avatar_url: req.body.avatar_url
      };

      const group = await groupService.createGroup(groupData, req.user.user_id);
      res.status(201).json({ success: true, group });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route GET /api/groups/:group_id
 * @desc Get group by ID
 * @access Private
 */
router.get('/:group_id',
  passport.authenticate('jwt', { session: false }),
  [
    param('id').isMongoId().withMessage('Invalid group ID'),
    validate
  ],
  async (req, res) => {
    try {
      const group = await groupService.getGroupById(req.params.id);
      
      // Check if user is a member of the group
      if (!group.isMember(req.user.user_id)) {
        return res.status(403).json({ success: false, message: 'You are not a member of this group' });
      }
      
      res.json({ success: true, group });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route PUT /api/groups/:group_id
 * @desc Update group details
 * @access Private
 */
router.put('/:group_id',
  passport.authenticate('jwt', { session: false }),
  [
    param('id').isMongoId().withMessage('Invalid group ID'),
    body('name').optional().isLength({ min: 3, max: 50 }).withMessage('Group name must be between 3 and 50 characters'),
    body('description').optional(),
    body('privacy_level').optional().isIn(['public', 'private', 'secret']).withMessage('Invalid privacy level'),
    body('avatar_url').optional(),
    validate
  ],
  async (req, res) => {
    try {
      const updateData = {
        group_name: req.body.name,
        group_description: req.body.description,
        privacy_level: req.body.privacy_level,
        avatar_url: req.body.avatar_url
      };

      const group = await groupService.updateGroup(req.params.id, updateData, req.user.user_id);
      res.json({ success: true, group });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route PUT /api/groups/:group_id/settings
 * @desc Update group settings
 * @access Private
 */
router.put('/:group_id/settings',
  passport.authenticate('jwt', { session: false }),
  [
    param('id').isMongoId().withMessage('Invalid group ID'),
    body('settings').isObject().withMessage('Settings must be an object'),
    validate
  ],
  async (req, res) => {
    try {
      const settings = req.body.settings;
      const updatedSettings = await groupService.updateGroupSettings(req.params.id, settings, req.user.user_id);
      res.json({ success: true, settings: updatedSettings });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route DELETE /api/groups/:group_id
 * @desc Delete a group
 * @access Private
 */
router.delete('/:group_id',
  passport.authenticate('jwt', { session: false }),
  [
    param('id').isMongoId().withMessage('Invalid group ID'),
    validate
  ],
  async (req, res) => {
    try {
      await groupService.deleteGroup(req.params.id, req.user.user_id);
      res.json({ success: true, message: 'Group deleted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route GET /api/groups/:group_id/members
 * @desc Get group members
 * @access Private
 */
router.get('/:group_id/members',
  passport.authenticate('jwt', { session: false }),
  [
    param('id').isMongoId().withMessage('Invalid group ID'),
    validate
  ],
  async (req, res) => {
    try {
      const filters = {
        status: req.query.status,
        role: req.query.role
      };
      
      const members = await groupService.getGroupMembers(req.params.id, filters);
      res.json({ success: true, members });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/groups/:group_id/members
 * @desc Add member to group
 * @access Private
 */
router.post('/:group_id/members',
  passport.authenticate('jwt', { session: false }),
  [
    param('id').isMongoId().withMessage('Invalid group ID'),
    body('user_id').exists().withMessage('User ID is required'),
    body('role').optional().isIn(['member', 'admin']).withMessage('Invalid role'),
    validate
  ],
  async (req, res) => {
    try {
      const { user_id, role } = req.body;
      const group = await groupService.addGroupMember(req.params.id, user_id, role, req.user.user_id);
      res.status(201).json({ success: true, group });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route PUT /api/groups/:group_id/members/:userId
 * @desc Update group member
 * @access Private
 */
router.put('/:group_id/members/:userId',
  passport.authenticate('jwt', { session: false }),
  [
    param('id').isMongoId().withMessage('Invalid group ID'),
    param('userId').exists().withMessage('User ID is required'),
    body('role').optional().isIn(['member', 'admin']).withMessage('Invalid role'),
    body('status').optional().isIn(['active', 'inactive', 'muted']).withMessage('Invalid status'),
    body('nickname').optional(),
    validate
  ],
  async (req, res) => {
    try {
      const updateData = {
        role: req.body.role,
        status: req.body.status,
        nickname: req.body.nickname
      };

      const member = await groupService.updateGroupMember(req.params.id, req.params.userId, updateData, req.user.user_id);
      res.json({ success: true, member });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route DELETE /api/groups/:group_id/members/:userId
 * @desc Remove member from group
 * @access Private
 */
router.delete('/:group_id/members/:userId',
  passport.authenticate('jwt', { session: false }),
  [
    param('id').isMongoId().withMessage('Invalid group ID'),
    param('userId').exists().withMessage('User ID is required'),
    validate
  ],
  async (req, res) => {
    try {
      await groupService.removeGroupMember(req.params.id, req.params.userId, req.user.user_id);
      res.json({ success: true, message: 'Member removed successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/groups/:group_id/invitations
 * @desc Invite user to group
 * @access Private
 */
router.post('/:group_id/invitations',
  passport.authenticate('jwt', { session: false }),
  [
    param('id').isMongoId().withMessage('Invalid group ID'),
    body('email').isEmail().withMessage('Valid email is required'),
    validate
  ],
  async (req, res) => {
    try {
      const { email } = req.body;
      const invitation = await groupService.inviteToGroup(req.params.id, email, req.user.user_id);
      res.status(201).json({ success: true, invitation });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route GET /api/groups/:group_id/invitations
 * @desc Get group invitations
 * @access Private
 */
router.get('/:group_id/invitations',
  passport.authenticate('jwt', { session: false }),
  [
    param('id').isMongoId().withMessage('Invalid group ID'),
    validate
  ],
  async (req, res) => {
    try {
      const invitations = await groupService.getGroupInvitations(req.params.id, req.user.user_id);
      res.json({ success: true, invitations });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route DELETE /api/groups/:group_id/invitations/:invitationId
 * @desc Cancel group invitation
 * @access Private
 */
router.delete('/:group_id/invitations/:invitationId',
  passport.authenticate('jwt', { session: false }),
  [
    param('id').isMongoId().withMessage('Invalid group ID'),
    param('invitationId').isMongoId().withMessage('Invalid invitation ID'),
    validate
  ],
  async (req, res) => {
    try {
      await groupService.cancelInvitation(req.params.id, req.params.invitationId, req.user.user_id);
      res.json({ success: true, message: 'Invitation cancelled successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route GET /api/groups/invitations/me
 * @desc Get user invitations
 * @access Private
 */
router.get('/invitations/me',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const invitations = await groupService.getUserInvitations(req.user.user_id);
      res.json({ success: true, invitations });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/groups/invitations/:invitationId/accept
 * @desc Accept group invitation
 * @access Private
 */
router.post('/invitations/:invitationId/accept',
  passport.authenticate('jwt', { session: false }),
  [
    param('invitationId').isMongoId().withMessage('Invalid invitation ID'),
    validate
  ],
  async (req, res) => {
    try {
      const group = await groupService.acceptInvitation(req.params.invitationId, req.user.user_id);
      res.json({ success: true, group });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/groups/invitations/:invitationId/decline
 * @desc Decline group invitation
 * @access Private
 */
router.post('/invitations/:invitationId/decline',
  passport.authenticate('jwt', { session: false }),
  [
    param('invitationId').isMongoId().withMessage('Invalid invitation ID'),
    validate
  ],
  async (req, res) => {
    try {
      await groupService.declineInvitation(req.params.invitationId, req.user.user_id);
      res.json({ success: true, message: 'Invitation declined successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
