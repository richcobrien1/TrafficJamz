// test-supabase.js
const { createClient } = require('@supabase/supabase-js');

// Replace with your actual environment variables
const supabaseUrl = process.env.POSTGRES_USER_SUPABASE_URL;
const supabaseKey = process.env.POSTGRES_USER_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseConnection() {
  try {
    // Try to query the users table
    const { data, error } = await supabase
      .from('users')
      .select('count()', { count: 'exact' })
      .limit(1);
    
    if (error) throw error;
    
    console.log('Supabase connection successful!');
    console.log('User count:', data[0].count);
    return true;
  } catch (error) {
    console.error('Supabase connection failed:', error.message);
    return false;
  }
}

module.exports = testSupabaseConnection;
