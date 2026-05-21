import supabase from "../src/utils/supabaseClient.js";

async function testEarnings() {
  try {
    const testRow = {
      amount: 1500,
      type: "rental",
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("earnings")
      .insert([testRow])
      .select();

    if (error) {
      console.error("❌ Test insert failed:", error.message);
    } else {
      console.log("✅ Insert succeeded! Table columns:", data ? Object.keys(data[0]) : "no data");
      
      // Clean up test row
      if (data && data[0]) {
        await supabase.from("earnings").delete().eq("id", data[0].id);
        console.log("✅ Cleanup complete.");
      }
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

testEarnings();
