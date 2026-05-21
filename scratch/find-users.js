import supabase from "../src/utils/supabaseClient.js";

async function run() {
  const ids = [
    "3ac83c70-348c-431f-b952-2ec952fbd53e",
    "97c88bf9-0765-4a68-b896-b95786254b8f",
    "edb2120c-04aa-418d-a3df-6ec7d4fa2761"
  ];
  
  for (const id of ids) {
    console.log(`\nChecking ID: ${id}`);
    
    // Check in users
    const { data: user, error: err1 } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();
      
    if (user) {
      console.log(`  Found in users: Name="${user.full_name || user.name}", Phone="${user.phone}", Email="${user.email}"`);
    } else {
      console.log(`  NOT found in users table. Error:`, err1);
    }
    
    // Check in profiles
    const { data: profile, error: err2 } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
      
    if (profile) {
      console.log(`  Found in profiles: Name="${profile.full_name}", Phone="${profile.phone}", Email="${profile.email}"`);
    } else {
      console.log(`  NOT found in profiles table. Error:`, err2);
    }
  }
}

run();
