import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: bills, error } = await sb.from('subscription_billing').select('*').eq('status', 'paid');
  const { data: profiles } = await sb.from('profiles').select('id, full_name, email');

  if (error) {
    console.error('Error fetching subscription_billing:', error.message);
    return;
  }

  const profileMap = new Map();
  if (profiles) profiles.forEach(p => profileMap.set(p.id, p));

  const realUserIds = new Set(
    (profiles || []).filter(u => {
      const name = (u.full_name || '').toLowerCase();
      return !name.includes('test');
    }).map(u => u.id)
  );

  console.log('====================================');
  console.log('ALL PAID SUBSCRIPTION BILLINGS FOR REAL USERS');
  console.log('====================================');
  let sum = 0;
  for (const b of bills || []) {
    const isRealUser = b.user_id && realUserIds.has(b.user_id);
    if (isRealUser) {
      const prof = profileMap.get(b.user_id);
      console.log(`- User: ${prof ? prof.full_name : 'Unknown'} | Email: ${prof ? prof.email : ''} | Amt: ₹${b.amount} | Method: ${b.payment_method} | Date: ${b.created_at}`);
      sum += Number(b.amount || 0);
    }
  }
  console.log('Total Subscription Billing Revenue:', sum);
}

main();
