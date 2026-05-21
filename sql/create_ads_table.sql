-- 16. Ads/Banners table for Admin management & User app display
CREATE TABLE IF NOT EXISTS public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS ads_created_at_idx ON public.ads (created_at DESC);
