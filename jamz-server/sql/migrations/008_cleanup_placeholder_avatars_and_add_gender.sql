-- Migration: Cleanup placeholder avatars and add gender
-- Date: 2025-11-01
-- Purpose: Remove old ui-avatars.com URLs and add gender field

-- Step 1: Create gender ENUM type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE gender_type AS ENUM ('male', 'female', 'non-binary', 'prefer-not-to-say');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add gender column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN gender gender_type;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Step 3: Clear all placeholder avatar URLs (ui-avatars.com and dicebear.com)
-- This allows the frontend to generate proper gender-specific avatars
UPDATE users 
SET profile_image_url = NULL 
WHERE profile_image_url LIKE '%ui-avatars.com%' 
   OR profile_image_url LIKE '%api.dicebear.com%';

-- Step 4: Set gender for known users (update these based on your actual users)
-- Male users
UPDATE users SET gender = 'male' 
WHERE first_name IN ('Richard', 'John', 'Michael', 'David', 'James', 'Robert', 'Daniel', 'Matthew', 'Christopher');

-- Female users  
UPDATE users SET gender = 'female'
WHERE first_name IN ('Breanna', 'Mary', 'Jennifer', 'Linda', 'Patricia', 'Jessica', 'Sarah', 'Ashley', 'Emily');

-- Add comment
COMMENT ON COLUMN users.gender IS 'User gender for avatar personalization';

-- Verify the changes
SELECT 
    user_id,
    first_name,
    last_name,
    gender,
    CASE 
        WHEN profile_image_url IS NULL THEN 'NULL (will use gender avatar)'
        WHEN profile_image_url LIKE '%supabase.co/storage%' THEN 'Real uploaded image'
        ELSE profile_image_url
    END as profile_image_status
FROM users
ORDER BY first_name;
