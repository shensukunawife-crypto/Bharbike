import "dotenv/config";
import supabase from "../src/utils/supabaseClient.js";

async function main() {
  const { data: users, error } = await supabase.from("users").select("id, is_delivery_partner").limit(20);
  if (error) {
    console.error("DB Error:", error.message);
    process.exit(1);
  }

  console.log("Sample users from DB:");
  console.log(users);
  
  // Count how many are null, true, false
  const { data: allUsers, error: err2 } = await supabase.from("users").select("is_delivery_partner");
  if (err2) {
    console.error("Error fetching all users:", err2.message);
  } else {
    let nullCount = 0;
    let trueCount = 0;
    let falseCount = 0;
    for (const u of allUsers) {
      if (u.is_delivery_partner === null) nullCount++;
      else if (u.is_delivery_partner === true) trueCount++;
      else if (u.is_delivery_partner === false) falseCount++;
    }
    console.log(`Total users in DB: ${allUsers.length}`);
    console.log(`is_delivery_partner IS NULL: ${nullCount}`);
    console.log(`is_delivery_partner IS TRUE: ${trueCount}`);
    console.log(`is_delivery_partner IS FALSE: ${falseCount}`);
  }

  process.exit(0);
}

main();
