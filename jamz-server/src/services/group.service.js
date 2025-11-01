const Group = require('../models/group.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');
const emailService = require('./email.service');
const smsService = require('./sms.service');
const crypto = require('crypto');

/**
 * Generate default avatar URL based on user data
 * @param {string} email - User email
 * @param {string} firstName - User first name (optional)
 * @returns {string} - Avatar URL
 */
function getDefaultAvatar(email, firstName) {
  if (!email && !firstName) return null;
  
  // Use UI Avatars service to generate initials-based avatars
  // Falls back to gender-neutral person icon
  const hash = crypto.createHash('md5').update((email || firstName || '').toLowerCase().trim()).digest('hex');
  const colorIndex = parseInt(hash.substring(0, 2), 16) % 10;
  
  // Neutral avatar colors
  const colors = ['7C3AED', '2563EB', '059669', 'DC2626', 'EA580C', 'CA8A04', '0891B2', '9333EA', 'DB2777', '65A30D'];
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName || 'User')}&background=${colors[colorIndex]}&color=fff&size=200&bold=true`;
}

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
  // In your group.service.js file
  async getGroupById(groupId) {
    try {
      console.log('getGroupById called with groupId:', groupId);
      
      // Find the group in the database
      console.log('Finding group in MongoDB...');
      const group = await Group.findById(groupId);
      console.log('MongoDB findById result:', group ? 'found' : 'not found');
      
      if (!group) {
        console.log('Group not found, throwing error');
        throw new Error('Group not found');
      }
      
      console.log('Group found, transforming data...');
      
      // Require the User model once outside the map function
      const User = require('../models/user.model');
      
      // Transform the group data for the response
      const transformedGroup = {
        id: group._id,
        name: group.group_name,
        description: group.group_description,
        avatar_url: group.avatar_url,
        privacy_level: group.privacy_level,
        status: group.status,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        
        // Transform members with user details
        members: await Promise.all((group.group_members || []).map(async (member) => {
          // Fetch user details for this member
          let userData = null;
          
          try {
            // Check if the user_id is a valid UUID before querying PostgreSQL
            const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.user_id);
            
            if (isValidUUID) {
              // Only query PostgreSQL for valid UUIDs
              userData = await User.findOne({ 
                where: { user_id: member.user_id } 
              });
              
              console.log(`Found user data for ${member.user_id}: ${userData ? userData.username : 'null'}`);
            } else {
              console.log(`Skipping PostgreSQL query for non-UUID member: ${member.user_id}`);
            }
          } catch (err) {
            console.error(`Error fetching user data for member ${member.user_id}:`, err);
          }
          
          // Use member data from MongoDB if available, otherwise use PostgreSQL data
          const email = member.email || userData?.email || '';
          const firstName = member.first_name || userData?.first_name || '';
          const profileImageUrl = userData?.profile_image_url || member.profile_image_url;
          
          return {
            id: member._id,
            user_id: member.user_id,
            role: member.role,
            status: member.status,
            joined_at: member.joined_at,
            // Prioritize MongoDB data for these fields
            first_name: firstName,
            last_name: member.last_name || userData?.last_name || '',
            username: userData?.username || firstName || 'Unknown User',
            email: email,
            // Use profile image if available, otherwise fallback to default avatar
            profile_image_url: profileImageUrl || getDefaultAvatar(email, firstName),
            phone_number: member.phone_number || userData?.phone_number || ''
          };
        })),
        
        // Add invitations to the transformed group (include invite_count per email)
        invitations: (group.invitations || []).map(invitation => ({
          id: invitation._id,
          email: invitation.email,
          invited_by: invitation.invited_by,
          invited_at: invitation.invited_at,
          status: invitation.status,
          expires_at: invitation.expires_at,
          // Count how many invitations in this group exist for this email (all statuses)
          invite_count: (group.invitations || []).filter(inv => inv.email === invitation.email).length
        }))
      };
      
      console.log('getGroupById transformation complete, returning group');
      return transformedGroup;
    } catch (error) {
      console.error('Error in getGroupById:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
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
      console.log('group.service.js - updateGroup:', user_id, groupId, updateData);
      
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
      
      // Enrich with User table data (profile_image_url, social_accounts)
      const enrichedMembers = await Promise.all(members.map(async (member) => {
        const memberObj = member.toObject();
        try {
          const user = await User.findOne({ 
            where: { user_id: member.user_id },
            attributes: ['profile_image_url', 'social_accounts']
          });
          
          return {
            ...memberObj,
            profile_image_url: user?.profile_image_url || null,
            social_accounts: user?.social_accounts || null,
            avatarUrl: generateMemberAvatar(member.email, member.first_name)
          };
        } catch (err) {
          console.error(`Error fetching user data for ${member.user_id}:`, err);
          return {
            ...memberObj,
            profile_image_url: null,
            social_accounts: null,
            avatarUrl: generateMemberAvatar(member.email, member.first_name)
          };
        }
      }));
      
      return enrichedMembers;
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
      if (group.group_members && group.group_members.length >= group.max_members) {
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
  async inviteToGroup(groupId, email, inviterId, options = {}) {
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
        // initialize sent_count to 1 for first send
        sent_count: 1,
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
      const baseUrl = process.env.FRONTEND_URL || 'https://jamz.v2u.us';
      const invitationLink = `${baseUrl}/invitations/${group._id}/${group.invitations.length - 1}`;
      
      // Get inviter details - Fix for hybrid PostgreSQL/MongoDB system
  let inviterName = 'A user'; // Default fallback
  let inviterFullName = null;
  let inviterHandle = null;

      try {
        // Coerce inviterId to string for safe checks
        const inviterIdStr = inviterId ? inviterId.toString() : '';
        // Check if inviterId is a valid UUID (registered user)
        console.log('Checking inviterId:', inviterIdStr);
        console.log('Is UUID format?', inviterIdStr.includes('-'));

        if (inviterIdStr.includes('-')) {
          // Try to get user data using a more direct approach
          // Import sequelize directly
          const sequelize = require('../config/database');
          console.log('Sequelize imported successfully');
          
          // Log the SQL query we're about to execute
          console.log('Executing SQL query for user_id:', inviterIdStr);

          // Use raw SQL query instead of model methods
          // Use QueryTypes.SELECT from Sequelize to avoid referencing on the instance
          const Sequelize = require('sequelize');
          const users = await sequelize.query(
            `SELECT username, first_name, last_name, email FROM users WHERE user_id = :userId`,
            {
              replacements: { userId: inviterIdStr },
              type: Sequelize.QueryTypes.SELECT
            }
          );
          
          console.log('SQL query result:', users);
          
          if (users && users.length > 0) {
            const user = users[0];
            console.log('Found user data:', user);
            
            // Use PostgreSQL user data - accept partial names (first or last)
            const pgParts = [user.first_name, user.last_name].filter(Boolean);
            inviterFullName = pgParts.length ? pgParts.join(' ').trim() : null;
            inviterHandle = (user.username || user.email) ? (user.username || (user.email && user.email.split('@')[0])) : null;
            inviterName = inviterFullName || inviterHandle || inviterName;
            console.log(`Set inviterName to: ${inviterName}`, { inviterFullName, inviterHandle });
          } else {
            console.log(`No user found with ID: ${inviterId}`);
          }

          // Debug: log raw Postgres users result for troubleshooting
          try {
            console.log('Postgres users result (sanitized):', JSON.stringify(users && users.map(u => ({ username: u.username, first_name: u.first_name, last_name: u.last_name, email: u.email })), null, 2));
          } catch (e) {
            console.error('Error serializing Postgres users result for logs:', e);
          }
        }
      } catch (error) {
        console.error('Detailed error finding inviter:', error);
        // Continue with default inviterName
      }

      // Fallback: if we couldn't get a full name from Postgres, try to derive it from the group's member record
      let inviterSource = inviterFullName ? 'postgres' : null;
      if (!inviterFullName && group && Array.isArray(group.group_members)) {
        try {
          const member = group.group_members.find(m => m.user_id === inviterId || m.user_id === (inviterId && inviterId.toString()));
          console.log('Group members count:', (group.group_members || []).length);
          console.log('Attempting to derive inviter from group member record. Found member:', member ? JSON.stringify({ user_id: member.user_id, first_name: member.first_name, last_name: member.last_name, profile: member.profile && { first_name: member.profile.first_name, last_name: member.profile.last_name }, email: member.email }, null, 2) : 'none');
          if (member) {
            // Prefer top-level fields, then nested profile fields
            const memberFirst = member.first_name || (member.profile && member.profile.first_name) || null;
            const memberLast = member.last_name || (member.profile && member.profile.last_name) || null;
            const parts = [memberFirst, memberLast].filter(Boolean);
            if (parts.length) {
              inviterFullName = parts.join(' ').trim();
              inviterName = inviterFullName;
              inviterSource = 'group_member';
              console.log('Derived inviterFullName from group member record:', inviterFullName);
            }
          }
        } catch (e) {
          console.error('Error deriving inviterFullName from group members:', e);
        }
      }
      if (!inviterSource) inviterSource = inviterFullName ? 'postgres' : (inviterHandle ? 'handle' : 'unknown');

      // Final debug: show what inviter fields we'll send to the email service
      console.log('Prepare to send invitation email with inviter data:', {
        inviterName,
        inviterFullName,
        inviterHandle,
        inviterSource,
        invitationLink
      });

      // Send invitation email (optional - can be skipped for async sending)
      let emailResult = null;
      if (options?.sendEmail !== false) {
        try {
          console.log('📧 Attempting to send invitation email to:', email);
          emailResult = await emailService.sendInvitationEmail(email, {
            groupName: group.group_name,
            inviterName: inviterName,
            inviterFullName,
            inviterHandle,
            invitationLink
          });
          
          console.log('✅ Invitation email sent successfully:', emailResult);
        } catch (emailError) {
          console.error('❌ FAILED to send invitation email:', emailError.message);
          console.error('Email error details:', emailError);
          // Don't throw - allow invitation to be created even if email fails
        }
      }

      // Send SMS if phone number provided
      if (options?.phoneNumber) {
        try {
          const formattedPhone = smsService.formatPhoneNumber(options.phoneNumber);
          
          if (smsService.isValidPhoneNumber(formattedPhone)) {
            const smsResult = await smsService.sendGroupInvitation(formattedPhone, {
              groupName: group.group_name,
              inviterName: inviterName,
              invitationLink,
              customMessage: options?.customMessage
            });
            
            console.log('Invitation SMS sent:', smsResult);
          } else {
            console.warn('Invalid phone number format, skipping SMS:', options.phoneNumber);
          }
        } catch (smsError) {
          console.error('Failed to send SMS invitation:', smsError.message);
          // Don't fail the whole invitation if SMS fails
        }
      }

      // Compute how many times this email has been invited in this group
      // Prefer the aggregated sent_count for this email if present
      const inviteCount = group.invitations
        .filter(inv => inv.email === email)
        .reduce((sum, inv) => sum + (inv.sent_count || 1), 0);

      // Return a plain object representation including invite_count for API responses
      // Include the invitationLink and any email preview URL in dev for easy testing
      const responsePayload = {
        id: savedInvitation._id,
        email: savedInvitation.email,
        invited_by: savedInvitation.invited_by,
        invited_at: savedInvitation.invited_at,
        status: savedInvitation.status,
        expires_at: savedInvitation.expires_at,
        invite_count: inviteCount
      };

      if (process.env.NODE_ENV !== 'production') {
        responsePayload.invitationLink = invitationLink;
        if (emailResult && emailResult.previewUrl) {
          responsePayload.emailPreviewUrl = emailResult.previewUrl;
        }
      }

      return responsePayload;
    } catch (error) {
      console.error('Error sending invitation:', error);
      throw error;
    }
  }

  /**
   * Resend an existing invitation email
   * @param {string} groupId
   * @param {string} invitationId
   * @param {string} requesterId
   * @param {Object} options - Optional settings (e.g., sendEmail: false to skip email)
   */
  async resendInvitation(groupId, invitationId, requesterId, options = {}) {
    try {
      const group = await Group.findById(groupId);
      if (!group) throw new Error('Group not found');

      // Authorization: only admins or members_can_invite may resend
      if (!group.isAdmin(requesterId) && !(group.settings.members_can_invite && group.isMember(requesterId))) {
        throw new Error('Permission denied');
      }

      const invitation = group.invitations.find(inv => inv._id.toString() === invitationId);
      if (!invitation) throw new Error('Invitation not found');
      if (invitation.status !== 'pending') throw new Error('Only pending invitations may be resent');

  // Update invited_at timestamp to now, extend expiry and increment sent_count
  invitation.invited_at = new Date();
  invitation.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  invitation.sent_count = (invitation.sent_count || 0) + 1;

      // Save group
      await group.save();

      // Rebuild invitation link using current index
      const index = group.invitations.findIndex(inv => inv._id.toString() === invitationId);
      const baseUrl = process.env.FRONTEND_URL || 'https://jamz.v2u.us';
      const invitationLink = `${baseUrl}/invitations/${group._id}/${index}`;

      // Determine inviter name for email
  let inviterName = 'A user';
  let inviterFullName = null;
  let inviterHandle = null;
      try {
        if (requesterId && requesterId.includes('-')) {
          const sequelize = require('../config/database');
          const users = await sequelize.query(
            `SELECT username, first_name, last_name, email FROM users WHERE user_id = :userId`,
            { replacements: { userId: requesterId }, type: sequelize.QueryTypes.SELECT }
          );
          if (users && users.length > 0) {
            const user = users[0];
            inviterFullName = (user.first_name && user.last_name) ? `${user.first_name} ${user.last_name}`.trim() : null;
            inviterHandle = (user.username || user.email) ? (user.username || user.email.split('@')[0]) : null;
            inviterName = inviterFullName || inviterHandle || inviterName;
          }

      // Fallback: if Postgres lookup didn't provide a full name, try to extract from group member info
      if (!inviterFullName && group && Array.isArray(group.group_members)) {
        try {
          const member = group.group_members.find(m => m.user_id === requesterId || m.user_id === (requesterId && requesterId.toString()));
          if (member) {
            const memberFirst = member.first_name || (member.profile && member.profile.first_name) || null;
            const memberLast = member.last_name || (member.profile && member.profile.last_name) || null;
            const parts = [memberFirst, memberLast].filter(Boolean);
            if (parts.length) {
              inviterFullName = parts.join(' ').trim();
              inviterName = inviterFullName;
              console.log('Derived inviterFullName from group member record in resendInvitation:', inviterFullName);
            }
          }
        } catch (e) {
          console.error('Error deriving inviterFullName from group members in resendInvitation:', e);
        }
      }
        }
      } catch (err) {
        console.error('Error fetching inviter details in resendInvitation:', err);
      }

      // Send email and capture result (preview URL when using Ethereal)
      // Optional - can be skipped for async sending
      let emailResult = null;
      if (options?.sendEmail !== false) {
        try {
          console.log('📧 Attempting to send invitation email to:', invitation.email);
          emailResult = await emailService.sendInvitationEmail(invitation.email, {
            groupName: group.group_name,
            inviterName,
            inviterFullName,
            inviterHandle,
            invitationLink
          });
          console.log('✅ Email sent successfully to:', invitation.email);
          if (emailResult && emailResult.previewUrl) {
            console.log('📧 Ethereal preview URL:', emailResult.previewUrl);
          }
        } catch (err) {
          console.error('❌ Error sending invitation email in resendInvitation:', err);
          console.error('❌ Error details:', {
            message: err.message,
            code: err.code,
            command: err.command,
            response: err.response,
            responseCode: err.responseCode
          });
          // Re-throw so the caller knows it failed
          throw new Error(`Failed to send email: ${err.message}`);
        }
      }

      // Compute invite_count for this invitation's email within the group
      // Compute invite_count from sent_count across invitations for this email
      const inviteCount = group.invitations
        .filter(inv => inv.email === invitation.email)
        .reduce((sum, inv) => sum + (inv.sent_count || 1), 0);

      return {
        id: invitation._id,
        email: invitation.email,
        invited_at: invitation.invited_at,
        expires_at: invitation.expires_at,
        status: invitation.status,
        invite_count: inviteCount,
        emailPreviewUrl: emailResult && emailResult.previewUrl ? emailResult.previewUrl : null
      };
    } catch (error) {
      console.error('Error in resendInvitation:', error);
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

      // Return pending invitations with invite_count included for each email
      return (group.invitations || [])
        .filter(inv => inv.status === 'pending')
        .map(inv => ({
          id: inv._id,
          email: inv.email,
          invited_by: inv.invited_by,
          invited_at: inv.invited_at,
          status: inv.status,
          expires_at: inv.expires_at,
          // Sum sent_count across invitations for this email; fall back to count of docs
          invite_count: (group.invitations || [])
            .filter(i => i.email === inv.email)
            .reduce((sum, i) => sum + (i.sent_count || 1), 0)
        }));
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
   * Accept group invitation (HTTP route handler)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async acceptInvitation(req, res) {
    try {
      const { invitationId } = req.params;
      const { firstName, lastName, mobilePhone, email } = req.body;
      
      console.log('acceptInvitation called with:', { invitationId, firstName, lastName, mobilePhone, email });
      
      // Validate required fields
      if (!firstName || !lastName || !mobilePhone) {
        console.log('Validation failed: missing required fields');
        return res.status(400).json({
          success: false,
          message: 'First name, last name, and mobile phone are required'
        });
      }
      
      console.log('Finding group with invitation...');
      // Convert invitationId to ObjectId
      const invitationObjectId = new mongoose.Types.ObjectId(invitationId);
      
      // Find the group with this invitation
      let group;
      try {
        group = await Group.findOne({ 'invitations._id': invitationObjectId });
      } catch (dbError) {
        console.error('Database error finding group:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Database error',
          error: dbError.message
        });
      }
      
      if (!group) {
        console.log('Group not found for invitation:', invitationId);
        return res.status(404).json({
          success: false,
          message: 'Invitation not found'
        });
      }
      
      console.log('Group found:', group._id);
      console.log('Group invitations:', group.invitations.map(inv => ({ id: inv._id, status: inv.status })));
      
      // Find the invitation in the group
      const invitation = group.invitations.find(inv => 
        inv._id.toString() === invitationId
      );
      
      if (!invitation) {
        console.log('Invitation not found in group at all');
        return res.status(404).json({
          success: false,
          message: 'Invitation not found in group'
        });
      }
      
      if (invitation.status !== 'pending') {
        console.log('Invitation status is not pending:', invitation.status);
        return res.status(400).json({
          success: false,
          message: `Invitation has already been ${invitation.status}`
        });
      }
      
      console.log('Invitation found:', invitation._id, invitation.email);
      
      // Check if a member with this email already exists
      const existingMemberIndex = group.group_members.findIndex(
        member => member.email === (email || invitation.email)
      );
      
      if (existingMemberIndex >= 0) {
        // Update existing member with new information
        group.group_members[existingMemberIndex].status = 'active';
        group.group_members[existingMemberIndex].first_name = firstName;
        group.group_members[existingMemberIndex].last_name = lastName;
        group.group_members[existingMemberIndex].phone_number = mobilePhone;
        
        if (email) {
          group.group_members[existingMemberIndex].email = email;
        }
      } else {
        // Generate a temporary user ID for new invitees
        const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Check if a registered user with this email exists
        let actualUserId = tempUserId;
        try {
          const registeredUser = await User.findOne({ where: { email: email || invitation.email } });
          if (registeredUser) {
            actualUserId = registeredUser.user_id;
            console.log('Found registered user, using real user_id:', actualUserId);
          } else {
            console.log('No registered user found, using temp user_id:', tempUserId);
          }
        } catch (userError) {
          console.error('Error checking for registered user:', userError);
          // Continue with temp user_id
        }

        // Create a new member with the provided information
        const newMember = {
          user_id: actualUserId,
          first_name: firstName,  // Don't default to empty string
          last_name: lastName,    // Don't default to empty string
          email: email || invitation.email,
          phone_number: mobilePhone,  // Don't default to empty string
          role: 'member',  // Changed from 'invitee' to 'member'
          status: 'active',
          joined_at: new Date()
        };

        // Add the new member to the group
        group.group_members.push(newMember);
      }
      
      // Update the invitation status
      invitation.status = 'accepted';
      
      // Save without validation to avoid schema issues for now
      try {
        await group.save({ validateBeforeSave: false });
        console.log('Group saved successfully without validation');
      } catch (saveError) {
        console.error('Error saving group:', saveError);
        return res.status(500).json({
          success: false,
          message: 'Failed to save group changes',
          error: saveError.message
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Invitation accepted successfully',
        group: {
          id: group._id,
          name: group.group_name,
          // Include other group details as needed
        }
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to accept invitation',
        error: error.message
      });
    }
  }

  /**
   * Accept group invitation for new user
   * @param {string} invitationId - Invitation ID
   * @param {string} tempUserId - Temporary user ID
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Group data
   */
  async acceptInvitationForNewUser(invitationId, tempUserId, userData) {
    try {
      const { firstName, lastName, mobilePhone, email } = userData;
      
      // Convert string ID to MongoDB ObjectId
      const objectId = new mongoose.Types.ObjectId(invitationId);
      console.log('Looking for invitation with ID:', invitationId);
      
      // Find group with this invitation
      let group = await Group.findOne({
        'invitations._id': objectId,
        'invitations.email': email,
        'invitations.status': 'pending'
      });
      
      if (!group) {
        throw new Error('Invitation not found');
      }
      
      console.log('Found group with ID:', group._id);
      
      // Find invitation by ID
      const invitationIndex = group.invitations.findIndex(
        inv => inv._id.toString() === invitationId && inv.email === email && inv.status === 'pending'
      );

      if (invitationIndex === -1) {
        throw new Error('Invitation not found in group');
      }

      // Check if invitation is expired
      const invitation = group.invitations[invitationIndex];
      if (invitation.expires_at < new Date()) {
        throw new Error('Invitation has expired');
      }

      // Update invitation status
      group.invitations[invitationIndex].status = 'accepted';
      
      // Add user to group as invitee
      group.group_members.push({
        user_id: tempUserId,
        role: 'invitee',
        status: 'active',
        joined_at: new Date(),
        // Store user profile data in the group member record
        profile: {
          first_name: firstName,
          last_name: lastName,
          phone_number: mobilePhone,
          email: email
        }
      });
      
      await group.save();
      return group;
    } catch (error) {
      console.error('Error in acceptInvitationForNewUser:', error);
      throw error;
    }
  }

  /**
   * Accept group invitation for existing user
   * @param {string} invitationId - Invitation ID
   * @param {string} user_id - User ID accepting the invitation
   * @returns {Promise<Object>} - Group data
   */
  async acceptInvitationForExistingUser(invitationId, user_id) {
    try {
      // Find user - FIX THE SEQUELIZE QUERY
      console.log('About to query user with:', { user_id });
      
      // If using Sequelize for User model
      const user = await User.findOne({
        where: { user_id: user_id }  // Make sure 'where' is specified
      });
      
      // Alternative if using Mongoose for User model
      // const user = await User.findOne({ user_id: user_id });
      
      console.log('Query result:', user ? 'User found' : 'User not found');     
      if (!user) {
        throw new Error('User not found');
      }
  
      // Convert string ID to MongoDB ObjectId
      const objectId = new mongoose.Types.ObjectId(invitationId);
      console.log('Looking for invitation with ID:', invitationId);
      
      // Find group with this invitation
      let group = await Group.findOne({
        'invitations._id': objectId
      });
      
      if (!group) {
        throw new Error('Group with invitation not found');
      }
      
      console.log('Found group with ID:', group._id);
      console.log('Group has invitations:', group.invitations ? 'Yes' : 'No');
      
      if (group.invitations && group.invitations.length > 0) {
        console.log('Number of invitations:', group.invitations.length);
        
        // Log all invitation IDs for debugging
        group.invitations.forEach((inv, index) => {
          console.log(`Invitation ${index}: ID=${inv._id}, email=${inv.email}, status=${inv.status}`);
        });
      }
  
      // Find invitation by ID
      const invitationIndex = group.invitations.findIndex(
        inv => inv._id.toString() === invitationId
      );
  
      if (invitationIndex === -1) {
        console.log('Invitation not found by ID match');
        throw new Error('Invitation not found in group');
      }
  
      const invitation = group.invitations[invitationIndex];
      console.log('Found invitation:', invitation);

      // Check if invitation is for this user
      if (invitation.email !== user.email) {
        // If the invited email doesn't belong to any user yet, we should allow
        // the current user to claim it (for testing purposes)
        const invitedUserExists = await User.findOne({
          where: { email: invitation.email }
        });
        
        if (invitedUserExists) {
          // If a user with this email exists, enforce the security check
          console.log(`Invitation email (${invitation.email}) doesn't match user email (${user.email})`);
          throw new Error('This invitation is not for your email address');
        } else {
          // For new users not in the system, allow the current user to accept
          console.log(`Invitation email (${invitation.email}) is for a new user. Allowing current user (${user.email}) to accept for testing.`);
          // Optionally, you could update the invitation email to match the current user
          // invitation.email = user.email;
        }
      }
      
      // Check if invitation is for this user
      if (invitation.email !== user.email) {
        console.log(`Invitation email (${invitation.email}) doesn't match user email (${user.email})`);
        throw new Error('This invitation is not for your email address');
      }
      
      // Check if invitation is pending
      if (invitation.status !== 'pending') {
        console.log(`Invitation status is ${invitation.status}, not pending`);
        throw new Error(`Invitation has already been ${invitation.status}`);
      }
  
      // Check if invitation is expired
      if (invitation.expires_at < new Date()) {
        console.log('Invitation has expired');
        throw new Error('Invitation has expired');
      }
  
      // Update invitation status
      group.invitations[invitationIndex].status = 'accepted';
      console.log('Updated invitation status to accepted');
  
      // Add user to group
      if (!group.isMember(user_id)) {
        console.log('Adding user to group members');
        group.addMember(user_id, 'member');
      } else {
        console.log('User is already a member of this group');
      }
  
      await group.save();
      console.log('Group saved successfully');
      return group;
    } catch (error) {
      console.error('Error in acceptInvitation:', error);
      throw error;
    }
  }

  /**
   * Send invitation email asynchronously (non-blocking)
   * @param {string} groupId
   * @param {string} invitationId
   */
  async sendInvitationEmailAsync(groupId, invitationId) {
    try {
      console.log('🔄 sendInvitationEmailAsync called:', { groupId, invitationId });
      
      const group = await Group.findById(groupId);
      if (!group) {
        console.error('❌ Group not found for async email:', groupId);
        return;
      }
      console.log('✅ Group found:', group.group_name);

      const invitation = group.invitations.id(invitationId);
      if (!invitation) {
        console.error('❌ Invitation not found for async email:', invitationId);
        return;
      }
      console.log('✅ Invitation found for email:', invitation.email);

      // Get invitation index
      const index = group.invitations.findIndex(inv => inv._id.toString() === invitationId);
      
      // Generate invitation link
      const baseUrl = process.env.FRONTEND_URL || 'https://jamz.v2u.us';
      const invitationLink = `${baseUrl}/invitations/${group._id}/${index}`;
      console.log('📧 Invitation link:', invitationLink);

      // Get inviter details
      let inviterName = 'A user';
      let inviterFullName = null;
      let inviterHandle = null;

      try {
        const inviterIdStr = invitation.invited_by ? invitation.invited_by.toString() : '';
        if (inviterIdStr.includes('-')) {
          const sequelize = require('../config/database');
          const [results] = await sequelize.query(
            'SELECT username, full_name FROM users WHERE user_id = :userId',
            { replacements: { userId: inviterIdStr } }
          );
          if (results && results.length > 0) {
            inviterHandle = results[0].username;
            inviterFullName = results[0].full_name;
            inviterName = inviterFullName || inviterHandle;
          }
        }
      } catch (err) {
        console.error('⚠️ Error fetching inviter details for async email:', err);
      }

      console.log('👤 Inviter name:', inviterName);
      console.log('📨 About to send email to:', invitation.email);

      // Send email
      await emailService.sendInvitationEmail(invitation.email, {
        groupName: group.group_name,
        inviterName,
        inviterFullName,
        inviterHandle,
        invitationLink
      });

      console.log('✅✅✅ Async invitation email sent successfully to:', invitation.email);
    } catch (error) {
      console.error('❌❌❌ Error in sendInvitationEmailAsync:', error);
      console.error('Error stack:', error.stack);
      // Don't throw - this is fire-and-forget
    }
  }
}
  
module.exports = new GroupService();
