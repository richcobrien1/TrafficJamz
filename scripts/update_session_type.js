/**
 * Script to update audio session type from voice_only to voice_with_music
 * This is needed for sessions created before the music upload feature was fully implemented
 * 
 * Usage: node scripts/update_session_type.js <sessionId>
 */

const mongoose = require('mongoose');
require('dotenv').config();

const AudioSession = require('../jamz-server/src/models/audio-session.model');

async function updateSessionType(sessionId) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Find and update the session
    const session = await AudioSession.findById(sessionId);
    
    if (!session) {
      console.error('❌ Session not found:', sessionId);
      process.exit(1);
    }

    console.log('📋 Current session type:', session.session_type);

    if (session.session_type === 'voice_with_music') {
      console.log('✅ Session already supports music');
      process.exit(0);
    }

    // Update session type
    session.session_type = 'voice_with_music';
    await session.save();

    console.log('✅ Session updated successfully');
    console.log('📋 New session type:', session.session_type);

  } catch (error) {
    console.error('❌ Error updating session:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Get sessionId from command line arguments
const sessionId = process.argv[2];

if (!sessionId) {
  console.error('❌ Usage: node scripts/update_session_type.js <sessionId>');
  process.exit(1);
}

updateSessionType(sessionId);
