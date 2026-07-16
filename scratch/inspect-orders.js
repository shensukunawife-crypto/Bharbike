import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: orders, error } = await sb.from('orders').select('*');
  console.log('Orders count in DB:', orders?.length);
  if (error) {
    console.error('Error:', error.message);
    return;
  }

  const { data: profiles } = await sb.from('profiles').select('id, full_name');
  const userMap = {};
  profiles.forEach(u => {
    userMap[u.id] = u.full_name;
  });

  console.log('\n--- ALL PAID ORDERS IN DB ---');
  let totalOrderAmt = 0;
  orders.forEach(o => {
    const userName = userMap[o.user_id];
    const isPaid = ['paid', 'success', 'completed'].includes(o.status);
    if (isPaid) {
      console.log(`User: ${userName || 'DELETED ('+o.user_id+')'} | Amount: ₹${o.amount} | Status: ${o.status} | Created At: ${o.created_at}`);
      const isTestUser = userName && userName.toLowerCase().includes("test");
      if (!isTestUser) {
        totalOrderAmt += Number(o.amount || 0);
      }
    }
  });
  console.log('Total Paid Orders Amt (excluding test users):', totalOrderAmt);
}

main();
