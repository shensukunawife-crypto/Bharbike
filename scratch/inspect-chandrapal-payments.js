import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const userId = 'ab7fe311-8828-4b63-9d47-ff8d702228d2'; // Chandrapal Singh
  console.log(`Fetching payments for Chandrapal (user_id: ${userId})...`);
  
  const { data: payments, error } = await sb
    .from('payments')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching payments:', error.message);
    return;
  }

  console.log(`Found ${payments.length} payments:`);
  payments.forEach((p, idx) => {
    console.log(`Payment #${idx + 1}:`);
    console.log(`- ID: ${p.id}`);
    console.log(`- Amount: ${p.amount}`);
    console.log(`- Status: ${p.status}`);
    console.log(`- Razorpay Payment ID (UTR): ${p.razorpay_payment_id}`);
    console.log(`- Razorpay Order ID (Screenshot): ${p.razorpay_order_id}`);
    console.log(`- Created At: ${p.created_at}`);
  });
}

main();
