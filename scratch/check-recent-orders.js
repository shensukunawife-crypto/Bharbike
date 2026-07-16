import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: orders, error } = await sb.from('orders').select('*').order('created_at', { ascending: false }).limit(5);
  const { data: profiles } = await sb.from('profiles').select('id, full_name, email');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  const profileMap = new Map();
  if (profiles) profiles.forEach(p => profileMap.set(p.id, p));

  console.log('--- RECENT ORDERS ---');
  orders.forEach(o => {
    const prof = profileMap.get(o.user_id);
    console.log(`ID: ${o.id} | Code: ${o.order_code} | User: ${prof ? prof.full_name : 'Unknown ('+o.user_id+')'} | Amt: ₹${o.amount} | Status: ${o.status} | Created: ${o.created_at || o.createdAt}`);
  });
}

main();
