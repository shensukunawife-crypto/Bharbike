import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import supabase from "../src/utils/supabaseClient.js";

dotenv.config();

const sqlPath = path.resolve("sql/create_ads_table.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

console.log("Running SQL migration...");
console.log(sql);

async function run() {
  const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });
  if (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
  console.log("Migration completed successfully!", data);
  process.exit(0);
}

run();
