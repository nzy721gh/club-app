-- Per-event control over whether guests are allowed and how many
-- Run in Supabase SQL editor

alter table events add column if not exists allow_guests boolean not null default false;
alter table events add column if not exists max_guests_per_person integer;

-- enforce guest rules alongside the existing capacity check
create or replace function check_ticket_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_count integer;
  v_allow_guests boolean;
  v_max_guests integer;
  v_guest_count integer;
begin
  select capacity, allow_guests, max_guests_per_person
    into v_capacity, v_allow_guests, v_max_guests
    from events where id = new.event_id;

  if v_capacity is not null then
    select count(*) into v_count from tickets where event_id = new.event_id;
    if v_count >= v_capacity then
      raise exception 'This event is sold out';
    end if;
  end if;

  if new.guest_name is not null then
    if not coalesce(v_allow_guests, false) then
      raise exception 'Guests are not allowed for this event';
    end if;

    if v_max_guests is not null then
      select count(*) into v_guest_count
        from tickets
        where event_id = new.event_id
          and member_id = new.member_id
          and guest_name is not null;
      if v_guest_count >= v_max_guests then
        raise exception 'Maximum number of guests reached';
      end if;
    end if;
  end if;

  return new;
end;
$$;
