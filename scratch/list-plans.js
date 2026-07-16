import supabase from "../src/utils/supabaseClient.js";

async function listPlans() {
  console.log("Fetching subscription plans from remote Supabase...");
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("price", { ascending: true });

  if (error) {
    console.error("Error fetching plans:", error);
  } else {
    console.log("Plans in database:", JSON.stringify(data, null, 2));
  }
}

listPlans();
