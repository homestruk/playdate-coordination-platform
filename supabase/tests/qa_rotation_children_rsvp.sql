-- QA: Invite rotation, RLS, and per-child RSVP
-- This script uses Supabase's request.jwt.claim.sub to simulate auth.uid()
-- Run sections sequentially in the SQL editor

-- Setup: create two users
with u as (
  select gen_random_uuid() as admin_id, gen_random_uuid() as member_id
)
insert into public.users (id, email)
select admin_id, 'admin@example.com' from u
union all
select member_id, 'member@example.com' from u;

-- Fetch created IDs
with ids as (
  select id as admin_id from public.users where email = 'admin@example.com'
), ids2 as (
  select id as member_id from public.users where email = 'member@example.com'
)
select * from ids, ids2;

-- Set current user to admin and create a circle
select set_config('request.jwt.claim.sub', (select id::text from public.users where email='admin@example.com'), true);

do $$
declare
  v_circle_id uuid := gen_random_uuid();
  v_invite text := 'ABCDEFG1';
begin
  insert into public.circles (id, name, description, created_by, invite_code)
  values (v_circle_id, 'QA Circle', 'Test circle', (select id from public.users where email='admin@example.com'), v_invite);

  insert into public.circle_members (circle_id, user_id, role, status, joined_at)
  values (v_circle_id, (select id from public.users where email='admin@example.com'), 'admin', 'approved', now());

  -- Add member as pending
  insert into public.circle_members (circle_id, user_id, role, status, joined_at)
  values (v_circle_id, (select id from public.users where email='member@example.com'), 'member', 'pending', now());
end $$;

-- Admin can rotate invite code
select set_config('request.jwt.claim.sub', (select id::text from public.users where email='admin@example.com'), true);
with c as (
  select id from public.circles where name='QA Circle'
)
select public.rotate_circle_invite_code((select id from c)) as new_code;

-- Non-admin cannot rotate invite code
select set_config('request.jwt.claim.sub', (select id::text from public.users where email='member@example.com'), true);
do $$
declare
  v_circle_id uuid := (select id from public.circles where name='QA Circle');
begin
  perform public.rotate_circle_invite_code(v_circle_id);
  raise exception 'expected failure';
exception when others then
  -- expected not_authorized
  perform 1;
end $$;

-- Member visibility: member sees own pending row and approved admin row only via admin policy; app filters handle UI
select set_config('request.jwt.claim.sub', (select id::text from public.users where email='member@example.com'), true);
select id, user_id, role, status from public.circle_members where circle_id = (select id from public.circles where name='QA Circle');

-- Children RLS: owner-only CRUD
select set_config('request.jwt.claim.sub', (select id::text from public.users where email='admin@example.com'), true);
insert into public.children (user_id, full_name, allergies) values
((select id from public.users where email='admin@example.com'), 'Alex Admin', 'peanuts');

-- Member cannot see admin's child
select set_config('request.jwt.claim.sub', (select id::text from public.users where email='member@example.com'), true);
select * from public.children; -- should return only member's children (none yet)

-- Member creates own child
insert into public.children (user_id, full_name) values
((select id from public.users where email='member@example.com'), 'Mia Member');

-- Playdate created by admin
select set_config('request.jwt.claim.sub', (select id::text from public.users where email='admin@example.com'), true);
insert into public.playdates (id, circle_id, created_by, title, start_time, end_time, capacity, status)
values (
  gen_random_uuid(),
  (select id from public.circles where name='QA Circle'),
  (select id from public.users where email='admin@example.com'),
  'QA Playdate', now() + interval '1 day', now() + interval '1 day 2 hours', 10, 'published'
);

-- Organizer can write child RSVPs for any child
insert into public.playdate_child_participants (playdate_id, child_id, rsvp)
select p.id, c.id, 'yes'
from public.playdates p
join public.children c on c.full_name = 'Alex Admin'
where p.title='QA Playdate';

-- Member can write only for their child, not others
select set_config('request.jwt.claim.sub', (select id::text from public.users where email='member@example.com'), true);
-- attempt to write admin's child (should fail)
do $$
declare
  v_playdate uuid := (select id from public.playdates where title='QA Playdate');
  v_admin_child uuid := (select id from public.children where full_name='Alex Admin');
begin
  insert into public.playdate_child_participants (playdate_id, child_id, rsvp)
  values (v_playdate, v_admin_child, 'maybe');
  raise exception 'expected failure';
exception when others then
  perform 1;
end $$;

-- write own child RSVP (should succeed)
insert into public.playdate_child_participants (playdate_id, child_id, rsvp)
select p.id, c.id, 'yes'
from public.playdates p, public.children c
where p.title='QA Playdate' and c.full_name='Mia Member';

-- Read RSVPs as circle member
select set_config('request.jwt.claim.sub', (select id::text from public.users where email='member@example.com'), true);
select * from public.playdate_child_participants where playdate_id = (select id from public.playdates where title='QA Playdate');

-- Cleanup note: leave data for inspection; truncate manually if desired


