import "dotenv/config";
import supabase from "../src/utils/supabaseClient.js";

async function runSql(query) {
  const { data, error } = await supabase.rpc("exec_sql", { sql_query: query });
  if (error) {
    console.error("❌ SQL Error:", error);
    return null;
  }
  return data;
}

async function main() {
  console.log("1. Fetching all user functions in public schema...");
  const funcsSql = `
    SELECT proname as function_name 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public';
  `;
  const funcs = await runSql(funcsSql);
  console.log("Raw funcs response:", funcs);

  console.log("\n2. Fetching user-defined triggers...");
  const triggersSql = `
    SELECT 
      tgname as trigger_name,
      relname as table_name,
      proname as function_name
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_proc p ON t.tgfoid = p.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public';
  `;
  const triggers = await runSql(triggersSql);
  console.log("Raw triggers response:", triggers);

  process.exit(0);
}

main();
