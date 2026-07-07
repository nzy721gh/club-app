-- Guest tickets: a member can bring one guest per event
-- Run in Supabase SQL editor

alter table tickets add column if not exists guest_name text;

-- only enforce "one ticket per member per event" for the member's own ticket;
-- guest tickets (guest_name is not null) are allowed alongside it
alter table tickets drop constraint if exists tickets_event_id_member_id_key;

create unique index if not exists tickets_primary_unique
  on tickets (event_id, member_id)
  where guest_name is null;
