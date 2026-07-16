import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  // 1. Find user profile for AlokBind
  const { data: profiles, error: pErr } = await sb.from('profiles').select('*').ilike('full_name', '%AlokBind%');
  if (pErr) {
    console.error('Error fetching profile:', pErr.message);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('No user profile found for AlokBind.');
    return;
  }

  console.log('--- PROFILE FOUND ---');
  console.log(profiles);

  for (const user of profiles) {
    const userId = user.id;

    // 2. Fetch subscriptions
    const { data: subs } = await sb.from('user_subscriptions').select('*').eq('user_id', userId);
    console.log(`\n--- SUBSCRIPTIONS FOR ${user.full_name} (${userId}) ---`);
    console.log(subs);

    // 3. Fetch billing records
    const { data: billing } = await sb.from('subscription_billing').select('*').eq('user_id', userId);
    console.log(`\n--- BILLING RECORDS FOR ${user.full_name} ---`);
    console.log(billing);

    // 4. Fetch payments
    const { data: payments } = await sb.from('payments').select('*').eq('user_id', userId);
    console.log(`\n--- PAYMENTS FOR ${user.full_name} ---`);
    console.log(payments);
  }
}

main();
