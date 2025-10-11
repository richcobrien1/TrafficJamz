const mongoose = require('mongoose');
const Group = require('./src/models/group.model');

async function checkGroup() {
  try {
    await mongoose.connect('mongodb://localhost:27017/trafficjamz');
    const group = await Group.findById('68e944da482cc178aacffb95');
    console.log('Group found:', !!group);
    if (group) {
      console.log('Group name:', group.group_name);
      console.log('Members:', group.group_members?.length || 0);
      console.log('Owner:', group.owner_id);
      console.log('Members details:', group.group_members);
    } else {
      console.log('Group not found');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkGroup();