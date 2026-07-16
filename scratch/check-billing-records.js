import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: billing } = await sb.from('subscription_billing').select('user_id, amount, status, created_at').eq('status', 'paid');
  const { data: profiles } = await sb.from('profiles').select('id, full_name');
  const map = new Map(profiles.map(p => [p.id, p.full_name]));

  console.log('Total paid billing records:', billing.length);
  billing.forEach(b => console.log(map.get(b.user_id) || 'Unknown', '| ₹' + b.amount));
  const total = billing.reduce((s, b) => s + Number(b.amount), 0);
  console.log('\nRaw total (before +1500 adjustment):', total);
}

main();
