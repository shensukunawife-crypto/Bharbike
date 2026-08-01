import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixBuggyRentals() {
  console.log("=== Fixing 26 active buggy rentals (clearing end_time) ===");
  
  // 1. Fetch the active rentals that have price=0 (admin assigned) and end_time IS NOT NULL
  const { data: rentals, error: fetchErr } = await supabase
    .from("rentals")
    .select("id, user_id, bike_id, end_time, duration")
    .in("status", ["active", "ongoing"])
    .eq("price", 0)
    .not("end_time", "is", null);

  if (fetchErr) {
    console.error("Failed to fetch rentals:", fetchErr);
    return;
  }

  console.log(`Found ${rentals.length} active admin-assigned rentals with a buggy end_time.\n`);

  if (rentals.length === 0) {
    console.log("No rentals need fixing!");
    return;
  }

  // 2. Update all of them to have end_time = null, duration = null
  const rentalIds = rentals.map(r => r.id);
  
  const { error: updateErr } = await supabase
    .from("rentals")
    .update({ 
      end_time: null,
      duration: null 
    })
    .in("id", rentalIds);

  if (updateErr) {
    console.error("Failed to update rentals:", updateErr);
    return;
  }

  console.log(`✅ Successfully cleared end_time and duration for ${rentals.length} rentals!`);
  
  // Also checking Noor Alam (TNA010) specifically since his sub date was out of sync
  // user_id for Noor Alam would be retrieved via phone +916205562272
  const { data: noorUser } = await supabase.from("users").select("id").eq("phone", "+916205562272").maybeSingle();
  if (noorUser) {
     const { data: sub } = await supabase.from("user_subscriptions")
       .select("start_date, end_date")
       .eq("user_id", noorUser.id)
       .order("end_date", { ascending: false })
       .limit(1)
       .maybeSingle();
       
     if (sub) {
        console.log(`\nNote on Noor Alam: His current active subscription ends on ${sub.end_date}.`);
        console.log(`Since his rental is now open-ended, the rental will stay active as long as his subscription is active.`);
     }
  }
}

fixBuggyRentals().catch(console.error);
