#!/usr/bin/env node
/**
 * scripts/add_profile_images.js
 *
 * Script to add profile images to existing users for testing avatars
 */

const path = require('path');
const sequelize = require('../src/config/database');

// Sample avatar URLs from various sources
const sampleAvatars = [
  'https://i.pravatar.cc/200?img=1',
  'https://i.pravatar.cc/200?img=2',
  'https://i.pravatar.cc/200?img=3',
  'https://i.pravatar.cc/200?img=4',
  'https://i.pravatar.cc/200?img=5',
  'https://i.pravatar.cc/200?img=6',
  'https://i.pravatar.cc/200?img=7',
  'https://i.pravatar.cc/200?img=8',
  'https://i.pravatar.cc/200?img=9',
  'https://i.pravatar.cc/200?img=10'
];

async function main() {
  console.log('Adding profile images to users...');

  try {
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL');

    // Get all users
    const [users] = await sequelize.query('SELECT user_id, username, email, first_name, last_name FROM users');
    console.log(`Found ${users.length} users`);

    // Update each user with a profile image
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const avatarUrl = sampleAvatars[i % sampleAvatars.length];
      
      await sequelize.query(
        'UPDATE users SET profile_image_url = :avatarUrl WHERE user_id = :userId',
        {
          replacements: { avatarUrl, userId: user.user_id }
        }
      );
      
      console.log(`✓ Updated ${user.username} (${user.first_name} ${user.last_name}) with avatar: ${avatarUrl}`);
    }

    console.log('\nProfile images added successfully!');
    console.log('\nNote: Avatars will display in the UI. Users without profile_image_url will show Gravatar based on their email.');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
