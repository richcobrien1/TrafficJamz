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

// Update the GET route for fetching all groups
router.get('/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const filters = {
        status: req.query.status,
        role: req.query.role
      };
      
      const groups = await groupService.getGroupsByUserId(req.user.user_id, filters);
      
      // Transform MongoDB groups to match frontend expectations
      const formattedGroups = groups.map(group => ({
        id: group._id.toString(), // Convert ObjectId to string
        name: group.group_name,
        description: group.group_description,
        avatar_url: group.avatar_url,
        privacy_level: group.privacy_level,
        status: group.status,
        members: (group.group_members || []).map(member => ({
          id: member._id ? member._id.toString() : null,
          user_id: member.user_id,
          role: member.role,
          status: member.status,
          joined_at: member.joined_at
        })),
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      }));
      
      res.json({ success: true, groups: formattedGroups });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// Update the POST route for creating a group
router.post('/',
  passport.authenticate('jwt', { session: false }),
  [
    body('group_name').isLength({ min: 3, max: 50 }).withMessage('Group name must be between 3 and 50 characters'),
    body('group_description').optional(),
    body('privacy_level').optional().isIn(['public', 'private', 'secret']).withMessage('Invalid privacy level'),
    body('max_members').optional().isInt({ min: 2, max: 100 }).withMessage('Max members must be between 2 and 100'),
    body('settings').optional().isObject().withMessage('Settings must be an object'),
    validate
  ],
  async (req, res) => {
    try {
      const groupData = {
        group_name: req.body.group_name,
        group_description: req.body.group_description,
        privacy_level: req.body.privacy_level,
        max_members: req.body.max_members,
        settings: req.body.settings,
        avatar_url: req.body.avatar_url
      };

      console.log('group.routes.js - 64: =>>>  ' + req.body.group_name + ' - ' + req.body.group_description + ' : ' + req.user.user_id)

      const group = await groupService.createGroup(groupData, req.user.user_id);
      
      // Format the response to match frontend expectations
      const formattedGroup = {
        id: group._id.toString(),
        name: group.group_name,
        description: group.group_description,
        avatar_url: group.avatar_url,
        privacy_level: group.privacy_level,
        status: group.status,
        members: (group.group_members || []).map(member => ({
          id: member._id ? member._id.toString() : null,
          user_id: member.user_id,
          role: member.role,
          status: member.status,
          joined_at: member.joined_at
        })),
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      };
      
      res.status(201).json({ 
        success: true, 
        group: formattedGroup 
      });

    } catch (error) {
      console.error('Group creation error:', error);
    
      // Handle specific MongoDB errors
      if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
        return res.status(500).json({
          success: false,
          message: 'Database operation timed out. Please try again.'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create group. Please try again.'
      });
    }
  }
);

// Update the GET route for fetching a specific group
router.get('/:group_id',
  passport.authenticate('jwt', { session: false }),
  [
    param('group_id').isMongoId().withMessage('Invalid group ID'),
    validate
  ],
  async (req, res) => {
    try {
      const group = await groupService.getGroupById(req.params.group_id);
      
      // Check if user is a member of the group
      if (!group.isMember(req.user.user_id)) {
        return res.status(403).json({ success: false, message: 'You are not a member of this group' });
      }
      
      // Format the response to match frontend expectations
      const formattedGroup = {
        id: group._id.toString(),
        name: group.group_name,
        description: group.group_description,
        avatar_url: group.avatar_url,
        privacy_level: group.privacy_level,
        status: group.status,
        members: (group.group_members || []).map(member => ({
          id: member._id ? member._id.toString() : null,
          user_id: member.user_id,
          role: member.role,
          status: member.status,
          joined_at: member.joined_at
        })),
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      };
      
      res.json({ success: true, group: formattedGroup });
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
router.put('/:group_id',
  passport.authenticate('jwt', { session: false }),
  [
    param('group_id').isMongoId().withMessage('Invalid group ID'), // Change 'id' to 'group_id'
    body('group_name').optional().isLength({ min: 3, max: 50 }).withMessage('Group name must be between 3 and 50 characters'),
    body('group_description').optional(),
    body('privacy_level').optional().isIn(['public', 'private', 'secret']).withMessage('Invalid privacy level'),
    body('avatar_url').optional(),
    validate
  ],
  async (req, res) => {
    try {
      const updateData = {
        group_name: req.body.group_name,
        group_description: req.body.group_description,
        privacy_level: req.body.privacy_level,
        avatar_url: req.body.avatar_url
      };

      console.log('group.routes.js - PUT: group_id:', req.params.group_id, 'group_name:', req.body.group_name);

      // Use group_id parameter name to match route
      const group = await groupService.updateGroup(req.params.group_id, updateData, req.user.user_id);
      
      // Format response for frontend
      const formattedGroup = {
        id: group._id.toString(),
        name: group.group_name,
        description: group.group_description,
        avatar_url: group.avatar_url,
        privacy_level: group.privacy_level,
        status: group.status,
        members: (group.group_members || []).map(member => ({
          id: member._id ? member._id.toString() : null,
          user_id: member.user_id,
          role: member.role,
          status: member.status,
          joined_at: member.joined_at
        })),
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      };
      
      res.json({ success: true, group: formattedGroup });
    } catch (error) {
      console.error('Group update error:', error);
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
    param('group_id').isMongoId().withMessage('Invalid group ID'),  // Change from 'id' to 'group_id'
    validate
  ],
  async (req, res) => {
    try {
      await groupService.deleteGroup(req.params.group_id, req.user.user_id);  // Change from req.params.id to req.params.group_id
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
    param('group_id').isMongoId().withMessage('Invalid group ID'),  // Change from 'id' to 'group_id'
    body('email').isEmail().withMessage('Valid email is required'),
    validate
  ],
  async (req, res) => {
    try {
      const { email } = req.body;
      const invitation = await groupService.inviteToGroup(req.params.group_id, email, req.user.user_id);  // Change from req.params.id to req.params.group_id
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
