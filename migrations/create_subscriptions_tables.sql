-- =====================================================
-- SUBSCRIPTION SYSTEM DATABASE SCHEMA
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. SUBSCRIPTION PLANS TABLE
-- Defines available subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  duration_days INTEGER NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USER SUBSCRIPTIONS TABLE
-- Tracks user's active and past subscriptions
-- user_id is TEXT to match the users table (supports demo IDs like "demo-91...")
-- plan_id is TEXT to accept both UUID and plan name strings
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  -- Status: active, expired, cancelled, pending
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  auto_renew BOOLEAN DEFAULT false,
  payment_id TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. SUBSCRIPTION BILLING HISTORY TABLE
-- Tracks all billing transactions for subscriptions
CREATE TABLE IF NOT EXISTS subscription_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Status: pending, paid, failed, refunded
  payment_method VARCHAR(50),
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  billing_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. INDEXES for better query performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_end_date ON user_subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscription_billing_user_id ON subscription_billing(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_billing_subscription_id ON subscription_billing(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_billing_status ON subscription_billing(status);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_billing ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active subscription plans
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

-- Users can only view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only view their own billing history
CREATE POLICY "Users can view own billing history"
  ON subscription_billing FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for backend API — uses service_role key)
CREATE POLICY "Service role full access to plans"
  ON subscription_plans FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to subscriptions"
  ON user_subscriptions FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to billing"
  ON subscription_billing FOR ALL
  USING (true) WITH CHECK (true);

-- 6. INSERT DEFAULT SUBSCRIPTION PLANS
INSERT INTO subscription_plans (name, display_name, description, price, duration_days, features) VALUES
  ('monthly_basic', 'Monthly Basic', 'Basic plan with essential features', 1999.00, 30, 
   '["50 rides per month", "Standard support", "Basic bike models"]'::jsonb),
  
  ('monthly_pro', 'Monthly Pro', 'Pro plan with unlimited rides', 2999.00, 30, 
   '["Unlimited rides", "Priority support", "All bike models", "Free helmet"]'::jsonb),
  
  ('quarterly_pro', 'Quarterly Pro', 'Pro plan for 3 months with discount', 7999.00, 90, 
   '["Unlimited rides", "Priority support", "All bike models", "Free helmet", "10% discount"]'::jsonb),
  
  ('yearly_pro', 'Yearly Pro', 'Pro plan for 12 months with best discount', 29999.00, 365, 
   '["Unlimited rides", "Priority support", "All bike models", "Free helmet", "20% discount", "Free maintenance"]'::jsonb)
ON CONFLICT DO NOTHING;

-- 7. FUNCTION: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. TRIGGERS for auto-updating timestamps
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. FUNCTION: Check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND end_date > NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- 10. FUNCTION: Get user's current active subscription
CREATE OR REPLACE FUNCTION get_active_subscription(p_user_id TEXT)
RETURNS TABLE (
  subscription_id UUID,
  plan_name VARCHAR,
  plan_display_name VARCHAR,
  price DECIMAL,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  days_remaining INTEGER,
  auto_renew BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.id,
    sp.name,
    sp.display_name,
    sp.price,
    us.start_date,
    us.end_date,
    EXTRACT(DAY FROM (us.end_date - NOW()))::INTEGER,
    us.auto_renew
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id
    AND us.status = 'active'
    AND us.end_date > NOW()
  ORDER BY us.end_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify tables are created
-- 3. Check default plans are inserted
-- =====================================================
