-- 补全 auth.users 中缺失的 profiles 行（常见于早期微信登录用户）
-- paper_instances / exam_sessions 等表的外键均指向 profiles.id

insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'wechat_nickname'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    split_part(u.email, '@', 1)
  )
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- 客户端登录后可调用，确保当前用户必有 profile
create or replace function public.ensure_my_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.profiles (id, display_name)
  select
    u.id,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'wechat_nickname'), ''),
      nullif(trim(u.raw_user_meta_data->>'name'), ''),
      split_part(u.email, '@', 1)
    )
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do nothing;

  select * into result from public.profiles where id = auth.uid();
  if result.id is null then
    raise exception 'profile not found';
  end if;
  return result;
end;
$$;

revoke all on function public.ensure_my_profile() from public;
grant execute on function public.ensure_my_profile() to authenticated;
