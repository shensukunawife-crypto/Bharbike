-- =====================================================
-- WALLET SYSTEM - Database Schema
-- =====================================================
-- This migration creates tables for wallet balance and transactions
-- Run this in Supabase SQL Editor

-- 1. Create wallet_balances table
CREATE TABLE IF NOT EXISTS wallet_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_id VARCHAR(255),
  order_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallet_balances_user_id ON wallet_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);

-- 4. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create triggers for updated_at
DROP TRIGGER IF EXISTS wallet_balances_updated_at ON wallet_balances;
CREATE TRIGGER wallet_balances_updated_at
  BEFORE UPDATE ON wallet_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_updated_at();

DROP TRIGGER IF EXISTS wallet_transactions_updated_at ON wallet_transactions;
CREATE TRIGGER wallet_transactions_updated_at
  BEFORE UPDATE ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_updated_at();

-- 6. Create function to get or create wallet balance
CREATE OR REPLACE FUNCTION get_or_create_wallet_balance(p_user_id UUID)
RETURNS wallet_balances AS $$
DECLARE
  v_wallet wallet_balances;
BEGIN
  -- Try to get existing wallet
  SELECT * INTO v_wallet FROM wallet_balances WHERE user_id = p_user_id;
  
  -- If not found, create new wallet
  IF NOT FOUND THEN
    INSERT INTO wallet_balances (user_id, balance)
    VALUES (p_user_id, 0.00)
    RETURNING * INTO v_wallet;
  END IF;
  
  RETURN v_wallet;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to add money to wallet
CREATE OR REPLACE FUNCTION add_money_to_wallet(
  p_user_id UUID,
  p_amount DECIMAL(10, 2),
  p_title VARCHAR(255),
  p_payment_id VARCHAR(255) DEFAULT NULL,
  p_order_id VARCHAR(255) DEFAULT NULL
)
RETURNS wallet_transactions AS $$
DECLARE
  v_transaction wallet_transactions;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;
  
  -- Ensure wallet exists
  PERFORM get_or_create_wallet_balance(p_user_id);
  
  -- Update balance
  UPDATE wallet_balances
  SET balance = balance + p_amount
  WHERE user_id = p_user_id;
  
  -- Create transaction record
  INSERT INTO wallet_transactions (
    user_id, amount, type, title, status, payment_id, order_id
  )
  VALUES (
    p_user_id, p_amount, 'credit', p_title, 'completed', p_payment_id, p_order_id
  )
  RETURNING * INTO v_transaction;
  
  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to deduct money from wallet
CREATE OR REPLACE FUNCTION deduct_money_from_wallet(
  p_user_id UUID,
  p_amount DECIMAL(10, 2),
  p_title VARCHAR(255),
  p_description TEXT DEFAULT NULL
)
RETURNS wallet_transactions AS $$
DECLARE
  v_transaction wallet_transactions;
  v_current_balance DECIMAL(10, 2);
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;
  
  -- Ensure wallet exists
  PERFORM get_or_create_wallet_balance(p_user_id);
  
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM wallet_balances
  WHERE user_id = p_user_id;
  
  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', v_current_balance, p_amount;
  END IF;
  
  -- Update balance
  UPDATE wallet_balances
  SET balance = balance - p_amount
  WHERE user_id = p_user_id;
  
  -- Create transaction record
  INSERT INTO wallet_transactions (
    user_id, amount, type, title, description, status
  )
  VALUES (
    p_user_id, p_amount, 'debit', p_title, p_description, 'completed'
  )
  RETURNING * INTO v_transaction;
  
  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql;

-- 9. Enable Row Level Security (RLS)
ALTER TABLE wallet_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for wallet_balances
DROP POLICY IF EXISTS "Users can view their own wallet balance" ON wallet_balances;
CREATE POLICY "Users can view their own wallet balance"
  ON wallet_balances FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own wallet balance" ON wallet_balances;
CREATE POLICY "Users can insert their own wallet balance"
  ON wallet_balances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own wallet balance" ON wallet_balances;
CREATE POLICY "Users can update their own wallet balance"
  ON wallet_balances FOR UPDATE
  USING (auth.uid() = user_id);

-- 11. Create RLS policies for wallet_transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON wallet_transactions;
CREATE POLICY "Users can view their own transactions"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON wallet_transactions;
CREATE POLICY "Users can insert their own transactions"
  ON wallet_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 12. Insert sample data (optional - for testing)
-- Uncomment below to add sample data
/*
INSERT INTO wallet_balances (user_id, balance) VALUES
  ('00000000-0000-0000-0000-000000000001', 1248.00)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO wallet_transactions (user_id, amount, type, title, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 500.00, 'credit', 'Wallet Recharge', 'completed'),
  ('00000000-0000-0000-0000-000000000001', 98.00, 'debit', 'EV Scooter Pro Ride', 'completed'),
  ('00000000-0000-0000-0000-000000000001', 50.00, 'credit', 'Cashback Reward', 'completed')
ON CONFLICT DO NOTHING;
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Tables created:
--   1. wallet_balances - Stores user wallet balances
--   2. wallet_transactions - Stores all wallet transactions
--
-- Functions created:
--   1. get_or_create_wallet_balance() - Get or create wallet
--   2. add_money_to_wallet() - Add money to wallet
--   3. deduct_money_from_wallet() - Deduct money from wallet
--
-- Security:
--   - Row Level Security (RLS) enabled
--   - Users can only access their own data
--   - Policies enforce user isolation
-- =====================================================
