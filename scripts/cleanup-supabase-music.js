/**
 * Supabase Music Files Cleanup Script
 * 
 * This script helps identify and remove duplicate/unused music files from Supabase storage
 * to free up space and stay within the 1GB limit.
 * 
 * Steps:
 * 1. Lists all files in the 'Session-Music' folder of profile-images bucket
 * 2. Queries database for all active music tracks in playlists
 * 3. Identifies unused files (not referenced in any playlist)
 * 4. Optionally deletes unused files
 * 
 * Usage:
 *   node scripts/cleanup-supabase-music.js --dry-run  (preview only)
 *   node scripts/cleanup-supabase-music.js --delete   (actually delete files)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', 'jamz-server', '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const mongoose = require('mongoose');

// Clean environment variables
const cleanEnv = (str) => {
  if (!str) return '';
  return str.split('#')[0].trim().replace(/^["']|["']$/g, '');
};

// Initialize Supabase client
const supabase = createClient(
  cleanEnv(process.env.SUPABASE_URL),
  cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
);

// MongoDB connection
const MONGODB_URI = cleanEnv(process.env.MONGODB_URI);

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function getAllSupabaseFiles() {
  try {
    console.log('\n📂 Fetching all files from Supabase storage...');
    
    // List all files in the Session-Music folder
    const { data, error } = await supabase
      .storage
      .from('profile-images')
      .list('Session-Music', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('❌ Error listing files:', error);
      return [];
    }

    console.log(`✅ Found ${data.length} files in Supabase storage`);
    
    // Get file details with sizes
    const filesWithDetails = data.map(file => ({
      name: file.name,
      size: file.metadata?.size || 0,
      created: file.created_at,
      updated: file.updated_at,
      path: `Session-Music/${file.name}`,
      url: `${cleanEnv(process.env.SUPABASE_URL)}/storage/v1/object/public/profile-images/Session-Music/${file.name}`
    }));

    // Sort by size (largest first)
    filesWithDetails.sort((a, b) => b.size - a.size);

    // Calculate total size
    const totalSize = filesWithDetails.reduce((sum, file) => sum + file.size, 0);
    const totalSizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(3);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    console.log(`📊 Total storage used: ${totalSizeMB} MB (${totalSizeGB} GB)`);
    
    return filesWithDetails;
  } catch (error) {
    console.error('❌ Error fetching files:', error);
    return [];
  }
}

async function getActiveTrackURLs() {
  try {
    console.log('\n🔍 Querying database for active music tracks...');
    
    // Import AudioSession model
    const AudioSession = require('../jamz-server/src/models/audio-session.model');
    
    // Find all audio sessions with playlists
    const sessions = await AudioSession.find({
      'music.playlist': { $exists: true, $ne: [] }
    }).select('music.playlist group_id session_name');

    console.log(`✅ Found ${sessions.length} sessions with playlists`);

    // Extract all unique file URLs from playlists
    const activeUrls = new Set();
    const trackDetails = [];

    sessions.forEach(session => {
      if (session.music && session.music.playlist) {
        session.music.playlist.forEach(track => {
          // Check both url and fileUrl fields (for backwards compatibility)
          const trackUrl = track.url || track.fileUrl;
          
          // Only include Supabase URLs (not R2 URLs)
          if (trackUrl && trackUrl.includes('Session-Music') && trackUrl.includes('supabase')) {
            activeUrls.add(trackUrl);
            trackDetails.push({
              title: track.title,
              artist: track.artist,
              url: trackUrl,
              session: session.session_name || session._id,
              groupId: session.group_id
            });
          } else if (trackUrl) {
            // Log non-Supabase URLs for debugging
            console.log(`ℹ️  Track "${track.title}" uses ${trackUrl.includes('r2.dev') ? 'R2' : 'external'} storage`);
          }
        });
      }
    });

    console.log(`✅ Found ${activeUrls.size} unique active track URLs`);
    console.log(`📋 Total tracks across all playlists: ${trackDetails.length}`);

    return { activeUrls, trackDetails };
  } catch (error) {
    console.error('❌ Error querying database:', error);
    return { activeUrls: new Set(), trackDetails: [] };
  }
}

function extractFilenameFromURL(url) {
  // Extract filename from Supabase URL
  // URL format: https://nrlaqkpojtvvheosnpaz.supabase.co/storage/v1/object/public/profile-images/Session-Music/filename.mp3
  const parts = url.split('Session-Music/');
  if (parts.length > 1) {
    return parts[1].split('?')[0]; // Remove query params
  }
  return null;
}

async function analyzeAndCleanup(dryRun = true) {
  await connectDB();

  // Get all files from Supabase
  const allFiles = await getAllSupabaseFiles();

  // Get active track URLs from database
  const { activeUrls, trackDetails } = await getActiveTrackURLs();

  // Create a Set of active filenames for quick lookup
  const activeFilenames = new Set();
  activeUrls.forEach(url => {
    const filename = extractFilenameFromURL(url);
    if (filename) {
      activeFilenames.add(filename);
    }
  });

  console.log(`\n🔍 Active filenames in database: ${activeFilenames.size}`);

  // Identify unused files
  const unusedFiles = allFiles.filter(file => !activeFilenames.has(file.name));
  const usedFiles = allFiles.filter(file => activeFilenames.has(file.name));

  console.log('\n📊 ANALYSIS RESULTS:');
  console.log('==================');
  console.log(`Total files in Supabase: ${allFiles.length}`);
  console.log(`Files referenced in playlists: ${usedFiles.length}`);
  console.log(`Unused files: ${unusedFiles.length}`);

  // Calculate space savings
  const unusedSize = unusedFiles.reduce((sum, file) => sum + file.size, 0);
  const unusedSizeMB = (unusedSize / (1024 * 1024)).toFixed(2);
  const unusedSizeGB = (unusedSize / (1024 * 1024 * 1024)).toFixed(3);

  const usedSize = usedFiles.reduce((sum, file) => sum + file.size, 0);
  const usedSizeMB = (usedSize / (1024 * 1024)).toFixed(2);

  console.log(`\nUsed storage: ${usedSizeMB} MB`);
  console.log(`Unused storage: ${unusedSizeMB} MB (${unusedSizeGB} GB)`);
  console.log(`Potential savings: ${((unusedSize / (usedSize + unusedSize)) * 100).toFixed(1)}%`);

  // Show top 10 largest unused files
  if (unusedFiles.length > 0) {
    console.log('\n🗑️  Top 10 Largest Unused Files:');
    console.log('================================');
    unusedFiles.slice(0, 10).forEach((file, idx) => {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      console.log(`${idx + 1}. ${file.name}`);
      console.log(`   Size: ${sizeMB} MB | Created: ${new Date(file.created).toLocaleDateString()}`);
    });
  }

  // Show active tracks
  console.log('\n✅ Active Tracks in Playlists:');
  console.log('==============================');
  trackDetails.forEach((track, idx) => {
    console.log(`${idx + 1}. "${track.title}" by ${track.artist}`);
    console.log(`   Session: ${track.session}`);
  });

  // Delete unused files if not dry run
  if (!dryRun && unusedFiles.length > 0) {
    console.log('\n🗑️  DELETING UNUSED FILES...');
    console.log('============================');
    
    let deletedCount = 0;
    let deletedSize = 0;
    
    for (const file of unusedFiles) {
      try {
        const { error } = await supabase
          .storage
          .from('profile-images')
          .remove([file.path]);

        if (error) {
          console.error(`❌ Failed to delete ${file.name}:`, error.message);
        } else {
          deletedCount++;
          deletedSize += file.size;
          console.log(`✅ Deleted: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
        }
      } catch (err) {
        console.error(`❌ Error deleting ${file.name}:`, err.message);
      }
    }

    const deletedSizeMB = (deletedSize / (1024 * 1024)).toFixed(2);
    const deletedSizeGB = (deletedSize / (1024 * 1024 * 1024)).toFixed(3);

    console.log('\n✅ CLEANUP COMPLETE:');
    console.log('===================');
    console.log(`Deleted ${deletedCount} of ${unusedFiles.length} unused files`);
    console.log(`Freed up ${deletedSizeMB} MB (${deletedSizeGB} GB)`);
  } else if (dryRun && unusedFiles.length > 0) {
    console.log('\n⚠️  DRY RUN MODE - No files were deleted');
    console.log(`Run with --delete flag to actually delete ${unusedFiles.length} unused files and free up ${unusedSizeMB} MB`);
  }

  // Close MongoDB connection
  await mongoose.connection.close();
  console.log('\n✅ Done!');
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = !args.includes('--delete');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Supabase Music Files Cleanup Script
===================================

Usage:
  node scripts/cleanup-supabase-music.js [options]

Options:
  --dry-run   Preview what would be deleted (default)
  --delete    Actually delete unused files
  --help, -h  Show this help message

Examples:
  node scripts/cleanup-supabase-music.js              # Preview only
  node scripts/cleanup-supabase-music.js --dry-run    # Preview only
  node scripts/cleanup-supabase-music.js --delete     # Delete unused files
  `);
  process.exit(0);
}

console.log('🧹 Supabase Music Files Cleanup Script');
console.log('======================================');
console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (preview only)' : '🗑️  DELETE MODE'}`);

analyzeAndCleanup(isDryRun).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
