import "dotenv/config";
import supabase from "./src/utils/supabaseClient.js";

const sql = `
CREATE OR REPLACE FUNCTION public.list_wallet_functions()
RETURNS TABLE (
  func_name TEXT,
  arg_types TEXT,
  func_src TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.proname::TEXT,
    pg_get_function_arguments(p.oid)::TEXT,
    p.prosrc::TEXT
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
    AND p.proname LIKE '%wallet%';
END;
$$;
`;

async function main() {
  console.log("Creating RPC to list functions...");
  await supabase.rpc("exec_sql", { sql_query: sql });

  console.log("Calling RPC...");
  await new Promise((resolve) => setTimeout(resolve, 2000));
  
  const { data, error } = await supabase.rpc("list_wallet_functions");
  if (error) {
    console.error("Failed to call RPC:", error);
  } else {
    console.log("Found Wallet Functions in DB:");
    console.log(JSON.stringify(data, null, 2));
  }

  // Cleanup
  console.log("Cleaning up RPC...");
  await supabase.rpc("exec_sql", { sql_query: "DROP FUNCTION IF EXISTS public.list_wallet_functions();" });

  process.exit(0);
}

main();
