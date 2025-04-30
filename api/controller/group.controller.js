// In your group.controller.js file

/**
 * Get all groups for the current user
 * GET /api/groups
 */
exports.getGroups = async (req, res) => {
    try {
      const groups = await groupService.getGroupsByUserId(req.user.user_id);
      
      // Transform MongoDB groups to match frontend expectations
      const formattedGroups = groups.map(group => ({
        id: group._id.toString(), // Convert ObjectId to string
        name: group.group_name,
        description: group.group_description,
        avatar_url: group.avatar_url,
        privacy_level: group.privacy_level,
        status: group.status,
        members: (group.group_members || []).map(member => ({
          id: member._id.toString(),
          user_id: member.user_id,
          role: member.role,
          status: member.status,
          joined_at: member.joined_at
        })),
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      }));
      
      res.status(200).json({
        success: true,
        groups: formattedGroups
      });
    } catch (error) {
      console.error('Error fetching groups:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to fetch groups. Please try again.'
      });
    }
  };
  
  /**
   * Create a new group
   * POST /api/groups
   */
  exports.createGroup = async (req, res) => {
    try {
      const groupData = {
        group_name: req.body.group_name,
        group_description: req.body.group_description,
        avatar_url: req.body.avatar_url,
        privacy_level: req.body.privacy_level,
        max_members: req.body.max_members,
        settings: req.body.settings
      };
      
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
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create group. Please try again.'
      });
    }
  };
  
  /**
   * Get a specific group by ID
   * GET /api/groups/:groupId
   */
  exports.getGroupById = async (req, res) => {
    try {
      const group = await groupService.getGroupById(req.params.groupId);
      
      // Check if user is a member of the group
      if (!group.isMember(req.user.user_id) && group.privacy_level !== 'public') {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this group'
        });
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
      
      res.status(200).json({
        success: true,
        group: formattedGroup
      });
    } catch (error) {
      console.error('Error fetching group:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to fetch group. Please try again.'
      });
    }
  };
  