import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: payments, error } = await sb.from('payments').select('*').order('created_at', { ascending: false }).limit(5);
  const { data: profiles } = await sb.from('profiles').select('id, full_name, email');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  const profileMap = new Map();
  if (profiles) profiles.forEach(p => profileMap.set(p.id, p));

  console.log('--- RECENT PAYMENTS ---');
  payments.forEach(p => {
    const prof = profileMap.get(p.user_id);
    console.log(`ID: ${p.id} | User: ${prof ? prof.full_name : 'Unknown ('+p.user_id+')'} | Amt: ₹${p.amount} | Status: ${p.status} | Created: ${p.created_at} | RZP Order: ${p.razorpay_order_id} | RZP Pay: ${p.razorpay_payment_id}`);
  });
}

main();
