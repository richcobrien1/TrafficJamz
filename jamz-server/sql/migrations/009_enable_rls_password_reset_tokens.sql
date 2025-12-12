-- Migration: Enable Row Level Security on password_reset_tokens
-- Date: 2025-12-11
-- Purpose: Secure password_reset_tokens table with RLS policies
-- Security Issue: Table was public without RLS enabled

-- Step 1: Enable Row Level Security on the table
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can only view their own password reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "System can insert password reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Users can update their own password reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "System can delete expired tokens" ON password_reset_tokens;

-- Step 3: Create RLS policies

-- Policy 1: Users can only SELECT their own password reset tokens
-- This allows users to verify their tokens exist but doesn't expose others' tokens
CREATE POLICY "Users can only view their own password reset tokens"
ON password_reset_tokens
FOR SELECT
USING (
  -- Allow access if the user_id matches the authenticated user
  auth.uid() = user_id
  OR
  -- Allow access if the email matches the authenticated user's email
  email = (SELECT email FROM users WHERE user_id = auth.uid())
);

-- Policy 2: Service role can INSERT password reset tokens
-- This is for the backend application to create tokens
CREATE POLICY "System can insert password reset tokens"
ON password_reset_tokens
FOR INSERT
WITH CHECK (true); -- Backend will use service role key, which bypasses RLS

-- Policy 3: Users can UPDATE their own tokens (mark as used)
-- This allows the password reset process to mark tokens as used
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

-- Policy 4: Service role can DELETE expired or used tokens
-- This is for cleanup operations
CREATE POLICY "System can delete expired tokens"
ON password_reset_tokens
FOR DELETE
USING (true); -- Backend will use service role key for cleanup

-- Step 4: Add indexes for performance (if not already present)
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id 
ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token 
ON password_reset_tokens(token);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email 
ON password_reset_tokens(email);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at 
ON password_reset_tokens(expires_at) 
WHERE used = FALSE;

-- Step 5: Add comments for documentation
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens with RLS enabled for security';
COMMENT ON POLICY "Users can only view their own password reset tokens" ON password_reset_tokens IS 'Prevents users from viewing other users password reset tokens';
COMMENT ON POLICY "System can insert password reset tokens" ON password_reset_tokens IS 'Allows backend service to create password reset tokens';
COMMENT ON POLICY "Users can update their own password reset tokens" ON password_reset_tokens IS 'Allows users to mark their own tokens as used during password reset';
COMMENT ON POLICY "System can delete expired tokens" ON password_reset_tokens IS 'Allows backend service to clean up expired or used tokens';

-- Step 6: Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'password_reset_tokens') THEN
    RAISE EXCEPTION 'Row Level Security is not enabled on password_reset_tokens';
  END IF;
  RAISE NOTICE 'Row Level Security successfully enabled on password_reset_tokens';
END $$;
