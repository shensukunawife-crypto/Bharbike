import supabase from '../src/utils/supabaseClient.js';

async function inspectPayment() {
  const { data: payment, error } = await supabase.from("payments").select("*").eq("id", "dd82d354-f325-4b89-8557-6c2a97ed82e1").single();
  console.log("Payment Record:", payment);
  
  if (payment && payment.order_id) {
    const { data: order } = await supabase.from("orders").select("*").eq("id", payment.order_id).single();
    console.log("Order Record:", order);
  }
}
inspectPayment();
