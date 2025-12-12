// Script to fix function search_path security warnings
// Run this to secure database functions
const sequelize = require('./src/config/database');
const fs = require('fs');
const path = require('path');

const fixFunctionSecurity = async () => {
  try {
    console.log('🔒 Fixing function search_path security issues...\n');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'sql', 'migrations', '010_fix_function_search_path.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await sequelize.query(sql);
    
    console.log('\n✅ All function security issues fixed!');
    console.log('\n🔐 Security Improvements:');
    console.log('   ✓ is_group_member - SECURITY DEFINER with search_path=public');
    console.log('   ✓ is_group_admin - SECURITY DEFINER with search_path=public');
    console.log('   ✓ update_group_timestamp - SECURITY DEFINER with search_path=public');
    console.log('   ✓ resolve_group_role - SECURITY DEFINER with search_path=public');
    console.log('\n📋 Triggers recreated:');
    console.log('   ✓ update_group_timestamp_on_member_change');
    console.log('   ✓ update_group_timestamp_on_activity');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing function security:', error.message);
    console.error(error);
    process.exit(1);
  }
};

fixFunctionSecurity();
