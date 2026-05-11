-- Tables required by the admin dashboard that may not exist yet
-- Run this in Supabase SQL Editor

-- Add missing columns to users table (admin dashboard needs these)
DO $$ BEGIN
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_delivery_partner BOOLEAN DEFAULT false;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Column addition skipped: %', SQLERRM;
END $$;

-- 1. profiles (mirror of users for admin dashboard joins)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  image_url TEXT,
  is_delivery_partner BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. orders (delivery orders)
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_code TEXT,
  user_id TEXT,
  assigned_user_id TEXT,
  bike_id BIGINT,
  status TEXT DEFAULT 'pending',
  amount NUMERIC DEFAULT 0,
  price NUMERIC DEFAULT 0,
  pickup_location TEXT,
  drop_location TEXT,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. earnings
CREATE TABLE IF NOT EXISTS public.earnings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  userId TEXT,
  type TEXT DEFAULT 'delivery',
  amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. payments
CREATE TABLE IF NOT EXISTS public.payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT,
  user_id TEXT,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. delivery_partners
CREATE TABLE IF NOT EXISTS public.delivery_partners (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  vehicle_type TEXT,
  license_number TEXT,
  aadhar_number TEXT,
  license_url TEXT,
  aadhar_url TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'review',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 6. kyc_documents
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  file_url TEXT,
  status TEXT DEFAULT 'pending',
  consumer_name TEXT,
  consumer_number TEXT,
  board_name TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, type)
);

-- 7. support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_number TEXT,
  user_id TEXT,
  subject TEXT,
  description TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (backend uses service_role key)
CREATE POLICY "Service role full access" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.earnings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.delivery_partners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.kyc_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.support_tickets FOR ALL USING (true) WITH CHECK (true);

-- Sync: when a user is created/updated in users table, upsert into profiles
-- This ensures the admin dashboard can find users via the profiles table
INSERT INTO public.profiles (id, full_name, email, phone, image_url, created_at, updated_at)
SELECT id, full_name, email, phone, image_url, created_at, COALESCE(updated_at, created_at)
FROM public.users
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  image_url = EXCLUDED.image_url,
  updated_at = now();
