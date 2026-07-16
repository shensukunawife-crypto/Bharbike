import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: subs } = await sb.from('user_subscriptions')
    .select('id, user_id, start_date, end_date, status')
    .in('status', ['active']);

  const { data: profiles } = await sb.from('profiles').select('id, full_name');
  const map = new Map(profiles.map(p => [p.id, p.full_name]));

  console.log('--- CORRECTING END TIMES TO MATCH START TIMES ---');

  for (const s of subs) {
    const start = new Date(s.start_date);
    const end = new Date(s.end_date);

    // If hours/minutes/seconds of start & end don't match, we update end date time components
    if (start.getUTCHours() !== end.getUTCHours() || start.getUTCMinutes() !== end.getUTCMinutes()) {
      const newEnd = new Date(end);
      newEnd.setUTCHours(start.getUTCHours());
      newEnd.setUTCMinutes(start.getUTCMinutes());
      newEnd.setUTCSeconds(start.getUTCSeconds());
      newEnd.setUTCMilliseconds(start.getUTCMilliseconds());

      // Special case: Make sure Chandrapal (July 10 -> July 17) gets shortened to July 16 to be inclusive
      const daysDiff = Math.round((newEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff === 7) {
        newEnd.setDate(newEnd.getDate() - 1);
      }

      const { error } = await sb.from('user_subscriptions')
        .update({ end_date: newEnd.toISOString() })
        .eq('id', s.id);

      if (error) {
        console.error(`❌ Failed for ${map.get(s.user_id)}: ${error.message}`);
      } else {
        console.log(`✅ Fixed ${map.get(s.user_id) || s.user_id}:`);
        console.log(`   Old End: ${s.end_date}`);
        console.log(`   New End: ${newEnd.toISOString()} (Matches Start: ${s.start_date})`);
      }
    }
  }

  console.log('\n--- DONE ---');
}

main();
