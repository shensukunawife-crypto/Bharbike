import supabase from "../src/utils/supabaseClient.js";

async function inspectColumns() {
  try {
    console.log("Checking profiles table...");
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .limit(1);
    
    if (pErr) {
      console.error("Error profiles query:", pErr.message);
    } else {
      console.log("Profiles columns keys:", profiles && profiles.length > 0 ? Object.keys(profiles[0]) : "No rows");
    }

    console.log("Checking users table...");
    const { data: users, error: uErr } = await supabase
      .from("users")
      .select("*")
      .limit(1);
    
    if (uErr) {
      console.error("Error users query:", uErr.message);
    } else {
      console.log("Users columns keys:", users && users.length > 0 ? Object.keys(users[0]) : "No rows");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

inspectColumns();
