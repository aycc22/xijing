-- P0 DeepSeek AI：考点确认戳、会话分析报告、日配额

alter table public.questions
  add column if not exists tags_edited_at timestamptz;

comment on column public.questions.tags_edited_at is
  '非空表示标签已经过上传者确认（手改或 AI 预览确认写入）';

create table public.session_ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_type text not null check (session_type in ('practice', 'exam')),
  session_id uuid not null,
  tag_stats jsonb not null default '[]'::jsonb,
  summary text not null default '',
  weak_points jsonb not null default '[]'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  status text not null default 'ready' check (status in ('ready', 'failed')),
  error_message text,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_type, session_id)
);

create index session_ai_reports_user_idx on public.session_ai_reports (user_id, updated_at desc);

alter table public.session_ai_reports enable row level security;

create policy session_ai_reports_select_own
  on public.session_ai_reports for select to authenticated
  using (user_id = auth.uid());

create table public.ai_usage_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (timezone('utc', now()))::date,
  analyze_count int not null default 0,
  grade_count int not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage_daily enable row level security;

create policy ai_usage_daily_select_own
  on public.ai_usage_daily for select to authenticated
  using (user_id = auth.uid());

-- 原子递增，避免并发读写丢失计数。由 Edge Function 以 service role 在上游成功后调用。
create or replace function public.increment_ai_usage(p_user_id uuid, p_kind text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  if p_kind = 'grade' then
    insert into public.ai_usage_daily (user_id, day, grade_count)
    values (p_user_id, (timezone('utc', now()))::date, 1)
    on conflict (user_id, day)
    do update set grade_count = public.ai_usage_daily.grade_count + 1
    returning grade_count into new_count;
  else
    insert into public.ai_usage_daily (user_id, day, analyze_count)
    values (p_user_id, (timezone('utc', now()))::date, 1)
    on conflict (user_id, day)
    do update set analyze_count = public.ai_usage_daily.analyze_count + 1
    returning analyze_count into new_count;
  end if;
  return new_count;
end;
$$;

revoke all on function public.increment_ai_usage(uuid, text) from public, anon, authenticated;
grant execute on function public.increment_ai_usage(uuid, text) to service_role;
