import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const USER_ID = "55a92d34-a26f-4768-9d30-017c4b8d4407";

async function runCheck() {
  try {
    const { data: user, error: uErr } = await supabase.from("users").select("*").eq("id", USER_ID).maybeSingle();
    console.log("--- USERS TABLE ---");
    console.log("User:", user, "\nError:", uErr);

    const { data: profile, error: pErr } = await supabase.from("profiles").select("*").eq("id", USER_ID).maybeSingle();
    console.log("\n--- PROFILES TABLE ---");
    console.log("Profile:", profile, "\nError:", pErr);

    const { data: wallet, error: wErr } = await supabase.from("wallet_balances").select("*").eq("user_id", USER_ID).maybeSingle();
    console.log("\n--- WALLET BALANCES TABLE ---");
    console.log("Wallet:", wallet, "\nError:", wErr);

    const { data: txs, error: txsErr } = await supabase.from("wallet_transactions").select("*").eq("user_id", USER_ID);
    console.log("\n--- WALLET TRANSACTIONS TABLE ---");
    console.log("Transactions:", txs, "\nError:", txsErr);

    const { data: subs, error: subsErr } = await supabase.from("user_subscriptions").select("*").eq("user_id", USER_ID);
    console.log("\n--- USER SUBSCRIPTIONS TABLE ---");
    console.log("Subscriptions:", subs, "\nError:", subsErr);
  } catch (err) {
    console.error("Failed to run check:", err);
  }
}

runCheck();
