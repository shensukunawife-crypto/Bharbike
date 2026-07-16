import "dotenv/config";
import supabase from "../src/utils/supabaseClient.js";

async function main() {
  const { data, error } = await supabase.rpc("exec_sql", { sql_query: "SELECT * FROM bikes LIMIT 1" });
  console.log("Error:", error);
  console.log("Data:", data);
  process.exit(0);
}

main();
