import supabase from "../src/utils/supabaseClient.js";

async function checkOrders() {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Orders fetch failed:", error.message);
    } else {
      console.log(`✅ Orders row count: ${orders.length}`);
      if (orders.length > 0) {
        console.log("Sample order keys:", Object.keys(orders[0]));
        console.log("Sample orders (first 3):", orders.slice(0, 3));
      }
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

checkOrders();
