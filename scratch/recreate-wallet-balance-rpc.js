import supabase from "../src/utils/supabaseClient.js";

async function run() {
  console.log("=== RECREATING get_or_create_wallet_balance RPC FUNCTION WITH TEXT SIGNATURE ===");

  const queries = [
    // 1. Drop existing overloaded functions
    "DROP FUNCTION IF EXISTS public.get_or_create_wallet_balance(uuid);",
    "DROP FUNCTION IF EXISTS public.get_or_create_wallet_balance(text);",
    
    // 2. Create the clean TEXT signature function
    `
    CREATE OR REPLACE FUNCTION public.get_or_create_wallet_balance(p_user_id TEXT)
    RETURNS TABLE (
      user_id TEXT,
      balance NUMERIC,
      currency TEXT
    ) 
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    #variable_conflict use_column
    BEGIN
      -- Try to get existing wallet
      RETURN QUERY
      SELECT wb.user_id::TEXT, wb.balance::NUMERIC, wb.currency::TEXT
      FROM public.wallet_balances wb
      WHERE wb.user_id = p_user_id;
      
      -- If no wallet exists, create one
      IF NOT FOUND THEN
        INSERT INTO public.wallet_balances (user_id, balance, currency)
        VALUES (p_user_id, 0, 'INR')
        ON CONFLICT (user_id) DO NOTHING;
        
        RETURN QUERY
        SELECT wb.user_id::TEXT, wb.balance::NUMERIC, wb.currency::TEXT
        FROM public.wallet_balances wb
        WHERE wb.user_id = p_user_id;
      END IF;
    END;
    $$;
    `,
    
    // 3. Grant execute permissions to authenticated users
    "GRANT EXECUTE ON FUNCTION public.get_or_create_wallet_balance(TEXT) TO authenticated;"
  ];

  for (const sql of queries) {
    try {
      const { data, error } = await supabase.rpc("exec_sql", {
        sql_query: sql
      });
      if (error) {
        console.error(`❌ Failed: ${sql.slice(0, 100)}...`, error);
      } else {
        console.log(`✅ Success: ${sql.slice(0, 100)}...`, data);
      }
    } catch (err) {
      console.error("❌ Exception during query execution:", err);
    }
  }
}

run();
