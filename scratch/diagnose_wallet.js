import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("--- Fetching Recent Users ---");
  const { data: users, error: uErr } = await supabase
    .from("users")
    .select("id, email, phone, name, wallet_balance, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  console.log("Recent Users:", users);
  if (uErr) console.error("Users Error:", uErr.message);

  console.log("\n--- Fetching Wallet Balances ---");
  const { data: wallets, error: wErr } = await supabase
    .from("wallet_balances")
    .select("*")
    .limit(10);
  console.log("Wallet Balances:", wallets);
  if (wErr) console.error("Wallets Error:", wErr.message);

  console.log("\n--- Fetching Recent Wallet Transactions ---");
  const { data: txs, error: tErr } = await supabase
    .from("wallet_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  console.log("Recent Transactions:", txs);
  if (tErr) console.error("Transactions Error:", tErr.message);
}
run();
