import supabase from "../src/utils/supabaseClient.js";

async function run() {
  const sql = "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('wallet_balances', 'wallet_transactions')";
  try {
    const { data, error } = await supabase.rpc("exec_sql", {
      sql_query: sql
    });
    if (error) {
      console.error("❌ RPC failed:", error);
    } else {
      console.log("✅ Column types of wallet_balances:", data);
    }
  } catch (err) {
    console.error(err);
  }
}

run();
