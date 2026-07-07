-- Membership tiers: member, paid, committee
-- Run in Supabase SQL editor

alter table members
  add column if not exists membership_tier text not null default 'member'
  check (membership_tier in ('member', 'paid', 'committee'));

update members set membership_tier = 'paid' where is_paid = true and membership_tier = 'member';

-- Keep is_paid in sync when redeeming a reference code
create or replace function redeem_reference_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code reference_codes;
begin
  select * into v_code from reference_codes where code = p_code for update;

  if v_code.code is null then
    raise exception 'Invalid reference code';
  end if;

  if v_code.used_by is not null then
    raise exception 'This reference code has already been used';
  end if;

  update reference_codes set used_by = auth.uid(), used_at = now() where code = p_code;
  update members
    set is_paid = true,
        membership_tier = case when membership_tier = 'committee' then membership_tier else 'paid' end
    where id = auth.uid();
end;
$$;

-- Admin can set a member's committee status
create or replace function set_membership_tier(p_member_id uuid, p_tier text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only admins can change membership tier';
  end if;

  if p_tier not in ('member', 'paid', 'committee') then
    raise exception 'Invalid membership tier';
  end if;

  update members set membership_tier = p_tier where id = p_member_id;
end;
$$;
