// Script to create password_reset_tokens table
const sequelize = require('./src/config/database');

const createTable = async () => {
  try {
    // Create table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        token UUID NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('✅ Table password_reset_tokens created successfully');
    
    // Enable Row Level Security
    await sequelize.query(`
      ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
    `);
    
    console.log('✅ Row Level Security enabled on password_reset_tokens');
    
    // Create RLS policies
    await sequelize.query(`
      -- Users can only view their own tokens
      CREATE POLICY "Users can only view their own password reset tokens"
      ON password_reset_tokens
      FOR SELECT
      USING (
        auth.uid() = user_id
        OR
        email = (SELECT email FROM users WHERE user_id = auth.uid())
      );
      
      -- System can insert tokens
      CREATE POLICY "System can insert password reset tokens"
      ON password_reset_tokens
      FOR INSERT
      WITH CHECK (true);
      
      -- Users can update their own tokens
      CREATE POLICY "Users can update their own password reset tokens"
      ON password_reset_tokens
      FOR UPDATE
      USING (
        auth.uid() = user_id
        OR
        email = (SELECT email FROM users WHERE user_id = auth.uid())
      );
      
      -- System can delete expired tokens
      CREATE POLICY "System can delete expired tokens"
      ON password_reset_tokens
      FOR DELETE
      USING (true);
    `);
    
    console.log('✅ RLS policies created successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    process.exit(1);
  }
};

createTable();
