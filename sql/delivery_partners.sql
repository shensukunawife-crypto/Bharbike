create extension if not exists "pgcrypto";

create table if not exists public.delivery_partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  name text null,
  full_name text null,
  phone text not null,
  email text null,
  city text not null,
  vehicle_type text null,
  license_number text null,
  aadhar_number text null,
  license_url text null,
  aadhar_url text null,
  photo_url text null,
  status text not null default 'review',
  created_at timestamptz not null default now()
);

alter table public.delivery_partners enable row level security;

drop policy if exists "Allow insert for all" on public.delivery_partners;
create policy "Allow insert for all"
on public.delivery_partners
for insert
to public
with check (true);
