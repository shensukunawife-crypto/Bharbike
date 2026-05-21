import supabase from "../src/utils/supabaseClient.js";

async function checkEarnings() {
  try {
    const { data: earnings, error: earnErr } = await supabase
      .from("earnings")
      .select("*")
      .limit(10);
      
    if (earnErr) {
      console.error("❌ Earnings fetch failed:", earnErr.message);
    } else {
      console.log(`✅ Earnings row count: ${earnings.length}`);
      console.log("Sample earnings:", earnings);
    }

    const { data: payments, error: payErr } = await supabase
      .from("payments")
      .select("*")
      .limit(10);

    if (payErr) {
      console.error("❌ Payments fetch failed:", payErr.message);
    } else {
      console.log(`✅ Payments row count: ${payments.length}`);
      console.log("Sample payments:", payments);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

checkEarnings();
