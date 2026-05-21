import supabase from "../src/utils/supabaseClient.js";

async function inspectFK() {
  try {
    const query = `
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'delivery_partners';
    `;

    // Run custom SQL via RPC or fallback to direct schema inspect
    const { data, error } = await supabase.rpc("run_sql_query", { sql: query });
    if (error) {
      console.log("RPC run_sql_query not available, trying other methods to inspect FK.");
      // If we can't inspect FK, let's look at auth.users and profiles
      console.log("Checking if profiles has user_id...");
      const { data: profs } = await supabase.from("profiles").select("id").limit(5);
      console.log("Sample profiles ids:", profs);
      
      const { data: users } = await supabase.from("users").select("id").limit(5);
      console.log("Sample users ids:", users);
    } else {
      console.log("FK constraints for delivery_partners:", data);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

inspectFK();
