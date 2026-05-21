import supabase from "../src/utils/supabaseClient.js";

async function run() {
  console.log("=== DIAGNOSTIC SCRIPT FOR USERS AND SUBSCRIPTIONS ===");
  
  // 1. Fetch profiles
  console.log("\n1. Fetching profiles...");
  const { data: profiles, error: err1 } = await supabase
    .from("profiles")
    .select("*");
  if (err1) {
    console.error("Error fetching profiles:", err1);
  } else {
    console.log(`profiles count: ${profiles?.length || 0}`);
    console.log(JSON.stringify(profiles, null, 2));
  }

  // 2. Fetch users
  console.log("\n2. Fetching users...");
  const { data: users, error: err2 } = await supabase
    .from("users")
    .select("*");
  if (err2) {
    console.error("Error fetching users:", err2);
  } else {
    console.log(`users count: ${users?.length || 0}`);
    console.log(JSON.stringify(users, null, 2));
  }
}

run();
