-- Optional capacity limit per event, enforced at the database level
-- Run in Supabase SQL editor

alter table events add column if not exists capacity integer;

create or replace function check_ticket_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_count integer;
begin
  select capacity into v_capacity from events where id = new.event_id;

  if v_capacity is not null then
    select count(*) into v_count from tickets where event_id = new.event_id;
    if v_count >= v_capacity then
      raise exception 'This event is sold out';
    end if;
  end if;

  return new;
end;
$$;

create trigger on_ticket_insert_check_capacity
  before insert on tickets
  for each row execute function check_ticket_capacity();

-- Aggregate ticket counts per event (members can't see other members' rows,
-- so this security definer function exposes only the count, not who claimed)
create or replace function get_event_ticket_counts()
returns table(event_id uuid, ticket_count bigint)
language sql
security definer
set search_path = public
as $$
  select event_id, count(*) from tickets group by event_id;
$$;
