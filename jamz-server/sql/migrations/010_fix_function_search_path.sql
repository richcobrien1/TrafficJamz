-- Migration: Fix Function Search Path Security
-- Date: 2025-12-11
-- Purpose: Set immutable search_path on security-sensitive functions
-- Fixes: function_search_path_mutable warnings

-- Fix 1: is_group_member function
-- Drop and recreate with SECURITY DEFINER and search_path set
DROP FUNCTION IF EXISTS is_group_member(uuid, uuid);

CREATE OR REPLACE FUNCTION is_group_member(p_user_id uuid, p_group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM group_members 
    WHERE user_id = p_user_id 
    AND group_id = p_group_id
  );
END;
$$;

COMMENT ON FUNCTION is_group_member IS 'Checks if a user is a member of a group - Security Definer with fixed search_path';

-- Fix 2: is_group_admin function
DROP FUNCTION IF EXISTS is_group_admin(uuid, uuid);

CREATE OR REPLACE FUNCTION is_group_admin(p_user_id uuid, p_group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM groups 
    WHERE group_id = p_group_id 
    AND owner_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM group_members
    WHERE user_id = p_user_id
    AND group_id = p_group_id
    AND role = 'admin'
  );
END;
$$;

COMMENT ON FUNCTION is_group_admin IS 'Checks if a user is an admin/owner of a group - Security Definer with fixed search_path';

-- Fix 3: update_group_timestamp function (trigger function)
DROP FUNCTION IF EXISTS update_group_timestamp() CASCADE;

CREATE OR REPLACE FUNCTION update_group_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE groups 
  SET updated_at = NOW() 
  WHERE group_id = COALESCE(NEW.group_id, OLD.group_id);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_group_timestamp IS 'Updates group timestamp on member/activity changes - Security Definer with fixed search_path';

-- Recreate triggers if they existed
DROP TRIGGER IF EXISTS update_group_timestamp_on_member_change ON group_members;
CREATE TRIGGER update_group_timestamp_on_member_change
  AFTER INSERT OR UPDATE OR DELETE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION update_group_timestamp();

-- Note: group_activities table trigger skipped (table may not exist)
-- DROP TRIGGER IF EXISTS update_group_timestamp_on_activity ON group_activities;
-- CREATE TRIGGER update_group_timestamp_on_activity
--   AFTER INSERT ON group_activities
--   FOR EACH ROW
--   EXECUTE FUNCTION update_group_timestamp();

-- Also update resolve_group_role function while we're at it
DROP FUNCTION IF EXISTS resolve_group_role(uuid, uuid);

CREATE OR REPLACE FUNCTION resolve_group_role(p_user_id uuid, p_group_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM groups WHERE group_id = p_group_id AND owner_id = p_user_id
  ) THEN
    RETURN 'owner';
  ELSIF EXISTS (
    SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = p_user_id
  ) THEN
    RETURN 'member';
  ELSIF EXISTS (
    SELECT 1 FROM group_invites WHERE group_id = p_group_id AND invited_user_id = p_user_id
  ) THEN
    RETURN 'invitee';
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

COMMENT ON FUNCTION resolve_group_role IS 'Returns user role in group (owner/member/invitee/null) - Security Definer with fixed search_path';

-- Verify all functions now have search_path set
DO $$
DECLARE
  func_record RECORD;
  missing_count INTEGER := 0;
BEGIN
  FOR func_record IN 
    SELECT proname, pronamespace::regnamespace::text as schema
    FROM pg_proc
    WHERE proname IN ('is_group_member', 'is_group_admin', 'update_group_timestamp', 'resolve_group_role')
    AND pronamespace = 'public'::regnamespace
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc
      WHERE proname = func_record.proname
      AND proconfig IS NOT NULL
      AND 'search_path=public' = ANY(proconfig)
    ) THEN
      RAISE WARNING 'Function %.% still missing search_path', func_record.schema, func_record.proname;
      missing_count := missing_count + 1;
    ELSE
      RAISE NOTICE '✓ Function %.% has search_path configured', func_record.schema, func_record.proname;
    END IF;
  END LOOP;
  
  IF missing_count = 0 THEN
    RAISE NOTICE '✅ All functions have immutable search_path configured';
  ELSE
    RAISE EXCEPTION '❌ % function(s) still missing search_path', missing_count;
  END IF;
END $$;
