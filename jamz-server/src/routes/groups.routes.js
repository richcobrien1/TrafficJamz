const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Group = require('../models/group.model');
const groupService = require('../services/group.service');
const passport = require('passport');
const { body, param, validationResult } = require('express-validator');

// Import MongoDB connection status checker
// Adjust the path if needed based on your project structure
const { isMongoDBConnected } = require('../config/mongodb');

// Middleware to validate request
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Middleware to check MongoDB connection before proceeding
const checkMongoDBConnection = (req, res, next) => {
  if (!isMongoDBConnected()) {
    console.warn('MongoDB connection not established for request:', req.originalUrl);
    return res.status(503).json({ 
      success: false, 
      message: 'Database service unavailable. Please try again later.',
      error: 'MONGODB_UNAVAILABLE'
    });
  }
  next();
};

// Update the GET route for fetching all groups
router.get('/',
  passport.authenticate('jwt', { session: false }),
  checkMongoDBConnection, // Add MongoDB connection check
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
      console.error('Error fetching groups:', error);
      
      // Enhanced error handling
      if (error.name === 'MongooseError' || error.name === 'MongoError') {
        return res.status(500).json({ 
          success: false, 
          message: 'Database operation failed. Please try again later.',
          error: error.message
        });
      }
      
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// Update the POST route for creating a group
router.post('/',
  passport.authenticate('jwt', { session: false }),
  checkMongoDBConnection, // Add MongoDB connection check
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

      // Set a timeout for the database operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timed out')), 10000)
      );
      
      // Execute the group creation with a timeout
      const groupPromise = groupService.createGroup(groupData, req.user.user_id);
      const group = await Promise.race([groupPromise, timeoutPromise]);
      
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
    
      // Enhanced error handling with specific error types
      if (error.message === 'Database operation timed out') {
        return res.status(504).json({
          success: false,
          message: 'Database operation timed out. Please try again.',
          error: 'TIMEOUT'
        });
      }
      
      if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
        return res.status(504).json({
          success: false,
          message: 'Database operation timed out. Please try again.',
          error: 'BUFFER_TIMEOUT'
        });
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        return res.status(500).json({
          success: false,
          message: 'Database error occurred. Please try again later.',
          error: error.code || 'MONGO_ERROR'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create group. Please try again.',
        error: 'BAD_REQUEST'
      });
    }
  }
);

