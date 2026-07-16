import supabase from "../src/utils/supabaseClient.js";

async function listBikes() {
  console.log("Fetching bikes from remote Supabase...");
  const { data, error } = await supabase
    .from("bikes")
    .select("name, price, durations")
    .limit(5);

  if (error) {
    console.error("Error fetching bikes:", error);
  } else {
    console.log("Bikes in database:", JSON.stringify(data, null, 2));
  }
}

listBikes();
