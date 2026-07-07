-- Club events/activities
-- Run in Supabase SQL editor

create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  location text,
  event_time timestamptz not null,
  created_at timestamptz not null default now()
);

alter table events enable row level security;

create policy "everyone can view events" on events
  for select using (true);

create policy "admin manages events" on events
  for all using (is_admin()) with check (is_admin());
