import supabase from "../src/utils/supabaseClient.js";

async function checkDocTypes() {
  console.log("=== CHECKING DOCUMENT TYPES ===");
  try {
    const { data, error } = await supabase.from("kyc_documents").select("type, status, user_id");
    if (error) {
      console.error("❌ Error fetching:", error.message);
      return;
    }

    const counts = {};
    const sampleByDocType = {};
    for (const row of data) {
      counts[row.type] = (counts[row.type] || 0) + 1;
      if (!sampleByDocType[row.type]) {
        sampleByDocType[row.type] = row;
      }
    }

    console.log("Total records found:", data.length);
    console.log("Record counts by type:", counts);
    console.log("Sample of each type:", sampleByDocType);
  } catch (err) {
    console.error(err);
  }
}

checkDocTypes();
