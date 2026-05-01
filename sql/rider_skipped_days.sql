-- Run once in Supabase SQL Editor (Dashboard → SQL).
create table if not exists public.rider_skipped_days (
  id bigint generated always as identity primary key,
  rider_name text,
  bike_id text,
  skipped_start_date date,
  skipped_end_date date,
  days_skipped integer,
  reason text,
  status text default 'Inactive',
  created_at timestamptz not null default now()
);

create index if not exists rider_skipped_days_created_at_idx
  on public.rider_skipped_days (created_at desc);
