import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: orders, error } = await sb.from('orders').select('*');
  if (error) {
    console.error('Error fetching orders:', error.message);
    return;
  }

  console.log(`Total orders in database: ${orders.length}`);
  const statusCounts = {};
  orders.forEach(o => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });
  console.log('Status counts for orders:', statusCounts);

  // Print all active/accepted/ongoing/pending orders
  const activeOrders = orders.filter(o => ['pending', 'accepted', 'ongoing'].includes(o.status));
  console.log(`\n=== ACTIVE/PENDING/ONGOING ORDERS (${activeOrders.length}) ===`);
  
  // Get delivery partners
  const { data: partners } = await sb.from('delivery_partners').select('id, name');
  const partnerMap = new Map(partners?.map(p => [p.id, p.name]) || []);

  // Get profiles
  const { data: profiles } = await sb.from('profiles').select('id, full_name');
  const userMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

  activeOrders.forEach(o => {
    const rider = o.partner_id ? (partnerMap.get(o.partner_id) || o.partner_id) : 'None';
    const user = userMap.get(o.user_id) || o.user_id;
    console.log(`Order Code: ${o.order_code} | User: ${user} | Plan: ${o.plan_name} | Status: ${o.status} | Rider Assigned: ${rider}`);
  });
}

main();
