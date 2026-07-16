import supabase from "../src/utils/supabaseClient.js";

async function run() {
  console.log("=== REMOVING DUPLICATE OVERLOADS FOR get_or_create_wallet_balance ===");

  const queries = [
    "DROP FUNCTION IF EXISTS public.get_or_create_wallet_balance(text);",
    // Just in case, let's make sure the UUID one has the correct implementation:
    `
    CREATE OR REPLACE FUNCTION public.get_or_create_wallet_balance(p_user_id UUID)
    RETURNS TABLE (
      user_id UUID,
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
      SELECT wb.user_id, wb.balance, wb.currency
      FROM wallet_balances wb
      WHERE wb.user_id = p_user_id;
      
      -- If no wallet exists, create one
      IF NOT FOUND THEN
        INSERT INTO wallet_balances (user_id, balance, currency)
        VALUES (p_user_id, 0, 'INR')
        ON CONFLICT (user_id) DO NOTHING;
        
        RETURN QUERY
        SELECT wb.user_id, wb.balance, wb.currency
        FROM wallet_balances wb
        WHERE wb.user_id = p_user_id;
      END IF;
    END;
    $$;
    `
  ];

  for (const sql of queries) {
    try {
      const { data, error } = await supabase.rpc("exec_sql", {
        sql_query: sql
      });
      if (error) {
        console.error(`❌ Failed query: ${sql.slice(0, 100)}...`, error);
      } else {
        console.log(`✅ Success: ${sql.slice(0, 100)}...`, data);
      }
    } catch (err) {
      console.error("❌ Exception during query execution:", err);
    }
  }
}

run();
