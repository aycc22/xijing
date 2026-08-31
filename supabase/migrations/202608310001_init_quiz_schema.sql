-- Applied via Supabase MCP as init_quiz_schema
-- Profiles, question banks, questions, attempts + RLS

create type public.app_role as enum ('learner', 'uploader', 'admin');
create type public.question_type as enum ('single', 'multiple', 'case_analysis');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role public.app_role not null default 'learner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.has_upload_permission()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('uploader', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create table public.question_banks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  owner_id uuid not null references public.profiles (id) on delete cascade,
  is_published boolean not null default false,
  question_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index question_banks_owner_idx on public.question_banks (owner_id);
create index question_banks_published_idx on public.question_banks (is_published) where is_published;

alter table public.question_banks enable row level security;

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references public.question_banks (id) on delete cascade,
  qtype public.question_type not null,
  stem text not null,
  options jsonb not null default '[]'::jsonb,
  answer_keys text[] not null default '{}',
  explanation text not null default '',
  case_material text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index questions_bank_idx on public.questions (bank_id, sort_order);

alter table public.questions enable row level security;

create table public.attempt_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  bank_id uuid not null references public.question_banks (id) on delete cascade,
  total_count integer not null default 0,
  correct_count integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index attempt_sessions_user_idx on public.attempt_sessions (user_id, started_at desc);

alter table public.attempt_sessions enable row level security;

create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attempt_sessions (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  selected_keys text[] not null default '{}',
  is_correct boolean not null default false,
  answered_at timestamptz not null default now(),
  unique (session_id, question_id)
);

alter table public.attempt_answers enable row level security;

create or replace function public.refresh_bank_question_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.question_banks
  set question_count = (
    select count(*)::integer from public.questions where bank_id = coalesce(new.bank_id, old.bank_id)
  ),
  updated_at = now()
  where id = coalesce(new.bank_id, old.bank_id);
  return coalesce(new, old);
end;
$$;

create trigger questions_count_aiud
  after insert or update or delete on public.questions
  for each row execute function public.refresh_bank_question_count();

-- RLS policies (see applied migration for full set)
create policy profiles_select_authenticated on public.profiles for select to authenticated using (true);
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy banks_select on public.question_banks for select to authenticated
  using (is_published or owner_id = auth.uid() or public.is_admin());
create policy banks_insert on public.question_banks for insert to authenticated
  with check (owner_id = auth.uid() and public.has_upload_permission());
create policy banks_update on public.question_banks for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy banks_delete on public.question_banks for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create policy questions_select on public.questions for select to authenticated
  using (exists (
    select 1 from public.question_banks b
    where b.id = bank_id and (b.is_published or b.owner_id = auth.uid() or public.is_admin())
  ));
create policy questions_insert on public.questions for insert to authenticated
  with check (exists (
    select 1 from public.question_banks b
    where b.id = bank_id and (b.owner_id = auth.uid() or public.is_admin()) and public.has_upload_permission()
  ));
create policy questions_update on public.questions for update to authenticated
  using (exists (select 1 from public.question_banks b where b.id = bank_id and (b.owner_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.question_banks b where b.id = bank_id and (b.owner_id = auth.uid() or public.is_admin())));
create policy questions_delete on public.questions for delete to authenticated
  using (exists (select 1 from public.question_banks b where b.id = bank_id and (b.owner_id = auth.uid() or public.is_admin())));

create policy sessions_select_own on public.attempt_sessions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy sessions_insert_own on public.attempt_sessions for insert to authenticated
  with check (user_id = auth.uid());
create policy sessions_update_own on public.attempt_sessions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy answers_select_own on public.attempt_answers for select to authenticated
  using (exists (select 1 from public.attempt_sessions s where s.id = session_id and (s.user_id = auth.uid() or public.is_admin())));
create policy answers_insert_own on public.attempt_answers for insert to authenticated
  with check (exists (select 1 from public.attempt_sessions s where s.id = session_id and s.user_id = auth.uid()));
