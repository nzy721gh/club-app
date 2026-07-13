-- Allow a member to edit their own booking (guest list + payment proof)
-- while it's still pending or rejected review.
-- Run in Supabase SQL editor

create or replace function update_booking(
  p_event_id uuid,
  p_guest_names text[],
  p_screenshot_urls text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_primary tickets;
  v_member uuid := auth.uid();
  v_name text;
begin
  select * into v_primary from tickets
    where event_id = p_event_id and member_id = v_member and guest_name is null
    for update;

  if v_primary.id is null then
    raise exception 'No existing ticket to edit';
  end if;

  if v_primary.payment_status not in ('pending', 'rejected') then
    raise exception 'This booking can no longer be edited';
  end if;

  delete from tickets
    where event_id = p_event_id and member_id = v_member and guest_name is not null;

  foreach v_name in array p_guest_names loop
    insert into tickets (event_id, member_id, guest_name, payment_screenshot_urls, payment_status)
    values (p_event_id, v_member, v_name, p_screenshot_urls, 'pending');
  end loop;

  update tickets
    set payment_screenshot_urls = p_screenshot_urls,
        payment_status = 'pending'
    where id = v_primary.id;
end;
$$;
