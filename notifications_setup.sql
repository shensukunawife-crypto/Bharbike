-- Run this in your Supabase SQL editor

-- Table to store user-specific notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info', -- 'wallet', 'success', 'kyc', 'order', 'promo'
  read        BOOLEAN DEFAULT false,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Table to store admin-sent notifications history
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  audience     TEXT DEFAULT 'All Users',
  push         BOOLEAN DEFAULT true,
  sms          BOOLEAN DEFAULT false,
  email        BOOLEAN DEFAULT false,
  priority     TEXT DEFAULT 'Normal',
  cta_link     TEXT,
  scheduled_at TIMESTAMPTZ,
  status       TEXT DEFAULT 'Sent',
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Disable Row-Level Security to ensure instant API access from backend service-role & user routes
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications DISABLE ROW LEVEL SECURITY;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON public.admin_notifications(created_at DESC);
