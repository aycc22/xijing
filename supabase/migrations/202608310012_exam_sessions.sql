-- Exam sessions + answer-key isolation for paper instances

create table if not exists public.paper_grading (
  paper_id uuid primary key references public.paper_instances (id) on delete cascade,
  grading jsonb not null default '{}'::jsonb
);

alter table public.paper_grading enable row level security;

-- Owner may write grading at create time; nobody (except definer fn) may read via API
create policy paper_grading_insert_own on public.paper_grading
  for insert to authenticated
  with check (
    exists (
      select 1 from public.paper_instances p
      where p.id = paper_id and p.user_id = auth.uid()
    )
  );

create table if not exists public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.paper_instances (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  current_index integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score numeric not null default 0,
  correct_count integer not null default 0,
  total_count integer not null default 0,
  duration_ms integer not null default 0,
  result_items jsonb not null default '[]'::jsonb,
  unique (paper_id, user_id)
);

create index if not exists exam_sessions_user_idx
  on public.exam_sessions (user_id, started_at desc);

alter table public.exam_sessions enable row level security;

create policy exam_sessions_select_own on public.exam_sessions
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy exam_sessions_insert_own on public.exam_sessions
  for insert to authenticated
  with check (user_id = auth.uid());

-- Clients may only update in-progress sessions (answers / index); finish is via RPC
create policy exam_sessions_update_own on public.exam_sessions
  for update to authenticated
  using (user_id = auth.uid() and finished_at is null)
  with check (user_id = auth.uid() and finished_at is null);

-- Strip answers from paper items JSON
create or replace function public.strip_paper_item_answers(items jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  result jsonb := '[]'::jsonb;
  elem jsonb;
  snap jsonb;
begin
  if items is null then
    return result;
  end if;
  for elem in select * from jsonb_array_elements(items)
  loop
    snap := coalesce(elem->'snapshot', '{}'::jsonb);
    snap := snap || jsonb_build_object('answer_keys', '[]'::jsonb, 'explanation', '');
    result := result || jsonb_build_array(
      (elem - 'snapshot') || jsonb_build_object('snapshot', snap)
    );
  end loop;
  return result;
end;
$$;

-- Finish exam: grade using paper_grading (security definer)
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
  item jsonb;
  qid text;
  selected text[];
  answer_keys text[];
  explanation text;
  is_correct boolean;
  earned numeric;
  total_score numeric := 0;
  correct_n integer := 0;
  result jsonb := '[]'::jsonb;
  snap jsonb;
  answers jsonb;
  duration integer;
begin
  select * into sess from public.exam_sessions where id = p_session_id;
  if sess.id is null then
    raise exception 'exam session not found';
  end if;
  if sess.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'not allowed';
  end if;
  if sess.finished_at is not null then
    return sess; -- idempotent
  end if;

  select * into paper from public.paper_instances where id = sess.paper_id;
  select * into grade_row from public.paper_grading where paper_id = sess.paper_id;

  answers := coalesce(sess.answers, '{}'::jsonb);

  for item in select * from jsonb_array_elements(coalesce(paper.items, '[]'::jsonb))
  loop
    qid := item->>'question_id';
    selected := coalesce(
      array(select jsonb_array_elements_text(answers->qid->'selected')),
      '{}'::text[]
    );
    -- normalize upper
    select coalesce(array_agg(upper(x)), '{}'::text[]) into selected from unnest(selected) as x;

    answer_keys := coalesce(
      array(select jsonb_array_elements_text(grade_row.grading->qid->'answer_keys')),
      '{}'::text[]
    );
    select coalesce(array_agg(upper(x)), '{}'::text[]) into answer_keys from unnest(answer_keys) as x;
    explanation := coalesce(grade_row.grading->qid->>'explanation', '');

    is_correct := (
      select coalesce(array_agg(x order by x), '{}'::text[]) from unnest(selected) as x
    ) = (
      select coalesce(array_agg(x order by x), '{}'::text[]) from unnest(answer_keys) as x
    )
    and cardinality(answer_keys) > 0;

    earned := case when is_correct then coalesce((item->>'score')::numeric, 0) else 0 end;
    if is_correct then
      correct_n := correct_n + 1;
      total_score := total_score + earned;
    end if;

    snap := coalesce(item->'snapshot', '{}'::jsonb)
      || jsonb_build_object('answer_keys', to_jsonb(answer_keys), 'explanation', explanation);

    result := result || jsonb_build_array(jsonb_build_object(
      'question_id', qid,
      'score', coalesce((item->>'score')::numeric, 0),
      'earned', earned,
      'selected_keys', to_jsonb(selected),
      'is_correct', is_correct,
      'flagged', coalesce((answers->qid->>'flagged')::boolean, false),
      'snapshot', snap
    ));

    -- 答错才入错题本；未作答不记
    if not is_correct and cardinality(selected) > 0 then
      insert into public.wrong_question_items (user_id, question_id, wrong_count, last_wrong_keys, first_wrong_at, last_wrong_at)
      values (sess.user_id, qid::uuid, 1, selected, now(), now())
      on conflict (user_id, question_id) do update set
        wrong_count = public.wrong_question_items.wrong_count + 1,
        last_wrong_keys = excluded.last_wrong_keys,
        last_wrong_at = now();
    end if;
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

-- Backfill grading from legacy paper items that still embed answers, then strip
insert into public.paper_grading (paper_id, grading)
select
  p.id,
  coalesce(
    (
      select jsonb_object_agg(
        elem->>'question_id',
        jsonb_build_object(
          'answer_keys', coalesce(elem->'snapshot'->'answer_keys', '[]'::jsonb),
          'explanation', coalesce(elem->'snapshot'->>'explanation', '')
        )
      )
      from jsonb_array_elements(coalesce(p.items, '[]'::jsonb)) as elem
      where coalesce(jsonb_array_length(elem->'snapshot'->'answer_keys'), 0) > 0
         or coalesce(elem->'snapshot'->>'explanation', '') <> ''
    ),
    '{}'::jsonb
  )
from public.paper_instances p
where not exists (select 1 from public.paper_grading g where g.paper_id = p.id)
on conflict (paper_id) do nothing;

update public.paper_instances
set items = public.strip_paper_item_answers(items)
where items is not null
  and items::text like '%answer_keys%';
