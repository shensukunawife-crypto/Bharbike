import "dotenv/config";
import supabase from "./src/utils/supabaseClient.js";

const sql = `
CREATE OR REPLACE FUNCTION public.get_wallet_column_types()
RETURNS TABLE (
  tbl_name TEXT,
  col_name TEXT,
  col_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    table_name::TEXT, 
    column_name::TEXT, 
    data_type::TEXT
  FROM information_schema.columns 
  WHERE table_name IN ('wallet_balances', 'wallet_transactions')
    AND table_schema = 'public';
END;
$$;
`;

async function main() {
  console.log("Creating RPC to get column types...");
  await supabase.rpc("exec_sql", { sql_query: sql });

  console.log("Calling RPC...");
  const { data, error } = await supabase.rpc("get_wallet_column_types");
  if (error) {
    console.error("Failed to call RPC:", error);
  } else {
    console.log("Column types:");
    console.log(JSON.stringify(data, null, 2));
  }

  // Cleanup
  console.log("Cleaning up RPC...");
  await supabase.rpc("exec_sql", { sql_query: "DROP FUNCTION IF EXISTS public.get_wallet_column_types();" });

  process.exit(0);
}

main();
