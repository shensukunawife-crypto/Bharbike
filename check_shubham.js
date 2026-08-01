import supabase from "./src/utils/supabaseClient.js";

async function checkShubham() {
  console.log("Looking up user 'Shubham Raj'...");
  const { data: users, error: err } = await supabase
    .from("users")
    .select("id, full_name, phone")
    .ilike("full_name", "%Shubham Raj%");

  if (err) {
    console.error("Error fetching user:", err);
    return;
  }
  
  if (!users || users.length === 0) {
    console.log("No user found matching 'Shubham Raj'.");
    return;
  }

  for (const user of users) {
    console.log(`\nUser: ${user.full_name} (Phone: ${user.phone}, ID: ${user.id})`);
    
    const { data: subs, error: subErr } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (subErr) {
      console.error("Error fetching subscriptions:", subErr);
      continue;
    }

    if (!subs || subs.length === 0) {
      console.log("No subscriptions found for this user.");
    } else {
      console.log(`Found ${subs.length} subscriptions:`);
      subs.forEach(s => {
        console.log(`- ID: ${s.id} | Status: ${s.status}`);
        console.log(`  Plan: ${s.plan_id}`);
        console.log(`  Start Date: ${new Date(s.start_date).toLocaleString()}`);
        console.log(`  End Date:   ${new Date(s.end_date).toLocaleString()}`);
        console.log(`  Created At: ${new Date(s.created_at).toLocaleString()}`);
      });
    }
  }
}

checkShubham().then(() => {
  console.log("\nDone.");
  process.exit(0);
});
