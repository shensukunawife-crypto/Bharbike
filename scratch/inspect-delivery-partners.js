import supabase from "../src/utils/supabaseClient.js";

async function inspect() {
  const { data, error } = await supabase.from("delivery_partners").select("*").limit(1);
  if (error) {
    console.error("Error fetching delivery_partners:", error.message);
  } else {
    console.log("delivery_partners columns:", data && data.length > 0 ? Object.keys(data[0]) : "No data");
    if (data && data.length > 0) {
      console.log("Sample row:", data[0]);
    }
  }
}

inspect();
