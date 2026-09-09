-- 账号状态 / 资料字段、审计日志、错题掌握、空库发布与删除保护、会话发布约束

-- 1) profiles: 冻结状态与头像（不依赖微信）
alter table public.profiles
  add column if not exists status text not null default 'active',
  add column if not exists avatar_url text;

alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('active', 'frozen'));

-- 2) 题目可选难度 / 标签（CSV 对齐）
alter table public.questions
  add column if not exists difficulty text,
  add column if not exists tags text[] not null default '{}';

-- 3) 错题掌握状态
alter table public.wrong_question_items
  add column if not exists consecutive_correct integer not null default 0,
  add column if not exists mastery text not null default 'pending';

alter table public.wrong_question_items
  drop constraint if exists wrong_items_mastery_check;

alter table public.wrong_question_items
  add constraint wrong_items_mastery_check
  check (mastery in ('pending', 'reviewing', 'mastered'));

-- 4) 答题可选截止时间（客户端倒计时；交卷仍走 RPC）
alter table public.exam_sessions
  add column if not exists deadline_at timestamptz;

-- 5) 有效题目数（停用题不计入，空库不能发布）
create or replace function public.refresh_bank_question_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.question_banks
  set question_count = (
    select count(*)::integer
    from public.questions
    where bank_id = coalesce(new.bank_id, old.bank_id)
      and coalesce(is_active, true)
  ),
  updated_at = now()
  where id = coalesce(new.bank_id, old.bank_id);
  return coalesce(new, old);
end;
$$;

update public.question_banks b
set question_count = (
  select count(*)::integer
  from public.questions q
  where q.bank_id = b.id and coalesce(q.is_active, true)
);

-- 6) 新用户资料：不再优先微信昵称
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    ),
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), '')
  );
  return new;
end;
$$;

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

  insert into public.profiles (id, display_name, avatar_url)
  select
    u.id,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'name'), ''),
      split_part(u.email, '@', 1)
    ),
    nullif(trim(u.raw_user_meta_data->>'avatar_url'), '')
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

-- 7) 审计日志
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated
  using (public.is_admin());

create or replace function public.audit_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role then
    insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
    values (
      auth.uid(),
      'role_change',
      'profile',
      new.id,
      jsonb_build_object('from', old.role, 'to', new.role)
    );
  end if;
  if old.status is distinct from new.status then
    insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
    values (
      auth.uid(),
      'status_change',
      'profile',
      new.id,
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_audit_aiu on public.profiles;
create trigger profiles_audit_aiu
  after update of role, status on public.profiles
  for each row execute function public.audit_profile_changes();

create or replace function public.audit_bank_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_published is distinct from new.is_published then
    insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
    values (
      auth.uid(),
      case when new.is_published then 'bank_publish' else 'bank_unpublish' end,
      'question_bank',
      new.id,
      jsonb_build_object('title', new.title)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists banks_audit_publish on public.question_banks;
create trigger banks_audit_publish
  after update of is_published on public.question_banks
  for each row execute function public.audit_bank_publish();

-- 8) 最后一名有效管理员保护
create or replace function public.protect_last_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'admin' then
    if new.role is distinct from 'admin'
       or (new.status = 'frozen' and old.status is distinct from 'frozen') then
      if not exists (
        select 1
        from public.profiles
        where role = 'admin'
          and id <> old.id
          and coalesce(status, 'active') = 'active'
      ) then
        raise exception 'cannot demote the last admin';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_last_admin on public.profiles;
create trigger profiles_protect_last_admin
  before update of role, status on public.profiles
  for each row execute function public.protect_last_admin();

-- 9) 空题库不能发布
create or replace function public.prevent_empty_bank_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_published and old.is_published is distinct from true then
    if not exists (
      select 1 from public.questions
      where bank_id = new.id and coalesce(is_active, true)
    ) then
      raise exception 'empty bank cannot be published';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists banks_prevent_empty_publish on public.question_banks;
