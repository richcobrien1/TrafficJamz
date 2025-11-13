const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/trafficjamz').then(async () => {
  const AudioSession = require('./src/models/audio-session.model');
  const session = await AudioSession.findById('6805c88621925c8fd767cd4d');
  
  if (!session) {
    console.log('❌ Session not found');
    process.exit(1);
  }
  
  let updated = 0;
  session.music.playlist.forEach(track => {
    if (!track.url) {
      // Set url based on track source
      if (track.fileUrl) track.url = track.fileUrl;
      else if (track.youtubeUrl) track.url = track.youtubeUrl;
      else if (track.spotifyPreviewUrl) track.url = track.spotifyPreviewUrl;
      
      if (track.url) {
        console.log(`✅ Set URL for: ${track.title} - ${track.url.substring(0, 50)}`);
        updated++;
      }
    }
  });
  
  // Clear invalid currently_playing
  if (session.music.currently_playing && !session.music.currently_playing.url) {
    session.music.currently_playing = null;
    console.log('🗑️ Cleared invalid currently_playing track');
  }
  
  await session.save();
  console.log(`\n✅ Updated ${updated} tracks with url field`);
  console.log(`📋 Total tracks in playlist: ${session.music.playlist.length}`);
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
