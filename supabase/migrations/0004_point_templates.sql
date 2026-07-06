-- Point templates: reusable presets for scanning (e.g. "Event attendance +5")
-- Run in Supabase SQL editor

create table point_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  points_delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table point_templates enable row level security;

create policy "admin manages point templates" on point_templates
  for all using (is_admin()) with check (is_admin());
