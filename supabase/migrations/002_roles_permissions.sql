-- Add super admin flag to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- USERS table: super admin full access
CREATE POLICY IF NOT EXISTS "super_admin_all_users" ON public.users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
  );

-- CIRCLES table: super admin full access
CREATE POLICY IF NOT EXISTS "super_admin_all_circles" ON public.circles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
  );

-- CIRCLE_MEMBERS table: super admin full access
CREATE POLICY IF NOT EXISTS "super_admin_all_circle_members" ON public.circle_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
  );

-- PLAYDATES table: super admin full access
CREATE POLICY IF NOT EXISTS "super_admin_all_playdates" ON public.playdates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
  );

-- PLAYDATE_PARTICIPANTS table: super admin full access
CREATE POLICY IF NOT EXISTS "super_admin_all_playdate_participants" ON public.playdate_participants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
  );

-- AVAILABILITY_SLOTS table: super admin full access
CREATE POLICY IF NOT EXISTS "super_admin_all_availability_slots" ON public.availability_slots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
  );

-- MESSAGES table: super admin full access
CREATE POLICY IF NOT EXISTS "super_admin_all_messages" ON public.messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
  );

-- VENUES table: super admin full access
CREATE POLICY IF NOT EXISTS "super_admin_all_venues" ON public.venues
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
  );

-- Circle admin moderation policies

-- Messages: circle admins can delete messages in their circles (circle chat or playdate chat)
CREATE POLICY IF NOT EXISTS "circle_admin_delete_messages" ON public.messages
  FOR DELETE USING (
    (circle_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.circle_members cm
      WHERE cm.circle_id = messages.circle_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
        AND cm.status = 'approved'
    ))
    OR
    (playdate_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.playdates p
      JOIN public.circle_members cm ON cm.circle_id = p.circle_id
      WHERE p.id = messages.playdate_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
        AND cm.status = 'approved'
    ))
  );

-- Playdates: circle admins or creators can update/cancel/delete playdates
CREATE POLICY IF NOT EXISTS "circle_admin_update_playdates" ON public.playdates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.circle_members cm
      WHERE cm.circle_id = playdates.circle_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
        AND cm.status = 'approved'
    )
    OR auth.uid() = created_by
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.circle_members cm
      WHERE cm.circle_id = playdates.circle_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
        AND cm.status = 'approved'
    )
    OR auth.uid() = created_by
  );

CREATE POLICY IF NOT EXISTS "circle_admin_delete_playdates" ON public.playdates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.circle_members cm
      WHERE cm.circle_id = playdates.circle_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
        AND cm.status = 'approved'
    )
    OR auth.uid() = created_by
  );


