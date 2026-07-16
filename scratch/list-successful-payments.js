import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: payments } = await sb.from('payments').select('*').in('status', ['success', 'paid']);
  const { data: profiles } = await sb.from('profiles').select('id, full_name, email');
  const { data: users } = await sb.from('users').select('id, full_name');

  const profileMap = new Map();
  if (profiles) profiles.forEach(p => profileMap.set(p.id, p));

  const userMap = new Map();
  if (users) users.forEach(u => userMap.set(u.id, u));

  console.log('====================================');
  console.log('ALL SUCCESSFUL/PAID PAYMENTS IN DB');
  console.log('====================================');
  let sum = 0;
  for (const p of payments || []) {
    const prof = profileMap.get(p.user_id);
    const usr = userMap.get(p.user_id);
    const name = prof ? prof.full_name : (usr ? usr.full_name : 'Unknown ('+p.user_id+')');
    const email = prof ? prof.email : 'No profile';
    console.log(`- User: ${name} | Email: ${email} | Amt: ₹${p.amount} | ID: ${p.id} | Date: ${p.created_at}`);
    sum += Number(p.amount || 0);
  }
  console.log('Total Successful Payments Sum:', sum);
}

main();
