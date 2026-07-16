import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: payments, error } = await sb.from('payments').select('*');
  console.log('Payments count in DB:', payments?.length);
  if (error) {
    console.error('Error:', error.message);
    return;
  }

  const { data: users } = await sb.from('users').select('id, full_name');
  const userMap = {};
  users.forEach(u => {
    userMap[u.id] = u.full_name;
  });

  console.log('\n--- ALL PAYMENTS IN DB ---');
  payments.forEach(p => {
    const userName = userMap[p.user_id];
    console.log(`User: ${userName || 'DELETED ('+p.user_id+')'} | Amount: ₹${p.amount} | Status: ${p.status} | Method: ${p.payment_method || 'Razorpay/UPI'} | Created At: ${p.created_at}`);
  });
}

main();
