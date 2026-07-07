-- Committee members get admin privileges too
-- Run in Supabase SQL editor

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from members
    where id = auth.uid()
      and (role = 'admin' or membership_tier = 'committee')
  );
$$;