// Update the GET route for fetching a specific group
router.get('/:group_id',
  passport.authenticate('jwt', { session: false }),
  checkMongoDBConnection, // Add MongoDB connection check
  [
    param('group_id').isMongoId().withMessage('Invalid group ID for get group'),
    validate
  ],
  async (req, res) => {
    try {
      // Set a timeout for the database operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timed out')), 10000)
      );
      
      // Execute the group fetch with a timeout
      const groupPromise = groupService.getGroupById(req.params.group_id);
      const group = await Promise.race([groupPromise, timeoutPromise]);
      
      // Instead of calling group.isMember, check if the user is a member manually
      const isMember = group.members && Array.isArray(group.members) && 
                      group.members.some(member => member.user_id === req.user.user_id);
      
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'You are not a member of this group' });
      }
      
      res.json({ success: true, group });
    } catch (error) {
      console.error('Error fetching group details:', error);
      
      // Enhanced error handling
      if (error.message === 'Database operation timed out') {
        return res.status(504).json({
          success: false,
          message: 'Database operation timed out. Please try again.',
          error: 'TIMEOUT'
        });
      }
      
      if (error.name === 'CastError') {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid group ID format',
          error: 'INVALID_ID'
        });
      }
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          success: false, 
          message: error.message,
          error: 'NOT_FOUND'
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching group details',
        error: error.message
      });
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
  checkMongoDBConnection, // Add MongoDB connection check
  [
    param('group_id').isMongoId().withMessage('Invalid group ID for change group'),
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

      // Set a timeout for the database operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timed out')), 10000)
      );
      
      // Execute the group update with a timeout
      const groupPromise = groupService.updateGroup(req.params.group_id, updateData, req.user.user_id);
      const group = await Promise.race([groupPromise, timeoutPromise]);
      
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
      
      // Enhanced error handling
      if (error.message === 'Database operation timed out') {
        return res.status(504).json({
          success: false,
          message: 'Database operation timed out. Please try again.',
          error: 'TIMEOUT'
        });
      }
      
      if (error.name === 'CastError') {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid group ID format',
          error: 'INVALID_ID'
        });
      }
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          success: false, 
          message: error.message,
          error: 'NOT_FOUND'
        });
      }
      
      res.status(400).json({ 
        success: false, 
        message: error.message,
        error: 'UPDATE_FAILED'
      });
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
  checkMongoDBConnection, // Add MongoDB connection check
  [
    param('group_id').isMongoId().withMessage('Invalid group ID for delete group'),
    validate
  ],
  async (req, res) => {
    try {
      // Set a timeout for the database operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timed out')), 10000)
      );
      
      // Execute the group deletion with a timeout
      const deletePromise = groupService.deleteGroup(req.params.group_id, req.user.user_id);
      await Promise.race([deletePromise, timeoutPromise]);
      
      res.json({ success: true, message: 'Group deleted successfully' });
    } catch (error) {
      console.error('Group deletion error:', error);
      
      // Enhanced error handling
      if (error.message === 'Database operation timed out') {
        return res.status(504).json({
          success: false,
          message: 'Database operation timed out. Please try again.',
          error: 'TIMEOUT'
        });
      }
      
      if (error.name === 'CastError') {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid group ID format',
          error: 'INVALID_ID'
        });
      }
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          success: false, 
          message: error.message,
          error: 'NOT_FOUND'
        });
      }
      
      res.status(400).json({ 
        success: false, 
        message: error.message,
        error: 'DELETE_FAILED'
      });
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
  checkMongoDBConnection, // Add MongoDB connection check
  [
    param('group_id').isMongoId().withMessage('Invalid group ID for get group'),
    validate
  ],
  async (req, res) => {
    try {
      const filters = {
        status: req.query.status,
        role: req.query.role
      };
      
      // Set a timeout for the database operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timed out')), 10000)
      );
      
      // Execute the members fetch with a timeout
      const membersPromise = groupService.getGroupMembers(req.params.group_id, filters);
      const members = await Promise.race([membersPromise, timeoutPromise]);
      
      res.json({ success: true, members });
    } catch (error) {
      console.error('Error fetching group members:', error);
      
      // Enhanced error handling
      if (error.message === 'Database operation timed out') {
        return res.status(504).json({
          success: false,
          message: 'Database operation timed out. Please try again.',
          error: 'TIMEOUT'
        });
      }
      
      res.status(400).json({ 
        success: false, 
        message: error.message,
        error: 'FETCH_FAILED'
      });
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
  checkMongoDBConnection, // Add MongoDB connection check
  [
    param('group_id').isMongoId().withMessage('Invalid group ID for add member to group'),
    body('user_id').exists().withMessage('User ID is required'),
    body('role').optional().isIn(['member', 'admin']).withMessage('Invalid role'),
    validate
  ],
  async (req, res) => {
    try {
      const { user_id, role } = req.body;
      
      // Set a timeout for the database operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timed out')), 10000)
      );
      
      // Execute the add member operation with a timeout
      const groupPromise = groupService.addGroupMember(req.params.group_id, user_id, role, req.user.user_id);
      const group = await Promise.race([groupPromise, timeoutPromise]);
      
      res.status(201).json({ success: true, group });
    } catch (error) {
      console.error('Error adding group member:', error);
      
      // Enhanced error handling
      if (error.message === 'Database operation timed out') {
        return res.status(504).json({
          success: false,
          message: 'Database operation timed out. Please try again.',
          error: 'TIMEOUT'
        });
      }
      
      res.status(400).json({ 
        success: false, 
        message: error.message,
        error: 'ADD_MEMBER_FAILED'
      });
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
  checkMongoDBConnection, // Add MongoDB connection check
  [
    param('group_id').isMongoId().withMessage('Invalid group ID'),
    validate
  ],
  async (req, res) => {
    try {
      // Set a timeout for the database operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timed out')), 10000)
      );
      
      // Execute the invitations fetch with a timeout
      const invitationsPromise = groupService.getGroupInvitations(req.params.group_id, req.user.user_id);
      const invitations = await Promise.race([invitationsPromise, timeoutPromise]);
      
      res.json({ success: true, invitations });
    } catch (error) {
      console.error('Error fetching group invitations:', error);
      
      // Enhanced error handling
      if (error.message === 'Database operation timed out') {
        return res.status(504).json({
          success: false,
          message: 'Database operation timed out. Please try again.',
          error: 'TIMEOUT'
        });
      }
      
      if (error.name === 'CastError') {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid group ID format',
          error: 'INVALID_ID'
        });
      }
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          success: false, 
          message: error.message,
          error: 'NOT_FOUND'
        });
      }
      
      res.status(400).json({ 
        success: false, 
        message: error.message,
        error: 'FETCH_INVITATIONS_FAILED'
      });
    }
  }
);
router.post('/:group_id/invitations',
  passport.authenticate('jwt', { session: false }),
  checkMongoDBConnection, // Add MongoDB connection check
  [
    param('group_id').isLength({ min: 1 }).withMessage('Group ID is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('text').optional().isString().withMessage('Text message must be a string')
  ],
  validate,
  async (req, res) => {
    try {
      const { email, text } = req.body;
      
      // Set a timeout for the database operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timed out')), 10000)
      );
      
      // Execute the invitation creation with a timeout
      const invitationPromise = groupService.inviteToGroup(req.params.group_id, email, req.user.user_id);
      const invitation = await Promise.race([invitationPromise, timeoutPromise]);
      
      res.status(201).json({ 
        success: true, 
        message: 'Invitation sent successfully',
        invitation: {
          id: invitation._id,
          email: invitation.email,
          invited_by: invitation.invited_by,
          invited_at: invitation.invited_at,
          status: invitation.status,
          expires_at: invitation.expires_at
        }
      });
    } catch (error) {
      console.error('Error sending invitation:', error);
      
      // Enhanced error handling
      if (error.message === 'Database operation timed out') {
        return res.status(504).json({
          success: false,
          message: 'Database operation timed out. Please try again.',
          error: 'TIMEOUT'
        });
      }
      
      if (error.name === 'CastError') {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid group ID format',
          error: 'INVALID_ID'
        });
      }
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          success: false, 
          message: error.message,
          error: 'NOT_FOUND'
        });
      }
      
      res.status(400).json({ 
        success: false, 
        message: error.message,
        error: 'INVITATION_FAILED'
      });
    }
  }
);

