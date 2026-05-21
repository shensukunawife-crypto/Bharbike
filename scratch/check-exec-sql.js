import supabase from "../src/utils/supabaseClient.js";

async function check() {
  console.log("Checking if exec_sql RPC exists on the remote database...");
  try {
    const { data, error } = await supabase.rpc("exec_sql", {
      sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'vehicles';"
    });
    
    if (error) {
      console.log("❌ RPC Call Failed. exec_sql is likely not defined or errored.");
      console.log("Error details:", error);
    } else {
      console.log("✅ exec_sql RPC is working! Retrieved columns of vehicles table:");
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Failed to run check:", err);
  }
}

check();
