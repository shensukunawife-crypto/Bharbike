import "dotenv/config";
import supabase from "./src/utils/supabaseClient.js";

const sql = `
CREATE OR REPLACE FUNCTION public.get_wallet_triggers()
RETURNS TABLE (
  tbl_name TEXT,
  trig_name TEXT,
  proc_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::TEXT AS tbl_name,
    t.tgname::TEXT AS trig_name,
    p.proname::TEXT AS proc_name
  FROM pg_trigger t
  JOIN pg_proc p ON t.tgfoid = p.oid
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' 
    AND c.relname IN ('wallet_balances', 'wallet_transactions');
END;
$$;
`;

async function main() {
  console.log("Creating RPC to check triggers...");
  await supabase.rpc("exec_sql", { sql_query: sql });

  console.log("Calling RPC...");
  // Wait 2 seconds for schema cache reload
  await new Promise((resolve) => setTimeout(resolve, 2000));
  
  const { data, error } = await supabase.rpc("get_wallet_triggers");
  if (error) {
    console.error("Failed to call RPC:", error);
  } else {
    console.log("Wallet Triggers:", JSON.stringify(data, null, 2));
  }

  // Cleanup
  console.log("Cleaning up RPC...");
  await supabase.rpc("exec_sql", { sql_query: "DROP FUNCTION IF EXISTS public.get_wallet_triggers();" });

  process.exit(0);
}

main();
