import "dotenv/config";
import supabase from "./src/utils/supabaseClient.js";

const sql = `
-- Drop existing overloaded versions of the add_money_to_wallet function
DROP FUNCTION IF EXISTS public.add_money_to_wallet(text, numeric, character varying, character varying, character varying);
DROP FUNCTION IF EXISTS public.add_money_to_wallet(uuid, numeric, text, text, text);

-- Recreate the clean version with standard UUID and TEXT parameters
CREATE OR REPLACE FUNCTION public.add_money_to_wallet(
  p_user_id UUID,
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
  -- Ensure wallet exists
  INSERT INTO wallet_balances (user_id, balance, currency)
  VALUES (p_user_id, 0, 'INR')
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

-- Grant permissions to make sure the app roles can access it
GRANT EXECUTE ON FUNCTION public.add_money_to_wallet(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_money_to_wallet(UUID, NUMERIC, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.add_money_to_wallet(UUID, NUMERIC, TEXT, TEXT, TEXT) TO service_role;
`;

async function main() {
  console.log("Starting DB overload cleanup...");
  const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });
  if (error) {
    console.error("❌ DB cleanup failed:", error);
    process.exit(1);
  }
  console.log("✅ DB cleanup successfully executed! Overloaded functions dropped and single clean function recreated.", data);
  process.exit(0);
}

main();
