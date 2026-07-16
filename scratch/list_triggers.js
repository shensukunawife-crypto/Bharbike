import "dotenv/config";
import supabase from "../src/utils/supabaseClient.js";

async function main() {
  console.log("Listing all user-defined triggers in pg_trigger...");
  const { data: triggers, error } = await supabase.rpc("run_sql_query", {
    query_text: `
      SELECT 
        tgname as trigger_name,
        relname as table_name,
        proname as function_name
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND t.gisinternal = false;
    `
  });
  
  if (error) {
    // If the rpc doesn't exist, let's do a raw select or check if we can get it via another way.
    console.error("❌ RPC failed:", error);
    
    // Fallback: let's try a different query via supabase or check if we can run it.
    console.log("Attempting direct select from pg_policies / pg_trigger via standard query...");
  } else {
    console.log("✅ Triggers found:", triggers);
  }
  process.exit(0);
}

main();
