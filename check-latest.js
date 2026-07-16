import "dotenv/config";
import supabase from "./src/utils/supabaseClient.js";

async function main() {
  console.log("--- Latest 5 Rows from 'users' ---");
  try {
    const { data: usersData, error: usersErr } = await supabase
      .from("users")
      .select("id, full_name, phone, email, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (usersErr) {
      console.error("Error fetching users:", usersErr);
    } else {
      console.log(usersData);
    }
  } catch (err) {
    console.error(err);
  }

  console.log("\n--- Latest 5 Rows from 'profiles' ---");
  try {
    const { data: profilesData, error: profilesErr } = await supabase
      .from("profiles")
      .select("id, full_name, phone, email, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (profilesErr) {
      console.error("Error fetching profiles:", profilesErr);
    } else {
      console.log(profilesData);
    }
  } catch (err) {
    console.error(err);
  }

  process.exit(0);
}

main();
