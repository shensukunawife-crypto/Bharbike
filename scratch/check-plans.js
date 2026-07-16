import supabase from "../src/utils/supabaseClient.js";

async function check() {
  console.log("Checking subscription plans...");
  const { data, error } = await supabase.from("subscription_plans").select("*");
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Plans in DB:", data);
  }
}

check();
