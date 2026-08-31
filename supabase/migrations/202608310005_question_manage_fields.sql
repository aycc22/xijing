-- Question lifecycle fields for manage UI and CSV upsert
alter table public.questions
  add column if not exists is_active boolean not null default true,
  add column if not exists external_id text;

create unique index if not exists questions_bank_external_id_idx
  on public.questions (bank_id, external_id)
  where external_id is not null;
