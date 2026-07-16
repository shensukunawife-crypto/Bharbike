import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: orders } = await sb.from('orders').select('*');
  const { data: payments } = await sb.from('payments').select('*');
  const { data: profiles } = await sb.from('profiles').select('id, full_name, email');

  const profileMap = new Map();
  if (profiles) profiles.forEach(p => profileMap.set(p.id, p));

  const paymentOrderIds = new Set(payments ? payments.map(p => p.order_id).filter(Boolean) : []);

  console.log('====================================');
  console.log('ALL PAID/SUCCESS ORDERS IN DB');
  console.log('====================================');
  let orderSum = 0;
  for (const o of orders || []) {
    const status = String(o.status || '').toLowerCase();
    const isPaid = status === 'paid' || status === 'success' || status === 'completed';
    if (isPaid) {
      const u = profileMap.get(o.user_id);
      const isLinkedToPayment = paymentOrderIds.has(o.id);
      console.log(`- Order ID: ${o.id} | Code: ${o.order_code} | User: ${u ? u.full_name : 'Unknown ('+o.user_id+')'} | Amt: ₹${o.amount} | Linked to Payment Table? ${isLinkedToPayment ? 'YES' : 'NO'} | Date: ${o.created_at || o.createdAt}`);
      orderSum += Number(o.amount || 0);
    }
  }
  console.log('Total Paid Orders Sum:', orderSum);
}

main();
