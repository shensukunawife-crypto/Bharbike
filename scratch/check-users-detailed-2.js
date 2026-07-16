import supabase from "../src/utils/supabaseClient.js";

async function check() {
  const ramId = "70658f94-dfb8-4f5a-8f05-e9c26d49659f";
  const vishalId = "b9d0a488-5af5-46a0-9efe-3f7e2c4b9d30";

  console.log("Fetching profile columns...");
  const { data: profileSample } = await supabase.from("profiles").select("*").limit(1);
  if (profileSample && profileSample[0]) {
    console.log("Profile columns:", Object.keys(profileSample[0]));
  }

  // 1. Ram Sajivan Yadav
  console.log("\n==================================================");
  console.log("RAM SAJIVAN YADAV:");
  const { data: ramProfile } = await supabase.from("profiles").select("*").eq("id", ramId).single();
  console.log("Profile:", ramProfile);

  const { data: ramSubs } = await supabase.from("user_subscriptions").select("*").eq("user_id", ramId);
  console.log("Subscriptions:", ramSubs);

  const { data: ramPayments } = await supabase.from("payments").select("*").eq("user_id", ramId);
  console.log("Payments:", ramPayments);

  // 2. Vishal Kumar
  console.log("\n==================================================");
  console.log("VISHAL KUMAR:");
  const { data: vishalProfile } = await supabase.from("profiles").select("*").eq("id", vishalId).single();
  console.log("Profile:", vishalProfile);

  const { data: vishalSubs } = await supabase.from("user_subscriptions").select("*").eq("user_id", vishalId);
  console.log("Subscriptions:", vishalSubs);

  const { data: vishalPayments } = await supabase.from("payments").select("*").eq("user_id", vishalId);
  console.log("Payments:", vishalPayments);
}

check();
