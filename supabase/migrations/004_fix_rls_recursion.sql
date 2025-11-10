-- Fix infinite recursion in circle_members RLS policies
-- This migration creates helper functions to break the recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view circle members of circles they belong to" ON public.circle_members;
DROP POLICY IF EXISTS "Circle admins can approve/remove members" ON public.circle_members;
DROP POLICY IF EXISTS "Circle admins can delete members" ON public.circle_members;

-- Create security definer functions to check membership without RLS recursion
CREATE OR REPLACE FUNCTION public.is_circle_member(p_circle_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.circle_members
    WHERE circle_id = p_circle_id
    AND user_id = p_user_id
    AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_circle_admin(p_circle_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.circle_members
    WHERE circle_id = p_circle_id
    AND user_id = p_user_id
    AND role = 'admin'
    AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies using security definer functions (no recursion)
CREATE POLICY "Users can view circle members of circles they belong to" ON public.circle_members
  FOR SELECT USING (
    public.is_circle_member(circle_id, auth.uid())
  );

CREATE POLICY "Circle admins can approve/remove members" ON public.circle_members
  FOR UPDATE USING (
    public.is_circle_admin(circle_id, auth.uid())
  );

CREATE POLICY "Circle admins can delete members" ON public.circle_members
  FOR DELETE USING (
    public.is_circle_admin(circle_id, auth.uid())
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_circle_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_circle_admin(UUID, UUID) TO authenticated;
