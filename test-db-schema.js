import "dotenv/config";
import supabase from "./src/utils/supabaseClient.js";

async function main() {
  const sql = `
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_prepaid BOOLEAN DEFAULT FALSE;
  `;
  const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });
  if (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
  console.log("Migration succeeded:", data);
  process.exit(0);
}

main();
