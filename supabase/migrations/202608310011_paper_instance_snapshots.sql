-- Freeze full question snapshots (stem/options/answers) on paper instances
alter table public.paper_instances
  add column if not exists items jsonb not null default '[]'::jsonb;
