import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: subs } = await sb.from('user_subscriptions')
    .select('id, user_id, start_date, end_date, status')
    .in('status', ['active', 'expired']);

  const { data: profiles } = await sb.from('profiles').select('id, full_name');
  const map = new Map(profiles.map(p => [p.id, p.full_name]));

  console.log('--- FIXING END DATES TO INCLUSIVE 7-DAY COUNTING ---');

  for (const s of subs) {
    const start = new Date(s.start_date);
    const end = new Date(s.end_date);
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24));

    // Only fix subs that are currently 7 days (exclusive) → make them 6 days (inclusive = Day 7)
    if (days === 7) {
      const newEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      const { error } = await sb.from('user_subscriptions')
        .update({ end_date: newEnd.toISOString() })
        .eq('id', s.id);

      if (error) {
        console.error(`❌ Failed for ${map.get(s.user_id)}: ${error.message}`);
      } else {
        console.log(`✅ ${map.get(s.user_id) || s.user_id}: ${end.toISOString().slice(0,10)} → ${newEnd.toISOString().slice(0,10)}`);
      }
    }
  }

  console.log('\n--- DONE ---');
}

main();
