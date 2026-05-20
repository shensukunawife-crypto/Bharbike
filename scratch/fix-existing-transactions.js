import supabase from "../src/utils/supabaseClient.js";

async function fixTransactions() {
  console.log("🔍 Checking for transactions with raw UUIDs...");

  // 1. Fetch wallet transactions
  const { data: txs, error: fetchErr } = await supabase
    .from("wallet_transactions")
    .select("id, title, amount");

  if (fetchErr) {
    console.error("Error fetching transactions:", fetchErr.message);
    return;
  }

  console.log(`Found ${txs?.length || 0} total transactions.`);

  // 2. Filter for ones that contain a UUID pattern or "Subscription: 0378"
  const targets = txs?.filter(t => 
    t.title && 
    (t.title.includes("03780beb") || /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(t.title))
  ) || [];

  if (targets.length === 0) {
    console.log("✅ No transactions found with raw UUIDs in their titles.");
    return;
  }

  console.log(`⚠️ Found ${targets.length} transactions with raw UUIDs. Fixing them...`);

  for (const t of targets) {
    console.log(`  Fixing transaction ID ${t.id}: "${t.title}"`);
    
    // Replace any UUID with "Weekly Plan"
    let cleanTitle = t.title.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig, "Weekly Plan");
    // Clean up double spaces or trailing dashes if any
    cleanTitle = cleanTitle.replace(/\s+/g, " ").trim();
    
    const { error: updateErr } = await supabase
      .from("wallet_transactions")
      .update({ title: cleanTitle })
      .eq("id", t.id);

    if (updateErr) {
      console.error(`❌ Failed to update transaction ${t.id}:`, updateErr.message);
    } else {
      console.log(`    ✅ Updated to: "${cleanTitle}"`);
    }
  }

  console.log("\n🎉 Existing transactions cleanup completed!");
}

fixTransactions();
