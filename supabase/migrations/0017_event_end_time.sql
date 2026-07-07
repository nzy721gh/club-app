-- Events get an end time; tickets are considered expired once the event ends
-- Run in Supabase SQL editor

alter table events add column if not exists end_time timestamptz;