create trigger banks_prevent_empty_publish
  before update of is_published on public.question_banks
  for each row execute function public.prevent_empty_bank_publish();

-- 10) 有学习记录的题库禁止硬删除
create or replace function public.bank_has_learning_records(p_bank_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.attempt_sessions where bank_id = p_bank_id)
    or exists (select 1 from public.paper_instances where bank_id = p_bank_id)
    or exists (
      select 1
      from public.questions q
      join public.wrong_question_items w on w.question_id = q.id
      where q.bank_id = p_bank_id
    )
    or exists (
      select 1
      from public.questions q
      join public.question_favorites f on f.question_id = q.id
      where q.bank_id = p_bank_id
    )
    or exists (
      select 1
      from public.questions q
      join public.question_notes n on n.question_id = q.id
      where q.bank_id = p_bank_id
    );
$$;

revoke all on function public.bank_has_learning_records(uuid) from public;
grant execute on function public.bank_has_learning_records(uuid) to authenticated;

create or replace function public.prevent_bank_delete_with_records()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.bank_has_learning_records(old.id) then
    raise exception 'bank has learning records';
  end if;
  return old;
end;
$$;

drop trigger if exists banks_prevent_delete_with_records on public.question_banks;
create trigger banks_prevent_delete_with_records
  before delete on public.question_banks
  for each row execute function public.prevent_bank_delete_with_records();

-- 11) 未发布题库：学习者不可新开会话 / 组卷（owner/admin 仍可）
drop policy if exists sessions_insert_own on public.attempt_sessions;
create policy sessions_insert_own on public.attempt_sessions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.question_banks b
      where b.id = bank_id
        and (b.is_published or b.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists paper_instances_insert_own on public.paper_instances;
create policy paper_instances_insert_own on public.paper_instances
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.question_banks b
      where b.id = bank_id
        and (b.is_published or b.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists exam_sessions_insert_own on public.exam_sessions;
create policy exam_sessions_insert_own on public.exam_sessions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.paper_instances p
      join public.question_banks b on b.id = p.bank_id
      where p.id = paper_id
        and (b.is_published or b.owner_id = auth.uid() or public.is_admin())
    )
  );

-- 12) 交卷时同步错题掌握状态
create or replace function public.finish_exam_session(p_session_id uuid)
returns public.exam_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  sess public.exam_sessions;
  paper public.paper_instances;
  grade_row public.paper_grading;
  grading jsonb;
  item jsonb;
  qid text;
  qid_uuid uuid;
  qtype text;
  selected text[];
  answer_keys text[];
  explanation text;
  reference_answer text;
  is_correct boolean;
  earned numeric;
  total_score numeric := 0;
  correct_n integer := 0;
  result jsonb := '[]'::jsonb;
  snap jsonb;
  answers jsonb;
  duration integer;
  user_text text;
  ref_norm text;
  user_norm text;
