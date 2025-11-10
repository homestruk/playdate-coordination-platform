-- Enable RLS
alter table public.children enable row level security;
alter table public.playdate_child_participants enable row level security;

-- Children: owner-only CRUD
drop policy if exists children_owner_select on public.children;
create policy children_owner_select on public.children
  for select using (auth.uid() = user_id);

drop policy if exists children_owner_modify on public.children;
create policy children_owner_modify on public.children
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Playdate child participants:
-- Read: circle members of the playdate’s circle
drop policy if exists pcp_circle_read on public.playdate_child_participants;
create policy pcp_circle_read on public.playdate_child_participants
  for select using (
    exists (
      select 1
      from public.playdates pd
      join public.circle_members cm
        on cm.circle_id = pd.circle_id
       and cm.user_id = auth.uid()
       and cm.status = 'approved'
      where pd.id = playdate_child_participants.playdate_id
    )
  );

-- Write: child owner OR playdate organizer
drop policy if exists pcp_write_owner_or_organizer on public.playdate_child_participants;
create policy pcp_write_owner_or_organizer on public.playdate_child_participants
  for all using (
    exists (
      select 1
      from public.playdates pd
      where pd.id = playdate_child_participants.playdate_id
        and (pd.created_by = auth.uid()
             or exists (
               select 1 from public.children c
               where c.id = playdate_child_participants.child_id
                 and c.user_id = auth.uid()
             ))
    )
  )
  with check (
    exists (
      select 1
      from public.playdates pd
      where pd.id = playdate_child_participants.playdate_id
        and (pd.created_by = auth.uid()
             or exists (
               select 1 from public.children c
               where c.id = playdate_child_participants.child_id
                 and c.user_id = auth.uid()
             ))
    )
  );

-- circle_members visibility refinement
alter table public.circle_members enable row level security;

drop policy if exists cm_self_select on public.circle_members;
create policy cm_self_select on public.circle_members
  for select using (user_id = auth.uid());

drop policy if exists cm_admin_select on public.circle_members;
create policy cm_admin_select on public.circle_members
  for select using (
    exists (
      select 1
      from public.circle_members admin_row
      where admin_row.circle_id = circle_members.circle_id
        and admin_row.user_id = auth.uid()
        and admin_row.role = 'admin'
        and admin_row.status = 'approved'
    )
  );


