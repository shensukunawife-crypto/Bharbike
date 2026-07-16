import supabase from "../src/utils/supabaseClient.js";

async function check() {
  console.log("Checking users...");
  try {
    // 1. Search for users by name
    const { data: users, error: userErr } = await supabase
      .from("profiles")
      .select("*")
      .or("full_name.ilike.%yadav%,full_name.ilike.%vishal%,full_name.ilike.%ram%");
    
    if (userErr) {
      console.log("Trying 'users' table instead of 'profiles'...");
      const { data: users2, error: userErr2 } = await supabase
        .from("users")
        .select("*")
        .or("full_name.ilike.%yadav%,full_name.ilike.%vishal%,full_name.ilike.%ram%");
      if (userErr2) throw userErr2;
      printDetails(users2);
    } else {
      printDetails(users);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function printDetails(users) {
  if (!users || users.length === 0) {
    console.log("No users found matching Ram Yadav or Vishal Kumar.");
    return;
  }

  console.log(`Found ${users.length} matching users:`);
  for (const user of users) {
    console.log(`\n========================================`);
    console.log(`User: ${user.full_name} | ID: ${user.id} | Phone: ${user.phone}`);
    console.log(`Wallet Balance: ${user.wallet_balance} | Role: ${user.role} | KYC: ${user.kyc_status || user.kyc}`);

    // Fetch payments for this user today (2026-07-14)
    const { data: payments, error: payErr } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    console.log(`\nPayments:`);
    if (payErr) console.error("Error fetching payments:", payErr.message);
    else if (payments.length === 0) console.log("  No payments found.");
    else {
      payments.forEach(p => {
        console.log(`  - ID: ${p.id} | Amt: ${p.amount} | Status: ${p.status} | Type: ${p.type} | Created: ${p.created_at}`);
      });
    }

    // Fetch subscriptions
    const { data: subs, error: subErr } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    console.log(`\nUser Subscriptions:`);
    if (subErr) console.error("Error fetching subscriptions:", subErr.message);
    else if (subs.length === 0) console.log("  No subscriptions found.");
    else {
      subs.forEach(s => {
        console.log(`  - ID: ${s.id} | Plan: ${s.plan_id} | Status: ${s.status} | Start: ${s.start_date} | End: ${s.end_date} | Created: ${s.created_at}`);
      });
    }

    // Fetch wallet transactions
    const { data: txs, error: txErr } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    console.log(`\nWallet Transactions:`);
    if (txErr) console.error("Error fetching wallet txs:", txErr.message);
    else if (txs.length === 0) console.log("  No transactions found.");
    else {
      txs.forEach(t => {
        console.log(`  - ID: ${t.id} | Amt: ${t.amount} | Type: ${t.type} | Title: ${t.title} | Status: ${t.status} | Created: ${t.created_at}`);
      });
    }
  }
}

check();
