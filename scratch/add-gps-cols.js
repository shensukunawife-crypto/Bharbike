import supabase from "../src/utils/supabaseClient.js";

async function addGpsColumns() {
  console.log("=== Attempting to Add GPS Columns via RPC ===");
  const sqlQuery = `
    ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION;
    ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS last_lng DOUBLE PRECISION;
    ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS last_gps_updated_at TIMESTAMPTZ;
  `;
  
  try {
    const { data, error } = await supabase.rpc("exec_sql", { sql_query: sqlQuery });
    console.log("exec_sql Result:", { data, error });
    
    if (error) {
      console.log("exec_sql failed, trying execute_sql...");
      const { data: data2, error: error2 } = await supabase.rpc("execute_sql", { sql: sqlQuery });
      console.log("execute_sql Result:", { data: data2, error: error2 });
      
      if (error2) {
        console.error("❌ Both RPCs failed. The migration needs to be executed manually in Supabase SQL editor.");
      } else {
        console.log("✅ Successfully executed migration using execute_sql!");
      }
    } else {
      console.log("✅ Successfully executed migration using exec_sql!");
    }
  } catch (err) {
    console.error("❌ Unexpected error running SQL RPC:", err);
  }
}

addGpsColumns();
