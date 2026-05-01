create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  bike_id uuid,
  duration text,
  start_time timestamp,
  end_time timestamp,
  price numeric,
  status text,
  created_at timestamp default now()
);
