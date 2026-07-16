import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: subs } = await sb.from('user_subscriptions')
    .select('id, user_id, start_date, end_date, status')
    .in('status', ['active']);

  const { data: profiles } = await sb.from('profiles').select('id, full_name');
  const map = new Map(profiles.map(p => [p.id, p.full_name]));

  console.log('--- ACTIVE SUBSCRIPTIONS AND THEIR TIMING ---');
  subs.forEach(s => {
    const start = new Date(s.start_date);
    const end = new Date(s.end_date);
    console.log(`${map.get(s.user_id) || s.user_id} | Start: ${s.start_date} | End: ${s.end_date}`);
  });
}

main();
