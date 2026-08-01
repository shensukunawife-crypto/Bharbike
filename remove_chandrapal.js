import supabase from "./src/utils/supabaseClient.js";

async function removeChandrapalTestData() {
  console.log("Searching for Chandrapal profiles/users...");
  
  const { data: profiles } = await supabase.from("profiles").select("*").ilike("full_name", "%chandrapal%");
  console.log("Found profiles:", profiles);

  const { data: users } = await supabase.from("users").select("*").ilike("full_name", "%chandrapal%");
  console.log("Found users:", users);

  const userIds = [...new Set([
    ...(profiles || []).map(p => p.id),
    ...(users || []).map(u => u.id)
  ])];

  console.log("User IDs to remove test data for:", userIds);

  for (const uid of userIds) {
    console.log(`Cleaning up test data for user ${uid}...`);
    
    // Delete from wallet_transactions
    const { error: wErr } = await supabase.from("wallet_transactions").delete().eq("user_id", uid);
    console.log("Deleted wallet_transactions:", wErr ? wErr.message : "Success");

    // Delete from subscription_billing
    const { error: bErr } = await supabase.from("subscription_billing").delete().eq("user_id", uid);
    console.log("Deleted subscription_billing:", bErr ? bErr.message : "Success");

    // Delete from user_subscriptions
    const { error: sErr } = await supabase.from("user_subscriptions").delete().eq("user_id", uid);
    console.log("Deleted user_subscriptions:", sErr ? sErr.message : "Success");

    // Delete from payments
    const { error: pErr } = await supabase.from("payments").delete().eq("user_id", uid);
    console.log("Deleted payments:", pErr ? pErr.message : "Success");
  }

  console.log("Done cleaning up database records!");
}

removeChandrapalTestData().then(() => process.exit(0));
