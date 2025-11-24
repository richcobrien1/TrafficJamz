const { createClient } = require('@supabase/supabase-js');

// Clean environment variables (remove inline comments and quotes)
const cleanEnv = (str) => {
  if (!str) return '';
  return str.split('#')[0].trim().replace(/^["']|["']$/g, '');
};

const supabaseUrl = cleanEnv(process.env.SUPABASE_URL);
const supabaseKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log('🔍 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUrls() {
  try {
    // Get all users with R2 signed URLs
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('user_id, email, profile_image_url')
      .like('profile_image_url', '%r2.cloudflarestorage.com%');
    
    if (fetchError) throw fetchError;
    
    console.log(`📊 Found ${users?.length || 0} users with old R2 URLs`);
    
    if (!users || users.length === 0) {
      console.log('✅ No URLs to fix');
      return;
    }
    
    // Update each URL
    let successCount = 0;
    let failCount = 0;
    
    for (const user of users) {
      const oldUrl = user.profile_image_url;
      // Extract just the path after /music/
      const match = oldUrl.match(/\/music\/(profiles\/[^?]+)/);
      if (!match) {
        console.log(`⚠️ Skipping ${user.email}: couldn't parse URL`);
        continue;
      }
      
      const newUrl = `https://public.v2u.us/${match[1]}`;
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_image_url: newUrl })
        .eq('user_id', user.user_id);
      
      if (updateError) {
        console.error(`❌ Failed to update ${user.email}: ${updateError.message}`);
        failCount++;
      } else {
        console.log(`✅ Updated ${user.email}: ${newUrl}`);
        successCount++;
      }
    }
    
    console.log(`\n🎉 Migration complete! Success: ${successCount}, Failed: ${failCount}`);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

fixUrls();
