import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  // Query payment #44. Row ID is a UUID.
  // Let's get the 5 most recent payments
  const { data: payments } = await sb.from('payments').select('*').order('created_at', { ascending: false }).limit(5);
  
  for (const p of payments) {
    console.log('\n--- PAYMENT ---');
    console.log('ID:', p.id);
    console.log('Amount:', p.amount);
    console.log('Status:', p.status);
    console.log('razorpay_order_id (contains screenshot URL):', p.razorpay_order_id);
    console.log('razorpay_payment_id:', p.razorpay_payment_id);
    console.log('order_id (UUID):', p.order_id);

    if (p.order_id) {
      const { data: order } = await sb.from('orders').select('*').eq('id', p.order_id).maybeSingle();
      if (order) {
        console.log('--- LINKED ORDER ---');
        console.log('Order ID:', order.id);
        console.log('Order Code:', order.order_code);
        console.log('Plan Name:', order.plan_name);
        console.log('Amount:', order.amount);
      }
    }
  }
}

main();
