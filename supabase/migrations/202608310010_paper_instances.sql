-- Paper instances from random composition (ticket 13)
create table if not exists public.paper_instances (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references public.question_banks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  seed bigint not null,
  question_ids uuid[] not null default '{}',
  scores numeric[] not null default '{}',
  total_score numeric not null default 100,
  counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists paper_instances_user_idx
  on public.paper_instances (user_id, created_at desc);

create index if not exists paper_instances_bank_idx
  on public.paper_instances (bank_id);

alter table public.paper_instances enable row level security;

create policy paper_instances_select_own on public.paper_instances
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy paper_instances_insert_own on public.paper_instances
  for insert to authenticated
  with check (user_id = auth.uid());
