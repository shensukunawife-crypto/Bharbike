import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const userId = 'ab7fe311-8828-4b63-9d47-ff8d702228d2'; // Chandrapal Singh
  console.log(`Searching database for any receipts/tickets/orders uploaded by user ${userId}...`);

  // 1. Check orders
  const { data: orders } = await sb.from('orders').select('*').eq('user_id', userId);
  console.log(`Found ${orders?.length || 0} orders:`);
  orders?.forEach(o => console.log(`Order ID: ${o.id} | Status: ${o.status} | Razorpay Order ID: ${o.razorpay_order_id} | Razorpay Payment ID: ${o.razorpay_payment_id}`));

  // 2. Check support tickets
  const { data: tickets } = await sb.from('support_tickets').select('*').eq('user_id', userId);
  console.log(`\nFound ${tickets?.length || 0} support tickets:`);
  tickets?.forEach(t => console.log(`Ticket ID: ${t.id} | Issue Type: ${t.issue_type} | Description: ${t.description} | Screenshot URL: ${t.screenshot_url}`));

  // 3. Check if there are any other payments
  const { data: payments } = await sb.from('payments').select('*').eq('user_id', userId);
  console.log(`\nFound ${payments?.length || 0} payments total.`);
}

main();
