import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: subs, error } = await sb.from('user_subscriptions').select('*');
  const { data: plans } = await sb.from('subscription_plans').select('id, name');
  const { data: profiles } = await sb.from('profiles').select('id, full_name, email');

  if (error) {
    console.error('Error fetching subscriptions:', error.message);
    return;
  }

  const planMap = new Map();
  if (plans) plans.forEach(p => planMap.set(p.id, p));

  const profileMap = new Map();
  if (profiles) profiles.forEach(p => profileMap.set(p.id, p));

  console.log('====================================');
  console.log('ALL SUBSCRIPTIONS IN DATABASE');
  console.log('====================================');
  console.log('Total subscriptions:', subs ? subs.length : 0);

  const statusCounts = {};
  if (subs) {
    subs.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    });
  }
  console.log('Status Breakdown:', statusCounts);

  console.log('\n--- SUBSCRIPTION LIST ---');
  if (subs) {
    subs.forEach((s, idx) => {
      const u = profileMap.get(s.user_id);
      const p = planMap.get(s.plan_id);
      console.log(`[Sub #${idx+1}] ID: ${s.id} | User: ${u ? u.full_name : 'Unknown ('+s.user_id+')'} | Plan: ${p ? p.name : 'Unknown ('+s.plan_id+')'} | Status: ${s.status} | Start: ${s.start_date} | End: ${s.end_date}`);
    });
  }
}

main();