begin
  select * into sess from public.exam_sessions where id = p_session_id;
  if sess.id is null then
    raise exception 'exam session not found';
  end if;
  if sess.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'not allowed';
  end if;
  if sess.finished_at is not null then
    return sess;
  end if;

  select * into paper from public.paper_instances where id = sess.paper_id;
  if paper.id is null then
    raise exception 'paper not found';
  end if;

  select * into grade_row from public.paper_grading where paper_id = sess.paper_id;
  if grade_row.paper_id is null then
    raise exception 'paper grading not found';
  end if;
  grading := coalesce(grade_row.grading, '{}'::jsonb);

  answers := coalesce(sess.answers, '{}'::jsonb);

  for item in select * from jsonb_array_elements(coalesce(paper.items, '[]'::jsonb))
  loop
    qid := item->>'question_id';
    selected := coalesce(
      array(select jsonb_array_elements_text(answers->qid->'selected')),
      '{}'::text[]
    );
    select coalesce(array_agg(upper(x)), '{}'::text[]) into selected from unnest(selected) as x;

    answer_keys := coalesce(
      array(select jsonb_array_elements_text(grading->qid->'answer_keys')),
      '{}'::text[]
    );
    select coalesce(array_agg(upper(x)), '{}'::text[]) into answer_keys from unnest(answer_keys) as x;
    explanation := coalesce(grading->qid->>'explanation', '');
    reference_answer := coalesce(grading->qid->>'reference_answer', '');
    qtype := coalesce(item->'snapshot'->>'qtype', '');

    if qtype = 'short_answer' then
      user_text := coalesce(selected[1], '');
      ref_norm := lower(trim(both from reference_answer));
      user_norm := lower(trim(both from user_text));
      is_correct := cardinality(selected) > 0 and ref_norm <> '' and (
        user_norm = ref_norm
        or position(user_norm in ref_norm) > 0
        or position(ref_norm in user_norm) > 0
      );
    else
      is_correct := (
        select coalesce(array_agg(x order by x), '{}'::text[]) from unnest(selected) as x
      ) = (
        select coalesce(array_agg(x order by x), '{}'::text[]) from unnest(answer_keys) as x
      )
      and cardinality(answer_keys) > 0;
    end if;

    earned := case when is_correct then coalesce((item->>'score')::numeric, 0) else 0 end;
    if is_correct then
      correct_n := correct_n + 1;
      total_score := total_score + earned;
    end if;

    snap := coalesce(item->'snapshot', '{}'::jsonb)
      || jsonb_build_object(
        'answer_keys', to_jsonb(answer_keys),
        'explanation', explanation,
        'reference_answer', reference_answer
      );

    result := result || jsonb_build_array(jsonb_build_object(
      'question_id', qid,
      'score', coalesce((item->>'score')::numeric, 0),
      'earned', earned,
      'selected_keys', to_jsonb(selected),
      'is_correct', is_correct,
      'flagged', coalesce((answers->qid->>'flagged')::boolean, false),
      'snapshot', snap
    ));

    begin
      qid_uuid := qid::uuid;
      if exists (select 1 from public.questions where id = qid_uuid) then
        if not is_correct and cardinality(selected) > 0 and qtype <> 'short_answer' then
          insert into public.wrong_question_items (
            user_id, question_id, wrong_count, last_wrong_keys, first_wrong_at, last_wrong_at,
            consecutive_correct, mastery
          )
          values (sess.user_id, qid_uuid, 1, selected, now(), now(), 0, 'pending')
          on conflict (user_id, question_id) do update set
            wrong_count = public.wrong_question_items.wrong_count + 1,
            last_wrong_keys = excluded.last_wrong_keys,
            last_wrong_at = now(),
            consecutive_correct = 0,
            mastery = 'pending';
        elsif is_correct then
          update public.wrong_question_items
          set
            consecutive_correct = consecutive_correct + 1,
            mastery = case
              when consecutive_correct + 1 >= 2 then 'mastered'
              else 'reviewing'
            end
          where user_id = sess.user_id and question_id = qid_uuid;
        end if;
      end if;
    exception
      when invalid_text_representation then
        null;
      when others then
        null;
    end;
  end loop;

  duration := greatest(0, floor(extract(epoch from (now() - sess.started_at)) * 1000)::integer);

  update public.exam_sessions
  set
    finished_at = now(),
    score = round(total_score, 2),
    correct_count = correct_n,
    total_count = jsonb_array_length(coalesce(paper.items, '[]'::jsonb)),
    duration_ms = duration,
    result_items = result
  where id = sess.id
  returning * into sess;

  return sess;
end;
$$;

revoke all on function public.finish_exam_session(uuid) from public;
grant execute on function public.finish_exam_session(uuid) to authenticated;

-- 13) 用户不能自行改角色或冻结状态
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and status = (select p.status from public.profiles p where p.id = auth.uid())
  );
