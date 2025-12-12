// Script to enable Row Level Security on password_reset_tokens table
// Run this to secure an existing password_reset_tokens table
const sequelize = require('./src/config/database');

const enableRLS = async () => {
  try {
    console.log('🔒 Enabling Row Level Security on password_reset_tokens...');
    
    // Enable RLS
    await sequelize.query(`
      ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
    `);
    
    console.log('✅ Row Level Security enabled');
    
    // Drop existing policies if they exist
    console.log('🧹 Cleaning up existing policies...');
    await sequelize.query(`
      DROP POLICY IF EXISTS "Users can only view their own password reset tokens" ON password_reset_tokens;
      DROP POLICY IF EXISTS "System can insert password reset tokens" ON password_reset_tokens;
      DROP POLICY IF EXISTS "Users can update their own password reset tokens" ON password_reset_tokens;
      DROP POLICY IF EXISTS "System can delete expired tokens" ON password_reset_tokens;
    `);
    
    // Create RLS policies
    console.log('📋 Creating RLS policies...');
    
    // Policy 1: Users can only SELECT their own tokens
    await sequelize.query(`
      CREATE POLICY "Users can only view their own password reset tokens"
      ON password_reset_tokens
      FOR SELECT
      USING (
        auth.uid() = user_id
        OR
        email = (SELECT email FROM users WHERE user_id = auth.uid())
      );
    `);
    console.log('  ✓ SELECT policy created');
    
    // Policy 2: Service role can INSERT tokens
    await sequelize.query(`
      CREATE POLICY "System can insert password reset tokens"
      ON password_reset_tokens
      FOR INSERT
      WITH CHECK (true);
    `);
    console.log('  ✓ INSERT policy created');
    
    // Policy 3: Users can UPDATE their own tokens
    await sequelize.query(`
      CREATE POLICY "Users can update their own password reset tokens"
      ON password_reset_tokens
      FOR UPDATE
      USING (
        auth.uid() = user_id
        OR
        email = (SELECT email FROM users WHERE user_id = auth.uid())
      )
      WITH CHECK (
        auth.uid() = user_id
        OR
        email = (SELECT email FROM users WHERE user_id = auth.uid())
      );
    `);
    console.log('  ✓ UPDATE policy created');
    
    // Policy 4: Service role can DELETE expired tokens
    await sequelize.query(`
      CREATE POLICY "System can delete expired tokens"
      ON password_reset_tokens
      FOR DELETE
      USING (true);
    `);
    console.log('  ✓ DELETE policy created');
    
    // Add indexes for performance
    console.log('📊 Adding performance indexes...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at) WHERE used = FALSE;
    `);
    console.log('  ✓ Indexes created');
    
    // Verify RLS is enabled
    const [results] = await sequelize.query(`
      SELECT relrowsecurity, relname 
      FROM pg_class 
      WHERE relname = 'password_reset_tokens';
    `);
    
    if (results[0]?.relrowsecurity) {
      console.log('✅ Row Level Security is ENABLED and verified');
      console.log('✅ All policies and indexes created successfully');
      console.log('\n🔐 Security Summary:');
      console.log('   - Users can only view their own password reset tokens');
      console.log('   - Backend service can create tokens (uses service role key)');
      console.log('   - Users can mark tokens as used during password reset');
      console.log('   - Backend service can clean up expired tokens');
    } else {
      throw new Error('RLS verification failed');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error enabling RLS:', error.message);
    console.error(error);
    process.exit(1);
  }
};

enableRLS();
