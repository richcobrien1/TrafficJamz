const mongoose = require('mongoose');
const Group = require('./jamz-server/src/models/group.model');

async function checkGroup() {
  try {
    await mongoose.connect('mongodb://localhost:27017/jamz');
    const group = await Group.findById('68e944da482cc178aacffb95');
    console.log('Group found:', !!group);
    if (group) {
      console.log('Group name:', group.group_name);
      console.log('Group members:', group.group_members);
      console.log('Group members type:', typeof group.group_members);
      console.log('Group members length:', group.group_members ? group.group_members.length : 'undefined');
    }
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkGroup();