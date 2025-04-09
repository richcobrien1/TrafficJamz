// test-supabase.js
const { createClient } = require('@supabase/supabase-js');

// Replace with your actual environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://nrlaqkpojtvvheosnpaz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ybGFxa3BvanR2dmhlb3NucGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwNjc4NDEsImV4cCI6MjA1OTY0Mzg0MX0._up9k3roeCdWru1rn3xwk4W10vQfSflSw9tqbgaYtBk';

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

testSupabaseConnection();
