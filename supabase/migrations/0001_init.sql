-- 社团会员积分系统 数据库结构
-- 在 Supabase SQL editor 中直接执行本文件即可完成初始化
--
create extension if not exists "pgcrypto";

-- 会员表，id 与 auth.users.id 一一对应
create table members (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  student_id text unique,
  role text not null default 'member' check (role in ('member', 'admin')),
  points integer not null default 0,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 积分流水
create table point_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members (id) on delete cascade,
  points_delta integer not null,
  reason text not null,
  operator_id uuid references members (id),
  created_at timestamptz not null default now()
);

-- 成就定义
create table achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text,
  threshold integer not null, -- 累计积分达到该值时解锁
  created_at timestamptz not null default now()
);

-- 会员已解锁成就
create table member_achievements (
  member_id uuid not null references members (id) on delete cascade,
  achievement_id uuid not null references achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (member_id, achievement_id)
);

-- 礼品
create table rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  cost integer not null,
  stock integer not null default 0,
  created_at timestamptz not null default now()
);

-- 兑换记录
create table redemptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members (id) on delete cascade,
  reward_id uuid not null references rewards (id),
  status text not null default 'pending' check (status in ('pending', 'fulfilled', 'cancelled')),
  operator_id uuid references members (id),
  created_at timestamptz not null default now()
);

-- 判断当前登录用户是否为管理员（security definer 绕过 RLS 避免递归）
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from members where id = auth.uid() and role = 'admin'
  );
$$;

-- 插入积分流水后：更新会员累计积分，并检查新解锁的成就
create or replace function handle_point_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update members set points = points + new.points_delta where id = new.member_id;

  insert into member_achievements (member_id, achievement_id)
  select new.member_id, a.id
  from achievements a
  join members m on m.id = new.member_id
  where m.points >= a.threshold
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_point_log_insert
  after insert on point_logs
  for each row execute function handle_point_log();

-- 兑换礼品：扣减库存与积分
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
  update members set points = points - v_reward.cost where id = p_member_id;

  insert into redemptions (member_id, reward_id, status)
  values (p_member_id, p_reward_id, 'fulfilled')
  returning * into v_redemption;

  return v_redemption;
end;
$$;

-- 新用户注册后自动建立会员档案
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into members (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Row Level Security
alter table members enable row level security;
alter table point_logs enable row level security;
alter table achievements enable row level security;
alter table member_achievements enable row level security;
alter table rewards enable row level security;
alter table redemptions enable row level security;

create policy "members can view self" on members
  for select using (auth.uid() = id or is_admin());

create policy "admin can update members" on members
  for update using (is_admin());

create policy "members can view own point logs" on point_logs
  for select using (auth.uid() = member_id or is_admin());

create policy "admin can insert point logs" on point_logs
  for insert with check (is_admin());

create policy "everyone can view achievements" on achievements
  for select using (true);

create policy "admin manages achievements" on achievements
  for all using (is_admin()) with check (is_admin());

create policy "members can view own achievements" on member_achievements
  for select using (auth.uid() = member_id or is_admin());

create policy "everyone can view rewards" on rewards
  for select using (true);

create policy "admin manages rewards" on rewards
  for all using (is_admin()) with check (is_admin());

create policy "members can view own redemptions" on redemptions
  for select using (auth.uid() = member_id or is_admin());

create policy "members can redeem for self" on redemptions
  for insert with check (auth.uid() = member_id or is_admin());

create policy "admin can update redemptions" on redemptions
  for update using (is_admin());
