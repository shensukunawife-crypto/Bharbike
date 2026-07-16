import "dotenv/config";
import supabase from "./src/utils/supabaseClient.js";

async function main() {
  console.log("Fetching one row from wallet_balances...");
  const { data: balance, error: balErr } = await supabase.from("wallet_balances").select("*").limit(1);
  if (balErr) {
    console.error("Failed to fetch balance:", balErr);
  } else {
    console.log("wallet_balances row:", balance);
  }

  console.log("\nFetching one row from wallet_transactions...");
  const { data: tx, error: txErr } = await supabase.from("wallet_transactions").select("*").limit(1);
  if (txErr) {
    console.error("Failed to fetch transaction:", txErr);
  } else {
    console.log("wallet_transactions row:", tx);
  }

  process.exit(0);
}

main();
