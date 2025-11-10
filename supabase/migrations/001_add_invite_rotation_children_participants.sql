-- Circles: add rotation metadata
alter table public.circles
  add column if not exists invite_code_rotated_at timestamptz,
  add column if not exists invite_code_rotated_by uuid references public.users(id);

-- Children: per-parent child profiles
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  full_name text not null,
  birthdate date,
  allergies text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_children_user_id on public.children(user_id);

-- Child-level RSVP
create table if not exists public.playdate_child_participants (
  id uuid primary key default gen_random_uuid(),
  playdate_id uuid not null references public.playdates(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  rsvp text not null default 'pending' check (rsvp in ('yes','no','maybe','pending')),
  notes text,
  created_at timestamptz not null default now(),
  unique (playdate_id, child_id)
);
create index if not exists idx_pcp_playdate on public.playdate_child_participants(playdate_id);
create index if not exists idx_pcp_child on public.playdate_child_participants(child_id);


