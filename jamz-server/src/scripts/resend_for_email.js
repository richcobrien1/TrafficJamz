// Script: resend_for_email.js
// Purpose: Resend pending invitations targeted to a specific email address (dev only, not bulk)

const path = require('path');
const mongodb = require('../config/mongodb');
const Group = require('../models/group.model');
const groupService = require('../services/group.service');

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node src/scripts/resend_for_email.js <email>');
    process.exit(2);
  }

  try {
    console.log(`Connecting to MongoDB and searching for pending invitations for: ${email}`);
    await mongodb.connectMongoDB();

    const groups = await Group.find({ 'invitations.email': email });
    console.log(`Found ${groups.length} group(s) containing invitations for ${email}`);

    let attempted = 0;
    for (const group of groups) {
      const pending = (group.invitations || []).filter(inv => inv.email === email && inv.status === 'pending');
      if (!pending.length) continue;
      console.log(`Group ${group._id} has ${pending.length} pending invitation(s) for ${email}`);

      for (const inv of pending) {
        try {
          console.log(`Resending invitation ${inv._id} (${inv.email}) for group ${group._id} using owner ${group.owner_id}`);
          const result = await groupService.resendInvitation(group._id.toString(), inv._id.toString(), group.owner_id);
          console.log('Resend result:', result);
          if (result && result.emailPreviewUrl) {
            console.log('Preview URL:', result.emailPreviewUrl);
          }
          attempted++;
        } catch (err) {
          console.error(`Failed to resend invitation ${inv._id} in group ${group._id}:`, err && err.message ? err.message : err);
        }
      }
    }

    console.log(`Done. Attempted resends for ${attempted} invitation(s) targeting ${email}`);
    process.exit(0);
  } catch (error) {
    console.error('Script error:', error && error.message ? error.message : error);
    process.exit(1);
  }
}

main();
