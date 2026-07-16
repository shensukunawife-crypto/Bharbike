import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const testUserId = "9658fb6d-a453-4404-8100-536ce5902076"; // An existing user ID from our balances query

  console.log("--- Testing get_or_create_wallet_balance RPC ---");
  const { data: balData, error: balErr } = await supabase.rpc("get_or_create_wallet_balance", {
    p_user_id: testUserId
  });
  console.log("RPC get_or_create_wallet_balance Result:", balData);
  if (balErr) console.error("RPC get_or_create_wallet_balance Error:", balErr.message, balErr);

  console.log("\n--- Testing add_money_to_wallet RPC ---");
  const { data: addData, error: addErr } = await supabase.rpc("add_money_to_wallet", {
    p_user_id: testUserId,
    p_amount: 10,
    p_title: "Test RPC",
    p_payment_id: "test_rpc_pay",
    p_order_id: "test_rpc_ord"
  });
  console.log("RPC add_money_to_wallet Result:", addData);
  if (addErr) console.error("RPC add_money_to_wallet Error:", addErr.message, addErr);
}
run();
