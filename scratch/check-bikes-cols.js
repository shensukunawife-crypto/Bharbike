import supabase from "../src/utils/supabaseClient.js";

async function checkBikesTable() {
  console.log("=== Checking bikes table columns ===");
  try {
    const { data, error } = await supabase
      .from("bikes")
      .select("*")
      .limit(1);

    if (error) {
      console.error("❌ Error fetching from bikes:", error.message);
    } else {
      console.log("✅ Successfully fetched from bikes table.");
      if (data && data.length > 0) {
        console.log("Columns in bikes table:", Object.keys(data[0]));
      } else {
        console.log("bikes table is empty, trying to query schema using rpc or check columns specifically");
        // We can check if selecting the columns specifically fails
        const { error: specificError } = await supabase
          .from("bikes")
          .select("last_lat, last_lng, last_gps_updated_at")
          .limit(1);
        
        if (specificError) {
          console.log("❌ Selecting GPS columns failed:", specificError.message);
        } else {
          console.log("✅ GPS columns exist in bikes table!");
        }
      }
    }
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}

checkBikesTable();
