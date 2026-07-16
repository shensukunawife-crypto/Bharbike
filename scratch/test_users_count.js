import "dotenv/config";
import supabase from "../src/utils/supabaseClient.js";

async function main() {
  console.log("Checking DB and client settings...");
  console.log("Supabase URL:", process.env.SUPABASE_URL);
  console.log("Is Service Role key used:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  // 1. Let's do usersCount query exactly like dashboard
  console.log("\n--- Query 1: usersCount exactly like dashboard ---");
  const q1 = await supabase.from("users").select("*", { count: "exact", head: true }).neq("is_delivery_partner", true);
  console.log("Query 1 result:", q1);

  // 2. Let's select all columns to see what is returned
  console.log("\n--- Query 2: select all columns, first 5 users ---");
  const q2 = await supabase.from("users").select("*").limit(5);
  console.log("Query 2 error:", q2.error);
  console.log("Query 2 data length:", q2.data?.length);
  if (q2.data && q2.data.length > 0) {
    console.log("Sample user columns:", Object.keys(q2.data[0]));
    console.log("Sample user data values:", q2.data[0]);
  }

  // 3. Let's select count of users table without any filters
  console.log("\n--- Query 3: total count of users table ---");
  const q3 = await supabase.from("users").select("*", { count: "exact", head: true });
  console.log("Query 3 result:", q3);

  process.exit(0);
}

main();
