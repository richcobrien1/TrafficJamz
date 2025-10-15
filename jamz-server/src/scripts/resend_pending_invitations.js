// Script: resend_pending_invitations.js
// Purpose: Resend all pending invitations by calling groupService.resendInvitation

const path = require('path');
const mongodb = require('../config/mongodb');
const Group = require('../models/group.model');
const groupService = require('../services/group.service');

async function main() {
  try {
    console.log('Connecting to MongoDB...');
    await mongodb.connectMongoDB();

    console.log('Searching for groups with pending invitations...');
    const groups = await Group.find({ 'invitations.status': 'pending' });
    console.log(`Found ${groups.length} groups with pending invitations`);

    let total = 0;
    for (const group of groups) {
      const pending = (group.invitations || []).filter(inv => inv.status === 'pending');
      if (!pending.length) continue;
      console.log(`Group ${group._id} has ${pending.length} pending invitation(s)`);

      for (const inv of pending) {
        try {
          console.log(`Resending invitation ${inv._id} (${inv.email}) for group ${group._id} using owner ${group.owner_id}`);
          const result = await groupService.resendInvitation(group._id.toString(), inv._id.toString(), group.owner_id);
          console.log('Resend result:', result);
          total++;
        } catch (err) {
          console.error(`Failed to resend invitation ${inv._id} in group ${group._id}:`, err && err.message ? err.message : err);
        }
      }
    }

    console.log(`Done. Attempted resends: ${total}`);
    process.exit(0);
  } catch (error) {
    console.error('Script error:', error && error.message ? error.message : error);
    process.exit(1);
  }
}

main();