// Resend an existing invitation email
router.post('/:group_id/invitations/:invitation_id/resend',
  passport.authenticate('jwt', { session: false }),
  checkMongoDBConnection,
  [
    param('group_id').isLength({ min: 1 }).withMessage('Group ID is required'),
    param('invitation_id').isLength({ min: 1 }).withMessage('Invitation ID is required')
  ],
  validate,
  async (req, res) => {
    try {
  const { group_id, invitation_id } = req.params;
  const result = await groupService.resendInvitation(group_id, invitation_id, req.user.user_id);
      // If email preview URL is available (Ethereal in dev), log it for easy verification
      if (result && result.emailPreviewUrl) {
        console.log(`Invitation resend preview URL for invitation ${invitation_id}:`, result.emailPreviewUrl);
      }

      // Include the preview URL at top-level for client-side verification when available
      res.json({ success: true, message: 'Invitation resent', invitation: result, previewUrl: result && result.emailPreviewUrl ? result.emailPreviewUrl : null });
    } catch (error) {
      console.error('Error resending invitation:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to resend invitation' });
    }
  }
);

/**
 * @route DELETE /api/groups/:group_id/members/:member_id
 * @desc Remove member from group
 * @access Private
 */
router.delete('/:group_id/members/:member_id',
  passport.authenticate('jwt', { session: false }),
  checkMongoDBConnection, // Add MongoDB connection check
  [
    param('group_id').isMongoId().withMessage('Invalid group ID'),
    param('member_id').isMongoId().withMessage('Invalid member ID'),
    validate
  ],
  async (req, res) => {
    try {
      // Set a timeout for the database operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timed out')), 10000)
      );
      
      // Execute the member removal with a timeout
      const removePromise = groupService.removeGroupMember(req.params.group_id, req.params.member_id, req.user.user_id);
      await Promise.race([removePromise, timeoutPromise]);
      
      res.json({ success: true, message: 'Member removed successfully' });
    } catch (error) {
      console.error('Error removing group member:', error);
      
      // Enhanced error handling
      if (error.message === 'Database operation timed out') {
        return res.status(504).json({
          success: false,
          message: 'Database operation timed out. Please try again.',
          error: 'TIMEOUT'
        });
      }
      
      if (error.name === 'CastError') {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid ID format',
          error: 'INVALID_ID'
        });
      }
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          success: false, 
          message: error.message,
          error: 'NOT_FOUND'
        });
      }
      
      res.status(400).json({ 
        success: false, 
        message: error.message,
        error: 'REMOVE_MEMBER_FAILED'
      });
    }
  }
);

// Export the router
module.exports = router;
