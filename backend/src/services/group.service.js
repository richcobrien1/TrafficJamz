const Group = require('../models/group.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');

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
    console.log('Creating group with data:', { 
      name: groupData.group_name, 
      description: groupData.group_description,
      owner: ownerId 
    });
  
    try {
      // Create group using the create method
      const group = await Group.create({
        group_name: groupData.group_name,
        group_description: groupData.group_description || '',
        owner_id: ownerId,
        avatar_url: groupData.avatar_url || '',
        privacy_level: groupData.privacy_level || 'private',
        max_members: groupData.max_members || 50,
        settings: {
          join_approval_required: true,
          members_can_invite: true,
          location_sharing_required: true,
          music_sharing_enabled: true,
          proximity_alert_distance: 100,
          default_mute_on_join: false
        },
        group_members: [{
          user_id: ownerId,
          role: 'owner',
          joined_at: new Date(),
          status: 'active'
        }]
      });
      
      console.log('Group created successfully with ID:', group._id);
      return group;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  /**
   * Get group by ID with populated member details
   * @param {string} groupId - Group ID
   * @returns {Promise<Object>} - Group object with populated member details
   */
  async getGroupById(groupId) {
    try {
      // Find the group by ID
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }
      
      // Create a formatted group object with the structure expected by frontend
      const formattedGroup = {
        id: group._id,
        name: group.group_name,
        description: group.group_description,
        avatar_url: group.avatar_url,
        privacy_level: group.privacy_level,
        status: group.status,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        members: []
      };
      
      // If there are members, fetch their user details
      if (group.group_members && group.group_members.length > 0) {
        // Get all user IDs from the members array
        const userIds = group.group_members.map(member => member.user_id);
        
        // Import the User model - make sure the path is correct for your project structure
        const User = require('../models/user.model'); // Adjust path as needed
        
        // Fetch all users in one query using Sequelize
        const users = await User.findAll({
          where: {
            user_id: userIds
          },
          attributes: ['user_id', 'username', 'email', 'profile_image_url', 'first_name', 'last_name']
        });
        
        // Create a map of user_id to user details for quick lookup
        const userMap = {};
        users.forEach(user => {
          const userData = user.get({ plain: true });
          userMap[userData.user_id] = userData;
        });
        
        // Combine member data with user data
        formattedGroup.members = group.group_members.map(member => {
          const user = userMap[member.user_id] || {};
          return {
            id: member._id,
            user_id: member.user_id,
            role: member.role,
            status: member.status,
            joined_at: member.joined_at,
            // Add user profile details
            username: user.username || 'Unknown User',
            email: user.email || '',
            profile_image_url: user.profile_image_url || '',
            first_name: user.first_name || '',
            last_name: user.last_name || ''
          };
        });
      }
      
      return formattedGroup;
    } catch (error) {
      console.error('Error in getGroupById:', error);
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
      const query = { 'group_members.user_id': user_id };
      
      // Apply status filter
      if (filters.status) {
        query.status = filters.status;
      }
      
      // Apply role filter
      if (filters.role) {
        query['group_members.role'] = filters.role;
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
      console.log('group.service.js - updateGroup:', groupId, updateData);
      
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }
  
      // Check if user has permission to update
      if (!group.isAdmin(user_id)) {
        throw new Error('Permission denied');
      }
  
      // Update allowed fields
      const allowedFields = ['group_name', 'group_description', 'avatar_url', 'privacy_level'];
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          group[field] = updateData[field];
        }
      }
  
      await group.save();
      return group;
    } catch (error) {
      console.error('Error in updateGroup service:', error);
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

      console.log('======================= Using group ID:', groupId, 'And user_id: ', user_id);

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
      console.log('246-About to query user with:', { user_id });
      const user = await User.findOne({ 
        where: { user_id: user_id } 
      })
      console.log('250-Query result:', user ? 'User found' : 'User not found');
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
  async removeGroupMember(id, user_id, requesterId) {
    try {
      console.log('Remove Group Member: Using Group ID:', id, 'And Member ID:', user_id);
  
      const group = await Group.findById(id);
      if (!group) {
        throw new Error('Group not found');
      }
  
      // Check if requester has permission
      const isAdmin = group.isAdmin(requesterId);
      const isSelfRemoval = user_id === requesterId;
      
      if (!isAdmin && !isSelfRemoval) {
        throw new Error('Permission denied');
      }
  
      // Cannot remove owner
      if (!group.group_members || !Array.isArray(group.group_members)) {
        throw new Error('Group members list is invalid');
      }
      
      const member = group.group_members.find(member => member.user_id === user_id);
      if (!member) {
        throw new Error('Member not found');
      }
      
      if (member.role === 'owner') {
        throw new Error('Cannot remove the group owner');
      }
  
      // If removeMember isn't working, do it directly here
      group.group_members = group.group_members.filter(member => member.user_id !== user_id);
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
        invited_at: new Date() ,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };

      // Add to group
      group.invitations.push(invitation);

      // Save the group to get the _id assigned to the new invitation
      await group.save();

      // Get the saved invitation (the one we just added)
      const savedInvitation = group.invitations[group.invitations.length - 1];

      // Generate invitation link with group ID and invitation index
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const invitationLink = `${baseUrl}/invitations/${group._id}/${group.invitations.length - 1}`;
      
      // Send invitation email
      const emailResult = await emailService.sendInvitationEmail(email, {
        groupName: group.group_name,
        inviterName: inviter ? `${inviter.first_name} ${inviter.last_name}`.trim()  || inviter.username : 'A user',
        invitationLink
      });
      
      console.log('Invitation email sent:', emailResult);

      return invitation;
    } catch (error) {
      console.error('Error sending invitation:', error);
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
      console.log('437-group.service: About to query user with:', { user_id });
      const user = await User.findOne({ 
        where: { user_id: user_id } 
      })
      console.log('477-group.service: Query result:', user ? 'User found' : 'User not found');

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
      console.log('523-group.service: About to query user with:', { user_id });
      const user = await User.findOne({ 
        where: { user_id: user_id } 
      })
      console.log('43-group.service: Query result:', user ? 'User found' : 'User not found');     
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
      const user = await User.findOne({
         where: { user_id: user_id } 
      });
      console.log('585-group.service: Query result:', user ? 'User found' : 'User not found');     

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
