import supabase from "../src/utils/supabaseClient.js";

async function checkDateRange() {
  try {
    const { data: minDate } = await supabase
      .from("earnings")
      .select("created_at")
      .order("created_at", { ascending: true })
      .limit(1);

    const { data: maxDate } = await supabase
      .from("earnings")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    console.log("Min Date in Database:", minDate);
    console.log("Max Date in Database:", maxDate);
  } catch (err) {
    console.error("Error:", err);
  }
}

checkDateRange();
