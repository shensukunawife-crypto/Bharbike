-- =====================================================
-- FIX: rentals table compatible with existing bigint bikes.id
-- Run this in Supabase SQL Editor
-- =====================================================

-- rentals table with bike_id as BIGINT to match existing bikes table
CREATE TABLE IF NOT EXISTS rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_id BIGINT REFERENCES bikes(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  duration INTEGER,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rentals_user_id ON rentals(user_id);
CREATE INDEX IF NOT EXISTS idx_rentals_bike_id ON rentals(bike_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);

-- Enable RLS
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can view own rentals
CREATE POLICY "Users can view own rentals"
  ON rentals FOR SELECT
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rentals_updated_at
  BEFORE UPDATE ON rentals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
