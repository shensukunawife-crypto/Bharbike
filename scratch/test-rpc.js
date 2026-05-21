import supabase from "../src/utils/supabaseClient.js";

async function testRpc() {
  const userId = "8da62412-4cdb-4cd1-af3f-ee5220107494";
  console.log("Testing RPC for user_id:", userId);
  try {
    const { data, error } = await supabase.rpc("get_or_create_wallet_balance", {
      p_user_id: userId,
    });
    console.log("RPC result:", { data, error });
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testRpc();
