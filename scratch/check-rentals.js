import supabase from "../src/utils/supabaseClient.js";

async function checkRentals() {
  try {
    const { data: rentals, error } = await supabase
      .from("rentals")
      .select("*")
      .limit(10);

    if (error) {
      console.error("❌ Rentals fetch failed:", error.message);
    } else {
      console.log(`✅ Rentals row count: ${rentals.length}`);
      console.log("Sample rentals:", rentals);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

checkRentals();
