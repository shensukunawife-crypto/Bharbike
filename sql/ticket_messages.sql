-- Create ticket_messages table to store chat history
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid null,
  sender_type varchar(10) not null check (sender_type in ('user', 'admin')),
  message text not null,
  image_url text,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.ticket_messages enable row level security;

-- Policies
drop policy if exists "Allow select for all" on public.ticket_messages;
create policy "Allow select for all"
on public.ticket_messages
for select
to public
using (true);

drop policy if exists "Allow insert for all" on public.ticket_messages;
create policy "Allow insert for all"
on public.ticket_messages
for insert
to public
with check (true);
