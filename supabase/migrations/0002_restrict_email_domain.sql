-- 限制注册邮箱域名（当前测试阶段仅允许 gmail.com，正式上线后改成学校邮箱域名）
-- 在 Supabase SQL editor 中执行本文件
/*
create or replace function check_email_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email !~* '@yahoo\.com$' then
    raise exception 'Only @gmail.com emails are allowed to sign up';
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_domain_check
  before insert on auth.users
  for each row execute function check_email_domain();

*/
