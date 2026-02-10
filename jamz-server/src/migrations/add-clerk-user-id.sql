-- Migration: Add Clerk user ID to users table
-- Date: 2026-02-09

-- Add clerk_user_id column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(255) UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);

-- Add comment
COMMENT ON COLUMN users.clerk_user_id IS 'Clerk user ID for SSO integration';

-- Allow password_hash to be nullable for Clerk-only users
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Update existing users to have active status if null
UPDATE users SET status = 'active' WHERE status IS NULL;
