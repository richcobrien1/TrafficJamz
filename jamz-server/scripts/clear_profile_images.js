#!/usr/bin/env node
/**
 * scripts/clear_profile_images.js
 *
 * Script to clear profile images and let default avatars show
 */

const sequelize = require('../src/config/database');

async function main() {
  console.log('Clearing profile images...');

  try {
    // Clear all profile_image_url fields
    const [results] = await sequelize.query(
      'UPDATE users SET profile_image_url = NULL'
    );
    
    console.log(`✓ Cleared profile images for all users`);
    console.log('\nUsers will now show default avatars based on their initials.');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
