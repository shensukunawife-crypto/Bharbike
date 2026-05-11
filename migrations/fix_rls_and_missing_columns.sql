-- ============================================================
-- FIX: Add missing KYC columns to users table + RLS policies
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add KYC document URL columns to users table (if missing)
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS aadhaar_front_url TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_back_url TEXT,
  ADD COLUMN IF NOT EXISTS pan_card_url TEXT,
  ADD COLUMN IF NOT EXISTS electricity_bill_url TEXT,
  ADD COLUMN IF NOT EXISTS selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS driving_license_url TEXT;

-- 2. Ensure orders table exists with proper columns
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  plan_name TEXT,
  amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  order_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure payments table exists
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT DEFAULT 'created',
  amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add RLS policies that allow inserts (service role should bypass, but add for safety)
-- Rentals policies
CREATE POLICY IF NOT EXISTS "Allow rental inserts"
  ON public.rentals FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow rental updates"
  ON public.rentals FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Orders policies  
CREATE POLICY IF NOT EXISTS "Allow order inserts"
  ON public.orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow order updates"
  ON public.orders FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Payments policies
CREATE POLICY IF NOT EXISTS "Allow payment inserts"
  ON public.payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow payment updates"
  ON public.payments FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Bikes policies (for status updates)
CREATE POLICY IF NOT EXISTS "Allow bike updates"
  ON public.bikes FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Users policies (for KYC document URL updates)
CREATE POLICY IF NOT EXISTS "Allow user KYC updates"
  ON public.users FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay ON public.payments(razorpay_order_id);
