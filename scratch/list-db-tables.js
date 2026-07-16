import "dotenv/config";
import supabase from "../src/utils/supabaseClient.js";

async function list() {
  const { data, error } = await supabase.rpc("exec_sql", {
    sql_query: `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  });
  if (error) {
    console.error(error);
  } else {
    console.log("DB Tables:", data);
  }
}
list();
