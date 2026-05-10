-- =====================================================
-- SUPPORT TICKETS - Database Schema
-- =====================================================
-- This migration creates table for support/maintenance tickets
-- Run this in Supabase SQL Editor

-- 1. Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bike_id UUID REFERENCES bikes(id) ON DELETE SET NULL,
  bike_name VARCHAR(255) NOT NULL,
  ticket_number INTEGER UNIQUE NOT NULL,
  issue_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'cancelled')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_bike_id ON support_tickets(bike_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_number ON support_tickets(ticket_number);

-- 3. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for updated_at
DROP TRIGGER IF EXISTS support_tickets_updated_at ON support_tickets;
CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_updated_at();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
DROP POLICY IF EXISTS "Users can view their own tickets" ON support_tickets;
CREATE POLICY "Users can view their own tickets"
  ON support_tickets FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tickets" ON support_tickets;
CREATE POLICY "Users can insert their own tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tickets" ON support_tickets;
CREATE POLICY "Users can update their own tickets"
  ON support_tickets FOR UPDATE
  USING (auth.uid() = user_id);

-- 7. Create storage bucket for support images
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-images', 'support-images', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Create storage policy for support images
DROP POLICY IF EXISTS "Users can upload support images" ON storage.objects;
CREATE POLICY "Users can upload support images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'support-images' AND
    auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Anyone can view support images" ON storage.objects;
CREATE POLICY "Anyone can view support images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'support-images');

-- 9. Create function to get ticket statistics
CREATE OR REPLACE FUNCTION get_support_ticket_stats(p_user_id UUID)
RETURNS TABLE (
  total_tickets INTEGER,
  pending_tickets INTEGER,
  in_progress_tickets INTEGER,
  resolved_tickets INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_tickets,
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as pending_tickets,
    COUNT(*) FILTER (WHERE status = 'in_progress')::INTEGER as in_progress_tickets,
    COUNT(*) FILTER (WHERE status = 'resolved')::INTEGER as resolved_tickets
  FROM support_tickets
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Tables created:
--   - support_tickets (stores all support/maintenance tickets)
--
-- Storage:
--   - support-images bucket created
--   - Upload and view policies configured
--
-- Functions created:
--   - update_support_ticket_updated_at() - Auto-update timestamp
--   - get_support_ticket_stats() - Get ticket statistics
--
-- Security:
--   - Row Level Security (RLS) enabled
--   - Users can only access their own tickets
--   - Public storage for support images
-- =====================================================
