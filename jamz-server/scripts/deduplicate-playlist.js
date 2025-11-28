const mongoose = require('mongoose');
require('dotenv').config();

async function deduplicatePlaylist() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    const AudioSession = require('./src/models/audio-session.model.js');
    const session = await AudioSession.findOne({ session_id: '6805c88621925c8fd767cd4d' });
    
    if (!session || !session.music || !session.music.playlist) {
      console.log('❌ Session not found or has no playlist');
      process.exit(1);
    }

    const playlist = session.music.playlist;
    console.log('📊 Original playlist:', playlist.length, 'tracks');
    
    const seen = new Set();
    const deduplicated = playlist.filter(track => {
      const key = `${track.title}|${track.artist}`;
      if (seen.has(key)) {
        console.log('🗑️ Removing duplicate:', track.title);
        return false;
      }
      seen.add(key);
      return true;
    });
    
    session.music.playlist = deduplicated;
    await session.save();
    
    console.log('✅ Deduplicated playlist:', deduplicated.length, 'tracks');
    console.log('✅ Removed', playlist.length - deduplicated.length, 'duplicates');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deduplicatePlaylist();
