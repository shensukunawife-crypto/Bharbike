import supabase from "../src/utils/supabaseClient.js";

async function inspectAdminColumns() {
  console.log("=== Inspecting admin_users Columns ===");
  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("*")
      .limit(1);

    if (error) {
      console.error("❌ Error fetching:", error.message);
    } else {
      if (data && data.length > 0) {
        console.log("✅ Row keys:", Object.keys(data[0]));
      } else {
        console.log("No rows in table to inspect.");
      }
    }
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

inspectAdminColumns();
