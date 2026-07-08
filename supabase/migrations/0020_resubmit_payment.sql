-- Members had no UPDATE permission on tickets, so retrying a rejected
-- payment silently did nothing. Use a security definer function instead
-- of opening broad UPDATE access.
-- Run in Supabase SQL editor

create or replace function resubmit_payment(p_ticket_id uuid, p_screenshot_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket tickets;
begin
  select * into v_ticket from tickets where id = p_ticket_id for update;

  if v_ticket.id is null then
    raise exception 'Ticket not found';
  end if;

  if v_ticket.member_id <> auth.uid() then
    raise exception 'You can only resubmit your own ticket';
  end if;

  if v_ticket.payment_status <> 'rejected' then
    raise exception 'Only rejected tickets can be resubmitted';
  end if;

  update tickets
    set payment_screenshot_url = p_screenshot_url,
        payment_status = 'pending'
    where id = p_ticket_id;
end;
$$;
