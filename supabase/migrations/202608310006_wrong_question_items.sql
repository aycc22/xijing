-- Wrong question items for practice mistakes and「暂不会」
create table if not exists public.wrong_question_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  wrong_count integer not null default 1,
  last_wrong_keys text[] not null default '{}',
  first_wrong_at timestamptz not null default now(),
  last_wrong_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create index if not exists wrong_items_user_idx on public.wrong_question_items (user_id, last_wrong_at desc);

alter table public.wrong_question_items enable row level security;

create policy wrong_items_select_own on public.wrong_question_items
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy wrong_items_insert_own on public.wrong_question_items
  for insert to authenticated with check (user_id = auth.uid());

create policy wrong_items_update_own on public.wrong_question_items
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
