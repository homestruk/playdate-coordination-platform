-- Migration 006: Super Admin Helper Functions
-- Makes it easy to promote users to super admin via SQL or API

-- Function to promote user to super admin by email
CREATE OR REPLACE FUNCTION promote_to_super_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find user by email
  SELECT id INTO user_record FROM public.users WHERE email = user_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;

  -- Promote to super admin
  UPDATE public.users
  SET is_super_admin = true
  WHERE email = user_email;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to demote super admin
CREATE OR REPLACE FUNCTION demote_super_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.users
  SET is_super_admin = false
  WHERE email = user_email;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION promote_to_super_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION demote_super_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated, anon;

COMMENT ON FUNCTION promote_to_super_admin IS 'Promote a user to super admin by email. Usage: SELECT promote_to_super_admin(''user@example.com'');';
COMMENT ON FUNCTION demote_super_admin IS 'Remove super admin privileges from a user by email';
COMMENT ON FUNCTION is_super_admin IS 'Check if the current authenticated user is a super admin';
