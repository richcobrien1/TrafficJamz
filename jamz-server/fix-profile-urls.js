/**
 * Fix profile image URLs - Convert signed R2 URLs to public URLs
 * 
 * Problem: Profile images use signed URLs that expire after 7 days
 * Solution: Update all profile_image_url entries to use public R2 URL domain
 * 
 * Before: https://d54e57481e824e8752d0f6caa9b37ba7.r2.cloudflarestorage.com/music/profiles/profile-xxx.jpg?X-Amz-Signature=...
 * After:  https://public.v2u.us/profiles/profile-xxx.jpg
 */

require('dotenv').config();
const { Pool } = require('pg');

// Clean environment variables (remove comments and quotes)
const cleanEnv = (value) => {
  if (!value) return value;
  // Remove everything after # (comments)
  const withoutComments = value.split('#')[0].trim();
  // Remove surrounding quotes
  return withoutComments.replace(/^["']|["']$/g, '');
};

const pool = new Pool({
  host: cleanEnv(process.env.POSTGRES_HOST) || 'aws-0-us-east-1.pooler.supabase.com',
  port: parseInt(cleanEnv(process.env.POSTGRES_PORT)) || 6543,
  database: cleanEnv(process.env.POSTGRES_DB) || 'postgres',
  user: cleanEnv(process.env.POSTGRES_USER),
  password: cleanEnv(process.env.POSTGRES_PASSWORD),
  ssl: { rejectUnauthorized: false }
});

console.log('📊 Database config:', {
  host: cleanEnv(process.env.POSTGRES_HOST),
  port: cleanEnv(process.env.POSTGRES_PORT),
  database: cleanEnv(process.env.POSTGRES_DB),
  user: cleanEnv(process.env.POSTGRES_USER)
});

async function fixProfileUrls() {
  console.log('🔧 Fixing profile image URLs...\n');

  try {
    // Get all users with R2 profile images
    const result = await pool.query(
      `SELECT user_id, username, email, profile_image_url 
       FROM users 
       WHERE profile_image_url LIKE '%r2.cloudflarestorage.com%'
       OR profile_image_url LIKE '%X-Amz-%'`
    );

    console.log(`Found ${result.rows.length} users with R2 URLs to fix\n`);

    if (result.rows.length === 0) {
      console.log('✅ No URLs need fixing!');
      return;
    }

    let fixedCount = 0;
    const publicDomain = process.env.R2_PUBLIC_URL || 'https://public.v2u.us';

    for (const user of result.rows) {
      const oldUrl = user.profile_image_url;
      
      // Extract the file path from the URL
      // Example: https://d54e...r2.cloudflarestorage.com/music/profiles/profile-xxx.jpg?params...
      // Extract: profiles/profile-xxx.jpg
      
      let newUrl = null;
      
      // Try to extract the path after /music/ or just the filename
      const musicMatch = oldUrl.match(/\/music\/(profiles\/[^?]+)/);
      const profilesMatch = oldUrl.match(/\/(profiles\/profile-[^?]+)/);
      
      if (musicMatch) {
        // Found /music/profiles/... pattern
        newUrl = `${publicDomain}/${musicMatch[1]}`;
      } else if (profilesMatch) {
        // Found /profiles/... pattern
        newUrl = `${publicDomain}/${profilesMatch[1]}`;
      } else {
        console.log(`⚠️  Could not parse URL for ${user.email}: ${oldUrl}`);
        continue;
      }

      // Update the database
      await pool.query(
        'UPDATE users SET profile_image_url = $1 WHERE user_id = $2',
        [newUrl, user.user_id]
      );

      console.log(`✅ Fixed ${user.email}:`);
      console.log(`   Old: ${oldUrl.substring(0, 80)}...`);
      console.log(`   New: ${newUrl}\n`);
      
      fixedCount++;
    }

    console.log(`\n🎉 Successfully fixed ${fixedCount} profile URLs!`);

  } catch (error) {
    console.error('❌ Error fixing URLs:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
fixProfileUrls()
  .then(() => {
    console.log('\n✅ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
