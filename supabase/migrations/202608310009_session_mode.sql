-- Session mode for history (practice vs exam)
alter table public.attempt_sessions
  add column if not exists mode text not null default 'practice'
  check (mode in ('practice', 'exam'));
