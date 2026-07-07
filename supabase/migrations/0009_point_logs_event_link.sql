-- Link point logs to an event (optional)
-- Run in Supabase SQL editor

alter table point_logs add column if not exists event_id uuid references events (id);
