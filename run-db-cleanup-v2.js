import "dotenv/config";
import supabase from "./src/utils/supabaseClient.js";

const sql = `
-- Drop ALL existing overloaded versions of add_money_to_wallet
DROP FUNCTION IF EXISTS public.add_money_to_wallet(text, numeric, character varying, character varying, character varying);
DROP FUNCTION IF EXISTS public.add_money_to_wallet(uuid, numeric, text, text, text);
DROP FUNCTION IF EXISTS public.add_money_to_wallet(text, numeric, text, text, text);

-- Drop ALL existing overloaded versions of deduct_money_from_wallet
DROP FUNCTION IF EXISTS public.deduct_money_from_wallet(uuid, numeric, text, text);
DROP FUNCTION IF EXISTS public.deduct_money_from_wallet(text, numeric, text, text);
DROP FUNCTION IF EXISTS public.deduct_money_from_wallet(text, numeric, character varying, text);

-- Recreate add_money_to_wallet accepting TEXT and querying with TEXT (NO UUID CASTS)
CREATE OR REPLACE FUNCTION public.add_money_to_wallet(
  p_user_id TEXT,
  p_amount NUMERIC,
  p_title TEXT,
  p_payment_id TEXT DEFAULT NULL,
  p_order_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  transaction_id UUID,
  new_balance NUMERIC,
  amount NUMERIC,
  type TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_new_balance NUMERIC;
BEGIN
  -- Ensure wallet exists (using TEXT p_user_id directly)
  INSERT INTO wallet_balances (user_id, balance, currency)
  VALUES (p_user_id, 0.00, 'INR')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update balance
  UPDATE wallet_balances
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  -- Create transaction record
  INSERT INTO wallet_transactions (
    user_id,
    amount,
    type,
    title,
    description,
    payment_id,
    order_id,
    status
  )
  VALUES (
    p_user_id,
    p_amount,
    'credit',
    p_title,
    'Money added to wallet',
    p_payment_id,
    p_order_id,
    'completed'
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN QUERY
  SELECT 
    v_transaction_id,
    v_new_balance,
    p_amount,
    'credit'::TEXT,
    'completed'::TEXT;
END;
$$;

-- Recreate deduct_money_from_wallet accepting TEXT and querying with TEXT (NO UUID CASTS)
CREATE OR REPLACE FUNCTION public.deduct_money_from_wallet(
  p_user_id TEXT,
  p_amount NUMERIC,
  p_title TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  transaction_id UUID,
  new_balance NUMERIC,
  amount NUMERIC,
  type TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_new_balance NUMERIC;
  v_current_balance NUMERIC;
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM wallet_balances
  WHERE user_id = p_user_id;
  
  -- Check if wallet exists
  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user';
  END IF;
  
  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Current: ₹%, Required: ₹%', v_current_balance, p_amount;
  END IF;
  
  -- Update balance
  UPDATE wallet_balances
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  -- Create transaction record
  INSERT INTO wallet_transactions (
    user_id,
    amount,
    type,
    title,
    description,
    status
  )
  VALUES (
    p_user_id,
    p_amount,
    'debit',
    p_title,
    COALESCE(p_description, 'Money deducted from wallet'),
    'completed'
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN QUERY
  SELECT 
    v_transaction_id,
    v_new_balance,
    p_amount,
    'debit'::TEXT,
    'completed'::TEXT;
END;
$$;

-- Grant execute permissions to make them widely accessible
GRANT EXECUTE ON FUNCTION public.add_money_to_wallet(TEXT, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_money_to_wallet(TEXT, NUMERIC, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.add_money_to_wallet(TEXT, NUMERIC, TEXT, TEXT, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION public.deduct_money_from_wallet(TEXT, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_money_from_wallet(TEXT, NUMERIC, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.deduct_money_from_wallet(TEXT, NUMERIC, TEXT, TEXT) TO service_role;
`;

async function main() {
  console.log("Starting DB robust types migration...");
  const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });
  if (error) {
    console.error("❌ DB cleanup failed:", error);
    process.exit(1);
  }
  console.log("✅ DB robust types migration successfully completed!", data);
  process.exit(0);
}

main();
