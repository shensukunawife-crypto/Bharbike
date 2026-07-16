import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  // Let's find Chandrapal by email
  const { data: profile } = await sb.from('profiles').select('id, full_name, email').eq('email', 'timesmedia@gmail.com').maybeSingle();
  if (!profile) {
    console.log('Profile not found for timesmedia@gmail.com');
    return;
  }
  console.log('Found profile:', profile);

  // Let's check user_subscriptions table for this user_id
  const { data: subs, error } = await sb.from('user_subscriptions').select('*').eq('user_id', profile.id);
  if (error) {
    console.error('Error fetching user_subscriptions:', error.message);
    return;
  }
  console.log('Subscriptions:', subs);

  for (const s of subs) {
    if (s.status === 'active' || s.status === 'ongoing') {
      console.log('Found active subscription, updating end_date...');
      // Update end_date to 2026-07-17 09:00:00 (which is 03:30:00 UTC)
      const newEndDate = '2026-07-17T03:30:00.000Z';
      const { data, error: uErr } = await sb.from('user_subscriptions')
        .update({ end_date: newEndDate })
        .eq('id', s.id)
        .select();
      
      console.log('Update result:', data, 'Error:', uErr?.message);
    }
  }
}

main();
