#!/usr/bin/env node
/**
 * Fix R2 URLs in database
 * This script updates all track URLs from old R2.dev hashes to the correct one
 * 
 * Usage: node scripts/fix-r2-urls.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import the model
const AudioSession = require('../src/models/audio-session.model');

const OLD_R2_HASHES = [
  'd54e57481e824e8752d0f6caa9b37ba7',
  'pub-c4cf281613c744fabfa8830a27954687' // Old incorrect hash
];

const CORRECT_R2_HASH = 'pub-c4cf281613c744fabfa8830d27954687';

async function fixR2URLs() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all sessions with tracks
    const sessions = await AudioSession.find({
      $or: [
        { 'playlist.url': { $exists: true, $ne: null } },
        { 'currently_playing.url': { $exists: true, $ne: null } }
      ]
    });

    console.log(`📊 Found ${sessions.length} sessions to check`);

    let updatedCount = 0;
    let trackCount = 0;

    for (const session of sessions) {
      let sessionModified = false;

      // Fix playlist tracks
      if (session.playlist && session.playlist.length > 0) {
        session.playlist.forEach(track => {
          if (track.url) {
            const oldUrl = track.url;
            let newUrl = oldUrl;

            // Replace old R2.dev hashes with correct one
            OLD_R2_HASHES.forEach(oldHash => {
              if (oldUrl.includes(oldHash)) {
                newUrl = oldUrl.replace(
                  new RegExp(oldHash, 'g'),
                  CORRECT_R2_HASH
                );
              }
            });

            // Ensure it's using the pub-* format, not the account hash format
            if (newUrl.includes('d54e57481e824e8752d0f6caa9b37ba7.r2.dev')) {
              newUrl = newUrl.replace(
                'd54e57481e824e8752d0f6caa9b37ba7.r2.dev',
                `${CORRECT_R2_HASH}.r2.dev`
              );
            }

            if (oldUrl !== newUrl) {
              track.url = newUrl;
              sessionModified = true;
              trackCount++;
              console.log(`  ✏️  Fixed: ${track.title || 'Unknown'}`);
              console.log(`      Old: ${oldUrl.substring(0, 80)}...`);
              console.log(`      New: ${newUrl.substring(0, 80)}...`);
            }
          }
        });
      }

      // Fix currently playing track
      if (session.currently_playing && session.currently_playing.url) {
        const oldUrl = session.currently_playing.url;
        let newUrl = oldUrl;

        OLD_R2_HASHES.forEach(oldHash => {
          if (oldUrl.includes(oldHash)) {
            newUrl = oldUrl.replace(
              new RegExp(oldHash, 'g'),
              CORRECT_R2_HASH
            );
          }
        });

        if (newUrl.includes('d54e57481e824e8752d0f6caa9b37ba7.r2.dev')) {
          newUrl = newUrl.replace(
            'd54e57481e824e8752d0f6caa9b37ba7.r2.dev',
            `${CORRECT_R2_HASH}.r2.dev`
          );
        }

        if (oldUrl !== newUrl) {
          session.currently_playing.url = newUrl;
          sessionModified = true;
          trackCount++;
          console.log(`  ✏️  Fixed currently playing: ${session.currently_playing.title || 'Unknown'}`);
        }
      }

      if (sessionModified) {
        await session.save();
        updatedCount++;
      }
    }

    console.log('\n✅ Migration complete!');
    console.log(`   Sessions updated: ${updatedCount}`);
    console.log(`   Tracks fixed: ${trackCount}`);

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the migration
fixR2URLs();
