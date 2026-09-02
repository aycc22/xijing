-- Exam paper import: short_answer type, bank metadata, per-question score

alter type public.question_type add value if not exists 'short_answer';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'bank_kind') then
    create type public.bank_kind as enum ('pool', 'exam');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'paper_compose_mode') then
    create type public.paper_compose_mode as enum ('random', 'fixed');
  end if;
end $$;

alter table public.question_banks
  add column if not exists bank_kind public.bank_kind not null default 'pool',
  add column if not exists exam_meta jsonb;

alter table public.questions
  add column if not exists score numeric,
  add column if not exists section text,
  add column if not exists attachments jsonb,
  add column if not exists reference_answer text not null default '';

alter table public.paper_instances
  add column if not exists compose_mode public.paper_compose_mode not null default 'random',
  add column if not exists section_labels jsonb;

create index if not exists question_banks_kind_idx on public.question_banks (bank_kind);
create index if not exists questions_bank_section_idx on public.questions (bank_id, section, sort_order);

-- Extend grading payload for short-answer reference text
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
  select * into grade_row from public.paper_grading where paper_id = sess.paper_id;

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
      array(select jsonb_array_elements_text(grade_row.grading->qid->'answer_keys')),
      '{}'::text[]
    );
    select coalesce(array_agg(upper(x)), '{}'::text[]) into answer_keys from unnest(answer_keys) as x;
    explanation := coalesce(grade_row.grading->qid->>'explanation', '');
    reference_answer := coalesce(grade_row.grading->qid->>'reference_answer', '');
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

    if not is_correct and cardinality(selected) > 0 and qtype <> 'short_answer' then
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
