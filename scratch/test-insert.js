import supabase from "../src/utils/supabaseClient.js";

async function testInsert() {
  try {
    const testRow = {
      rider_name: "Test Rider Name",
      bike_id: "TNA001",
      skipped_start_date: "2026-05-01",
      skipped_end_date: "2026-05-05",
      days_skipped: 4,
      reason: "Test Absence",
      status: "Inactive"
    };

    const { data, error } = await supabase
      .from("rider_skipped_days")
      .insert([testRow])
      .select();

    if (error) {
      console.error("❌ Schema mismatch / insert failed:", error.message);
    } else {
      console.log("✅ Insert succeeded! Columns matched!", data);
      
      // Clean up test row
      await supabase.from("rider_skipped_days").delete().eq("id", data[0].id);
      console.log("✅ Cleanup complete.");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

testInsert();
