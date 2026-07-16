import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "C:/Users/ronit/Downloads/Telegram Desktop/BharBike (3)/BharBike (2)/BharBike/BharBike/bike rental system backend/.env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const now = new Date();
  console.log("Current server time (UTC):", now.toISOString());
  console.log("Current server local string:", now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));

  // Query subscriptions and join with profiles
  const { data: subs, error } = await supabase
    .from("user_subscriptions")
    .select("id, user_id, status, end_date, plan_id, created_at")
    .order("end_date", { ascending: false });

  if (error) {
    console.error("Error querying subscriptions:", error);
    return;
  }

  const { data: profiles, error: pError } = await supabase
    .from("profiles")
    .select("id, full_name, phone");

  console.log(`Found ${subs.length} total subscriptions in database.`);

  subs.forEach(s => {
    const p = profiles?.find(profile => profile.id === s.user_id);
    const name = p ? p.full_name : "Unknown User";
    const phone = p ? p.phone : "Unknown Phone";
    console.log(`Rider: ${name} (${phone}) | Status: ${s.status} | End Date: ${s.end_date} | Created At: ${s.created_at}`);
  });
}

check();
