import supabase from "../src/utils/supabaseClient.js";

async function run() {
  console.log("=== UPDATING get_or_create_wallet_balance RPC FUNCTION ===");

  const sql = `
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
  `;

  try {
    const { data, error } = await supabase.rpc("exec_sql", {
      sql_query: sql
    });

    if (error) {
      console.error("❌ Failed to update RPC function:", error);
    } else {
      console.log("✅ Successfully updated RPC function get_or_create_wallet_balance!");
      console.log("Response:", data);
    }
  } catch (err) {
    console.error("❌ Script error:", err);
  }
}

run();
