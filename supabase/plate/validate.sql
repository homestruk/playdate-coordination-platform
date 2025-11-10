-- Core tables exist
select table_name
from information_schema.tables
where table_schema='public'
  and table_name in (
    'users','circles','circle_members','playdates','playdate_participants','availability_slots','messages','venues'
  )
order by table_name;

-- is_super_admin column exists
select column_name
from information_schema.columns
where table_schema='public' and table_name='users' and column_name='is_super_admin';

-- Trigger installed
select tgname from pg_trigger where tgname='on_auth_user_created';

-- Membership sanity by email (replace)
-- select cm.* from public.circle_members cm
-- join public.users u on u.id = cm.user_id
-- where u.email = 'REPLACE@EMAIL.COM'
-- order by cm.joined_at desc;


