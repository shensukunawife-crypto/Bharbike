-- Run this in your Supabase SQL editor

-- Table to store admin-sent notifications history
CREATE TABLE IF NOT EXISTS admin_notifications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  audience   TEXT DEFAULT 'All Users',
  push       BOOLEAN DEFAULT true,
  sms        BOOLEAN DEFAULT false,
  email      BOOLEAN DEFAULT false,
  priority   TEXT DEFAULT 'Normal',
  cta_link   TEXT,
  scheduled_at TIMESTAMPTZ,
  status     TEXT DEFAULT 'Sent',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS (admin-only table, accessed via service role key)
ALTER TABLE admin_notifications DISABLE ROW LEVEL SECURITY;

-- Index for fast sorting
CREATE INDEX IF NOT EXISTS idx_admin_notif_created ON admin_notifications(created_at DESC);
