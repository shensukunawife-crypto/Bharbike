import supabase from "../src/utils/supabaseClient.js";

async function inspectPlans() {
  const { data, error } = await supabase.from("subscription_plans").select("*");
  if (error) {
    console.error("Error fetching plans:", error.message);
  } else {
    console.log("Subscription plans in DB:", JSON.stringify(data, null, 2));
  }
}

inspectPlans();
