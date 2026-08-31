-- Group case sub-questions under a shared case_id within a bank
alter table public.questions add column if not exists case_id text;

create index if not exists questions_bank_case_idx
  on public.questions (bank_id, case_id, sort_order)
  where case_id is not null;
