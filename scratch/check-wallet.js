import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const USER_ID = "58d87fe5-e81b-4ed9-b129-2f813825598c";

async function checkWallet() {
  try {
    // 1. Balance
    const { data: balance, error: balErr } = await supabase
      .from("wallet_balances")
      .select("*")
      .eq("user_id", USER_ID)
      .maybeSingle();
    
    console.log("Wallet Balance:", balance, "| Error:", balErr);

    // 2. Transactions
    const { data: txs, error: txsErr } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", USER_ID);
    
    console.log("Wallet Transactions:", txs, "| Error:", txsErr);

    // 3. Orders
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", USER_ID);
    
    console.log("Orders:", orders, "| Error:", ordersErr);
  } catch (err) {
    console.error("Failed to query wallet:", err);
  }
}

checkWallet();
