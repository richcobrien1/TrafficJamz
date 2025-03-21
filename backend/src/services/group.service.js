const Group = require('../models/group.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * Group service for handling group-related operations
 */
class GroupService {
  /**
   * Create a new group
   * @param {Object} groupData - Group creation data
   * @param {string} ownerId - User ID of the group owner
   * @returns {Promise<Object>} - Newly created group
   */
  async createGroup(groupData, ownerId) {
    try {
      // Create new group
      const group = new Group({
        group_name: groupData.name,
        group_description: groupData.description || '',
        owner_id: ownerId,
        avatar_url: groupData.avatar_url || '',
        privacy_level: groupData.privacy_level || 'private',
        max_members: groupData.max_members || 50,
        settings: {
          ...Group.schema.paths.settings.default(),
          ...groupData.settings
        },
        members: [{
          user_id: ownerId,
          role: 'owner',
          joined_at: new Date(),
          status: 'active'
        }]
      });

      await group.save();
      return group;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get group by ID
   * @param {string} groupId - Group ID
   * @returns {Promise<Object>} - Group data
   */
  async getGroupById(groupId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }
      return group;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get groups for a user
   * @param {string} user_id - User ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} - Array of groups
   */
  async getGroupsByUserId(user_id, filters = {}) {
    try {
      const query = { 'members.user_id': user_id };
      
      // Apply status filter
      if (filters.status) {
        query.status = filters.status;
      }
      
      // Apply role filter
      if (filters.role) {
        query['members.role'] = filters.role;
      }
      
      const groups = await Group.find(query);
      return groups;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update group details
   * @param {string} groupId - Group ID
   * @param {Object} updateData - Data to update
   * @param {string} user_id - User ID making the request
   * @returns {Promise<Object>} - Updated group data
   */
  async updateGroup(groupId, updateData, user_id) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if user has permission to update
      if (!group.isAdmin(user_id)) {
        throw new Error('Permission denied');
      }

      // Update allowed fields
      const allowedFields = ['name', 'description', 'avatar_url', 'privacy_level'];
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          group[field] = updateData[field];
        }
      }

      await group.save();
      return group;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update group settings
   * @param {string} groupId - Group ID
   * @param {Object} settings - New settings
   * @param {string} user_id - User ID making the request
   * @returns {Promise<Object>} - Updated settings
   */
  async updateGroupSettings(groupId, settings, user_id) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if user has permission to update
      if (!group.isAdmin(user_id)) {
        throw new Error('Permission denied');
      }

      // Update settings
      group.settings = {
        ...group.settings,
        ...settings
      };

      await group.save();
      return group.settings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a group
   * @param {string} groupId - Group ID
   * @param {string} user_id - User ID making the request
   * @returns {Promise<boolean>} - Success status
   */
  async deleteGroup(groupId, user_id) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if user is the owner
      if (!group.isOwner(user_id)) {
        throw new Error('Only the group owner can delete the group');
      }

      await Group.deleteOne({ _id: groupId });
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get group members
   * @param {string} groupId - Group ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} - Array of members
   */
  async getGroupMembers(groupId, filters = {}) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      let members = group.members;
      
      // Apply status filter
      if (filters.status) {
        members = members.filter(member => member.status === filters.status);
      }
      
      // Apply role filter
      if (filters.role) {
        members = members.filter(member => member.role === filters.role);
      }
      
      return members;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add member to group
   * @param {string} groupId - Group ID
   * @param {string} user_id - User ID to add
   * @param {string} role - Member role
   * @param {string} requesterId - User ID making the request
   * @returns {Promise<Object>} - Updated group
   */
  async addGroupMember(groupId, user_id, role, requesterId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if requester has permission to add members
      if (!group.isAdmin(requesterId) && 
          !(group.settings.members_can_invite && group.isMember(requesterId))) {
        throw new Error('Permission denied');
      }

      // Check if user already exists in the group
      if (group.isMember(user_id)) {
        throw new Error('User is already a member of this group');
      }

      // Check if group is at capacity
      if (group.members.length >= group.max_members) {
        throw new Error('Group has reached maximum capacity');
      }

      // Verify user exists
      const user = await User.findOne({ where: { user_id: user_id } })
      if (!user) {
        throw new Error('User not found');
      }

      // Add member
      group.addMember(user_id, role || 'member');
      await group.save();

      return group;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update group member
   * @param {string} groupId - Group ID
   * @param {string} user_id - User ID to update
   * @param {Object} updateData - Data to update
   * @param {string} requesterId - User ID making the request
   * @returns {Promise<Object>} - Updated member
   */
  async updateGroupMember(groupId, user_id, updateData, requesterId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if requester has permission to update members
      if (!group.isAdmin(requesterId)) {
        throw new Error('Permission denied');
      }

      // Find member
      const memberIndex = group.members.findIndex(member => member.user_id === user_id);
      if (memberIndex === -1) {
        throw new Error('Member not found');
      }

      // Cannot change owner's role
      if (group.members[memberIndex].role === 'owner' && updateData.role && updateData.role !== 'owner') {
        throw new Error('Cannot change owner\'s role');
      }

      // Update allowed fields
      const allowedFields = ['role', 'status', 'nickname'];
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          group.members[memberIndex][field] = updateData[field];
        }
      }

      await group.save();
      return group.members[memberIndex];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove member from group
   * @param {string} groupId - Group ID
   * @param {string} user_id - User ID to remove
   * @param {string} requesterId - User ID making the request
   * @returns {Promise<boolean>} - Success status
   */
  async removeGroupMember(groupId, user_id, requesterId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if requester has permission to remove members
      const isAdmin = group.isAdmin(requesterId);
      const isSelfRemoval = user_id === requesterId;
      
      if (!isAdmin && !isSelfRemoval) {
        throw new Error('Permission denied');
      }

      // Cannot remove owner
      const member = group.members.find(member => member.user_id === user_id);
      if (!member) {
        throw new Error('Member not found');
      }
      
      if (member.role === 'owner') {
        throw new Error('Cannot remove the group owner');
      }

      // Remove member
      group.removeMember(user_id);
      await group.save();

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Invite user to group
   * @param {string} groupId - Group ID
   * @param {string} email - Email to invite
   * @param {string} inviterId - User ID making the invitation
   * @returns {Promise<Object>} - Invitation data
   */
  async inviteToGroup(groupId, email, inviterId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if inviter has permission
      if (!group.isAdmin(inviterId) && 
          !(group.settings.members_can_invite && group.isMember(inviterId))) {
        throw new Error('Permission denied');
      }

      // Check if invitation already exists
      const existingInvitation = group.invitations.find(
        inv => inv.email === email && inv.status === 'pending'
      );
      
      if (existingInvitation) {
        throw new Error('Invitation already sent to this email');
      }

      // Create invitation
      const invitation = {
        email,
        invited_by: inviterId,
        invited_at: new Date(),
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };

      group.invitations.push(invitation);
      await group.save();

      // In a real implementation, we would send an email to the invitee

      return invitation;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get group invitations
   * @param {string} groupId - Group ID
   * @param {string} requesterId - User ID making the request
   * @returns {Promise<Array>} - Array of invitations
   */
  async getGroupInvitations(groupId, requesterId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if requester has permission
      if (!group.isAdmin(requesterId)) {
        throw new Error('Permission denied');
      }

      return group.invitations.filter(inv => inv.status === 'pending');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel group invitation
   * @param {string} groupId - Group ID
   * @param {string} invitationId - Invitation ID
   * @param {string} requesterId - User ID making the request
   * @returns {Promise<boolean>} - Success status
   */
  async cancelInvitation(groupId, invitationId, requesterId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if requester has permission
      if (!group.isAdmin(requesterId)) {
        throw new Error('Permission denied');
      }

      // Find invitation
      const invitationIndex = group.invitations.findIndex(
        inv => inv._id.toString() === invitationId && inv.status === 'pending'
      );
      
      if (invitationIndex === -1) {
        throw new Error('Invitation not found');
      }

      // Remove invitation
      group.invitations.splice(invitationIndex, 1);
      await group.save();

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user invitations
   * @param {string} user_id - User ID
   * @returns {Promise<Array>} - Array of invitations
   */
  async getUserInvitations(user_id) {
    try {
      // Find user
      const user = await User.findOne({ where: { user_id: user_id } })
      if (!user) {
        throw new Error('User not found');
      }

      // Find groups with pending invitations for this user's email
      const groups = await Group.find({
        'invitations.email': user.email,
        'invitations.status': 'pending'
      });

      // Extract invitations
      const invitations = [];
      for (const group of groups) {
        const groupInvitations = group.invitations.filter(
          inv => inv.email === user.email && inv.status === 'pending'
        );
        
        for (const invitation of groupInvitations) {
          invitations.push({
            id: invitation._id,
            group_id: group._id,
            group_name: group.name,
            invited_by: invitation.invited_by,
            invited_at: invitation.invited_at,
            expires_at: invitation.expires_at
          });
        }
      }

      return invitations;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Accept group invitation
   * @param {string} invitationId - Invitation ID
   * @param {string} user_id - User ID accepting the invitation
   * @returns {Promise<Object>} - Group data
   */
  async acceptInvitation(invitationId, user_id) {
    try {
      // Find user
      const user = await User.findOne({ where: { user_id: user_id } })
      if (!user) {
        throw new Error('User not found');
      }

      // Find group with this invitation
      const group = await Group.findOne({
        'invitations._id': mongoose.Types.ObjectId(invitationId),
        'invitations.email': user.email,
        'invitations.status': 'pending'
      });

      if (!group) {
        throw new Error('Invitation not found');
      }

      // Find invitation
      const invitationIndex = group.invitations.findIndex(
        inv => inv._id.toString() === invitationId && inv.email === user.email && inv.status === 'pending'
      );

      if (invitationIndex === -1) {
        throw new Error('Invitation not found');
      }

      // Check if invitation is expired
      const invitation = group.invitations[invitationIndex];
      if (invitation.expires_at < new Date()) {
        throw new Error('Invitation has expired');
      }

      // Update invitation status
      group.invitations[invitationIndex].status = 'accepted';

      // Add user to group
      if (!group.isMember(user_id)) {
        group.addMember(user_id, 'member');
      }

      await group.save();
      return group;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Decline group invitation
   * @param {string} invitationId - Invitation ID
   * @param {string} user_id - User ID declining the invitation
   * @returns {Promise<boolean>} - Success status
   */
  async declineInvitation(invitationId, user_id) {
    try {
      // Find user
      const user = await User.findOne({ where: { user_id: user_id } })
      if (!user) {
        throw new Error('User not found');
      }

      // Find group with this invitation
      const group = await Group.findOne({
        'invitations._id': mongoose.Types.ObjectId(invitationId),
        'invitations.email': user.email,
        'invitations.status': 'pending'
      });

      if (!group) {
        throw new Error('Invitation not found');
      }

      // Find invitation
      const invitationIndex = group.invitations.findIndex(
        inv => inv._id.toString() === invitationId && inv.email === user.email && inv.status === 'pending'
      );

      if (invitationIndex === -1) {
        throw new Error('Invitation not found');
      }

      // Update invitation status
      group.invitations[invitationIndex].status = 'declined';
      await group.save();

      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new GroupService();
