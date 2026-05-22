-- ============================================
-- Create Hubs Database Table & Seed Defaults
-- ============================================

CREATE TABLE IF NOT EXISTS hubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apply updated_at trigger if trigger function exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_hubs_updated_at') THEN
    NULL;
  ELSE
    CREATE TRIGGER update_hubs_updated_at BEFORE UPDATE ON hubs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE hubs ENABLE ROW LEVEL SECURITY;

-- Add RLS select policy for all users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hubs' AND policyname = 'Allow public select access on hubs'
  ) THEN
    CREATE POLICY "Allow public select access on hubs" ON hubs
      FOR SELECT USING (true);
  END IF;
END $$;

-- Add RLS insert/update/delete policies for service role / admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hubs' AND policyname = 'Allow service_role full access on hubs'
  ) THEN
    CREATE POLICY "Allow service_role full access on hubs" ON hubs
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Seed default hubs if table is empty
INSERT INTO hubs (name, latitude, longitude, address, status)
VALUES
  ('Andheri East Hub', 19.11580000, 72.88760000, 'Near Metro Station, Andheri East, Mumbai', 'active'),
  ('Bandra Station Hub', 19.06180000, 72.83980000, 'Bandra Station Road West, Mumbai', 'active'),
  ('Juhu Beach Hub', 19.09880000, 72.82640000, 'Main Entrance, Juhu Beach, Mumbai', 'active'),
  ('BKC Hub', 19.06640000, 72.86790000, 'G Block, Bandra Kurla Complex, Mumbai', 'active')
ON CONFLICT (name) DO UPDATE 
SET 
  latitude = EXCLUDED.latitude, 
  longitude = EXCLUDED.longitude, 
  address = EXCLUDED.address;
