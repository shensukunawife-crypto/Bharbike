import supabase from "../src/utils/supabaseClient.js";

async function checkWallets() {
  console.log("=== CHECKING WALLETS ===");
  try {
    const { data: balances, error: balErr } = await supabase.from("wallet_balances").select("*");
    if (balErr) {
      console.error("❌ Error fetching balances:", balErr.message);
    } else {
      console.log(`✅ wallet_balances: ${balances?.length || 0} rows total`);
      console.log("Balances:", balances);
    }

    const { data: txs, error: txsErr } = await supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(10);
    if (txsErr) {
      console.error("❌ Error fetching transactions:", txsErr.message);
    } else {
      console.log(`✅ wallet_transactions: ${txs?.length || 0} recent rows`);
      console.log("Recent Transactions:", txs);
    }
  } catch (err) {
    console.error(err);
  }
}

checkWallets();
