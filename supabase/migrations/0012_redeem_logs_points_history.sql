-- Log reward redemptions in point_logs so they show up in Points History
-- Run in Supabase SQL editor

create or replace function redeem_reward(p_reward_id uuid, p_member_id uuid)
returns redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward rewards;
  v_member members;
  v_redemption redemptions;
begin
  select * into v_reward from rewards where id = p_reward_id for update;
  select * into v_member from members where id = p_member_id for update;

  if v_reward.stock <= 0 then
    raise exception 'This reward is out of stock';
  end if;

  if v_member.points < v_reward.cost then
    raise exception 'Not enough points';
  end if;

  update rewards set stock = stock - 1 where id = p_reward_id;

  -- inserting into point_logs triggers handle_point_log(), which deducts the
  -- points from the member automatically; do not also update members here
  insert into point_logs (member_id, points_delta, reason)
  values (p_member_id, -v_reward.cost, 'Redeemed: ' || v_reward.name);

  insert into redemptions (member_id, reward_id, status)
  values (p_member_id, p_reward_id, 'fulfilled')
  returning * into v_redemption;

  return v_redemption;
end;
$$;
