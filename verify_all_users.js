import supabase from "./src/utils/supabaseClient.js";

async function checkAllUsers() {
  const { data: activeSubs, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("status", "active")
    .order("end_date", { ascending: false });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Found ${activeSubs.length} active subscriptions.`);
  
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 8); // Should be max 7 days from today. Add 8 for a safe margin.

  let futureSubs = 0;
  for (const sub of activeSubs) {
    const end = new Date(sub.end_date);
    if (end > nextWeek) {
      console.log(`User ID: ${sub.user_id} has end date ${end.toLocaleString()}`);
      futureSubs++;
    }
  }

  if (futureSubs === 0) {
    console.log("\nAll users are perfectly aligned! No one has an end date beyond the current week limit.");
  } else {
    console.log(`\nFound ${futureSubs} users with dates too far in the future.`);
  }
}

checkAllUsers().then(() => process.exit(0));
