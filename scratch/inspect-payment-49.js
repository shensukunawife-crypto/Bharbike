import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const gatewayOrderId = 'ORD-QR-1783712521168';
  console.log(`Fetching details for payment with gateway order id: ${gatewayOrderId}...`);

  const { data, error } = await sb
    .from('payments')
    .select('*')
    .eq('razorpay_order_id', gatewayOrderId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching payment:', error.message);
    return;
  }

  if (!data) {
    console.log('No payment found matching that gateway order ID.');
    return;
  }

  console.log('Payment record found:');
  console.log(JSON.stringify(data, null, 2));

  if (data.user_id) {
    const { data: profile } = await sb.from('profiles').select('full_name, phone').eq('id', data.user_id).maybeSingle();
    console.log('\nUser profile:');
    console.log(profile);
  }
}

main();
