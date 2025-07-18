const { createClient } = require('@supabase/supabase-js');

async function testSupabaseConnection() {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || 'https://nrlaqkpojtvvheosnpaz.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseKey)  {
      console.error('Supabase key not found in environment variables');
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test query to users table
    const { data, error } = await supabase
      .from('users')
      .select('user_id, username, email')
      .limit(3);
    
    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }
    
    console.log('Successfully connected to Supabase!', data);
    return true;
  } catch (err) {
    console.error('Exception:', err);
    return false;
  }
}

module.exports = { testSupabaseConnection };
