import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: subs } = await sb.from('user_subscriptions')
    .select('user_id, plan_id, status, start_date, end_date, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: profiles } = await sb.from('profiles').select('id, full_name');
  const map = new Map(profiles.map(p => [p.id, p.full_name]));

  console.log('--- SUBSCRIPTION DATE CHECK ---');
  subs.forEach(s => {
    const start = new Date(s.start_date);
    const end = new Date(s.end_date);
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
    const flag = days !== 7 ? '⚠️ WRONG DAYS' : '✅';
    console.log(`${flag} ${map.get(s.user_id) || s.user_id} | Days: ${days} | Start: ${s.start_date} | End: ${s.end_date}`);
  });
}

main();
