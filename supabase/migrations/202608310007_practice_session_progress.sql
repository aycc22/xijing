-- Practice session progress for resume and expiry
alter table public.attempt_sessions
  add column if not exists current_index integer not null default 0,
  add column if not exists expired_at timestamptz,
  add column if not exists draft_question_id uuid references public.questions (id) on delete set null,
  add column if not exists draft_selected_keys text[] not null default '{}';

alter table public.attempt_answers
  add column if not exists is_skipped boolean not null default false;

create index if not exists attempt_sessions_active_idx
  on public.attempt_sessions (user_id, bank_id, started_at desc)
  where finished_at is null and expired_at is null;
