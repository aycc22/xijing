-- Session answer snapshots and personal learning markers
alter table public.attempt_answers
  add column if not exists question_snapshot jsonb;

create table if not exists public.question_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create table if not exists public.question_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);

alter table public.question_favorites enable row level security;
alter table public.question_notes enable row level security;

create policy favorites_select_own on public.question_favorites
  for select to authenticated using (user_id = auth.uid());
create policy favorites_insert_own on public.question_favorites
  for insert to authenticated with check (user_id = auth.uid());
create policy favorites_delete_own on public.question_favorites
  for delete to authenticated using (user_id = auth.uid());

create policy notes_select_own on public.question_notes
  for select to authenticated using (user_id = auth.uid());
create policy notes_insert_own on public.question_notes
  for insert to authenticated with check (user_id = auth.uid());
create policy notes_update_own on public.question_notes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notes_delete_own on public.question_notes
  for delete to authenticated using (user_id = auth.uid());
