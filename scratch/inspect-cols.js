import supabase from "../src/utils/supabaseClient.js";

async function inspectColumns() {
  try {
    const { data, error } = await supabase.rpc("inspect_table_columns", { table_name: "rider_skipped_days" });
    if (error) {
      // Fallback query via standard SQL block if RPC isn't available
      const { data: cols, error: sqlErr } = await supabase
        .from("rider_skipped_days")
        .select("*")
        .limit(1);
      
      if (sqlErr) {
        console.error("Error standard query:", sqlErr.message);
      } else {
        console.log("Column list sample keys:", cols && cols.length > 0 ? Object.keys(cols[0]) : "No rows (keys unavailable)");
      }
    } else {
      console.log("Columns:", data);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

inspectColumns();
