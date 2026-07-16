import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: orders, error } = await sb.from('orders').select('*');
  if (error) {
    console.error('Error fetching orders:', error.message);
    return;
  }

  const assignedOrders = orders.filter(o => o.partner_id !== null);
  console.log(`Total historical orders with partner_id assigned: ${assignedOrders.length}`);
  
  if (assignedOrders.length > 0) {
    const { data: partners } = await sb.from('delivery_partners').select('id, name');
    const partnerMap = new Map(partners?.map(p => [p.id, p.name]) || []);
    
    assignedOrders.forEach(o => {
      const pName = partnerMap.get(o.partner_id) || o.partner_id;
      console.log(`Order: ${o.order_code} | Status: ${o.status} | Partner: ${pName} | Created: ${o.created_at || o.createdAt}`);
    });
  }
}

main();
