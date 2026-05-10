-- =====================================================
-- BIKE LOCK LOGS - Database Schema
-- =====================================================
-- This migration creates table for tracking lock/unlock actions
-- Run this in Supabase SQL Editor

-- 1. Add is_locked column to bikes table if it doesn't exist
ALTER TABLE bikes 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT true;

-- 2. Add last_ping_at column to bikes table if it doesn't exist
ALTER TABLE bikes 
ADD COLUMN IF NOT EXISTS last_ping_at TIMESTAMPTZ;

-- 3. Create bike_lock_logs table
CREATE TABLE IF NOT EXISTS bike_lock_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_id UUID NOT NULL REFERENCES bikes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rental_id UUID REFERENCES rentals(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('lock', 'unlock')),
  method VARCHAR(20) NOT NULL DEFAULT 'app' CHECK (method IN ('app', 'qr', 'bluetooth', 'auto')),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bike_lock_logs_bike_id ON bike_lock_logs(bike_id);
CREATE INDEX IF NOT EXISTS idx_bike_lock_logs_user_id ON bike_lock_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_bike_lock_logs_rental_id ON bike_lock_logs(rental_id);
CREATE INDEX IF NOT EXISTS idx_bike_lock_logs_created_at ON bike_lock_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bike_lock_logs_action ON bike_lock_logs(action);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE bike_lock_logs ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
DROP POLICY IF EXISTS "Users can view their own lock logs" ON bike_lock_logs;
CREATE POLICY "Users can view their own lock logs"
  ON bike_lock_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own lock logs" ON bike_lock_logs;
CREATE POLICY "Users can insert their own lock logs"
  ON bike_lock_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 7. Create function to auto-lock bike after rental expiry
CREATE OR REPLACE FUNCTION auto_lock_expired_rentals()
RETURNS void AS $$
BEGIN
  -- Lock bikes whose rentals have expired
  UPDATE bikes
  SET is_locked = true, last_ping_at = NOW()
  WHERE id IN (
    SELECT bike_id
    FROM rentals
    WHERE status = 'active'
    AND end_time < NOW()
    AND bike_id IN (
      SELECT id FROM bikes WHERE is_locked = false
    )
  );
  
  -- Log the auto-lock actions
  INSERT INTO bike_lock_logs (bike_id, user_id, rental_id, action, method, success)
  SELECT 
    r.bike_id,
    r.user_id,
    r.id,
    'lock',
    'auto',
    true
  FROM rentals r
  WHERE r.status = 'active'
  AND r.end_time < NOW()
  AND r.bike_id IN (
    SELECT id FROM bikes WHERE is_locked = true
  );
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to get lock status with rental info
CREATE OR REPLACE FUNCTION get_lock_status_for_user(p_user_id UUID)
RETURNS TABLE (
  has_active_rental BOOLEAN,
  rental_id UUID,
  bike_id UUID,
  bike_name VARCHAR,
  license_plate VARCHAR,
  is_locked BOOLEAN,
  battery_level INTEGER,
  rental_expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as has_active_rental,
    r.id as rental_id,
    b.id as bike_id,
    b.name as bike_name,
    b.license_plate,
    COALESCE(b.is_locked, true) as is_locked,
    COALESCE(b.battery_level, 87) as battery_level,
    r.end_time as rental_expires_at
  FROM rentals r
  JOIN bikes b ON b.id = r.bike_id
  WHERE r.user_id = p_user_id
  AND r.status = 'active'
  ORDER BY r.created_at DESC
  LIMIT 1;
  
  -- If no active rental found, return default values
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      false as has_active_rental,
      NULL::UUID as rental_id,
      NULL::UUID as bike_id,
      NULL::VARCHAR as bike_name,
      NULL::VARCHAR as license_plate,
      true as is_locked,
      0 as battery_level,
      NULL::TIMESTAMPTZ as rental_expires_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Tables modified:
--   - bikes (added is_locked, last_ping_at columns)
--
-- Tables created:
--   - bike_lock_logs (tracks all lock/unlock actions)
--
-- Functions created:
--   - auto_lock_expired_rentals() - Auto-lock bikes after rental expiry
--   - get_lock_status_for_user() - Get lock status with rental info
--
-- Security:
--   - Row Level Security (RLS) enabled
--   - Users can only access their own lock logs
-- =====================================================
