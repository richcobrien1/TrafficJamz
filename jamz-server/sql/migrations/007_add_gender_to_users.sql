-- Migration: Add gender column to users table
-- Date: 2025-11-01
-- Purpose: Allow users to specify gender for better avatar representation

-- Create ENUM type for gender
CREATE TYPE gender_type AS ENUM ('male', 'female', 'non-binary', 'prefer-not-to-say');

-- Add gender column to users table
ALTER TABLE users 
ADD COLUMN gender gender_type;

-- Optional: Set default gender for existing users based on first_name (requires manual review)
-- UPDATE users SET gender = 'male' WHERE first_name IN ('Richard', 'John', 'Michael', 'David', 'James', 'Robert');
-- UPDATE users SET gender = 'female' WHERE first_name IN ('Breanna', 'Mary', 'Jennifer', 'Linda', 'Patricia', 'Jessica');

COMMENT ON COLUMN users.gender IS 'User gender for avatar personalization';
