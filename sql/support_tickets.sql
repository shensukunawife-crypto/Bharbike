create extension if not exists "pgcrypto";

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  bike_name text,
  issue_type text,
  description text,
  image_url text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

drop policy if exists "Allow insert for all" on public.support_tickets;
create policy "Allow insert for all"
on public.support_tickets
for insert
to public
with check (true);

drop policy if exists "Allow select for admin" on public.support_tickets;
create policy "Allow select for admin"
on public.support_tickets
for select
to authenticated
using (true);

drop policy if exists "Allow update for admin" on public.support_tickets;
create policy "Allow update for admin"
on public.support_tickets
for update
to authenticated
using (true)
with check (true);
