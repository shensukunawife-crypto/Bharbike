import supabase from "../src/utils/supabaseClient.js";

async function checkDetails() {
  console.log("=== CHECKING OPERATIONAL TABLES ===");
  try {
    const { data: partners, error: partErr } = await supabase
      .from("delivery_partners")
      .select("*");
    
    if (partErr) {
      console.error("❌ Error fetching delivery_partners:", partErr.message);
    } else {
      console.log(`✅ delivery_partners: ${partners?.length || 0} rows`);
      if (partners && partners.length > 0) {
        console.log("Sample delivery_partners:", partners.slice(0, 3));
      }
    }

    const { data: skipped, error: skipErr } = await supabase
      .from("rider_skipped_days")
      .select("*");
    
    if (skipErr) {
      console.error("❌ Error fetching rider_skipped_days:", skipErr.message);
    } else {
      console.log(`✅ rider_skipped_days: ${skipped?.length || 0} rows`);
      if (skipped && skipped.length > 0) {
        console.log("Sample rider_skipped_days:", skipped.slice(0, 3));
      }
    }
  } catch (err) {
    console.error("❌ Script error:", err);
  }
}

checkDetails();
