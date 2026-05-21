import supabase from "../src/utils/supabaseClient.js";

async function runSql() {
  console.log("=== Attempting to Add Column via execute_sql RPC ===");
  const sqlQuery = `
    ALTER TABLE public.admin_users 
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
  `;
  
  try {
    const { data, error } = await supabase.rpc("exec_sql", { sql_query: sqlQuery });
    console.log("exec_sql Result:", { data, error });
    if (error) {
      // Try alternative naming
      const { data: data2, error: error2 } = await supabase.rpc("execute_sql", { sql: sqlQuery });
      console.log("execute_sql Result:", { data: data2, error: error2 });
    }
  } catch (err) {
    console.error("RPC call failed:", err);
  }
}

runSql();
