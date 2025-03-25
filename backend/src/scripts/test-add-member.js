// test-add-member.js
const mongoose = require('mongoose');
const Group = require('../models/group.model'); // Adjust path as needed

async function addTestMember() {
  try {
    await mongoose.connect('mongodb://localhost:27017/audiogroupapp'); // Adjust connection string
    
    const groupId = '67e0e5a0f5ea8a260b2b726b'; // Replace with your actual group ID
    const testUserId = '1e644d41-007f-43a3-8cd3-02d944176920'; // Replace with a test user ID from your Sequelize users table
    
    const group = await Group.findById(groupId);
    if (!group) {
      console.error('Group not found');
      return;
    }
    
    // Check if user is already a member
    const existingMember = group.group_members.find(member => member.user_id === testUserId);
    if (existingMember) {
      console.log('User is already a member of this group');
      return;
    }
    
    // Add the test member
    group.group_members.push({
      user_id: testUserId,
      role: 'member',
      status: 'active',
      joined_at: new Date()
    });
    
    await group.save();
    
    console.log('Test member added successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

addTestMember();
